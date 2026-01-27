import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, useNavigate, useLocation, useParams, Navigate } from 'react-router-dom';
import { 
  Home as HomeIcon, 
  Plus, 
  History as HistoryIcon, 
  Camera, 
  FileText, 
  PenTool, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  ArrowLeft,
  Save,
  Loader2,
  MoreVertical,
  Play,
  LogOut,
  User as UserIcon,
  Copy,
  ExternalLink,
  CheckSquare,
  Square,
  X,
  Settings,
  Moon,
  Sun,
  Upload,
  Share2,
  Download,
  Menu,
  Key,
  Cloud,
  Link as LinkIcon,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth, googleProvider } from './services/firebaseConfig';
import { Button, Card, Input, TextArea, Badge } from './components/UI';
import { storageService } from './services/storageService';
// CAMBIO: Volvemos a la IA porque el OCR local falló en calidad
import { parseFileToQuiz } from './services/geminiService';
import { Test, Question, Option, TestResult, AnswerDetail } from './types';

// --- Utils ---
const generateId = () => Math.random().toString(36).substring(2, 9);

// --- Auth Context / Hook simple ---
const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { user, loading };
};

// --- Dark Mode Context ---
const useDarkMode = () => {
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  return { isDark, toggle: () => setIsDark(prev => !prev) };
};

// --- Components ---

// Modal para seleccionar lista existente o crear nueva
const ListSelectionModal = ({ 
  user, 
  onSelect, 
  onCancel 
}: { 
  user: User, 
  onSelect: (testId: string | null, title?: string) => void, 
  onCancel: () => void 
}) => {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => {
    const load = async () => {
      const data = await storageService.getTests(user.uid);
      setTests(data);
      if (data.length === 0) setMode('new');
      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) return <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><Loader2 className="animate-spin text-white" /></div>;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 w-full max-w-md border-2 border-slate-100 dark:border-slate-700">
        <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">¿Dónde guardamos esto?</h2>
        
        {mode === 'existing' && tests.length > 0 ? (
          <div className="space-y-3">
             <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Elige una lista existente:</p>
             <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar">
               {tests.map(t => (
                 <button 
                   key={t.id}
                   onClick={() => onSelect(t.id, t.title)}
                   className="w-full text-left p-3 rounded-xl border border-slate-200 bg-slate-50 hover:border-brand-500 hover:bg-brand-50 dark:bg-slate-700 dark:border-slate-600 dark:hover:border-brand-500 dark:text-slate-200 transition-all flex justify-between items-center"
                 >
                   <span className="font-medium truncate">{t.title}</span>
                   <span className="text-xs text-slate-400 bg-white dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-100 dark:border-slate-600">{t.questions.length}</span>
                 </button>
               ))}
             </div>
             <div className="pt-4 border-t border-slate-100 dark:border-slate-700 mt-2">
               <Button variant="secondary" onClick={() => setMode('new')} className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600">
                 + Crear Nueva Lista
               </Button>
             </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Crear una lista nueva:</p>
            <Input 
              autoFocus
              placeholder="Ej: Matemáticas T1" 
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              className="bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            />
            <div className="flex gap-2">
               {tests.length > 0 && (
                 <Button variant="ghost" onClick={() => setMode('existing')}>Volver</Button>
               )}
               <Button 
                 className="flex-1"
                 disabled={!newTitle.trim()}
                 onClick={() => onSelect(null, newTitle)}
               >
                 Crear y Continuar
               </Button>
            </div>
          </div>
        )}
        <button onClick={onCancel} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"><XCircle /></button>
      </div>
    </div>
  );
};

// --- Pages ---

const SettingsPage = () => {
  const { isDark, toggle } = useDarkMode();
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('user_gemini_key') || '');
  const [showSaveMsg, setShowSaveMsg] = useState(false);
  const [isSavingCloud, setIsSavingCloud] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<{hasKey: boolean, updatedAt?: number} | null>(null);

  useEffect(() => {
      storageService.checkGlobalConfig().then(status => setCloudStatus(status));
  }, []);

  const handleSaveKey = () => {
    localStorage.setItem('user_gemini_key', apiKey.trim());
    setShowSaveMsg(true);
    setTimeout(() => setShowSaveMsg(false), 2000);
  };

  const handleSaveToCloud = async () => {
      if(!apiKey.trim()) return alert("Escribe una clave primero.");
      
      const confirmMsg = cloudStatus?.hasKey 
        ? "⚠️ YA EXISTE UNA CLAVE GLOBAL.\n\nAl guardar, SOBRESCRIBIRÁS la clave actual y TODOS los usuarios empezarán a usar la nueva inmediatamente.\n\n¿Confirmar actualización?"
        : "⚠️ ATENCIÓN: Esto guardará tu clave en la base de datos compartida.\n\nCualquier usuario que inicie sesión en esta app usará automáticamente esta clave.\n\n¿Estás seguro?";

      if(!confirm(confirmMsg)) return;
      
      setIsSavingCloud(true);
      try {
          await storageService.saveGlobalApiKey(apiKey.trim());
          alert("✅ Clave actualizada en la nube.");
          setCloudStatus({ hasKey: true, updatedAt: Date.now() });
      } catch(e) {
          alert("Error al guardar en la nube.");
      } finally {
          setIsSavingCloud(false);
      }
  };

  const createMagicLink = () => {
      if(!apiKey.trim()) return alert("Escribe una clave primero.");
      const url = `${window.location.origin}/?key=${apiKey.trim()}`;
      navigator.clipboard.writeText(url);
      alert("🔗 Enlace Mágico copiado!\n\nEnvía este enlace a tus amigos. Al abrirlo, la app se configurará sola.");
  }

  return (
    <div className="pb-24 max-w-lg mx-auto p-4 animate-in fade-in zoom-in-95 duration-300">
      <header className="flex items-center gap-2 mb-8 md:hidden">
         <button onClick={() => navigate('/')} className="p-2 hover:bg-white/50 rounded-full text-slate-700 dark:text-slate-300"><ArrowLeft /></button>
         <h1 className="font-bold text-2xl text-slate-800 dark:text-white">Opciones</h1>
      </header>

      <h1 className="hidden md:block font-bold text-3xl text-slate-800 dark:text-white mb-8">Configuración</h1>

      <div className="space-y-6">
        {/* Modo Oscuro */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-brand-50 dark:bg-slate-700 p-3 rounded-xl text-brand-600 dark:text-brand-400">
                {isDark ? <Moon size={24} /> : <Sun size={24} />}
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-white">Modo Oscuro</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Cambiar entre tema claro y oscuro</p>
              </div>
            </div>
            
            <button 
              onClick={toggle}
              className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 ease-in-out ${isDark ? 'bg-brand-600' : 'bg-slate-200'}`}
            >
              <div className={`bg-white w-6 h-6 rounded-full shadow-sm transform transition-transform duration-300 ${isDark ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        {/* API Key Personal */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-xl text-yellow-600 dark:text-yellow-400">
                <Key size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-white">API Key (Inteligencia Artificial)</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Clave de Google AI Studio para evitar límites.</p>
              </div>
            </div>

            {/* Estado de la Nube */}
            <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Cloud size={16} className={cloudStatus?.hasKey ? "text-green-500" : "text-slate-400"}/>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        Estado Nube: {cloudStatus === null ? '...' : cloudStatus.hasKey ? '✅ Clave Activa' : '❌ Sin Clave Global'}
                    </span>
                </div>
                {cloudStatus?.hasKey && (
                    <span className="text-[10px] text-slate-400">
                        {new Date(cloudStatus.updatedAt || 0).toLocaleDateString()}
                    </span>
                )}
            </div>
            
            <div className="space-y-3">
               <Input 
                 type="password" 
                 placeholder="Pegar API Key aquí..."
                 value={apiKey}
                 onChange={(e) => setApiKey(e.target.value)}
                 className="dark:bg-slate-900 dark:border-slate-600 dark:text-white"
               />
               
               <div className="flex justify-between items-center text-xs text-brand-600 dark:text-brand-400 mb-2">
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                    Obtener Clave Gratis <ExternalLink size={12}/>
                  </a>
                  {cloudStatus?.hasKey && (
                      <span className="text-slate-400 italic">Si la actual falla, genera una nueva y actualízala aquí.</span>
                  )}
               </div>

               <div className="flex flex-wrap gap-2">
                 <Button onClick={handleSaveKey} disabled={showSaveMsg} className="flex-1 text-sm py-2">
                    {showSaveMsg ? "Guardado!" : "Guardar en mi Móvil"}
                 </Button>
               </div>
               
               <hr className="border-slate-100 dark:border-slate-700 my-4"/>
               
               <p className="text-xs font-bold text-slate-400 uppercase">Administrador / Compartir</p>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Button onClick={createMagicLink} variant="secondary" className="text-xs flex items-center justify-center gap-2 dark:bg-slate-700 dark:text-white dark:border-slate-600">
                        <LinkIcon size={14}/> Copiar Enlace Mágico
                    </Button>
                    <Button onClick={handleSaveToCloud} variant="secondary" className={`text-xs flex items-center justify-center gap-2 dark:bg-slate-700 dark:text-white dark:border-slate-600 ${cloudStatus?.hasKey ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10 text-yellow-700 dark:text-yellow-400' : ''}`} disabled={isSavingCloud}>
                        {isSavingCloud ? <Loader2 className="animate-spin" size={14}/> : cloudStatus?.hasKey ? <><RefreshCw size={14}/> Actualizar Global (Sobrescribir)</> : <><Cloud size={14}/> Guardar en Nube (Para Todos)</>}
                    </Button>
               </div>
            </div>
          </div>
        </div>
      </div>
      
      <p className="text-center text-slate-400 text-xs mt-8">StudySnap v1.3 • Gemini Powered</p>
    </div>
  );
};

const SharePage = ({ user }: { user: User }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState<Test | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if(!id) return;
      const t = await storageService.getTestById(id);
      setTest(t);
      setLoading(false);
    }
    load();
  }, [id]);

  const handleImport = async () => {
     if(!id) return;
     try {
       await storageService.copyTest(id, user.uid);
       alert("Lista importada correctamente!");
       navigate('/');
     } catch(e) {
       alert("Error al importar la lista.");
     }
  }

  if(loading) return <div className="flex justify-center h-screen items-center"><Loader2 className="animate-spin text-brand-500"/></div>;
  
  if(!test) return (
    <div className="flex flex-col items-center justify-center h-screen p-4 text-center">
      <XCircle size={48} className="text-red-400 mb-4"/>
      <h2 className="text-xl font-bold">Lista no encontrada</h2>
      <p className="text-slate-500 mt-2">El enlace puede ser incorrecto o la lista fue eliminada.</p>
      <Button onClick={() => navigate('/')} className="mt-6">Ir al Inicio</Button>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center h-screen p-6 text-center max-w-md mx-auto">
       <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl w-full border border-slate-100 dark:border-slate-700">
          <div className="bg-brand-100 dark:bg-slate-700 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
             <Download size={32} className="text-brand-600 dark:text-brand-400"/>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Importar Lista</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            ¿Quieres añadir <strong>"{test.title}"</strong> ({test.questions.length} preguntas) a tu colección?
          </p>
          <div className="flex gap-3">
             <Button variant="secondary" onClick={() => navigate('/')} className="flex-1 dark:bg-slate-700 dark:text-white dark:border-slate-600">Cancelar</Button>
             <Button onClick={handleImport} className="flex-1">Importar</Button>
          </div>
       </div>
    </div>
  );
};

const LoginPage = () => {
  const [errorMessage, setErrorMessage] = useState('');

  const handleGoogleLogin = async () => {
    try {
      setErrorMessage('');
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur p-8 rounded-3xl shadow-xl max-w-sm w-full border border-white dark:border-slate-700">
        <div className="bg-gradient-to-r from-brand-500 to-indigo-600 w-20 h-20 rounded-2xl rotate-3 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-brand-500/30">
          <FileText className="text-white" size={40} />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">StudySnap</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">Escanea, crea y repasa tus tests en cualquier lugar.</p>
        
        <Button 
          variant="primary"
          onClick={handleGoogleLogin} 
          className="w-full flex items-center justify-center gap-3 py-4 text-lg shadow-lg shadow-brand-500/20 hover:shadow-brand-500/40 transition-all"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6 bg-white rounded-full p-0.5" />
          <span>Entrar con Google</span>
        </Button>
        
        {errorMessage && (
          <p className="mt-4 text-red-500 text-sm bg-red-50 p-2 rounded">{errorMessage}</p>
        )}
      </div>
    </div>
  );
};

const HomePage = ({ user }: { user: User }) => {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadTests();
  }, [user]);

  const loadTests = async () => {
    setLoading(true);
    const data = await storageService.getTests(user.uid);
    setTests(data);
    setLoading(false);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('¿Quieres eliminar esta lista?')) {
      await storageService.deleteTest(id);
      setTests(prev => prev.filter(t => t.id !== id));
    }
  };
  
  const handleShare = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const url = `${window.location.origin}/#/share/${id}`;
    try {
       await navigator.clipboard.writeText(url);
       alert("Enlace copiado al portapapeles! Envíaselo a quien quieras.");
    } catch(err) {
       alert("No se pudo copiar: " + url);
    }
  }

  const handleLogout = () => {
    if(confirm("¿Cerrar sesión?")) signOut(auth);
  }

  // Floating Action Button for creating new test
  const handleCreate = () => {
    navigate('/editor?mode=camera');
  }

  return (
    <div className="space-y-8 pb-24 md:pb-8 w-full animate-in fade-in zoom-in-95 duration-300 relative min-h-screen">
      <header className="flex justify-between items-center bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-white/50 dark:border-slate-700">
        <div className="flex items-center gap-4">
          <div className="bg-brand-100 dark:bg-slate-700 p-3 rounded-full border border-brand-200 dark:border-slate-600 shadow-sm">
            <UserIcon className="text-brand-600 dark:text-brand-400 w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Mis Listas</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Hola, {user.displayName?.split(' ')[0]}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
           <button 
             onClick={() => navigate('/settings')}
             className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 rounded-full transition-colors"
             title="Configuración"
           >
             <Settings size={24} />
           </button>
           <button 
             onClick={handleLogout}
             className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:text-slate-500 dark:hover:bg-slate-700 rounded-full transition-colors" 
             title="Cerrar sesión"
           >
             <LogOut size={24} />
           </button>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-brand-500" size={40} />
        </div>
      ) : tests.length === 0 ? (
        <div className="text-center py-20 text-slate-400 bg-white/60 dark:bg-slate-800/60 rounded-3xl border border-white dark:border-slate-700 shadow-sm mx-auto max-w-lg">
          <div className="bg-slate-100 dark:bg-slate-700 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText size={40} className="text-slate-300 dark:text-slate-500" />
          </div>
          <h2 className="text-xl font-semibold text-slate-600 dark:text-slate-300 mb-2">No tienes listas guardadas</h2>
          <p className="text-slate-500 dark:text-slate-400">Usa el botón + para escanear tu primer test.</p>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">
          {tests.map(test => (
            <Card key={test.id} onClick={() => navigate(`/quiz/${test.id}`)} className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 hover:border-brand-200 dark:hover:border-brand-700 hover:shadow-lg transition-all cursor-pointer h-full flex flex-col justify-between group">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-brand-50 dark:bg-slate-700 p-3 rounded-xl text-brand-600 dark:text-brand-400 border border-brand-100 dark:border-slate-600">
                    <FileText size={24}/>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => handleShare(e, test.id)} className="text-slate-300 hover:text-brand-500 p-2 hover:bg-brand-50 dark:hover:bg-slate-700 rounded-lg transition-colors" title="Compartir">
                      <Share2 size={18} />
                    </button>
                    <button onClick={(e) => handleDelete(e, test.id)} className="text-slate-300 hover:text-red-500 p-2 hover:bg-red-50 dark:hover:bg-slate-700 rounded-lg transition-colors" title="Borrar">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100 line-clamp-2 mb-2 group-hover:text-brand-600 transition-colors">{test.title}</h3>
                <div className="text-sm text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
                    <Badge color="blue">{test.questions.length} preguntas</Badge>
                </div>
              </div>
              
              <div className="flex gap-3 mt-auto pt-4 border-t border-slate-100 dark:border-slate-700">
                 <Button 
                    variant="secondary" 
                    className="flex-1 text-sm py-2 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600"
                    onClick={(e) => { e.stopPropagation(); navigate(`/editor/${test.id}?mode=manual`); }}
                 >
                   Editar
                 </Button>
                 <Button variant="primary" className="flex-1 text-sm py-2 flex justify-center items-center gap-2 shadow-md shadow-brand-200 dark:shadow-none">
                   <Play size={16} /> Jugar
                 </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-10">
        <Button onClick={handleCreate} className="rounded-full w-14 h-14 flex items-center justify-center shadow-lg shadow-brand-500/40">
           <Plus size={28} />
        </Button>
      </div>
    </div>
  );
};

const EditorPage = ({ user }: { user: User }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const modeParam = searchParams.get('mode'); // 'manual' | 'camera'
  const { id: editId } = useParams();

  // State
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [progressPercent, setProgressPercent] = useState(0); 
  const [showListSelector, setShowListSelector] = useState(false);
  const [viewMode, setViewMode] = useState<'editor' | 'scanner'>(modeParam === 'camera' ? 'scanner' : 'editor');

  // Inicialización
  useEffect(() => {
    const init = async () => {
      if (editId) {
        setIsLoading(true);
        const test = await storageService.getTestById(editId);
        if (test && test.userId === user.uid) {
          setTitle(test.title);
          setQuestions(test.questions);
          if (modeParam === 'camera') {
            setViewMode('scanner');
          } else {
            setViewMode('editor');
            setCurrentQIndex(0);
          }
        } else {
           alert("Error al cargar test.");
           navigate('/');
        }
        setIsLoading(false);
        return;
      }

      if (modeParam && !editId) {
        setShowListSelector(true);
      }
    };
    init();
  }, [editId, modeParam, user]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setProgressMsg("Iniciando...");
    setProgressPercent(0);
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64String = (reader.result as string).split(',')[1];
        const extractedQuestions = await parseFileToQuiz(
            base64String, 
            file.type, 
            (msg, percent) => {
                setProgressMsg(msg);
                setProgressPercent(percent);
            }
        );
        setQuestions(prev => [...prev, ...extractedQuestions]);
        setViewMode('scanner');

      } catch (err: any) {
        alert(err.message);
      } finally {
        setIsLoading(false);
        setProgressMsg('');
        setProgressPercent(0);
        e.target.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const getCurrentQuestion = (): Question => {
    if (currentQIndex === questions.length) {
      return {
        id: generateId(),
        text: '',
        options: Array(4).fill(null).map(() => ({ id: generateId(), text: '' })), 
        correctOptionId: ''
      };
    }
    return questions[currentQIndex];
  };

  const updateCurrentQuestion = (field: keyof Question, value: any) => {
    const newQs = [...questions];
    if (currentQIndex === questions.length) {
       const newQ = getCurrentQuestion();
       (newQ as any)[field] = value;
       setQuestions([...newQs, newQ]);
    } else {
       (newQs[currentQIndex] as any)[field] = value;
       setQuestions(newQs);
    }
  };

  const updateOption = (oIndex: number, text: string) => {
    const q = getCurrentQuestion();
    const newOptions = [...q.options];
    newOptions[oIndex] = { ...newOptions[oIndex], text };
    updateCurrentQuestion('options', newOptions);
  };

  const setCorrectOption = (oId: string) => {
    updateCurrentQuestion('correctOptionId', oId);
  };

  const navigateQuestion = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (currentQIndex > 0) setCurrentQIndex(prev => prev - 1);
    } else {
      if (currentQIndex < questions.length) setCurrentQIndex(prev => prev + 1);
      else {
        const current = getCurrentQuestion();
        if(current.text.trim()) setCurrentQIndex(prev => prev + 1);
      }
    }
  };

  // Helpers
  const goToFirst = () => setCurrentQIndex(0);
  const goToPagePrompt = () => {
    const page = prompt(`Ir a pregunta (1 - ${questions.length + 1}):`);
    if (page) {
       const pageNum = parseInt(page);
       if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= questions.length + 1) {
          setCurrentQIndex(pageNum - 1);
       }
    }
  };

  const handleSave = async () => {
    if (!title.trim()) return alert("Escribe un título para la lista.");
    const validQuestions = questions.filter(q => q.text.trim() !== '');
    if (validQuestions.length === 0) return alert("Añade al menos una pregunta.");
    
    // Permitimos guardar aunque no esté "perfecto", ya que ahora la edición manual es más importante
    const missingAnswerIndex = questions.findIndex(q => q.text.trim() !== '' && !q.correctOptionId);
    if (missingAnswerIndex !== -1) {
        if(!confirm(`La pregunta ${missingAnswerIndex + 1} no tiene respuesta marcada. ¿Guardar de todas formas?`)) {
            setViewMode('editor');
            setCurrentQIndex(missingAnswerIndex);
            return;
        }
    }

    setIsLoading(true);
    setProgressMsg("Guardando...");
    setProgressPercent(100);
    
    try {
      const test: Test = {
        id: editId || generateId(), 
        userId: user.uid,
        title,
        createdAt: Date.now(),
        questions: validQuestions
      };
      await storageService.saveTest(test); 
      navigate('/');
    } catch (error: any) {
       alert("Error al guardar: " + error.message);
    } finally {
       setIsLoading(false);
       setProgressMsg('');
    }
  };

  const onListSelectFinal = (id: string | null, newTitle?: string) => {
    if (id) {
       navigate(`/editor/${id}?mode=${modeParam}`, { replace: true });
       setShowListSelector(false);
    } else if (newTitle) {
      setTitle(newTitle);
      setQuestions([]);
      if (modeParam === 'camera') setViewMode('scanner');
      else {
        setViewMode('editor');
        setCurrentQIndex(0);
      }
      setShowListSelector(false);
    }
  };

  const editQuestionFromList = (index: number) => {
    setViewMode('editor');
    setCurrentQIndex(index);
  }

  const addNewQuestionManual = () => {
     setViewMode('editor');
     setCurrentQIndex(questions.length); 
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-white/90 dark:bg-slate-900/90 backdrop-blur z-50 fixed inset-0">
        <div className="w-full max-w-xs text-center">
            <Loader2 className="animate-spin text-brand-600 mb-6 mx-auto" size={48} />
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{progressMsg || "Procesando..."}</h3>
            <p className="text-slate-500 text-sm mb-6">Esto puede tardar unos segundos...</p>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 overflow-hidden shadow-inner border border-slate-300 dark:border-slate-600">
               <div className="bg-brand-500 h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden" style={{ width: `${progressPercent}%` }}>
                  <div className="absolute inset-0 bg-white/20 animate-[pulse_2s_infinite]"></div>
               </div>
            </div>
            <div className="text-right text-xs font-bold text-brand-600 dark:text-brand-400 mt-2">{progressPercent}%</div>
        </div>
      </div>
    );
  }

  const activeQ = getCurrentQuestion();
  const displayTotal = currentQIndex === questions.length ? questions.length + 1 : questions.length;
  const displayIndex = currentQIndex + 1;

  return (
    <div className="pb-24 md:pb-8 max-w-4xl mx-auto w-full">
      {showListSelector && <ListSelectionModal user={user} onSelect={onListSelectFinal} onCancel={() => navigate('/')} />}

      <input id="file-upload-trigger" type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileUpload} />

      <header className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur z-20 py-4 border-b border-slate-200 dark:border-slate-800 mb-6 flex justify-between items-center px-4 -mx-4 shadow-sm">
        <div className="flex items-center gap-2">
           <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300"><ArrowLeft /></button>
           <div className="flex flex-col">
             <span className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase">
               {viewMode === 'scanner' ? 'Modo Escáner' : 'Editor Manual'}
             </span>
             <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título de la lista..." className="font-bold text-slate-800 dark:text-white bg-transparent focus:outline-none focus:border-b-2 border-brand-500 w-32 sm:w-auto placeholder:text-slate-300"/>
           </div>
        </div>
        <div className="flex gap-2">
             {viewMode === 'editor' && (
               <Button variant="secondary" onClick={() => setViewMode('scanner')} className="p-2 rounded-full border-slate-200 dark:border-slate-700 dark:bg-slate-800" title="Volver a Escáner">
                  <Camera size={20} className="text-slate-600 dark:text-slate-300"/>
               </Button>
             )}
            <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider mb-1">Guardar</span>
                <Button onClick={handleSave} className="w-12 h-12 rounded-full p-0 flex items-center justify-center shadow-lg shadow-brand-200 dark:shadow-none bg-brand-600 hover:bg-brand-700">
                  <Save size={20} />
                </Button>
            </div>
        </div>
      </header>

      {/* --- VISTA ESCÁNER --- */}
      {viewMode === 'scanner' && (
        <div className="space-y-6">
           <div className="bg-brand-50 dark:bg-slate-800 border border-brand-200 dark:border-slate-700 rounded-2xl p-8 text-center shadow-sm">
              <div className="bg-white dark:bg-slate-700 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Camera className="text-brand-500" size={36} />
              </div>
              <h3 className="font-bold text-xl text-slate-800 dark:text-white mb-2">Modo Escáner Activo</h3>
              <p className="text-slate-600 dark:text-slate-300 mb-6 max-w-xs mx-auto">
                 Haz fotos a tu libro o sube un PDF. El sistema extraerá las preguntas automáticamente.
              </p>
              <Button onClick={() => document.getElementById('file-upload-trigger')?.click()} className="w-full sm:w-auto px-8 py-3 text-lg flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20">
                 <Upload size={20} /> Abrir Cámara / Archivo
              </Button>
              <div className="mt-4">
                <button onClick={addNewQuestionManual} className="text-sm text-brand-600 dark:text-brand-400 font-medium hover:underline">
                  O añadir pregunta manual
                </button>
              </div>
           </div>
           {questions.length > 0 && (
             <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-500 dark:text-slate-400 text-sm uppercase">
                  Preguntas extraídas ({questions.length})
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[500px] overflow-y-auto">
                  {questions.map((q, idx) => (
                    <div key={q.id} onClick={() => editQuestionFromList(idx)} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer flex gap-3 group transition-colors">
                       <span className="font-bold text-slate-300 dark:text-slate-600 group-hover:text-brand-500">{idx + 1}.</span>
                       <div className="flex-1">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 line-clamp-2">{q.text}</p>
                       </div>
                       <ChevronRight size={16} className="text-slate-300 self-center"/>
                    </div>
                  ))}
                </div>
             </div>
           )}
        </div>
      )}

      {/* --- VISTA EDITOR MANUAL --- */}
      {viewMode === 'editor' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-4">
             <div className="flex gap-1">
                 <Button variant="ghost" onClick={goToFirst} disabled={currentQIndex === 0} className="px-2 dark:text-slate-400 dark:hover:bg-slate-700">
                   <ChevronsLeft size={20} />
                 </Button>
                 <Button variant="ghost" onClick={() => navigateQuestion('prev')} disabled={currentQIndex === 0} className="px-2 dark:text-slate-300 dark:hover:bg-slate-700">
                   <ChevronLeft size={20} />
                 </Button>
             </div>
             <button onClick={goToPagePrompt} className="font-mono font-bold text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
               {displayIndex} <span className="text-slate-300 dark:text-slate-600">/</span> {displayTotal}
             </button>
             <div className="flex gap-1">
                 <Button variant="ghost" onClick={() => navigateQuestion('next')} disabled={currentQIndex === questions.length} className="px-2 text-brand-600 dark:text-brand-400 dark:hover:bg-slate-700">
                   <ChevronRight size={20} />
                 </Button>
                 <Button variant="secondary" onClick={addNewQuestionManual} className="px-2 ml-1 border-l border-slate-200 dark:border-slate-600 rounded-none rounded-r-lg" title="Nueva Pregunta">
                    <Plus size={20} className="text-brand-600 dark:text-brand-400"/>
                 </Button>
             </div>
          </div>
  
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 p-6 relative min-h-[400px]">
              <div className="mb-6">
                <label className="block text-xs uppercase text-slate-400 dark:text-slate-500 font-bold mb-2">Pregunta</label>
                <TextArea value={activeQ.text} onChange={e => updateCurrentQuestion('text', e.target.value)} placeholder="Escribe la pregunta aquí..." className="text-lg bg-slate-50 dark:bg-slate-900 dark:text-white dark:border-slate-700 border-slate-200 min-h-[100px] focus:bg-white dark:focus:bg-slate-800 transition-colors"/>
              </div>
              <div className="space-y-3">
                <label className="block text-xs uppercase text-slate-400 dark:text-slate-500 font-bold mb-2">Respuestas (Marca la correcta)</label>
                {activeQ.options.map((opt, oIndex) => (
                  <div key={opt.id} className="flex items-center gap-3 group">
                    <button onClick={() => setCorrectOption(opt.id)} className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${activeQ.correctOptionId === opt.id ? 'border-green-500 bg-green-500 text-white shadow-md shadow-green-200 dark:shadow-none' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-transparent hover:border-slate-400'}`}>
                      <CheckCircle size={18} fill="currentColor" className={activeQ.correctOptionId === opt.id ? 'text-white' : ''} />
                    </button>
                    <div className="flex-1 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs font-bold">{String.fromCharCode(65 + oIndex)}</span>
                      <Input value={opt.text} onChange={e => updateOption(oIndex, e.target.value)} placeholder={`Opción ${oIndex + 1}`} className="pl-8 py-3 bg-slate-50 dark:bg-slate-900 dark:text-white dark:border-slate-700 border-slate-200 focus:bg-white dark:focus:bg-slate-800 transition-colors shadow-sm"/>
                    </div>
                    <button onClick={() => { const newOptions = activeQ.options.filter((_, i) => i !== oIndex); updateCurrentQuestion('options', newOptions); }} className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <XCircle size={20} />
                    </button>
                  </div>
                ))}
                <button onClick={() => { const newOpt = { id: generateId(), text: '' }; updateCurrentQuestion('options', [...activeQ.options, newOpt]); }} className="mt-2 text-sm font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-brand-50 dark:hover:bg-slate-700 transition-colors w-fit">
                  <Plus size={16}/> Añadir otra opción
                </button>
              </div>
              {activeQ.id && currentQIndex < questions.length && (
                 <div className="absolute top-4 right-4">
                    <button onClick={() => { if(confirm("¿Borrar esta pregunta?")) { const newQs = questions.filter((_, i) => i !== currentQIndex); setQuestions(newQs); if(currentQIndex >= newQs.length) setCurrentQIndex(Math.max(0, newQs.length - 1)); } }} className="text-slate-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-full"><Trash2 size={20}/></button>
                 </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
};

const QuizPage = ({ user }: { user: User }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<AnswerDetail[]>([]);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    const loadTest = async () => {
      if (!id) return;
      const t = await storageService.getTestById(id);
      if (t) {
        setTest(t);
      }
      setLoading(false);
    };
    loadTest();
  }, [id]);

  const handleAnswer = (optionId: string) => {
    setSelectedOptionId(optionId);
  };

  const nextQuestion = async () => {
    if (!test || !selectedOptionId) return;

    const currentQuestion = test.questions[currentQuestionIndex];
    const isCorrect = selectedOptionId === currentQuestion.correctOptionId;

    const answerDetail: AnswerDetail = {
      questionId: currentQuestion.id,
      questionText: currentQuestion.text,
      selectedOptionId: selectedOptionId,
      correctOptionId: currentQuestion.correctOptionId,
      options: currentQuestion.options,
      isCorrect
    };

    const newAnswers = [...answers, answerDetail];
    setAnswers(newAnswers);
    setSelectedOptionId(null);

    if (currentQuestionIndex < test.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Finish
      const score = newAnswers.filter(a => a.isCorrect).length;
      const result: TestResult = {
        id: generateId(),
        userId: user.uid,
        testId: test.id,
        testTitle: test.title,
        date: Date.now(),
        score: Math.round((score / test.questions.length) * 10),
        totalQuestions: test.questions.length,
        details: newAnswers
      };
      
      await storageService.saveResult(result);
      setShowResult(true);
    }
  };

  if (loading) return <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-brand-500" /></div>;
  if (!test) return <div className="text-center pt-20">Test no encontrado</div>;

  if (showResult) {
    const score = answers.filter(a => a.isCorrect).length;
    return (
      <div className="max-w-2xl mx-auto p-6 pb-24">
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 text-center shadow-sm border border-slate-100 dark:border-slate-700 mb-6">
           <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Resultados</h2>
           <div className="text-5xl font-black text-brand-600 dark:text-brand-400 mb-2">{score} / {test.questions.length}</div>
           <p className="text-slate-500 dark:text-slate-400 mb-6">Puntuación: {Math.round((score / test.questions.length) * 10)}/10</p>
           <Button onClick={() => navigate('/')} className="w-full">Volver al Inicio</Button>
        </div>
        <div className="space-y-4">
          {answers.map((ans, idx) => (
            <div key={idx} className={`bg-white dark:bg-slate-800 p-4 rounded-xl border ${ans.isCorrect ? 'border-green-200 dark:border-green-900' : 'border-red-200 dark:border-red-900'}`}>
               <p className="font-medium text-slate-800 dark:text-white mb-2">{idx + 1}. {ans.questionText}</p>
               {ans.options.map(opt => {
                 const isSelected = opt.id === ans.selectedOptionId;
                 const isCorrect = opt.id === ans.correctOptionId;
                 let bg = "bg-slate-50 dark:bg-slate-900";
                 if (isCorrect) bg = "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300";
                 else if (isSelected) bg = "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300";
                 
                 return (
                   <div key={opt.id} className={`p-2 rounded mb-1 text-sm ${bg} flex justify-between`}>
                     <span>{opt.text}</span>
                     {isCorrect && <CheckCircle size={14}/>}
                     {isSelected && !isCorrect && <XCircle size={14}/>}
                   </div>
                 )
               })}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const question = test.questions[currentQuestionIndex];

  return (
    <div className="max-w-xl mx-auto p-4 flex flex-col h-[calc(100vh-80px)]">
      <header className="flex justify-between items-center mb-6">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X size={24} className="text-slate-400"/></button>
        <span className="font-bold text-slate-700 dark:text-slate-300">Pregunta {currentQuestionIndex + 1}/{test.questions.length}</span>
        <div className="w-10"></div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 leading-relaxed">{question.text}</h2>
        <div className="space-y-3">
          {question.options.map(opt => (
            <button
              key={opt.id}
              onClick={() => handleAnswer(opt.id)}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${selectedOptionId === opt.id ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 dark:border-brand-500' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-brand-200 dark:hover:border-slate-600'}`}
            >
              <span className="text-slate-800 dark:text-slate-200">{opt.text}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="pt-4 mt-auto">
        <Button onClick={nextQuestion} disabled={!selectedOptionId} className="w-full py-3 text-lg shadow-lg shadow-brand-200 dark:shadow-none">
          {currentQuestionIndex === test.questions.length - 1 ? 'Terminar' : 'Siguiente'}
        </Button>
      </div>
    </div>
  );
};

const App = () => {
  const { user, loading } = useAuth();
  const { isDark } = useDarkMode();

  // MAGIC LINK DETECTION
  useEffect(() => {
      const searchParams = new URLSearchParams(window.location.search);
      const key = searchParams.get('key');
      if(key) {
          localStorage.setItem('user_gemini_key', key);
          // Limpiar URL
          window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
          alert("🔑 Clave Mágica detectada y guardada.\n\nLa app está lista para usarse.");
      }
  }, []);

  if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-white dark:bg-slate-900"><Loader2 className="animate-spin text-brand-600" size={40} /></div>;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'dark bg-slate-900' : 'bg-slate-50'}`}>
      <HashRouter>
        <Routes>
          <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
          <Route path="/share/:id" element={user ? <SharePage user={user} /> : <LoginPage />} />
          <Route path="/" element={user ? <HomePage user={user} /> : <Navigate to="/login" />} />
          <Route path="/editor" element={user ? <EditorPage user={user} /> : <Navigate to="/login" />} />
          <Route path="/editor/:id" element={user ? <EditorPage user={user} /> : <Navigate to="/login" />} />
          <Route path="/quiz/:id" element={user ? <QuizPage user={user} /> : <Navigate to="/login" />} />
          <Route path="/settings" element={user ? <SettingsPage /> : <Navigate to="/login" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </div>
  );
};

export default App;