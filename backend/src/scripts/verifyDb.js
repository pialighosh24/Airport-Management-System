/**
 * AeroNexus — MySQL Connection & Database Verification Script
 * 
 * Tests and verifies:
 * 1. Live connectivity to MySQL 8.0 server
 * 2. Presence of "aeronexus" database
 * 3. Presence of "flights" table
 * 4. Record count and data integrity
 * 
 * Usage:
 *   node src/scripts/verifyDb.js
 *   npm run db:verify
 */

const config = require('../config');
const { connectDB, closeDB, isDatabaseConnected, getPool } = require('../config/database');
const Flight = require('../models/Flight');

async function verifyDatabase() {
  console.log('====================================================');
  console.log('🔍 AeroNexus — MySQL 8.0 Connection Verification');
  console.log('====================================================');
  console.log(`📡 Target Host: ${config.db.host}:${config.db.port}`);
  console.log(`👤 Database User: ${config.db.user}`);
  console.log(`🗄️  Target DB:   ${config.db.database}`);
  console.log(`🔑 Password:     ${config.db.password ? '[CONFIGURED IN .ENV]' : '[NOT SET / EMPTY]'}`);
  console.log('----------------------------------------------------');

  try {
    const result = await connectDB();

    if (!isDatabaseConnected()) {
      console.log('\n❌ RESULT: MySQL is NOT currently connected.');
      console.log(`   Status:  ${result.message}`);
      console.log('\n👉 Next steps to connect:');
      console.log('   1. Open "server/.env" in your editor.');
      console.log('   2. Set DB_PASSWORD=<your_mysql_password>');
      console.log('   3. Run "npm run seed" to initialize table and seed demo flights.');
      console.log('   4. Re-run "npm run db:verify" to verify live connection.');
      console.log('====================================================');
      process.exit(1);
    }

    console.log('\n✅ RESULT: Live MySQL connection established successfully!');

    // Check table
    const pool = getPool();
    const [tableRows] = await pool.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'flights'`,
      [config.db.database]
    );

    if (tableRows.length === 0) {
      console.log('⚠️  Notice: "flights" table does not exist yet in "aeronexus".');
      console.log('👉 Run "npm run seed" to create the table and seed demo records.');
    } else {
      console.log('✅ Table "flights" exists.');
      const count = await Flight.countDocuments();
      console.log(`📊 Total flight records in MySQL: ${count}`);

      if (count > 0) {
        const sample = await Flight.findOne({ flightNumber: 'AA100' });
        if (sample) {
          console.log(`✅ Sample record verified: ${sample.flightNumber} (${sample.airline.name}) -> ${sample.origin.iata} to ${sample.destination.iata}`);
          console.log(`   Data freshness: ${sample.freshness.status} (Demo flag: ${sample.isDemo})`);
        }
      } else {
        console.log('ℹ️  Table is empty. Run "npm run seed" to populate test data.');
      }
    }

    console.log('====================================================');
    await closeDB();
    process.exit(0);
  } catch (err) {
    console.error(`❌ Unexpected verification error: ${err.message}`);
    await closeDB();
    process.exit(1);
  }
}

verifyDatabase();
