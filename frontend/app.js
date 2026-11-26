const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/api\/?$/, "");

const state = {
  user: null,
  students: [],
};

const el = (id) => document.getElementById(id);

async function api(url, options = {}) {
  const fullUrl = url.startsWith("http") ? url : `${API_BASE}${url}`;
  const res = await fetch(fullUrl, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function showView(viewName) {
  const titles = {
    dashboard: "Dashboard",
    students: "Students",
    announcements: "Announcements",
    attendance: "Attendance",
  };
  el("topbar-title").textContent = titles[viewName] || "Dashboard";

  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === viewName);
  });
  document.querySelectorAll(".view-section").forEach((sec) => {
    sec.classList.toggle("hidden", sec.id !== `view-${viewName}`);
  });

  if (viewName === "dashboard") loadDashboard();
  if (viewName === "students") loadStudents();
  if (viewName === "announcements") loadAnnouncements();
  if (viewName === "attendance") loadAttendance();
}

function setAuthenticated(user) {
  state.user = user;
  el("login-view").classList.add("hidden");
  el("app-shell").classList.remove("hidden");
  el("user-name").textContent = user.full_name;
  el("user-role").textContent = user.role === "admin" ? "Administrator" : "Student";
  const initials = user.full_name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  el("user-avatar").textContent = initials || "CA";
  showView("dashboard");
}

function setUnauthenticated() {
  state.user = null;
  el("app-shell").classList.add("hidden");
  el("login-view").classList.remove("hidden");
}

async function loadDashboard() {
  try {
    const data = await api("/api/dashboard");
    el("stat-total-students").textContent = data.totalStudents;
    el("stat-active-students").textContent = data.activeStudents;
    el("stat-attendance-rate").textContent = `${data.attendanceRate}%`;
    el("stat-announcements").textContent = data.totalAnnouncements;

    const list = el("dashboard-announcements");
    if (!data.recentAnnouncements.length) {
      list.innerHTML = `<div class="empty-state">No announcements published yet.</div>`;
      return;
    }
    list.innerHTML = data.recentAnnouncements
      .map(
        (a) => `
        <div class="recent-item">
          <strong>${escapeHtml(a.title)}</strong>
          <span>${escapeHtml(a.author)} &bull; ${new Date(a.created_at).toLocaleDateString()}</span>
        </div>`
      )
      .join("");
  } catch (err) {
    console.error(err);
  }
}

async function loadStudents(query = "") {
  try {
    const data = await api(`/api/students${query ? `?q=${encodeURIComponent(query)}` : ""}`);
    state.students = data.students;
    el("student-count").textContent = `${data.students.length} student${data.students.length === 1 ? "" : "s"}`;

    const tbody = el("students-tbody");
    if (!data.students.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No matching students found.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.students
      .map(
        (s) => `
        <tr>
          <td>
            <strong>${escapeHtml(s.full_name)}</strong>
            <div class="student-sub">${escapeHtml(s.email)}</div>
          </td>
          <td>${escapeHtml(s.student_code)}</td>
          <td>${escapeHtml(s.department)}</td>
          <td>${escapeHtml(s.semester)}</td>
          <td>
            <span class="${s.status === "Active" ? "badge-active" : "badge-inactive"}">${escapeHtml(s.status)}</span>
          </td>
          <td>
            <button class="btn-outline btn-sm" data-edit="${s.id}">Edit</button>
            <button class="btn-outline btn-sm btn-danger" data-delete="${s.id}">Delete</button>
          </td>
        </tr>`
      )
      .join("");
  } catch (err) {
    console.error(err);
  }
}

async function loadAnnouncements() {
  try {
    const data = await api("/api/announcements");
    const grid = el("announcements-grid");
    if (!data.announcements.length) {
      grid.innerHTML = `<div class="panel empty-state">No announcements posted yet.</div>`;
      return;
    }
    grid.innerHTML = data.announcements
      .map(
        (a) => `
        <article class="ann-card">
          <h4>${escapeHtml(a.title)}</h4>
          <p>${escapeHtml(a.body)}</p>
          <div class="ann-meta">${escapeHtml(a.author)} &bull; ${new Date(a.created_at).toLocaleDateString()}</div>
        </article>`
      )
      .join("");
  } catch (err) {
    console.error(err);
  }
}

async function loadAttendance() {
  try {
    const data = await api("/api/attendance");
    const tbody = el("attendance-tbody");
    const wrap = el("attendance-table-wrap");
    const empty = el("attendance-empty");

    if (!data.summary.length) {
      wrap.classList.add("hidden");
      empty.classList.remove("hidden");
      return;
    }

    wrap.classList.remove("hidden");
    empty.classList.add("hidden");
    tbody.innerHTML = data.summary
      .map(
        (r) => `
        <tr>
          <td><strong>${escapeHtml(r.full_name)}</strong></td>
          <td>${escapeHtml(r.student_code)}</td>
          <td>${r.present}</td>
          <td>${r.absent}</td>
          <td>${r.records}</td>
          <td>
            <div>${r.percentage}%</div>
            <div class="progress-track">
              <div class="progress-fill" style="width: ${r.percentage}%"></div>
            </div>
          </td>
        </tr>`
      )
      .join("");
  } catch (err) {
    console.error(err);
  }
}

function openStudentModal(student = null) {
  el("student-error").classList.add("hidden");
  el("student-modal-title").textContent = student ? "Edit student" : "Add student";
  el("student-id").value = student ? student.id : "";
  el("student-code").value = student ? student.student_code : "";
  el("student-name").value = student ? student.full_name : "";
  el("student-email").value = student ? student.email : "";
  el("student-dept").value = student ? student.department : "";
  el("student-sem").value = student ? student.semester : "";
  el("student-status").value = student ? student.status : "Active";
  el("student-modal").classList.remove("hidden");
}

// Event Listeners
el("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  el("login-error").classList.add("hidden");
  try {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: el("login-email").value,
        password: el("login-password").value,
      }),
    });
    setAuthenticated(data.user);
  } catch (err) {
    el("login-error").textContent = err.message;
    el("login-error").classList.remove("hidden");
  }
});

el("logout-btn").addEventListener("click", async () => {
  await api("/api/auth/logout", { method: "POST" }).catch(() => {});
  setUnauthenticated();
});

document.querySelectorAll(".nav-item").forEach((btn) => {
  btn.addEventListener("click", () => showView(btn.dataset.view));
});

document.querySelectorAll("[data-goto]").forEach((btn) => {
  btn.addEventListener("click", () => showView(btn.dataset.goto));
});

el("student-search").addEventListener("input", (e) => {
  loadStudents(e.target.value);
});

el("open-add-student").addEventListener("click", () => openStudentModal());
el("qa-add-student").addEventListener("click", () => {
  showView("students");
  openStudentModal();
});

el("open-add-announcement").addEventListener("click", () => {
  el("ann-error").classList.add("hidden");
  el("announcement-form").reset();
  el("announcement-modal").classList.remove("hidden");
});
el("qa-new-announcement").addEventListener("click", () => {
  showView("announcements");
  el("ann-error").classList.add("hidden");
  el("announcement-form").reset();
  el("announcement-modal").classList.remove("hidden");
});

document.querySelectorAll("[data-close]").forEach((btn) => {
  btn.addEventListener("click", () => el(btn.dataset.close).classList.add("hidden"));
});

el("students-tbody").addEventListener("click", async (e) => {
  const editId = e.target.dataset.edit;
  const deleteId = e.target.dataset.delete;
  if (editId) {
    const student = state.students.find((s) => String(s.id) === editId);
    if (student) openStudentModal(student);
  }
  if (deleteId) {
    if (!confirm("Delete this student record?")) return;
    await api(`/api/students/${deleteId}`, { method: "DELETE" });
    loadStudents(el("student-search").value);
  }
});

el("student-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  el("student-error").classList.add("hidden");
  const id = el("student-id").value;
  const payload = {
    student_code: el("student-code").value,
    full_name: el("student-name").value,
    email: el("student-email").value,
    department: el("student-dept").value,
    semester: el("student-sem").value,
    status: el("student-status").value,
  };
  try {
    await api(id ? `/api/students/${id}` : "/api/students", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });
    el("student-modal").classList.add("hidden");
    loadStudents(el("student-search").value);
  } catch (err) {
    el("student-error").textContent = err.message;
    el("student-error").classList.remove("hidden");
  }
});

el("announcement-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  el("ann-error").classList.add("hidden");
  try {
    await api("/api/announcements", {
      method: "POST",
      body: JSON.stringify({
        title: el("ann-title").value,
        body: el("ann-body").value,
      }),
    });
    el("announcement-modal").classList.add("hidden");
    loadAnnouncements();
  } catch (err) {
    el("ann-error").textContent = err.message;
    el("ann-error").classList.remove("hidden");
  }
});

// Check active session on page load
api("/api/auth/me")
  .then((data) => setAuthenticated(data.user))
  .catch(() => setUnauthenticated());