// Test script to verify Discord endpoint is working
// Run: node test-discord-endpoint.js

const https = require('https');

const testPing = async () => {
  const data = JSON.stringify({ type: 1 });
  
  const options = {
    hostname: 'pnl.onl',
    port: 443,
    path: '/api/discord/interactions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
      // Mock signature headers (won't verify but will test endpoint)
      'x-signature-ed25519': '0'.repeat(128),
      'x-signature-timestamp': Date.now().toString(),
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        console.log('Response:', body);
        resolve({ status: res.statusCode, body });
      });
    });

    req.on('error', (error) => {
      console.error('Error:', error);
      reject(error);
    });

    req.write(data);
    req.end();
  });
};

testPing()
  .then((result) => {
    if (result.status === 200 && result.body.includes('"type":1')) {
      console.log('✅ Endpoint is working!');
    } else {
      console.log('❌ Endpoint returned unexpected response');
    }
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
  });

