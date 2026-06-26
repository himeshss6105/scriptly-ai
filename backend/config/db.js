const mongoose = require('mongoose');
const dns = require('node:dns');

// Some Windows setups (and certain ISPs/routers/VPNs) can't resolve the
// special DNS SRV record that mongodb+srv:// URIs depend on, even though
// every other site works fine. Forcing Node to ask a public DNS resolver
// directly sidesteps that, instead of depending on the OS resolver.
dns.setServers(['8.8.8.8', '1.1.1.1']);

async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error('✗ MONGO_URI is not set in your .env file.');
    console.error('  Copy .env.example to .env and add your MongoDB Atlas connection string.');
    process.exit(1); // Don't start without a database — auth and history require it
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000, // Fail fast if Atlas is unreachable
    });
    console.log('✓ MongoDB Atlas connected');
  } catch (err) {
    console.error('✗ MongoDB Atlas connection failed:', err.message);
    if (err.message.includes('querySrv')) {
      console.error('  This is a DNS issue on this machine, not your Atlas setup —');
      console.error('  your network/ISP/router is blocking the SRV lookup that');
      console.error('  mongodb+srv:// needs. Two fixes, either works:');
      console.error('  1) Restart with a public DNS already applied (see README), or');
      console.error('  2) Swap MONGO_URI in .env for the non-SRV connection string');
      console.error('     from Atlas (Connect → Drivers → toggle off "SRV Connection String").');
    } else {
      console.error('  Check your MONGO_URI, IP whitelist (Network Access in Atlas), and credentials.');
    }
    process.exit(1);
  }
}

module.exports = connectDB;
