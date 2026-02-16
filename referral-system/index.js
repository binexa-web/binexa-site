const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const db = require("./db");
const { distributeCommission } = require("./referral/referralEngine");



db.get("SELECT * FROM admins WHERE username='admin'", (err, row) => {
    if (!row) {
        db.run(
            "INSERT INTO admins (username, password) VALUES (?, ?)",
            ["admin", "admin123"]
        );
        console.log("✅ Default admin created (admin / admin123)");
    }
});


// ===== REFERRAL CONFIG =====
const REFERRAL_PERCENT = [5, 4, 3, 2, 1];

// ===== MINING RULES BY PLAN =====
const MINING_RULES = {
    BASIC: {
        dailyBlocks: 3,
        pointsPerBlock: [5, 10],
        rarity: ["COMMON"]
    },
    SILVER: {
        dailyBlocks: 7,
        pointsPerBlock: [10, 20],
        rarity: ["COMMON", "RARE"]
    },
    GOLD: {
        dailyBlocks: 10,
        pointsPerBlock: [20, 40],
        rarity: ["RARE", "EPIC"]
    },
    PRO: {
        dailyBlocks: 15,
        pointsPerBlock: [40, 80],
        rarity: ["EPIC", "LEGENDARY"]
    }
};


// ===== TODAY DATE HELPER =====
function todayDate() {
    return new Date().toISOString().slice(0, 10);
}

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

const PORT = 3000;

app.post("/admin/login", (req, res) => {
    const { username, password } = req.body;

    db.get(
        "SELECT * FROM admins WHERE username=? AND password=?",
        [username, password],
        (err, admin) => {
            if (!admin) {
                return res.json({ success: false, message: "Invalid login" });
            }

            res.json({
                success: true,
                admin_id: admin.id,
                message: "Admin login successful"
            });
        }
    );
})

/* =========================
   REFERRAL CODE GENERATOR
========================= */
function generateReferralCode() {
    return "BNX" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ================= REGISTER USER =================
app.post("/register", (req, res) => {
    const { name, mobile, referrer_id } = req.body;

    if (!name || !mobile) {
        return res.status(400).json({ error: "Name & mobile required" });
    }

    let level = 1;

    if (referrer_id) {
        db.get(
            "SELECT level FROM users WHERE id = ?",
            [referrer_id],
            (err, refUser) => {
                if (refUser) {
                    level = refUser.level + 1;
                }

                insertUser(level);
            }
        );
    } else {
        insertUser(level);
    }

    function insertUser(level) {
        db.run(
            "INSERT INTO users (name, mobile, referrer_id, level) VALUES (?, ?, ?, ?)",
            [name, mobile, referrer_id || null, level],
            function (err) {
                if (err) {
                    return res.status(500).json({ error: "User already exists" });
                }

                res.json({
                    message: "User registered",
                    user_id: this.lastID,
                    level: level
                });
            }
        );
    }
});


/* =========================
   SUBSCRIPTION BUY
========================= */
app.post("/subscribe", (req, res) => {
    const { user_id, plan_name, amount } = req.body;

    db.run(
        "INSERT INTO subscriptions (user_id, plan_name, amount) VALUES (?, ?, ?)",
        [user_id, plan_name, amount],
        err => {
            if (err) return res.json({ error: err.message });
            res.json({ success: true });
        }
    );
});

/* =========================
   GET USER PLAN
========================= */
app.get("/user/:id/plan", (req, res) => {
    const userId = req.params.id;

    db.get(
        "SELECT plan_name FROM subscriptions WHERE user_id = ? ORDER BY id DESC LIMIT 1",
        [userId],
        (err, row) => {
            if (err) return res.json({ error: err.message });
            res.json({ plan: row ? row.plan_name : "BASIC" });
        }
    );
});

/* =========================
   MINING LIMIT CHECK
========================= */
app.get("/mining/limit/:userId", (req, res) => {
    const userId = req.params.userId;

    db.get(
        "SELECT plan_name FROM subscriptions WHERE user_id = ? ORDER BY id DESC LIMIT 1",
        [userId],
        (err, row) => {
            const plan = row ? row.plan_name : "BASIC";
            const rule = MINING_RULES[plan];

            res.json({
                plan,
                dailyBlocks: rule.dailyBlocks,
                pointsPerBlock: rule.pointsPerBlock
            });
        }
    );
});

/* =========================
   START MINING
========================= */
app.post("/mining/start", (req, res) => {
    const { userId } = req.body;
    const today = new Date().toISOString().slice(0, 10);

    db.get(
        "SELECT * FROM mining_status WHERE user_id = ? AND date = ?",
        [userId, today],
        (err, row) => {
            if (!row) {
                db.run(
                    "INSERT INTO mining_status (user_id, date, blocks_mined, total_points) VALUES (?, ?, 0, 0)",
                    [userId, today],
                    () => res.json({ started: true })
                );
            } else {
                res.json({ started: true });
            }
        }
    );
});

/* =========================
   CLAIM BLOCK
========================= */
app.post("/mining/claim", (req, res) => {
    const { userId } = req.body;
    const today = new Date().toISOString().slice(0, 10);

    db.get(
        "SELECT plan_name FROM subscriptions WHERE user_id = ? ORDER BY id DESC LIMIT 1",
        [userId],
        (err, planRow) => {
            const plan = planRow ? planRow.plan_name : "BASIC";
            const rule = MINING_RULES[plan];

            if (rule.dailyBlocks === 0) {
                return res.json({ error: "Mining not allowed for this plan" });
            }

            db.get(
                "SELECT * FROM mining_status WHERE user_id = ? AND date = ?",
                [userId, today],
                (err, row) => {
                    if (row.blocks_mined >= rule.dailyBlocks) {
                        return res.json({ error: "Daily limit reached" });
                    }

                    const miningAmount = rule.pointsPerBlock[0]; // Pehle amount nikalein (e.g., 5 ya 10)
                    const newBlocks = row.blocks_mined + 1;      // Block count badhayein
                    const newPoints = row.total_points + miningAmount; // Ab sahi number plus hoga

                    db.run(
                        "UPDATE mining_status SET blocks_mined = ?, total_points = ? WHERE id = ?",
                        [newBlocks, newPoints, row.id],
                        async () => {

                            // ⭐ USER WALLET UPDATE (REAL EARNING)
                            db.run(
                                "UPDATE users SET wallet = wallet + ? WHERE id=?",
                                [miningAmount, userId]
                            );

                            // 🚀 REAL REFERRAL COMMISSION TRIGGER
                            await distributeCommission(userId, miningAmount);

                            res.json({ success: true, newPoints });
                        }
                    );

                }
            );
        }
    );
});

/* ===============================
   REAL REFERRAL TREE API
================================ */

app.get("/api/tree/:userId", async (req, res) => {
    const userId = Number(req.params.userId); // String ko number mein badla

    try {
        const users = await new Promise((resolve, reject) => {
            // Check karein ki "name" column hi hai na aapki table mein
            db.all("SELECT id, name, referrer_id, level FROM users", [], (err, rows) => {
                if (err) {
                    console.error("Database Error:", err.message); // Exact error yahan dikhega
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });

        function buildTree(parentId, level = 1) {
            return users
                .filter(u => u.referrer_id === parentId)
                .map(child => ({
                    id: child.id,
                    username: child.name,
                    level: level,
                    children: buildTree(child.id, level + 1)
                }));
        }

        const tree = buildTree(userId, 1);
        res.json(tree);

    } catch (err) {
        console.error("Tree processing error:", err);
        res.status(500).json({ error: "Database query failed", details: err.message });
    }
});


/* =========================
   MINING STATUS
========================= */
app.get("/mining/status/:userId", (req, res) => {
    const userId = req.params.userId;
    const today = new Date().toISOString().slice(0, 10);

    db.get(
        "SELECT * FROM mining_status WHERE user_id = ? AND date = ?",
        [userId, today],
        (err, row) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.json(row || { blocks_mined: 0, total_points: 0 });
        }
    );
});

// ===== CHECK DIRECT REFERRALS COUNT =====
function hasTwoDirects(userId, callback) {
    db.get(
        "SELECT COUNT(*) as total FROM users WHERE referrer_id = ?",
        [userId],
        (err, row) => {
            callback(row && row.total >= 2);
        }
    );
}

// ===== DISTRIBUTE REFERRAL REWARD =====
function distributeReferralReward(userId, amount) {
    let level = 1;
    let currentUserId = userId;

    function nextLevel() {
        if (level > 5) return;

        db.get(
            "SELECT referrer_id FROM users WHERE id = ?",
            [currentUserId],
            (err, row) => {
                if (!row || !row.referrer_id) return;

                const referrerId = row.referrer_id;
                hasTwoDirects(referrerId, (eligible) => {
                    if (!eligible && level > 1) {
                        currentUserId = referrerId;
                        level++;
                        return nextLevel();
                    }

                    const rewardPercent = REFERRAL_PERCENT[level - 1];
                    const rewardAmount = (amount * rewardPercent) / 100;

                    db.run(
                        `INSERT INTO earnings (user_id, from_user, level, amount)
     VALUES (?, ?, ?, ?)`,
                        [referrerId, userId, level, rewardAmount]
                    );

                    currentUserId = referrerId;
                    level++;
                    nextLevel();
                });
            }
        );
    }

    nextLevel();
}

// ===============================
// REFERRAL TREE API (LEVEL 1–5)
// ===============================
app.get("/referral/tree/:userId", (req, res) => {
    const userId = parseInt(req.params.userId);
    const maxLevel = 5;
    let result = [];

    function fetchLevel(parentIds, level) {
        if (level > maxLevel || parentIds.length === 0) {
            return res.json(result);
        }

        const placeholders = parentIds.map(() => "?").join(",");
        db.all(
            `SELECT id, name, mobile, referrer_id 
       FROM users 
       WHERE referrer_id IN (${placeholders})`,
            parentIds,
            (err, rows) => {
                if (err) return res.json({ error: err.message });

                rows.forEach(u => {
                    result.push({
                        level: level,
                        user_id: u.id,
                        name: u.name,
                        mobile: u.mobile,
                        referrer_id: u.referrer_id
                    });
                });

                const nextIds = rows.map(r => r.id);
                fetchLevel(nextIds, level + 1);
            }
        );
    }

    fetchLevel([userId], 1);
});

// ============================
// USER TOTAL REFERRAL EARNINGS
// ============================
app.get("/referral/earnings/:userId", (req, res) => {
    const userId = req.params.userId;

    db.all(
        `SELECT level, SUM(amount) as total
     FROM earnings
     WHERE user_id = ?
     GROUP BY level`,
        [userId],
        (err, rows) => {
            if (err) return res.json({ error: err.message });

            let grandTotal = 0;
            rows.forEach(r => grandTotal += r.total);

            res.json({
                levels: rows,
                total: grandTotal
            });
        }
    );
});

// ================= ADMIN APIs =================

// All users
app.get("/admin/users", (req, res) => {
    db.all(
        "SELECT id, name, mobile, referral_code, referrer_id FROM users",
        [],
        (err, rows) => {
            if (err) return res.json({ error: err.message });
            res.json(rows);
        }
    );
});

// User earnings
app.get("/admin/earnings/:userId", (req, res) => {
    const userId = req.params.userId;

    db.all(
        `SELECT level, SUM(amount) as total
     FROM earnings
     WHERE user_id = ?
     GROUP BY level`,
        [userId],
        (err, rows) => {
            if (err) return res.json({ error: err.message });
            res.json(rows);
        }
    );
});

/* =========================
   ADMIN : USER REFERRAL TREE
========================= */

app.get("/admin/referral-tree/:userId", (req, res) => {
    const userId = req.params.userId;

    db.all(
        `
    SELECT 
      u.id,
      u.name,
      u.mobile,
      u.referrer_id,
      e.level,
      e.amount
    FROM users u
    LEFT JOIN earnings e ON u.id = e.from_user
    WHERE u.referrer_id = ?
    `,
        [userId],
        (err, rows) => {
            if (err) return res.json({ error: err.message });
            res.json(rows);
        }
    );
});

/* =========================
   ADMIN : ALL EARNINGS
========================= */

app.get("/admin/earnings", (req, res) => {
    db.all(
        `
    SELECT 
      e.id,
      e.user_id,
      u.name as user_name,
      e.from_user,
      e.level,
      e.amount,
      e.created_at
    FROM earnings e
    JOIN users u ON u.id = e.user_id
    ORDER BY e.created_at DESC
    `,
        (err, rows) => {
            if (err) return res.json({ error: err.message });
            res.json(rows);
        }
    );
});

// ===== ADMIN STATS =====
app.get("/admin/stats", (req, res) => {
    const stats = {};

    db.get("SELECT COUNT(*) as totalUsers FROM users", (err, row) => {
        stats.totalUsers = row.totalUsers;

        db.get("SELECT SUM(amount) as totalEarnings FROM earnings", (err, row2) => {
            stats.totalEarnings = row2.totalEarnings || 0;

            db.all(
                "SELECT level, SUM(amount) as amount FROM earnings GROUP BY level",
                (err, rows) => {
                    stats.levelWise = rows;
                    res.json(stats);
                }
            );
        });
    });
});

// ===== USER ULTRA PRO DASHBOARD DATA =====

app.get("/user/dashboard/:id", (req, res) => {

    const userId = req.params.id;

    const data = {
        totalRef: 0,
        activeRef: 0,
        totalEarn: 0,
        users: [],
        levelIncome: []
    };

    db.all(`
SELECT u.id,u.name,u.package,e.level,e.amount
FROM earnings e
JOIN users u ON u.id = e.from_user
WHERE e.user_id = ?
`, [userId], (err, rows) => {

        if (rows) {
            data.users = rows;
            data.totalRef = rows.length;
            data.activeRef = rows.length;

            rows.forEach(r => {
                data.totalEarn += r.amount;
            });
        }

        db.all(`
SELECT level,SUM(amount) as total
FROM earnings
WHERE user_id = ?
GROUP BY level
`, [userId], (err2, levels) => {

            data.levelIncome = levels || [];
            res.json(data);

        });

    });

});

// ===== ULTRA MAX MLM ENGINE =====

const LEVEL_PERCENT = [5, 4, 3, 2, 1];

// AUTO CALCULATE REFERRAL EARNINGS
function distributeReferralIncome(fromUserId, amount) {

    db.get("SELECT referrer_id FROM users WHERE id = ?", [fromUserId], (err, row) => {

        if (!row || !row.referrer_id) return;

        let currentRef = row.referrer_id;

        LEVEL_PERCENT.forEach((percent, index) => {

            if (!currentRef) return;

            const level = index + 1;
            const commission = (amount * percent) / 100;

            db.run(`
INSERT INTO earnings(user_id,from_user,level,amount)
VALUES(?,?,?,?)
`, [currentRef, fromUserId, level, commission]);

            db.get("SELECT referrer_id FROM users WHERE id = ?", [currentRef], (e, r) => {
                if (r) currentRef = r.referrer_id;
            });

        });

    });

}

// ===== USER RANK SYSTEM =====

app.get("/user/rank/:id", (req, res) => {

    const userId = req.params.id;

    db.get(`
SELECT SUM(amount) as total FROM earnings
WHERE user_id = ?
`, [userId], (err, row) => {

        let rank = "Starter";

        const total = row.total || 0;

        if (total > 5000) rank = "Diamond";
        else if (total > 2000) rank = "Gold";
        else if (total > 500) rank = "Silver";

        res.json({ rank, total });

    });

});

app.get("/ultra-data/:id", async (req, res) => {

    const userId = req.params.id;

    const user = await db.get(
        "SELECT wallet FROM users WHERE id=?",
        [userId]
    );

    const levels = await db.all(`
        SELECT level, SUM(amount) as amount
        FROM commissions
        WHERE to_user=?
        GROUP BY level
    `, [userId]);

    res.json({
        wallet: user.wallet,
        levelWise: levels || []
    });

});

/* =============================
   REAL TREE DATA API
============================= */

app.get("/tree/:userId", (req, res) => {

    const userId = req.params.userId;

    const tree = [];

    function loadLevel(parentId, level, callback) {

        db.all(
            "SELECT id, name FROM users WHERE referrer_id = ?",
            [parentId],
            (err, rows) => {

                if (rows && rows.length) {
                    rows.forEach(u => {
                        tree.push({
                            id: u.id,
                            name: u.name,
                            level: level,
                            parent: parentId
                        });
                    });

                    let pending = rows.length;

                    rows.forEach(u => {
                        loadLevel(u.id, level + 1, () => {
                            pending--;
                            if (pending === 0) callback();
                        });
                    });

                } else {
                    callback();
                }

            }
        );
    }

    loadLevel(userId, 1, () => {
        res.json(tree);
    });

});




/* =========================
   SERVER START
========================= */
app.listen(PORT, () => {
    console.log("Mining server running on http://localhost:" + PORT);
});
