const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const dbConfig = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "digital_campus",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

ssl: { rejectUnauthorized: false };

module.exports = { pool, dbConfig };
