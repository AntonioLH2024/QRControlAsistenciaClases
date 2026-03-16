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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5A5A40]/10 text-[#5A5A40] text-xs font-bold uppercase tracking-widest mb-6">
              <Zap size={14} />
              <span>Control de Asistencia Inteligente</span>
            </div>
            <h1 className="text-6xl md:text-7xl font-serif italic font-bold leading-[0.9] mb-8 tracking-tight">
              Registro de asistencia <br />
              <span className="text-[#5A5A40]">sin fricciones.</span>
            </h1>
            <p className="text-xl text-[#141414]/60 mb-10 leading-relaxed max-w-lg">
              La forma más rápida y segura de gestionar la asistencia en tus clases mediante códigos QR dinámicos y validación por geolocalización.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => onNavigate('/teacher')}
                className="bg-[#5A5A40] text-white px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#4A4A35] transition-all hover:scale-105 shadow-lg shadow-[#5A5A40]/20"
              >
                Acceder al Panel del Profesor
                <ArrowRight size={20} />
              </button>
              <button 
                onClick={() => {
                  const el = document.getElementById('features');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-white border border-[#141414]/10 text-[#141414] px-8 py-4 rounded-2xl font-bold hover:bg-[#F5F5F0] transition-all"
              >
                Saber más
              </button>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="aspect-square bg-white rounded-[48px] shadow-2xl p-12 flex items-center justify-center relative overflow-hidden border border-[#141414]/5">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,#5A5A4010,transparent)]" />
              <QrCode size={240} strokeWidth={1.5} className="text-[#141414] relative z-10" />
              
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
                className="absolute bottom-12 left-8 bg-white text-[#141414] px-4 py-2 rounded-xl shadow-lg border border-[#141414]/5 flex items-center gap-2 text-sm font-bold"
              >
                <Users size={18} className="text-[#5A5A40]" />
                <span>+45 Alumnos Registrados</span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="pt-12">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-serif italic font-bold mb-4">Potencia tu gestión académica</h2>
          <p className="text-[#141414]/60">Tecnología diseñada para simplificar el día a día del docente.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: <QrCode className="text-[#5A5A40]" />,
              title: "QR Dinámico",
              desc: "Genera códigos únicos que expiran en 15 minutos, evitando que los alumnos compartan el enlace fuera del aula."
            },
            {
              icon: <MapPin className="text-[#5A5A40]" />,
              title: "Geovallado",
              desc: "Valida que el alumno esté físicamente en el aula mediante el GPS de su dispositivo antes de permitir el registro."
            },
            {
              icon: <FileSpreadsheet className="text-[#5A5A40]" />,
              title: "Google Sheets",
              desc: "Sincronización automática con tus hojas de cálculo. Olvídate de pasar datos manualmente al finalizar la clase."
            }
          ].map((feature, i) => (
            <motion.div 
              key={i}
              whileHover={{ y: -5 }}
              className="bg-white p-10 rounded-[40px] border border-[#141414]/5 shadow-sm hover:shadow-xl hover:shadow-black/5 transition-all"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#5A5A40]/10 flex items-center justify-center mb-8">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
              <p className="text-[#141414]/60 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-[#141414] rounded-[64px] p-12 md:p-24 text-center text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#5A5A40] blur-[120px] opacity-20 -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 max-w-2xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-serif italic font-bold mb-8 leading-tight">
            ¿Listo para digitalizar tu control de asistencia?
          </h2>
          <p className="text-white/60 text-lg mb-12">
            Únete a los docentes que ya están ahorrando tiempo y mejorando la seguridad en sus aulas.
          </p>
          <button 
            onClick={() => onNavigate('/teacher')}
            className="bg-white text-[#141414] px-12 py-5 rounded-2xl font-bold text-lg hover:bg-[#F5F5F0] transition-all hover:scale-105 inline-flex items-center gap-3"
          >
            Empezar ahora
            <ArrowRight size={22} />
          </button>
        </div>
      </section>
    </div>
  );
}
