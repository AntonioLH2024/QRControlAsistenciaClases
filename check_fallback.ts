
import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive',
  ],
});

const sheets = google.sheets({ version: 'v4', auth });

async function checkSheet() {
  const spreadsheetId = '1_Pa8Cazq8KZjHnHz-rAoHr9kAhpMchf_UQaaL5ndRgg';
  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
    });
    console.log('✅ Spreadsheet found:', response.data.properties?.title);
    console.log('Sheets:', response.data.sheets?.map(s => s.properties?.title));
  } catch (error: any) {
    console.error('❌ Error checking spreadsheet:', error.message);
    if (error.response?.data) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

checkSheet();
