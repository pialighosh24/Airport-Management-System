const config = require('../config');
const { connectDB, closeDB, isDatabaseConnected, getPool } = require('../config/database');
const Flight = require('../models/Flight');
const User = require('../models/User');
const Disruption = require('../models/Disruption');
const Notice = require('../models/Notice');
const { DEMO_FLIGHTS } = require('../data/demoData');

function toUtcDateString(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

async function seedNotices() {
  if (!isDatabaseConnected()) {
    console.log('⚠️  Skipping notices seeding: database not connected.');
    return;
  }

  const pool = getPool();

  const initialNotices = [
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

  for (const notice of initialNotices) {
    const [result] = await pool.execute(
      `INSERT IGNORE INTO notices (notice_number, title, category, severity, status, summary, body, effective_from_utc, effective_to_utc, published_by)
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
    console.log(`   ${result.affectedRows > 0 ? '✅ Inserted' : '⏭️  Skipped existing'} notice ${notice.noticeNumber}`);
  }
}

async function seedDatabase() {
  console.log('====================================================');
  console.log('🌱 AeroNexus — MySQL 8.0 Comprehensive Database Seeder');
  console.log('====================================================');

  if (!config.db.host || !config.db.user) {
    console.error('❌ Database host or user is not configured in backend/.env!');
    process.exit(1);
  }

  try {
    console.log(`🔌 Connecting to MySQL (${config.db.host}:${config.db.port}/${config.db.database})...`);
    await connectDB();

    if (!isDatabaseConnected()) {
      console.error('❌ Failed to establish live connection to MySQL.');
      process.exit(1);
    }

    console.log('✅ Connected to MySQL successfully.');
    const pool = getPool();

    // Create flights table
    console.log('🔨 Ensuring "flights" table exists...');
    await Flight.createTableIfNotExists();
    console.log('✅ "flights" table verified.');

    // Clear existing demo flights
    console.log('🧹 Clearing existing demo flight records...');
    const deleteResult = await Flight.deleteMany({ isDemo: true });
    console.log(`   Removed ${deleteResult.deletedCount} old demo records.`);

    // Seed demo flights
    console.log(`✈️  Inserting ${DEMO_FLIGHTS.length} demo flight records into "flights" table...`);
    const inserted = await Flight.insertMany(DEMO_FLIGHTS);
    console.log(`✅ Successfully seeded ${inserted.length} demo flights into MySQL!`);

    // Seed flight operations notices (initial content only; idempotent via unique notice_number)
    console.log(`🌱 Seeding flight operations notices...`);
    await seedNotices();

    await closeDB();
    console.log('💤 MySQL connection closed. Seeding complete!');
    process.exit(0);
  } catch (err) {
    console.error(`❌ Seeding failed: ${err.message}`);
    await closeDB();
    process.exit(1);
  }
}

seedDatabase();
