/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QrCode, Users, Plus, CheckCircle2, AlertCircle, LogOut, ShieldCheck, Clock, Download } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Types
import { ClassSession, AttendanceRecord } from './types';

// Components
import TeacherDashboard from './components/TeacherDashboard';
import StudentCheckin from './components/StudentCheckin';
import LandingPage from './components/LandingPage';

export default function App() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setPath(window.location.pathname);
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const navigate = (newPath: string) => {
    window.history.pushState({}, '', newPath);
    setPath(newPath);
  };

  return (
    <div className="min-h-screen bg-bg text-ink font-sans selection:bg-primary selection:text-white">
      {/* Navigation / Header */}
      <header className="border-b border-primary/10 bg-white/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => navigate('/')}
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-105 transition-transform overflow-hidden border border-primary/20">
              <img 
                src="logo academia transparente.png" 
                alt="Logo" 
                className="w-full h-full object-contain p-1"
                onError={(e) => {
                  // Fallback to Icon if image fails to load
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
                }}
              />
              <div className="fallback-icon hidden">
                <QrCode size={24} className="text-primary" />
              </div>
            </div>
            <span className="font-serif italic text-xl font-bold tracking-tight text-primary">AsistenciaQR</span>
          </div>
          
          <nav className="hidden sm:flex items-center gap-6">
            <button 
              onClick={() => navigate('/')}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                path === '/' ? "text-primary" : "text-ink/60"
              )}
            >
              Inicio
            </button>
            <button 
              onClick={() => navigate('/teacher')}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                path === '/teacher' ? "text-primary" : "text-ink/60"
              )}
            >
              Panel Profesor
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {path === '/checkin' ? (
            <motion.div
              key="checkin"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <StudentCheckin />
            </motion.div>
          ) : path === '/teacher' ? (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <TeacherDashboard onNavigate={navigate} />
            </motion.div>
          ) : (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <LandingPage onNavigate={navigate} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t border-primary/10 py-12 bg-white/30 mt-auto">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="text-sm text-ink/40 font-mono">
            © 2026 ASISTENCIAQR • SISTEMA DE REGISTRO SEGURO
          </div>
          <div className="flex gap-8 text-xs uppercase tracking-widest font-bold text-ink/60">
            <a href="#" className="hover:text-primary transition-colors">Privacidad</a>
            <a href="#" className="hover:text-primary transition-colors">Soporte</a>
            <a href="#" className="hover:text-primary transition-colors">API</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

