import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, CreditCard, Send, CheckCircle2, AlertCircle, Loader2, ArrowLeft, ShieldCheck } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function StudentCheckin() {
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    dni: ''
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [classId, setClassId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setClassId(params.get('idClase'));
    setToken(params.get('token'));
  }, []);

  const validateDNI = (dni: string) => {
    const dniRegex = /^[0-9]{8}[TRWAGMYFPDXBNJZSQVHLCKE]$/i;
    if (!dniRegex.test(dni)) return false;
    
    const letters = "TRWAGMYFPDXBNJZSQVHLCKE";
    const number = parseInt(dni.substring(0, 8), 10);
    const letter = dni.substring(8).toUpperCase();
    return letters[number % 23] === letter;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.surname || !formData.dni) {
      setErrorMessage("Todos los campos son obligatorios");
      setStatus('error');
      return;
    }

    if (!validateDNI(formData.dni)) {
      setErrorMessage("DNI no válido");
      setStatus('error');
      return;
    }

    setStatus('loading');
    try {
      // Get location
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
        console.warn("Could not get student location:", e);
      }

      const response = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          classId,
          token,
          location
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setStatus('success');
      } else {
        let msg = data.error || "Error al registrar asistencia";
        if (msg.includes("Requested entity was not found")) {
          msg = "Error: La hoja de cálculo de esta clase no existe o no es accesible. Por favor, avisa al profesor.";
        }
        setErrorMessage(msg);
        setStatus('error');
      }
    } catch (error) {
      setErrorMessage("Error de conexión con el servidor");
      setStatus('error');
    }
  };

  if (!classId || !token) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center text-red-500 mx-auto mb-6">
          <AlertCircle size={40} />
        </div>
        <h2 className="text-2xl font-bold mb-4">Enlace Inválido</h2>
        <p className="text-[#141414]/60">
          Este enlace no contiene la información necesaria para registrar la asistencia. 
          Por favor, escanea el código QR de nuevo.
        </p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto bg-white p-10 rounded-[40px] shadow-2xl shadow-emerald-500/10 border border-emerald-100 text-center"
      >
        <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-500 mx-auto mb-8">
          <CheckCircle2 size={48} />
        </div>
        <h2 className="text-3xl font-serif italic font-bold mb-4 text-emerald-900">¡Registro Completado!</h2>
        <p className="text-[#141414]/60 mb-8">
          Tu asistencia ha sido registrada correctamente en el sistema. Ya puedes cerrar esta ventana.
        </p>
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 inline-block">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
            {new Date().toLocaleDateString()} • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#5A5A40]/10 text-[#5A5A40] text-xs font-bold uppercase tracking-widest mb-4">
          <ShieldCheck size={14} />
          Registro Seguro
        </div>
        <h1 className="text-4xl font-serif italic font-bold mb-2">Registro de Asistencia</h1>
        <p className="text-[#141414]/60">Introduce tus datos para confirmar tu presencia en clase.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="relative group">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[#141414]/30 group-focus-within:text-[#5A5A40] transition-colors">
              <User size={20} />
            </div>
            <input
              type="text"
              placeholder="Nombre"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-white border border-[#141414]/10 rounded-2xl py-5 pl-14 pr-6 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40] transition-all"
            />
          </div>

          <div className="relative group">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[#141414]/30 group-focus-within:text-[#5A5A40] transition-colors">
              <User size={20} />
            </div>
            <input
              type="text"
              placeholder="Apellidos"
              value={formData.surname}
              onChange={e => setFormData({ ...formData, surname: e.target.value })}
              className="w-full bg-white border border-[#141414]/10 rounded-2xl py-5 pl-14 pr-6 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40] transition-all"
            />
          </div>

          <div className="relative group">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[#141414]/30 group-focus-within:text-[#5A5A40] transition-colors">
              <CreditCard size={20} />
            </div>
            <input
              type="text"
              placeholder="DNI / NIE"
              value={formData.dni}
              onChange={e => setFormData({ ...formData, dni: e.target.value.toUpperCase() })}
              className="w-full bg-white border border-[#141414]/10 rounded-2xl py-5 pl-14 pr-6 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40] transition-all font-mono"
            />
          </div>
        </div>

        {status === 'error' && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-center gap-3"
          >
            <AlertCircle size={18} />
            {errorMessage}
          </motion.div>
        )}

        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full bg-[#5A5A40] text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-[#4A4A35] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          {status === 'loading' ? (
            <Loader2 className="animate-spin" />
          ) : (
            <>
              Registrar Asistencia
              <Send size={18} />
            </>
          )}
        </button>
      </form>

      <p className="mt-8 text-center text-xs text-[#141414]/40 leading-relaxed">
        Al registrarte, confirmas que estás presente físicamente en el aula. 
        Tu dirección IP y dispositivo serán registrados para evitar fraudes.
      </p>
    </div>
  );
}
