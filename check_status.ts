
async function checkStatus() {
  const BASE_URL = 'http://localhost:3000';
  try {
    const res = await fetch(`${BASE_URL}/api/status`);
    const data = await res.json();
    console.log('Status:', JSON.stringify(data, null, 2));
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}
checkStatus();
