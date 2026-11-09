const config = require('../config');
const { connectDB, closeDB, isDatabaseConnected, getPool } = require('../config/database');

const INITIAL_NOTICES = [
  {
    noticeNumber: 'AERO-NOTICE-2026-001',
    title: 'ATC Scheduling Advisory — JFK T2 Flow',
    category: 'operational',
    severity: 'info',
    status: 'published',
    summary: 'Upcoming runway construction window alters arrival sequencing for inbound widebodies.',
    body: 'A runway maintenance window is scheduled for next week. Expect spacing adjustments for inbound heavy aircraft.',
    effectiveFromUtc: new Date(Date.now() + 86400000).toISOString(),
    effectiveToUtc: new Date(Date.now() + 15 * 86400000).toISOString(),
    publishedBy: 'Duty Operations Center',
  },
  {
    noticeNumber: 'AERO-NOTICE-2026-002',
    title: 'Medical Diversion Protocol Update',
    category: 'medical',
    severity: 'high',
    status: 'published',
    summary: 'Expanded medical diversion coordination for transatlantic routes.',
    body: 'Medical diversion partners updated for LHR/ICAO corridors; standby medical escorts assigned.',
    effectiveFromUtc: new Date(Date.now() - 86400000).toISOString(),
    effectiveToUtc: new Date(Date.now() + 30 * 86400000).toISOString(),
    publishedBy: 'Medical Operations',
  },
];

function toUtcDateString(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

async function seedNotices() {
  if (!isDatabaseConnected()) {
    try {
      await closeDB();
    } catch (cleanupError) {
      // Best-effort cleanup; never mask the database-unavailable error.
    }
    throw new Error('Database unavailable: notices seed requires a live MySQL connection. Aborting before any writes.');
  }

  const pool = getPool();
  let inserted = 0;
  let skipped = 0;

  try {
    for (const notice of INITIAL_NOTICES) {
      const [existing] = await pool.query('SELECT notice_number FROM notices WHERE notice_number = ?', [notice.noticeNumber]);
      if (existing.length > 0) {
        skipped += 1;
        continue;
      }

      const [result] = await pool.execute(
        `INSERT INTO notices (notice_number, title, category, severity, status, summary, body, effective_from_utc, effective_to_utc, published_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          notice.noticeNumber,
          notice.title,
          notice.category,
          notice.severity,
          notice.status,
          notice.summary,
          notice.body,
          toUtcDateString(notice.effectiveFromUtc),
          toUtcDateString(notice.effectiveToUtc),
          notice.publishedBy,
        ]
      );

      if (result && result.affectedRows > 0) {
        inserted += 1;
      }
    }

    // Independent read-back verification: both expected notices must exist and match expected data.
    for (const notice of INITIAL_NOTICES) {
      const [rows] = await pool.query('SELECT * FROM notices WHERE notice_number = ?', [notice.noticeNumber]);
      const record = rows[0];
      if (!record) {
        throw new Error(`Notices persistence verification failed: expected notice ${notice.noticeNumber} was not found after seeding.`);
      }
      if (record.title !== notice.title || record.category !== notice.category || record.severity !== notice.severity || record.status !== notice.status) {
        throw new Error(`Notices persistence verification failed: persisted data mismatch for notice ${notice.noticeNumber}.`);
      }
    }

    await closeDB();
    return { inserted, skipped, verified: true };
  } catch (err) {
    try {
      await closeDB();
    } catch (cleanupError) {
      // Best-effort cleanup; never mask the original seeding error.
    }
    throw err;
  }
}

async function main() {
  if (!config.db.host || !config.db.user) {
    console.error('❌ Database host or user is not configured in backend/.env!');
    process.exit(1);
  }

  await connectDB();
  if (!isDatabaseConnected()) {
    console.error('❌ Failed to establish live connection to MySQL.');
    await closeDB();
    process.exit(1);
  }

  const result = await seedNotices();
  console.log(`✅ Notices seeding complete. Inserted: ${result.inserted}. Skipped existing: ${result.skipped}. Verified: ${result.verified}.`);
  process.exit(0);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`❌ Notices seeding failed: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { seedNotices };
