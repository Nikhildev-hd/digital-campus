const path = require("path");
const express = require("express");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const helmet = require("helmet");
const bcrypt = require("bcrypt");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const { pool, dbConfig } = require("./db");

const app = express();
const PORT = Number(process.env.PORT || 3000);

// Security headers (CSP configured to allow local frontend scripts/styles)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
      },
    },
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const sessionStore = new MySQLStore(
  {
    ...dbConfig,
    createDatabaseTable: true,
  },
  pool
);

app.use(
  session({
    key: "campusconnect.sid",
    secret: process.env.SESSION_SECRET || "campusconnect-dev-secret",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 8,
    },
  })
);

// Serve static frontend assets
const frontendDir = path.resolve(__dirname, "../../frontend");
app.use(express.static(frontendDir));

// Auth & role middleware
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  return next();
}

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  if (req.session.user.role !== "admin") {
    return res.status(403).json({ error: "Administrator access required" });
  }
  return next();
}

// --- Auth Routes ---
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const [rows] = await pool.execute(
      "SELECT id, full_name, email, password_hash, role FROM users WHERE email = ? LIMIT 1",
      [email.trim()]
    );
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    req.session.user = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
    };

    return res.json({ user: req.session.user });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Unable to process login." });
  }
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to log out." });
    }
    res.clearCookie("campusconnect.sid");
    return res.json({ message: "Logged out successfully." });
  });
});

app.get("/api/auth/me", (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  return res.json({ user: req.session.user });
});

// --- Dashboard Route ---
app.get("/api/dashboard", requireAuth, async (req, res) => {
  try {
    const [[studentStats]] = await pool.execute(`
      SELECT
        COUNT(*) AS totalStudents,
        SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) AS activeStudents
      FROM students
    `);

    const [[annStats]] = await pool.execute(
      "SELECT COUNT(*) AS totalAnnouncements FROM announcements"
    );

    const [[attStats]] = await pool.execute(`
      SELECT
        COUNT(*) AS totalRecords,
        SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) AS presentCount
      FROM attendance
    `);

    const attendanceRate =
      attStats.totalRecords > 0
        ? Number(((attStats.presentCount / attStats.totalRecords) * 100).toFixed(1))
        : 0;

    const [recentAnnouncements] = await pool.execute(`
      SELECT a.id, a.title, a.body, a.created_at, u.full_name AS author
      FROM announcements a
      JOIN users u ON a.created_by = u.id
      ORDER BY a.created_at DESC
      LIMIT 3
    `);

    return res.json({
      totalStudents: Number(studentStats.totalStudents || 0),
      activeStudents: Number(studentStats.activeStudents || 0),
      totalAnnouncements: Number(annStats.totalAnnouncements || 0),
      attendanceRate,
      recentAnnouncements,
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    return res.status(500).json({ error: "Failed to load dashboard summary." });
  }
});

// --- Student Management Routes ---
app.get("/api/students", requireAuth, async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    let sql =
      "SELECT id, student_code, full_name, email, department, semester, status, created_at FROM students";
    const params = [];

    if (q) {
      sql +=
        " WHERE full_name LIKE ? OR student_code LIKE ? OR email LIKE ? OR department LIKE ?";
      const like = `%${q}%`;
      params.push(like, like, like, like);
    }

    sql += " ORDER BY id DESC";
    const [rows] = await pool.execute(sql, params);
    return res.json({ students: rows });
  } catch (err) {
    console.error("List students error:", err);
    return res.status(500).json({ error: "Failed to fetch students." });
  }
});

app.post("/api/students", requireAdmin, async (req, res) => {
  try {
    const { student_code, full_name, email, department, semester, status } = req.body;
    if (!student_code || !full_name || !email || !department || !semester) {
      return res.status(400).json({ error: "All student fields are required." });
    }

    const safeStatus = status === "Inactive" ? "Inactive" : "Active";
    const [result] = await pool.execute(
      `INSERT INTO students (student_code, full_name, email, department, semester, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        student_code.trim(),
        full_name.trim(),
        email.trim(),
        department.trim(),
        semester.trim(),
        safeStatus,
      ]
    );

    const [created] = await pool.execute("SELECT * FROM students WHERE id = ?", [
      result.insertId,
    ]);
    return res.status(201).json({ student: created[0] });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ error: "Student code or email already exists." });
    }
    console.error("Create student error:", err);
    return res.status(500).json({ error: "Failed to create student." });
  }
});

app.put("/api/students/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { student_code, full_name, email, department, semester, status } = req.body;
    if (!student_code || !full_name || !email || !department || !semester) {
      return res.status(400).json({ error: "All student fields are required." });
    }

    const safeStatus = status === "Inactive" ? "Inactive" : "Active";
    const [result] = await pool.execute(
      `UPDATE students
       SET student_code = ?, full_name = ?, email = ?, department = ?, semester = ?, status = ?
       WHERE id = ?`,
      [
        student_code.trim(),
        full_name.trim(),
        email.trim(),
        department.trim(),
        semester.trim(),
        safeStatus,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Student not found." });
    }

    const [updated] = await pool.execute("SELECT * FROM students WHERE id = ?", [id]);
    return res.json({ student: updated[0] });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ error: "Student code or email already exists." });
    }
    console.error("Update student error:", err);
    return res.status(500).json({ error: "Failed to update student." });
  }
});

app.delete("/api/students/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [result] = await pool.execute("DELETE FROM students WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Student not found." });
    }
    return res.json({ message: "Student deleted successfully." });
  } catch (err) {
    console.error("Delete student error:", err);
    return res.status(500).json({ error: "Failed to delete student." });
  }
});

// --- Announcements Routes ---
app.get("/api/announcements", requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT a.id, a.title, a.body, a.created_at, u.full_name AS author
      FROM announcements a
      JOIN users u ON a.created_by = u.id
      ORDER BY a.created_at DESC
    `);
    return res.json({ announcements: rows });
  } catch (err) {
    console.error("List announcements error:", err);
    return res.status(500).json({ error: "Failed to fetch announcements." });
  }
});

app.post("/api/announcements", requireAdmin, async (req, res) => {
  try {
    const { title, body } = req.body;
    if (!title || !body) {
      return res
        .status(400)
        .json({ error: "Announcement title and body are required." });
    }

    const [result] = await pool.execute(
      "INSERT INTO announcements (title, body, created_by) VALUES (?, ?, ?)",
      [title.trim(), body.trim(), req.session.user.id]
    );

    const [created] = await pool.execute(
      `SELECT a.id, a.title, a.body, a.created_at, u.full_name AS author
       FROM announcements a
       JOIN users u ON a.created_by = u.id
       WHERE a.id = ?`,
      [result.insertId]
    );

    return res.status(201).json({ announcement: created[0] });
  } catch (err) {
    console.error("Create announcement error:", err);
    return res.status(500).json({ error: "Failed to create announcement." });
  }
});

// --- Attendance Summary Route ---
app.get("/api/attendance", requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT
        s.id AS student_id,
        s.full_name,
        s.student_code,
        SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) AS present_count,
        SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) AS absent_count,
        COUNT(a.id) AS total_records
      FROM students s
      INNER JOIN attendance a ON a.student_id = s.id
      GROUP BY s.id, s.full_name, s.student_code
      ORDER BY s.student_code ASC
    `);

    const summary = rows.map((r) => {
      const total = Number(r.total_records || 0);
      const present = Number(r.present_count || 0);
      const absent = Number(r.absent_count || 0);
      return {
        student_id: r.student_id,
        full_name: r.full_name,
        student_code: r.student_code,
        present,
        absent,
        records: total,
        percentage: total > 0 ? Math.round((present / total) * 100) : 0,
      };
    });

    return res.json({ summary });
  } catch (err) {
    console.error("Attendance summary error:", err);
    return res.status(500).json({ error: "Failed to fetch attendance summary." });
  }
});

// Fallback to SPA index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(frontendDir, "index.html"));
});

app.listen(PORT, () => {
  console.log(`CampusConnect server running at http://localhost:${PORT}`);
});
