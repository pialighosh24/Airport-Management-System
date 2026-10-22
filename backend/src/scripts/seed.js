const config = require('../config');
const { connectDB, closeDB, isDatabaseConnected, getPool } = require('../config/database');
const Flight = require('../models/Flight');
const User = require('../models/User');
const Disruption = require('../models/Disruption');
const { DEMO_FLIGHTS } = require('../data/demoData');

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
