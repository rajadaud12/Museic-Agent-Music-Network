const fs = require('fs');
const envContent = fs.readFileSync('.env.local', 'utf8');
let apiKey = '';
envContent.split('\n').forEach(line => {
  if (line.startsWith('ELEVENLABS_API_KEY=')) {
    apiKey = line.replace('ELEVENLABS_API_KEY=', '').trim().replace(/^["']|["']$/g, '');
  }
});

async function testAuthHeaders() {
  console.log('Testing xi-api-key:');
  const res1 = await fetch('https://api.elevenlabs.io/v1/user', {
    headers: { 'xi-api-key': apiKey }
  });
  console.log('Status xi-api-key:', res1.status, await res1.text());

  console.log('\nTesting Bearer Authorization:');
  const res2 = await fetch('https://api.elevenlabs.io/v1/user', {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  console.log('Status Bearer:', res2.status, await res2.text());
}

testAuthHeaders();
