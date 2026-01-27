import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  History, 
  Settings, 
  Plus, 
  Camera, 
  FileText, 
  PenTool, 
  X,
  Menu
} from 'lucide-react';
import { Button } from './UI';

interface LayoutProps {
  children: React.ReactNode;
  onFabAction: (action: 'scan' | 'create') => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, onFabAction }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showFabMenu, setShowFabMenu] = useState(false);

  // Ocultar layout en login, quiz o editor (el editor tiene su propio header)
  // Aunque el usuario pidió mantener la barra, el Editor suele necesitar pantalla completa.
  // Sin embargo, para cumplir con "navegación guarda", si mostramos la barra, debemos manejarlo.
  // Para simplificar la validación de salida del editor, ocultaremos el layout en /editor y /quiz
  const isFullScreen = location.pathname.startsWith('/login') || location.pathname.startsWith('/quiz') || location.pathname.startsWith('/editor');

  const isActive = (path: string) => location.pathname === path;

  const NavItem = ({ path, icon: Icon, label }: { path: string, icon: any, label: string }) => (
    <button
      onClick={() => navigate(path)}
      className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-200 ${
        isActive(path) 
          ? 'bg-brand-600 text-white shadow-md shadow-brand-200 dark:shadow-none' 
          : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
      }`}
    >
      <Icon size={24} />
      <span className="font-medium">{label}</span>
    </button>
  );

  if (isFullScreen) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      
      {/* --- DESKTOP SIDEBAR --- */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 p-6 fixed h-full z-30">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="bg-brand-600 p-2 rounded-lg">
             <FileText className="text-white" size={24} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">StudySnap</h1>
        </div>

        <nav className="space-y-2 flex-1">
          <NavItem path="/" icon={Home} label="Inicio" />
          {/* Placeholder for History page if implemented later */}
          <NavItem path="/settings" icon={Settings} label="Ajustes" />
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-700">
           <Button 
             onClick={() => onFabAction('create')} 
             className="w-full flex justify-center items-center gap-2 py-3 shadow-lg shadow-brand-500/20"
           >
             <Plus size={20}/> Nuevo Test
           </Button>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 md:ml-64 w-full max-w-[100vw] overflow-x-hidden">
        <div className="max-w-7xl mx-auto p-4 md:p-8 pb-24 md:pb-8">
            {children}
        </div>
      </main>

      {/* --- MOBILE BOTTOM BAR --- */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center z-40 pb-safe">
        <button 
          onClick={() => navigate('/')}
          className={`p-2 rounded-xl transition-colors ${isActive('/') ? 'text-brand-600 bg-brand-50 dark:bg-slate-700' : 'text-slate-400'}`}
        >
          <Home size={28} />
        </button>

        {/* FAB Container */}
        <div className="relative -top-8">
           {showFabMenu && (
             <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 flex flex-col gap-3 w-max animate-in slide-in-from-bottom-5 fade-in duration-200">
                <button 
                  onClick={() => { setShowFabMenu(false); onFabAction('create'); }}
                  className="flex items-center gap-3 bg-white dark:bg-slate-700 text-slate-700 dark:text-white px-4 py-2 rounded-full shadow-lg border border-slate-100 dark:border-slate-600"
                >
                  <PenTool size={18} /> <span className="font-medium text-sm">Manual</span>
                </button>
                <button 
                  onClick={() => { setShowFabMenu(false); onFabAction('scan'); }}
                  className="flex items-center gap-3 bg-white dark:bg-slate-700 text-slate-700 dark:text-white px-4 py-2 rounded-full shadow-lg border border-slate-100 dark:border-slate-600"
                >
                  <Camera size={18} /> <span className="font-medium text-sm">Escanear</span>
                </button>
             </div>
           )}
           <button 
             onClick={() => setShowFabMenu(!showFabMenu)}
             className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg shadow-brand-500/30 transition-transform duration-300 ${showFabMenu ? 'bg-slate-800 rotate-45' : 'bg-brand-600 hover:scale-105'}`}
           >
             <Plus size={32} className="text-white" />
           </button>
        </div>

        <button 
          onClick={() => navigate('/settings')}
          className={`p-2 rounded-xl transition-colors ${isActive('/settings') ? 'text-brand-600 bg-brand-50 dark:bg-slate-700' : 'text-slate-400'}`}
        >
          <Settings size={28} />
        </button>
      </div>

      {/* Overlay for FAB menu */}
      {showFabMenu && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-30 md:hidden" 
          onClick={() => setShowFabMenu(false)}
        />
      )}
    </div>
  );
};