require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();
app.use(cors());
app.use(express.json());

// =======================
// DATABASE CONNECTION
// =======================
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

// =======================
// API KEY MIDDLEWARE
// =======================
app.use((req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  console.log("HEADER X-API-KEY:", req.headers["x-api-key"]);
  console.log("ENV API_KEY:", process.env.API_KEY);
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
});

// =======================
// HEALTH CHECK
// =======================
app.get("/", (req, res) => {
  res.json({ status: "API User Sync running" });
});

// =======================
// REGISTER USER (ONLY THIS FEATURE)
// =======================
app.post("/api/user", async (req, res) => {
  try {
    console.log("HIT /api/user BODY:", req.body);

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email wajib" });
    }

    // cek apakah email sudah ada
    const [rows] = await db.query(
      "SELECT id FROM user WHERE email = ? LIMIT 1",
      [email]
    );

    if (rows.length > 0) {
      return res.json({ status: "exists" });
    }

    // insert user baru (email saja)
    await db.query(
      `
      INSERT INTO user (email)
      VALUES (?)
      `,
      [email]
    );

    res.json({ status: "created" });
  } catch (err) {
    console.error("ERROR /api/user:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// =======================
// START SERVER
// =======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("API User Sync running on port", PORT);
});
