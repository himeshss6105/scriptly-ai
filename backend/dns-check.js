// Run this with: node dns-check.js
// It tells you exactly whether the querySrv error is a DNS problem on this
// machine (almost always the case) — no MongoDB driver involved at all.

const dns = require('node:dns');

const host = '_mongodb._tcp.cluster0.utt1hwi.mongodb.net';

function tryResolve(label, resolver) {
  return new Promise((resolve) => {
    resolver.resolveSrv(host, (err, addresses) => {
      if (err) {
        console.log(`✗ ${label}: FAILED — ${err.code}`);
      } else {
        console.log(`✓ ${label}: OK — found ${addresses.length} server(s)`);
      }
      resolve();
    });
  });
}

(async () => {
  console.log('Checking SRV record resolution for your Atlas cluster...\n');

  console.log('1) Using your system/ISP DNS:');
  await tryResolve('System DNS', dns);

  console.log('\n2) Using Google DNS (8.8.8.8):');
  const googleResolver = new dns.Resolver();
  googleResolver.setServers(['8.8.8.8']);
  await tryResolve('Google DNS', googleResolver);

  console.log('\n3) Using Cloudflare DNS (1.1.1.1):');
  const cfResolver = new dns.Resolver();
  cfResolver.setServers(['1.1.1.1']);
  await tryResolve('Cloudflare DNS', cfResolver);

  console.log('\n--- What this means ---');
  console.log('If (1) failed but (2) or (3) succeeded: your ISP/router/VPN is');
  console.log('blocking SRV lookups. The fix already applied in config/db.js');
  console.log('(forcing 8.8.8.8 / 1.1.1.1) should solve it — just run the app again.');
  console.log('\nIf ALL THREE failed: something is blocking outbound DNS/network');
  console.log('on this machine entirely (firewall, antivirus, VPN, or captive');
  console.log('network). Try temporarily disabling VPN/firewall and rerun this.');
})();
