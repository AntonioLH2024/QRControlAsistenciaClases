import React from 'react';
import { motion } from 'motion/react';
import { QrCode, ShieldCheck, FileSpreadsheet, MapPin, ArrowRight, Users, Zap } from 'lucide-react';

interface LandingPageProps {
  onNavigate: (path: string) => void;
}

export default function LandingPage({ onNavigate }: LandingPageProps) {
  return (
    <div className="space-y-24 pb-12">
      {/* Hero Section */}
      <section className="relative pt-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-6">
              <Zap size={14} />
              <span>Control de Asistencia Inteligente</span>
            </div>
            <h1 className="text-6xl md:text-7xl font-serif italic font-bold leading-[0.9] mb-8 tracking-tight">
              Registro de asistencia <br />
              <span className="text-primary">sin fricciones.</span>
            </h1>
            <p className="text-xl text-ink/60 mb-10 leading-relaxed max-w-lg">
              La forma más rápida y segura de gestionar la asistencia en tus clases mediante códigos QR dinámicos y validación por geolocalización.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => onNavigate('/teacher')}
                className="bg-primary text-white px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all hover:scale-105 shadow-lg shadow-primary/20"
              >
                Acceder al Panel del Profesor
                <ArrowRight size={20} />
              </button>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="aspect-square bg-white rounded-[48px] shadow-2xl p-12 flex items-center justify-center relative overflow-hidden border border-ink/5">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,var(--color-primary)10,transparent)]" />
              <img 
                src="/logo.png" 
                alt="Logo Principal" 
                className="w-full h-full object-contain relative z-10"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
                }}
              />
              <div className="fallback-icon hidden relative z-10">
                <QrCode size={240} strokeWidth={1.5} className="text-ink" />
              </div>
              
              {/* Floating elements */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-10 right-10 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl shadow-lg border border-emerald-100 flex items-center gap-2 text-sm font-bold"
              >
                <ShieldCheck size={18} />
                <span>Ubicación Verificada</span>
              </motion.div>
              
              <motion.div 
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute bottom-12 left-8 bg-white text-ink px-4 py-2 rounded-xl shadow-lg border border-ink/5 flex items-center gap-2 text-sm font-bold"
              >
                <Users size={18} className="text-primary" />
                <span>+45 Alumnos Registrados</span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>


    </div>
  );
}
