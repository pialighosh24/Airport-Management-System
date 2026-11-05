/**
 * AeroNexus — MySQL 8.0 Database Seeder Script
 * 
 * Populates MySQL database "aeronexus" with standard demo flight records.
 * 
 * Usage:
 *   npm run seed
 * 
 * Note: Configured via environment variables in server/.env (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME).
 */

const config = require('../config');
const { connectDB, closeDB, isDatabaseConnected } = require('../config/database');
const Flight = require('../models/Flight');
const { DEMO_FLIGHTS } = require('../data/demoData');

async function seedDatabase() {
  console.log('====================================================');
  console.log('🌱 AeroNexus — MySQL 8.0 Database Seeder');
  console.log('====================================================');

  if (!config.db.host || !config.db.user) {
    console.error('❌ Database host or user is not configured in server/.env!');
    console.log('👉 Please configure DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME in server/.env.');
    process.exit(1);
  }

  try {
    console.log(`🔌 Connecting to MySQL (${config.db.host}:${config.db.port}/${config.db.database})...`);
    await connectDB();

    if (!isDatabaseConnected()) {
      console.error('❌ Failed to establish live connection to MySQL.');
      console.log('👉 Please check your credentials in server/.env (e.g. DB_PASSWORD).');
      console.log('   Ensure the MySQL 8.0 server is running and database "aeronexus" exists.');
      process.exit(1);
    }

    console.log('✅ Connected to MySQL successfully.');

    console.log('🔨 Ensuring "flights" table exists...');
    await Flight.createTableIfNotExists();
    console.log('✅ "flights" table verified.');

    console.log('🧹 Clearing existing demo flight records...');
    const deleteResult = await Flight.deleteMany({ isDemo: true });
    console.log(`   Removed ${deleteResult.deletedCount} old demo records.`);

    console.log(`✈️  Inserting ${DEMO_FLIGHTS.length} demo flight records into "flights" table...`);
    const inserted = await Flight.insertMany(DEMO_FLIGHTS);
    console.log(`✅ Successfully seeded ${inserted.length} demo flights into MySQL!`);

    console.log('\n====================================================');
    console.log('⚠️  IMPORTANT DISCLAIMER ON SEEDED DATA:');
    console.log('All inserted records are strictly SIMULATED DEMO DATA for testing.');
    console.log('They do NOT represent live operational flight telemetry.');
    console.log('====================================================');

    console.log('\nSample Seeded Flight:');
    console.log(`   Flight Number: ${inserted[0].flightNumber} (${inserted[0].callsign})`);
    console.log(`   Route:         ${inserted[0].origin.iata} -> ${inserted[0].destination.iata}`);
    console.log(`   Status:        ${inserted[0].status} (${inserted[0].freshness.status})`);
    console.log(`   Data Source:   ${inserted[0].dataSource} (Demo: ${inserted[0].isDemo})`);
    console.log('====================================================');

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
