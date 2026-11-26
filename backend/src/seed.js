const bcrypt = require("bcrypt");
const { pool } = require("./db");

async function seed() {
  const conn = await pool.getConnection();
  try {
    console.log("Seeding Digital Campus Portal database...");

    const passwordHash = await bcrypt.hash("Campus@123", 10);
    await conn.execute(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES (?, ?, ?, 'admin')
       ON DUPLICATE KEY UPDATE full_name = VALUES(full_name)`,
      ["Campus Administrator", "admin@campus.local", passwordHash]
    );

    const [[admin]] = await conn.execute(
      "SELECT id FROM users WHERE email = ?",
      ["admin@campus.local"]
    );

    const sampleStudents = [
      ["101", "Nikhil", "hdnikhildev@gmail.com", "MCA", "Semester 3", "Active"],
      ["102", "Nishanth", "nikhildev@gmail.com", "MCA", "Semester 3", "Active"],
      ["103", "Nik", "hdnikhil@gmail.com", "Information Science", "Semester 6", "Active"],
    ];

    for (const s of sampleStudents) {
      await conn.execute(
        `INSERT INTO students (student_code, full_name, email, department, semester, status)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE full_name = VALUES(full_name)`,
        s
      );
    }

    const [[annCount]] = await conn.execute("SELECT COUNT(*) AS cnt FROM announcements");
    if (annCount.cnt === 0) {
      await conn.execute(
        "INSERT INTO announcements (title, body, created_by) VALUES (?, ?, ?)",
        [
          "Welcome to Digital Campus Portal",
          "Use this portal to view campus updates and student records. This is sample content for your demonstration.",
          admin.id,
        ]
      );
      await conn.execute(
        "INSERT INTO announcements (title, body, created_by) VALUES (?, ?, ?)",
        [
          "Deepavali",
          "7 days holiday announced for the upcoming festive break.",
          admin.id,
        ]
      );
    }

    const [[firstStudent]] = await conn.execute(
      "SELECT id FROM students WHERE student_code = '101'"
    );
    if (firstStudent) {
      const sampleAttendance = [
        [firstStudent.id, "2026-11-18", "Present"],
        [firstStudent.id, "2026-11-19", "Present"],
        [firstStudent.id, "2026-11-20", "Present"],
        [firstStudent.id, "2026-11-21", "Absent"],
      ];
      for (const row of sampleAttendance) {
        await conn.execute(
          `INSERT IGNORE INTO attendance (student_id, attendance_date, status)
           VALUES (?, ?, ?)`,
          row
        );
      }
    }

    console.log("Seed completed successfully.");
  } finally {
    conn.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
