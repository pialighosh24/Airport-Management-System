const { connectDB, closeDB, getDatabaseHealth } = require('../config/database');

async function verify() {
  console.log('🩺 Verifying AeroNexus Database Connectivity...');
  await connectDB();
  const health = getDatabaseHealth();
  console.log('Status Result:', JSON.stringify(health, null, 2));
  await closeDB();
  process.exit(0);
}

verify();
