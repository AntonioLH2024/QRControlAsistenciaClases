import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "default-secret-change-me";

// In-memory store for sessions (In a real app, use Firestore)
const sessionsStore = new Map<string, { 
  sheetId: string, 
  attendees: Set<string>,
  location?: { latitude: number, longitude: number },
  maxDistance: number
}>();

// Helper to calculate distance in meters
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Google Sheets Setup
const GOOGLE_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

// No fallback ID by default to avoid "entity not found" errors if it's deleted
const FALLBACK_SPREADSHEET_ID = process.env.DEFAULT_SPREADSHEET_ID || null;

if (!GOOGLE_EMAIL || !GOOGLE_KEY) {
  console.error("❌ CRITICAL: Google Service Account credentials missing in environment variables.");
} else {
  const hasHeader = GOOGLE_KEY.includes("BEGIN PRIVATE KEY");
  const hasFooter = GOOGLE_KEY.includes("END PRIVATE KEY");
  console.log(`🔑 Credentials detected. Email: ${GOOGLE_EMAIL}, Key length: ${GOOGLE_KEY.length} chars. Header: ${hasHeader}, Footer: ${hasFooter}`);
  
  if (!hasHeader || !hasFooter) {
    console.warn("⚠️ WARNING: Private key seems to be missing standard PEM headers/footers.");
  }
}

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: GOOGLE_EMAIL,
    private_key: GOOGLE_KEY?.replace(/\\n/g, '\n').replace(/"/g, '').trim(),
  },
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/drive.file'
  ],
});

const sheets = google.sheets({ version: 'v4', auth });

let lastGoogleTestResult: any = null;

async function testGoogleConnection() {
  try {
    if (!GOOGLE_EMAIL) {
      lastGoogleTestResult = { success: false, error: "Email no configurado" };
      return;
    }
    
    console.log(`📡 Testing Google API connection for: ${GOOGLE_EMAIL}...`);
    const drive = google.drive({ version: 'v3', auth });
    
    // Test Sheets API creation
    const spreadsheet = await sheets.spreadsheets.create({
      requestBody: { properties: { title: "Test Connection" } },
      fields: 'spreadsheetId'
    });
    console.log(`✅ Sheets API creation verified. Test ID: ${spreadsheet.data.spreadsheetId}`);
    
    // Cleanup
    await drive.files.delete({ fileId: spreadsheet.data.spreadsheetId! });
    
    lastGoogleTestResult = { success: true, timestamp: new Date().toISOString() };
  } catch (error: any) {
    const msg = error.response?.data?.error?.message || error.message;
    console.error("❌ Google Connection Test Failed:", msg);
    lastGoogleTestResult = { success: false, error: msg, timestamp: new Date().toISOString() };
  }
}

async function createAttendanceSheet(className: string) {
  try {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      console.warn("Google credentials not provided. Skipping sheet creation.");
      return "mock-sheet-id";
    }

    const resource = {
      properties: {
        title: `Asistencia_${className}_${new Date().toISOString().replace(/[:.]/g, '-')}`,
      },
      sheets: [
        {
          properties: {
            title: 'Asistencia',
          },
        },
      ],
    };
    
    const spreadsheet = await sheets.spreadsheets.create({
      requestBody: resource,
      fields: 'spreadsheetId',
    });

    const spreadsheetId = spreadsheet.data.spreadsheetId;
    console.log(`✅ Created new spreadsheet: ${spreadsheetId}`);

    // Add headers
    await sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId!,
      range: "'Asistencia'!A1:I1",
      valueInputOption: 'RAW',
      requestBody: {
        values: [['Timestamp', 'Nombre', 'Apellidos', 'DNI', 'FechaClase', 'HoraClase', 'IDClase', 'IP', 'Dispositivo']],
      },
    });

    // Make the sheet readable by anyone with the link (optional, for the teacher)
    try {
      console.log(`📡 Setting permissions for spreadsheet: ${spreadsheetId}`);
      const drive = google.drive({ version: 'v3', auth });
      await drive.permissions.create({
        fileId: spreadsheetId!,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
      console.log("✅ Permissions set to 'anyone reader'.");
    } catch (e: any) {
      console.warn("⚠️ Could not set permissions on sheet:", e.message);
      if (e.response?.data) {
        console.warn("Permission Error Details:", JSON.stringify(e.response.data));
      }
    }

    return spreadsheetId;
  } catch (error: any) {
    console.error("❌ Error creating Google Sheet!");
    console.error(`Message: ${error.message}`);
    if (error.response?.data) {
      console.error("Full Google API Error Response:", JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  
  // Health check for Google API
  app.get("/api/health/google", async (req, res) => {
    try {
      const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      if (!email) {
        return res.json({ success: false, status: "Not Configured", error: "Email no configurado" });
      }
      
      const drive = google.drive({ version: 'v3', auth });
      await drive.about.get({ fields: 'user' });
      
      res.json({ success: true, status: "Ready", email: email.split('@')[0] + "@..." });
    } catch (error: any) {
      res.json({ 
        success: false, 
        status: "Error", 
        error: error.message,
        details: error.response?.data?.error?.message || error.message
      });
    }
  });

  // Detailed status endpoint for Google Sheets
  app.get("/api/status", async (req, res) => {
    const status: any = {
      googleConfigured: !!GOOGLE_EMAIL && !!GOOGLE_KEY,
      email: GOOGLE_EMAIL,
      keyLength: GOOGLE_KEY?.length || 0,
      sheetsApi: "unknown",
      driveApi: "unknown"
    };

    try {
      if (!status.googleConfigured) {
        return res.json({ success: false, ...status, error: "Credenciales de Google no configuradas" });
      }

      // Add the background test result
      status.backgroundTest = lastGoogleTestResult;
      
      // Test Drive API
      try {
        const drive = google.drive({ version: 'v3', auth });
        await drive.about.get({ fields: 'user' });
        status.driveApi = "ok";
      } catch (e: any) {
        status.driveApi = "error: " + e.message;
      }

      // Test Sheets API (list files to see if we can at least connect)
      try {
        const drive = google.drive({ version: 'v3', auth });
        const files = await drive.files.list({
          q: "mimeType='application/vnd.google-apps.spreadsheet'",
          pageSize: 1,
          fields: 'files(id, name)'
        });
        status.sheetsApi = "ok";
        status.sampleFile = files.data.files?.[0] || "none found";
      } catch (e: any) {
        status.sheetsApi = "error: " + e.message;
      }

      const overallSuccess = status.driveApi === "ok" && status.sheetsApi === "ok";
      res.json({ success: overallSuccess, ...status });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Create a new class
  app.post("/api/classes", async (req, res) => {
    let sheetId = "mock-sheet-id";
    let googleError = null;
    const { name, location, spreadsheetId: customSheetId, maxDistance = 100 } = req.body;
    const classId = uuidv4();

    try {
      // 1. Get or Create Google Sheet
      if (customSheetId) {
        sheetId = customSheetId;
        // Verify access to custom sheet
        try {
          await sheets.spreadsheets.get({ spreadsheetId: sheetId });
          console.log(`✅ Verified access to custom sheet: ${sheetId}`);
        } catch (err: any) {
          console.error(`❌ Custom sheet ${sheetId} not found or inaccessible:`, err.message);
          throw new Error(`La hoja de cálculo proporcionada no existe o no es accesible por el sistema. Asegúrate de haber compartido la hoja con: ${GOOGLE_EMAIL}`);
        }
      } else {
        try {
          console.log(`📡 Creating new attendance sheet for: ${name}`);
          sheetId = await createAttendanceSheet(name);
        } catch (err: any) {
          const detailedError = err.response?.data?.error?.message || err.message;
          console.error("⚠️ Failed to create new sheet:", detailedError);
          googleError = detailedError;
          
          if (FALLBACK_SPREADSHEET_ID) {
            console.log("Using fallback spreadsheet ID");
            sheetId = FALLBACK_SPREADSHEET_ID;
          } else {
            sheetId = "mock-sheet-id";
          }
        }
      }
      
      // 2. Store session info (Security: sheetId stays on server)
      sessionsStore.set(classId, { 
        sheetId: sheetId!, 
        attendees: new Set(), 
        location,
        maxDistance
      });
      
      // 3. Generate token
      const token = jwt.sign({ classId, type: 'attendance' }, JWT_SECRET, { expiresIn: '15m' });
      
      res.json({
        success: true,
        classId,
        token,
        name,
        sheetUrl: sheetId !== "mock-sheet-id" ? `https://docs.google.com/spreadsheets/d/${sheetId}/edit` : null,
        googleError,
        expiresAt: Date.now() + 15 * 60 * 1000
      });
    } catch (error: any) {
      console.error("Error creating class:", error);
      res.status(500).json({ success: false, error: "Error crítico al crear la clase", details: error.message });
    }
  });

  // Register attendance
  app.post("/api/checkin", async (req, res) => {
    try {
      const { token, name, surname, dni, classId, location } = req.body;
      
      // Basic validation
      if (!name || !surname || !dni || !classId || !token) {
        return res.status(400).json({ success: false, error: "Faltan campos obligatorios (nombre, dni, etc.)" });
      }

      // Get clean IP address
      const forwarded = req.headers['x-forwarded-for'];
      const ip = typeof forwarded === 'string' ? forwarded.split(',')[0] : req.socket.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      
      console.log(`📥 Checkin attempt: ${name} ${surname} (${dni}) for class ${classId}`);

      // 1. Validate token
      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET) as any;
      } catch (err: any) {
        console.error("❌ JWT Verification Error:", err.message);
        return res.status(401).json({ success: false, error: "QR caducado o inválido", details: err.message });
      }
      
      if (decoded.classId !== classId) {
        console.error(`❌ Class ID mismatch. Token: ${decoded.classId}, Body: ${classId}`);
        return res.status(400).json({ success: false, error: "El código QR no pertenece a esta clase" });
      }

      // 2. Lookup session
      const session = sessionsStore.get(classId);
      if (!session) {
        console.error(`❌ Session not found for classId: ${classId}`);
        return res.status(404).json({ success: false, error: "La sesión ha expirado o no existe" });
      }

      // 3. Validate Geolocation (Anti-fraud)
      if (session.location) {
        if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
          return res.status(403).json({ 
            success: false, 
            error: "La geolocalización es obligatoria para esta clase. Por favor, activa el GPS." 
          });
        }

        const distance = getDistance(
          session.location.latitude, 
          session.location.longitude, 
          location.latitude, 
          location.longitude
        );
        
        console.log(`📍 Distance check: ${Math.round(distance)}m (Limit: ${session.maxDistance}m)`);

        if (distance > session.maxDistance) {
          return res.status(403).json({ 
            success: false, 
            error: `Estás demasiado lejos del aula (${Math.round(distance)}m). El límite permitido es ${session.maxDistance}m.` 
          });
        }
      }

      // 4. Check for duplicates
      if (session.attendees.has(dni)) {
        console.warn(`⚠️ Duplicate checkin attempt for DNI: ${dni}`);
        return res.status(400).json({ success: false, error: "Este DNI ya ha registrado su asistencia en esta sesión" });
      }

      // 5. Mark as registered in memory FIRST (Ensures teacher sees it even if Sheets fails)
      session.attendees.add(dni);

      // 6. Write to Google Sheets
      if (GOOGLE_EMAIL && session.sheetId && session.sheetId !== "mock-sheet-id") {
        const now = new Date();
        const rowData = [
          now.toISOString(),
          name,
          surname,
          dni,
          now.toLocaleDateString(),
          now.toLocaleTimeString(),
          classId,
          ip,
          userAgent
        ];

        // Try common sheet names
        const sheetNames = ['Asistencia', 'Hoja 1', 'Sheet1'];
        let success = false;
        let lastError = null;

        for (const sheetName of sheetNames) {
          try {
            await sheets.spreadsheets.values.append({
              spreadsheetId: session.sheetId,
              range: `'${sheetName}'!A:A`,
              valueInputOption: 'RAW',
              requestBody: {
                values: [rowData],
              },
            });
            console.log(`✅ Successfully appended to Google Sheet: ${session.sheetId} (Sheet: ${sheetName})`);
            success = true;
            break;
          } catch (err: any) {
            lastError = err;
            console.warn(`⚠️ Failed to append to sheet "${sheetName}": ${err.message}`);
          }
        }

        // Final fallback: Discover actual sheet names if common ones fail
        if (!success) {
          try {
            console.log("🔍 Attempting to discover actual sheet names as fallback...");
            const spreadsheet = await sheets.spreadsheets.get({
              spreadsheetId: session.sheetId,
            });
            const actualNames = spreadsheet.data.sheets?.map(s => s.properties?.title).filter(Boolean) as string[] || [];
            
            for (const sheetName of actualNames) {
              if (sheetNames.includes(sheetName)) continue; // Already tried
              try {
                await sheets.spreadsheets.values.append({
                  spreadsheetId: session.sheetId,
                  range: `'${sheetName}'!A:A`,
                  valueInputOption: 'RAW',
                  requestBody: {
                    values: [rowData],
                  },
                });
                console.log(`✅ Successfully appended to discovered sheet: ${session.sheetId} (Sheet: ${sheetName})`);
                success = true;
                break;
              } catch (err: any) {
                lastError = err;
                console.warn(`⚠️ Failed to append to discovered sheet "${sheetName}": ${err.message}`);
              }
            }
          } catch (discoveryErr: any) {
            console.error("❌ Discovery failed:", discoveryErr.message);
          }
        }

        if (!success) {
          console.error("❌ Error appending to Google Sheet after trying all names:", lastError?.message);
          
          let specificError = "Error al guardar en Google Sheets";
          if (lastError?.response?.data?.error?.message) {
            specificError = `Google Sheets Error: ${lastError.response.data.error.message}`;
          }

          // Rollback memory if sheet fails
          session.attendees.delete(dni);

          return res.status(500).json({ 
            success: false, 
            error: specificError,
            details: lastError?.response?.data || lastError?.message
          });
        }
      } else if (session.sheetId === "mock-sheet-id") {
        console.log("ℹ️ Registered in memory only (Mock mode)");
      } else {
        // If it's not mock but credentials are missing
        session.attendees.delete(dni);
        return res.status(500).json({ 
          success: false, 
          error: "Configuración de Google Sheets incompleta en el servidor" 
        });
      }
      
      res.json({ 
        success: true, 
        message: "Asistencia registrada correctamente"
      });
    } catch (error: any) {
      console.error("🔥 Critical Error in checkin handler:", error);
      res.status(500).json({ 
        success: false, 
        error: "Error interno del servidor al procesar la asistencia",
        details: error.message 
      });
    }
  });

  // Get attendees for a class
  app.get("/api/classes/:classId/attendees", (req, res) => {
    const { classId } = req.params;
    const session = sessionsStore.get(classId);
    if (!session) {
      return res.status(404).json({ success: false, error: "Sesión no encontrada" });
    }
    
    // Convert Set to array of mock records for the UI
    // In a real app, we'd store the full record in the Map or Firestore
    res.json({ 
      success: true, 
      count: session.attendees.size,
      attendees: Array.from(session.attendees).map(dni => ({ dni, name: "Alumno", surname: "Registrado" }))
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    testGoogleConnection();
  });
}

startServer();
