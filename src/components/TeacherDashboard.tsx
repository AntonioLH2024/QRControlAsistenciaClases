import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, QrCode, Users, Download, Clock, CheckCircle2, Loader2, ExternalLink, Copy, Check, ShieldCheck, ArrowLeft, Settings as SettingsIcon, X, AlertCircle } from 'lucide-react';
import QRCode from 'qrcode';
import { ClassSession, AttendanceRecord } from '../types';

interface TeacherDashboardProps {
  onNavigate?: (path: string) => void;
}

export default function TeacherDashboard({ onNavigate }: TeacherDashboardProps) {
  const [activeSession, setActiveSession] = useState<ClassSession & { sheetUrl?: string } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attendees, setAttendees] = useState<AttendanceRecord[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [googleStatus, setGoogleStatus] = useState<{ success: boolean, sheetsApi: string, driveApi: string, error?: string } | null>(null);
  
  // Settings state
  const [config, setConfig] = useState({
    spreadsheetId: localStorage.getItem('pref_spreadsheet_id') || '',
    maxDistance: parseInt(localStorage.getItem('pref_max_distance') || '100'),
    useExistingSheet: localStorage.getItem('pref_use_existing') === 'true',
    expirationMinutes: parseInt(localStorage.getItem('pref_expiration_minutes') || '15')
  });

  const saveConfig = (newConfig: typeof config) => {
    setConfig(newConfig);
    localStorage.setItem('pref_spreadsheet_id', newConfig.spreadsheetId);
    localStorage.setItem('pref_max_distance', newConfig.maxDistance.toString());
    localStorage.setItem('pref_use_existing', newConfig.useExistingSheet.toString());
    localStorage.setItem('pref_expiration_minutes', newConfig.expirationMinutes.toString());
    setShowSettings(false);
  };

  const resetSession = () => {
    if (window.confirm("¿Estás seguro de que deseas finalizar esta sesión? Los alumnos ya no podrán registrarse.")) {
      setActiveSession(null);
      setQrDataUrl('');
      setAttendees([]);
      if (onNavigate) onNavigate('/');
    }
  };

  const createClass = async () => {
    setIsLoading(true);
    setError(null);
    
    // Check google status first if not already checked or if it was an error
    if (!googleStatus || !googleStatus.success) {
      try {
        const hRes = await fetch('/api/status');
        const hData = await hRes.json();
        setGoogleStatus(hData);
        // We don't block creation anymore, just warn
      } catch (e) {
        console.warn("Could not check Google status");
      }
    }

    try {
      // Get location if possible
      let location = null;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        location = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        };
      } catch (e) {
        console.warn("Could not get teacher location:", e);
      }

      const response = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: `Clase ${new Date().toLocaleDateString()}`,
          location,
          spreadsheetId: config.useExistingSheet ? config.spreadsheetId : null,
          maxDistance: config.maxDistance,
          expirationMinutes: config.expirationMinutes
        })
      });
      const data = await response.json();
      if (data.success) {
        setActiveSession(data);
        // Generate QR
        const appUrl = window.location.origin;
        const qrUrl = `${appUrl}/checkin?idClase=${data.classId}&token=${data.token}`;
        const qr = await QRCode.toDataURL(qrUrl, {
          width: 400,
          margin: 2,
          color: {
            dark: '#141414',
            light: '#FFFFFF'
          }
        });
        setQrDataUrl(qr);
        
        // Calculate time left from expiresAt
        const expiresAt = data.expiresAt;
        const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
        setTimeLeft(remaining);
      } else {
        setError(data.error || "Error al crear la clase");
      }
    } catch (error: any) {
      console.error("Error creating class:", error);
      setError("Error de conexión con el servidor");
    } finally {
      setIsLoading(false);
    }
  };

  // Polling for attendees
  useEffect(() => {
    // Initial status check
    fetch('/api/status')
      .then(res => res.json())
      .then(data => setGoogleStatus(data))
      .catch(err => console.error("Status check failed", err));
  }, []);

  useEffect(() => {
    if (!activeSession) return;

    const poll = async () => {
      try {
        const response = await fetch(`/api/classes/${activeSession.classId}/attendees`);
        const data = await response.json();
        if (data.success) {
          setAttendees(data.attendees);
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    };

    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [activeSession]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const copyLink = () => {
    if (!activeSession) return;
    const url = `${window.location.origin}/checkin?idClase=${activeSession.classId}&token=${activeSession.token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-start gap-4">
          {activeSession && (
            <button 
              onClick={resetSession}
              className="mt-2 p-2 rounded-xl hover:bg-[#141414]/5 transition-colors text-[#141414]/60"
              title="Volver al inicio"
            >
              <ArrowLeft size={24} />
            </button>
          )}
          <div>
            <h1 className="text-4xl font-serif italic font-bold mb-2">Panel del Profesor</h1>
            <div className="flex items-center gap-4 mb-2">
              <p className="text-[#141414]/60 max-w-lg">
                {activeSession 
                  ? `Gestionando asistencia para: ${activeSession.name}`
                  : "Genera un código QR para que tus alumnos registren su asistencia. Los datos se guardarán automáticamente en Google Sheets."
                }
              </p>
              {googleStatus && !activeSession && (
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${googleStatus.success ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${googleStatus.success ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                  {googleStatus.success ? 'Google Conectado' : 'Google Error'}
                </div>
              )}
            </div>
          </div>
        </div>
        {!activeSession && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowSettings(true)}
              className="p-4 rounded-2xl bg-[#141414]/5 text-[#141414]/60 hover:bg-[#141414]/10 transition-all"
              title="Configuración"
            >
              <SettingsIcon size={24} />
            </button>
            <button
              onClick={createClass}
              disabled={isLoading}
              className="bg-[#5A5A40] text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-[#4A4A35] transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : <Plus size={20} />}
              Crear Nueva Clase
            </button>
          </div>
        )}
      </div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-start gap-3 text-red-700"
        >
          <AlertCircle className="shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <p className="font-bold text-sm">Error</p>
            <p className="text-sm opacity-90">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <X size={18} />
          </button>
        </motion.div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-serif italic font-bold">Configuración</h2>
              <button onClick={() => setShowSettings(false)} className="text-[#141414]/40 hover:text-[#141414]">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              {googleStatus?.email && (
                <div className="p-4 bg-[#F5F5F0] rounded-2xl border border-[#141414]/5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/40 block mb-1">Email de la Cuenta de Servicio</label>
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-[10px] bg-white px-2 py-1 rounded border border-[#141414]/10 flex-1 truncate">{googleStatus.email}</code>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(googleStatus.email);
                        alert("Email copiado al portapapeles");
                      }}
                      className="p-1.5 hover:bg-white rounded-lg transition-colors text-[#5A5A40]"
                      title="Copiar Email"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                  <p className="text-[9px] text-[#141414]/40 mt-2 italic">
                    Comparte tus hojas de cálculo con este email dándole permisos de **Editor**.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-[#141414]/40">Hoja de Cálculo</label>
                <div className="flex items-center gap-2 mb-2">
                  <input 
                    type="checkbox" 
                    id="useExisting" 
                    checked={config.useExistingSheet}
                    onChange={(e) => setConfig({...config, useExistingSheet: e.target.checked})}
                    className="w-4 h-4 accent-[#5A5A40]"
                  />
                  <label htmlFor="useExisting" className="text-sm font-medium">Usar hoja existente</label>
                </div>
                {config.useExistingSheet && (
                  <div className="space-y-2">
                    <input 
                      type="text" 
                      placeholder="ID de la Hoja (de la URL)"
                      value={config.spreadsheetId}
                      onChange={(e) => setConfig({...config, spreadsheetId: e.target.value})}
                      className="w-full p-4 rounded-xl bg-[#F5F5F0] border-none focus:ring-2 focus:ring-[#5A5A40] text-sm"
                    />
                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-[10px] text-amber-800">
                      <p className="font-bold mb-1">⚠️ Recordatorio Importante:</p>
                      <p>Debes compartir tu hoja de cálculo con el email de tu **Cuenta de Servicio** otorgándole permisos de **Editor**.</p>
                    </div>
                  </div>
                )}
                <p className="text-[10px] text-[#141414]/40 italic">
                  Si no se especifica o no se marca, se creará una hoja nueva para cada clase.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-[#141414]/40">Distancia Máxima (metros)</label>
                <input 
                  type="number" 
                  value={config.maxDistance}
                  onChange={(e) => setConfig({...config, maxDistance: parseInt(e.target.value) || 0})}
                  className="w-full p-4 rounded-xl bg-[#F5F5F0] border-none focus:ring-2 focus:ring-[#5A5A40] text-sm"
                />
                <p className="text-[10px] text-[#141414]/40 italic">
                  Radio permitido para que el alumno pueda registrarse.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-[#141414]/40">Tiempo de Expiración (minutos)</label>
                <input 
                  type="number" 
                  value={config.expirationMinutes}
                  onChange={(e) => setConfig({...config, expirationMinutes: parseInt(e.target.value) || 1})}
                  min="1"
                  max="120"
                  className="w-full p-4 rounded-xl bg-[#F5F5F0] border-none focus:ring-2 focus:ring-[#5A5A40] text-sm"
                />
                <p className="text-[10px] text-[#141414]/40 italic">
                  Duración de la validez del código QR.
                </p>
              </div>

              <button 
                onClick={() => saveConfig(config)}
                className="w-full bg-[#5A5A40] text-white py-4 rounded-2xl font-bold hover:bg-[#4A4A35] transition-all"
              >
                Guardar Cambios
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {activeSession ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* QR Display */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-8 rounded-[32px] shadow-xl shadow-black/5 border border-[#141414]/5 flex flex-col items-center text-center"
          >
            <div className="mb-6 w-full flex justify-between items-center">
              <div className="flex flex-col items-start gap-1">
                <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-[#5A5A40]">
                  <Clock size={16} />
                  <span>Expira en: {formatTime(timeLeft)}</span>
                </div>
                {activeSession.location && (
                  <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold uppercase tracking-tighter">
                    <ShieldCheck size={10} />
                    <span>Ubicación Verificada</span>
                  </div>
                )}
              </div>
              <div className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider">
                Activo
              </div>
            </div>

            <div className="bg-[#F5F5F0] p-4 rounded-2xl mb-6">
              {qrDataUrl && <img src={qrDataUrl} alt="QR Code" className="w-64 h-64" />}
            </div>

            {activeSession.sheetId === "mock-sheet-id" && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs flex items-start gap-3 text-left">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold mb-1">Modo de Reserva Activo</p>
                  <p className="opacity-80">
                    {activeSession.googleError 
                      ? `Error de Google: ${activeSession.googleError}`
                      : "No se pudo conectar con Google Sheets. La asistencia se guardará temporalmente en la memoria del servidor."
                    }
                  </p>
                </div>
              </div>
            )}

            <h3 className="text-xl font-bold mb-2">{activeSession.name}</h3>
            <p className="text-sm text-[#141414]/40 font-mono mb-6">ID: {activeSession.classId}</p>
            
            <div className="flex flex-col gap-3 w-full">
              <button 
                onClick={() => {
                  const link = document.createElement('a');
                  link.download = `QR_${activeSession.name}.png`;
                  link.href = qrDataUrl;
                  link.click();
                }}
                className="w-full border border-[#141414]/10 py-3 rounded-xl font-bold hover:bg-[#141414]/5 transition-colors flex items-center justify-center gap-2"
              >
                <Download size={18} />
                Descargar QR
              </button>
              <button 
                onClick={copyLink}
                className="w-full border border-[#141414]/10 py-3 rounded-xl font-bold hover:bg-[#141414]/5 transition-colors flex items-center justify-center gap-2"
              >
                {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                {copied ? "Enlace Copiado" : "Copiar Enlace Alumno"}
              </button>
            </div>
          </motion.div>

          {/* Live List */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-8 rounded-[32px] shadow-xl shadow-black/5 border border-[#141414]/5 flex flex-col"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#5A5A40]/10 flex items-center justify-center text-[#5A5A40]">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="font-bold">Alumnos Registrados</h3>
                  <p className="text-xs text-[#141414]/40 uppercase tracking-widest">En tiempo real</p>
                </div>
              </div>
              <span className="text-4xl font-serif italic font-bold">{attendees.length}</span>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[300px] space-y-4 pr-2 custom-scrollbar">
              {attendees.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-[#141414]/20 py-12">
                  <Users size={48} strokeWidth={1} className="mb-4" />
                  <p className="italic">Esperando registros...</p>
                </div>
              ) : (
                attendees.map((attendee, i) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={i}
                    className="flex items-center justify-between p-4 rounded-2xl bg-[#F5F5F0]/50 border border-[#141414]/5"
                  >
                    <div>
                      <p className="font-bold">{attendee.name} {attendee.surname}</p>
                      <p className="text-xs text-[#141414]/40 font-mono">{attendee.dni}</p>
                    </div>
                    <div className="text-emerald-500">
                      <CheckCircle2 size={20} />
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {activeSession.sheetUrl && (
              <a 
                href={activeSession.sheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 w-full bg-[#141414] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all"
              >
                <ExternalLink size={20} />
                Ver en Google Sheets
              </a>
            )}
          </motion.div>
          <div className="lg:col-span-2 flex justify-center pt-4">
            <button 
              onClick={resetSession}
              className="text-[#141414]/40 hover:text-[#141414] font-bold flex items-center gap-2 transition-colors py-4 px-8 rounded-2xl hover:bg-[#141414]/5"
            >
              <ArrowLeft size={18} />
              Finalizar Sesión y Volver al Inicio
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: <QrCode />, title: "QR Dinámico", desc: "Genera códigos que expiran automáticamente para mayor seguridad." },
            { icon: <Users />, title: "Lista en Vivo", desc: "Mira quién se registra en tiempo real desde tu dispositivo." },
            { icon: <Download />, title: "Google Sheets", desc: "Exportación directa y automática a hojas de cálculo de Google." }
          ].map((feature, i) => (
            <div key={i} className="bg-white p-8 rounded-[32px] border border-[#141414]/5 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-[#5A5A40]/10 flex items-center justify-center text-[#5A5A40] mb-6">
                {feature.icon}
              </div>
              <h3 className="font-bold mb-2">{feature.title}</h3>
              <p className="text-sm text-[#141414]/60 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
