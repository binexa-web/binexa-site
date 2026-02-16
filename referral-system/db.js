const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./referral.db");

db.serialize(() => {
  // 1. Users Table (Added wallet and package)
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      mobile TEXT UNIQUE,
      referrer_id INTEGER,
      level INTEGER DEFAULT 1,
      wallet REAL DEFAULT 0,
      package TEXT DEFAULT 'BASIC'
    )
  `);

  // 2. Subscriptions Table
  db.run(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      plan_name TEXT,
      amount INTEGER
    )
  `);

  // 3. Earnings Table
  db.run(`
    CREATE TABLE IF NOT EXISTS earnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      from_user INTEGER,
      level INTEGER,
      amount REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 4. Mining Status Table (YE MISSING THI)
  db.run(`
    CREATE TABLE IF NOT EXISTS mining_status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      date TEXT,
      blocks_mined INTEGER DEFAULT 0,
      total_points REAL DEFAULT 0
    )
  `);

  // 5. Admins Table
  db.run(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT
    )
  `);

  // 6. Commissions Table
  db.run(`
    CREATE TABLE IF NOT EXISTS commissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_user INTEGER,
        to_user INTEGER,
        level INTEGER,
        amount REAL
    )
  `);
});

module.exports = db;