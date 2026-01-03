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

app.post("/api/produk", async (req, res) => {
  const { email, id, nama, stok, harga_jual, kategori_id, merek_id } = req.body;
  // id = produk_id dari lokal

  if (!email || !id) {
    return res.status(400).json({ message: "invalid payload" });
  }

  try {
    // 1. Ambil user_id dari email
    const [users] = await db.query(
      "SELECT id FROM user WHERE email = ? LIMIT 1",
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "user not found" });
    }

    const user_id = users[0].id;

    // 2. Cek apakah produk sudah ada
    const [existing] = await db.query(
      `
      SELECT id 
      FROM produk 
      WHERE user_id = ? AND produk_id = ?
      LIMIT 1
      `,
      [user_id, id]
    );

    if (existing.length > 0) {
      // 3a. UPDATE jika sudah ada
      await db.query(
        `
        UPDATE produk
        SET 
          nama = ?,
          stok = ?,
          harga_jual = ?,
          kategori_id = ?,
          merek_id = ?
        WHERE user_id = ? AND produk_id = ?
        `,
        [nama, stok, harga_jual, kategori_id, merek_id, user_id, id]
      );
    } else {
      // 3b. INSERT jika belum ada
      await db.query(
        `
        INSERT INTO produk
          (user_id, produk_id, nama, stok, harga_jual, kategori_id, merek_id)
        VALUES
          (?, ?, ?, ?, ?, ?, ?)
        `,
        [user_id, id, nama, stok, harga_jual, kategori_id, merek_id]
      );
    }

    res.json({ status: "ok" });
  } catch (err) {
    console.error("ERROR /api/produk:", err);
    res.status(500).json({ message: "server error" });
  }
});

app.post("/api/kategori", async (req, res) => {
  const { email, id, nama } = req.body;
  // id = kategori_id dari database lokal

  if (!email || !id) {
    return res.status(400).json({ message: "invalid payload" });
  }

  try {
    // 1️⃣ Ambil user_id dari email
    const [users] = await db.query(
      "SELECT id FROM user WHERE email = ? LIMIT 1",
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "user not found" });
    }

    const user_id = users[0].id;

    // 2️⃣ Cek apakah kategori sudah ada
    const [existing] = await db.query(
      `
      SELECT id
      FROM kategori
      WHERE user_id = ? AND kategori_id = ?
      LIMIT 1
      `,
      [user_id, id]
    );

    if (existing.length > 0) {
      // 3a️⃣ UPDATE jika sudah ada
      await db.query(
        `
        UPDATE kategori
        SET nama = ?
        WHERE user_id = ? AND kategori_id = ?
        `,
        [nama, user_id, id]
      );
    } else {
      // 3b️⃣ INSERT jika belum ada
      await db.query(
        `
        INSERT INTO kategori (user_id, kategori_id, nama)
        VALUES (?, ?, ?)
        `,
        [user_id, id, nama]
      );
    }

    res.json({ status: "ok" });
  } catch (err) {
    console.error("ERROR /api/kategori:", err);
    res.status(500).json({ message: "server error" });
  }
});

app.post("/api/merek", async (req, res) => {
  const { email, id, nama } = req.body;
  // id = merek_id dari lokal

  if (!email || !id || !nama) {
    return res.status(400).json({ message: "invalid payload" });
  }

  try {
    // 1. Ambil user_id dari email
    const [users] = await db.query(
      "SELECT id FROM user WHERE email = ? LIMIT 1",
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "user not found" });
    }

    const user_id = users[0].id;

    // 2. Cek merek sudah ada atau belum
    const [existing] = await db.query(
      `
      SELECT id 
      FROM merek 
      WHERE user_id = ? AND merek_id = ?
      LIMIT 1
      `,
      [user_id, id]
    );

    if (existing.length > 0) {
      // 3a. UPDATE
      await db.query(
        `
        UPDATE merek
        SET nama = ?
        WHERE user_id = ? AND merek_id = ?
        `,
        [nama, user_id, id]
      );
    } else {
      // 3b. INSERT
      await db.query(
        `
        INSERT INTO merek
          (user_id, merek_id, nama)
        VALUES
          (?, ?, ?)
        `,
        [user_id, id, nama]
      );
    }

    res.json({ status: "ok" });
  } catch (err) {
    console.error("ERROR /api/merek:", err);
    res.status(500).json({ message: "server error" });
  }
});

app.post("/api/metode-pembayaran", async (req, res) => {
  const { email, id, nama_metode, no_rekening, atas_nama } = req.body;
  // id = metode_pembayaran_id dari lokal

  if (!email || !id || !nama_metode) {
    return res.status(400).json({ message: "invalid payload" });
  }

  try {
    // 1️⃣ Ambil user_id dari email
    const [users] = await db.query(
      "SELECT id FROM user WHERE email = ? LIMIT 1",
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "user not found" });
    }

    const user_id = users[0].id;

    // 2️⃣ Cek apakah metode pembayaran sudah ada
    const [existing] = await db.query(
      `
      SELECT id
      FROM metode_pembayaran
      WHERE user_id = ? AND metode_pembayaran_id = ?
      LIMIT 1
      `,
      [user_id, id]
    );

    if (existing.length > 0) {
      // 3a️⃣ UPDATE jika sudah ada
      await db.query(
        `
        UPDATE metode_pembayaran
        SET 
          nama_metode = ?,
          no_rekening = ?,
          atas_nama = ?
        WHERE user_id = ? AND metode_pembayaran_id = ?
        `,
        [nama_metode, no_rekening, atas_nama, user_id, id]
      );
    } else {
      // 3b️⃣ INSERT jika belum ada
      await db.query(
        `
        INSERT INTO metode_pembayaran
          (user_id, metode_pembayaran_id, nama_metode, no_rekening, atas_nama)
        VALUES
          (?, ?, ?, ?, ?)
        `,
        [user_id, id, nama_metode, no_rekening, atas_nama]
      );
    }

    res.json({ status: "ok" });
  } catch (err) {
    console.error("ERROR /api/metode-pembayaran:", err);
    res.status(500).json({ message: "server error" });
  }
});

app.post("/api/order-setting", async (req, res) => {
  const { email, id, setting_key, setting_value } = req.body;
  // id = order_settings_id dari database lokal

  if (!email || !id || !setting_key) {
    return res.status(400).json({ message: "invalid payload" });
  }

  try {
    // 1️⃣ Ambil user_id dari email
    const [users] = await db.query(
      "SELECT id FROM user WHERE email = ? LIMIT 1",
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "user not found" });
    }

    const user_id = users[0].id;

    // 2️⃣ Cek apakah setting sudah ada
    const [existing] = await db.query(
      `
      SELECT id
      FROM order_settings
      WHERE user_id = ? AND order_settings_id = ?
      LIMIT 1
      `,
      [user_id, id]
    );

    if (existing.length > 0) {
      // 3a️⃣ UPDATE
      await db.query(
        `
        UPDATE order_settings
        SET 
          setting_key = ?,
          setting_value = ?
        WHERE user_id = ? AND order_settings_id = ?
        `,
        [setting_key, setting_value, user_id, id]
      );
    } else {
      // 3b️⃣ INSERT
      await db.query(
        `
        INSERT INTO order_settings
          (user_id, order_settings_id, setting_key, setting_value)
        VALUES
          (?, ?, ?, ?)
        `,
        [user_id, id, setting_key, setting_value]
      );
    }

    res.json({ status: "ok" });
  } catch (err) {
    console.error("ERROR /api/order-setting:", err);
    res.status(500).json({ message: "server error" });
  }
});

app.post("/api/pembelian", async (req, res) => {
  const { email, id, tanggal } = req.body;
  // id = pembelian_id dari database lokal

  if (!email || !id || !tanggal) {
    return res.status(400).json({ message: "invalid payload" });
  }

  try {
    // 1️⃣ Ambil user_id dari email
    const [users] = await db.query(
      "SELECT id FROM user WHERE email = ? LIMIT 1",
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "user not found" });
    }

    const user_id = users[0].id;

    // 2️⃣ Cek apakah pembelian sudah ada
    const [existing] = await db.query(
      `
      SELECT id
      FROM pembelian
      WHERE user_id = ? AND pembelian_id = ?
      LIMIT 1
      `,
      [user_id, id]
    );

    if (existing.length > 0) {
      // 3a️⃣ UPDATE
      await db.query(
        `
        UPDATE pembelian
        SET tanggal = ?
        WHERE user_id = ? AND pembelian_id = ?
        `,
        [tanggal, user_id, id]
      );
    } else {
      // 3b️⃣ INSERT
      await db.query(
        `
        INSERT INTO pembelian
          (user_id, pembelian_id, tanggal)
        VALUES
          (?, ?, ?)
        `,
        [user_id, id, tanggal]
      );
    }

    res.json({ status: "ok" });
  } catch (err) {
    console.error("ERROR /api/pembelian:", err);
    res.status(500).json({ message: "server error" });
  }
});

app.post("/api/settings-toko", async (req, res) => {
  const {
    email,
    id,
    nama_toko,
    jenis_usaha,
    deskripsi,
    alamat,
    no_telepon
  } = req.body;
  // id = settings_toko_id dari database lokal

  if (!email || !id || !nama_toko) {
    return res.status(400).json({ message: "invalid payload" });
  }

  try {
    // 1️⃣ Ambil user_id dari email
    const [users] = await db.query(
      "SELECT id FROM user WHERE email = ? LIMIT 1",
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "user not found" });
    }

    const user_id = users[0].id;

    // 2️⃣ Cek apakah settings toko sudah ada
    const [existing] = await db.query(
      `
      SELECT id
      FROM settings_toko
      WHERE user_id = ? AND settings_toko_id = ?
      LIMIT 1
      `,
      [user_id, id]
    );

    if (existing.length > 0) {
      // 3a️⃣ UPDATE
      await db.query(
        `
        UPDATE settings_toko
        SET
          nama_toko = ?,
          jenis_usaha = ?,
          deskripsi = ?,
          alamat = ?,
          no_telepon = ?
        WHERE user_id = ? AND settings_toko_id = ?
        `,
        [
          nama_toko,
          jenis_usaha,
          deskripsi,
          alamat,
          no_telepon,
          user_id,
          id
        ]
      );
    } else {
      // 3b️⃣ INSERT
      await db.query(
        `
        INSERT INTO settings_toko
          (user_id, settings_toko_id, nama_toko, jenis_usaha, deskripsi, alamat, no_telepon)
        VALUES
          (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          user_id,
          id,
          nama_toko,
          jenis_usaha,
          deskripsi,
          alamat,
          no_telepon
        ]
      );
    }

    res.json({ status: "ok" });
  } catch (err) {
    console.error("ERROR /api/settings-toko:", err);
    res.status(500).json({ message: "server error" });
  }
});

app.post("/api/settings-jam-operasional", async (req, res) => {
  const {
    email,
    id,
    hari,
    jam_buka,
    jam_tutup,
    aktif
  } = req.body;
  // id = settings_jam_operasional_id dari database lokal

  if (!email || !id || !hari) {
    return res.status(400).json({ message: "invalid payload" });
  }

  try {
    // 1️⃣ Ambil user_id dari email
    const [users] = await db.query(
      "SELECT id FROM user WHERE email = ? LIMIT 1",
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "user not found" });
    }

    const user_id = users[0].id;

    // 2️⃣ Cek apakah jam operasional sudah ada
    const [existing] = await db.query(
      `
      SELECT id
      FROM settings_jam_operasional
      WHERE user_id = ? AND settings_jam_operasional_id = ?
      LIMIT 1
      `,
      [user_id, id]
    );

    if (existing.length > 0) {
      // 3a️⃣ UPDATE
      await db.query(
        `
        UPDATE settings_jam_operasional
        SET
          hari = ?,
          jam_buka = ?,
          jam_tutup = ?,
          aktif = ?
        WHERE user_id = ? AND settings_jam_operasional_id = ?
        `,
        [hari, jam_buka, jam_tutup, aktif, user_id, id]
      );
    } else {
      // 3b️⃣ INSERT
      await db.query(
        `
        INSERT INTO settings_jam_operasional
          (user_id, settings_jam_operasional_id, hari, jam_buka, jam_tutup, aktif)
        VALUES
          (?, ?, ?, ?, ?, ?)
        `,
        [user_id, id, hari, jam_buka, jam_tutup, aktif]
      );
    }

    res.json({ status: "ok" });
  } catch (err) {
    console.error("ERROR /api/settings-jam-operasional:", err);
    res.status(500).json({ message: "server error" });
  }
});

app.post("/api/pesanan-online", async (req, res) => {
  const {
    email,
    id,
    nama,
    alamat_pengiriman,
    no_hp,
    jumlah_produk,
    catatan_tambahan,
    status_order,
    tanggal_order,
    metode_pembayaran_id,
    ref_no,
    bukti_transfer
  } = req.body;
  // id = pesanan_online_id dari lokal / bot

  if (!email || !id || !status_order || !tanggal_order) {
    return res.status(400).json({ message: "invalid payload" });
  }

  try {
    // 1️⃣ Ambil user_id
    const [users] = await db.query(
      "SELECT id FROM user WHERE email = ? LIMIT 1",
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "user not found" });
    }

    const user_id = users[0].id;

    // 2️⃣ Cek apakah pesanan sudah ada
    const [existing] = await db.query(
      `
      SELECT id
      FROM pesanan_online
      WHERE user_id = ? AND pesanan_online_id = ?
      LIMIT 1
      `,
      [user_id, id]
    );

    if (existing.length > 0) {
      // 3a️⃣ UPDATE
      await db.query(
        `
        UPDATE pesanan_online
        SET
          nama = ?,
          alamat_pengiriman = ?,
          no_hp = ?,
          jumlah_produk = ?,
          catatan_tambahan = ?,
          status_order = ?,
          tanggal_order = ?,
          metode_pembayaran_id = ?,
          ref_no = ?,
          bukti_transfer = ?
        WHERE user_id = ? AND pesanan_online_id = ?
        `,
        [
          nama,
          alamat_pengiriman,
          no_hp,
          jumlah_produk,
          catatan_tambahan,
          status_order,
          tanggal_order,
          metode_pembayaran_id,
          ref_no,
          bukti_transfer,
          user_id,
          id
        ]
      );
    } else {
      // 3b️⃣ INSERT
      await db.query(
        `
        INSERT INTO pesanan_online
          (
            user_id,
            pesanan_online_id,
            nama,
            alamat_pengiriman,
            no_hp,
            jumlah_produk,
            catatan_tambahan,
            status_order,
            tanggal_order,
            metode_pembayaran_id,
            ref_no,
            bukti_transfer
          )
        VALUES
          (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          user_id,
          id,
          nama,
          alamat_pengiriman,
          no_hp,
          jumlah_produk,
          catatan_tambahan,
          status_order,
          tanggal_order,
          metode_pembayaran_id,
          ref_no,
          bukti_transfer
        ]
      );
    }

    res.json({ status: "ok" });
  } catch (err) {
    console.error("ERROR /api/pesanan-online:", err);
    res.status(500).json({ message: "server error" });
  }
});

// =======================
// START SERVER
// =======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("API User Sync running on port", PORT);
});
