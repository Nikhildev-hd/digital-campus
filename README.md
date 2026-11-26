# CampusConnect — Digital Campus Portal

A full-stack web application built with **Node.js**, **Express.js**, **MySQL**, and **HTML5/CSS3/JavaScript** to centralise campus administration workflows including student record management, campus announcements, and attendance summaries.

---

## Features

- **Session-Based Authentication:** Secure login/logout using `bcrypt` password hashing and MySQL-backed sessions (`express-mysql-session`).
- **Role-Based Access Control:** Admin middleware protecting create, update, and delete operations.
- **Admin Dashboard:** Live overview of total students, active students, attendance rate, announcement count, recent announcements, and quick actions.
- **Student Management:** Searchable student directory (by name, student ID, email, or department) with full CRUD operations.
- **Announcements:** Centralised campus notice board with authorised announcement creation.
- **Attendance Overview:** Student-wise attendance summary with present/absent counts, percentage progress bars, and empty-state handling.
- **Security Hardening:** Parameterised SQL queries via `mysql2` (SQL injection protection) and HTTP security headers via `helmet`.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | HTML5, CSS3, Vanilla JavaScript (Fetch API) |
| **Backend** | Node.js, Express.js |
| **Database** | MySQL (`mysql2` connection pool) |
| **Auth & Security** | `bcrypt`, `express-session`, `express-mysql-session`, `helmet` |

---

## Project Structure

```text
digital-campus-portal/
├── .gitignore
├── LICENSE
├── README.md
├── backend/
│   ├── .env.example
│   ├── package.json
│   └── src/
│       ├── db.js          # MySQL connection pool
│       ├── seed.js        # Sample admin, student, announcement & attendance data
│       └── server.js      # Express app, middleware & REST API routes
├── database/
│   └── schema.sql         # MySQL schema for digital_campus
└── frontend/
    ├── index.html         # Single-page portal interface
    ├── styles.css         # Responsive UI styling
    └── app.js             # Client-side state, routing & API integration
```

---

## Getting Started

### Prerequisites

- **Node.js** (v18+ or v24.x recommended)
- **MySQL** (via standalone MySQL Server or XAMPP)

### 1. Set Up the Database

Import `database/schema.sql` into your MySQL server (via phpMyAdmin or MySQL CLI):

```bash
mysql -u root -p < database/schema.sql
```

### 2. Configure Environment Variables

```bash
cd backend
cp .env.example .env
```

Update `backend/.env` with your local MySQL credentials and a strong `SESSION_SECRET`.

### 3. Install Dependencies & Seed Sample Data

```bash
npm install
npm run seed
```

### 4. Run the Application

```bash
# Development mode (with nodemon)
npm run dev

# Or production mode
npm start
```

Open `http://localhost:3000` in your browser and sign in with the seeded demo admin account:
- **Email:** `admin@campus.local`
- **Password:** `Campus@123`

---

## API Endpoints

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Public | Authenticate user and create session |
| `POST` | `/api/auth/logout` | Authenticated | Destroy active session |
| `GET` | `/api/auth/me` | Authenticated | Return current signed-in user |
| `GET` | `/api/dashboard` | Authenticated | Fetch summary metrics & recent announcements |
| `GET` | `/api/students` | Authenticated | List/search student records (`?q=...`) |
| `POST` | `/api/students` | Admin | Add a new student |
| `PUT` | `/api/students/:id` | Admin | Update an existing student |
| `DELETE` | `/api/students/:id` | Admin | Delete a student record |
| `GET` | `/api/announcements` | Authenticated | List all announcements |
| `POST` | `/api/announcements` | Admin | Create a new announcement |
| `GET` | `/api/attendance` | Authenticated | Fetch student-wise attendance summary |

---

## Author

**Nikhildev H D**  
Master of Computer Applications (MCA) — ATME College of Engineering, Mysuru
