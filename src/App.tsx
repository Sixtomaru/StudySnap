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
  AlertTriangle,
  BookOpen,
  FileUp,
  Trophy,
  Calendar,
  Image as ImageIcon,
  Flag
} from 'lucide-react';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth, googleProvider } from './services/firebaseConfig';
import { Button, Card, Input, TextArea, Badge, Toast } from './components/UI';
import { Layout } from './components/Layout'; 
import { storageService } from './services/storageService';
import { parseFileToQuiz, getPDFPageCount, processPDFBatch } from './services/geminiService';
import { Test, Question, Option, TestResult, AnswerDetail, PDFProgress } from './types';

// --- Utils ---
const generateId = () => Math.random().toString(36).substring(2, 9);
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return isMobile;
};

// --- Auth Context ---
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
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  return { isDark, toggle: () => setIsDark(prev => !prev) };
};

// --- Components ---

// Modal de Confirmación Genérico
const ConfirmationModal = ({ 
    isOpen, 
    title, 
    message, 
    onConfirm, 
    confirmText = "Confirmar",
    onCancel, 
    onDiscard,
    discardText = "Descartar"
}: { 
    isOpen: boolean; 
    title: string; 
    message: string; 
    onConfirm: () => void; 
    confirmText?: string;
    onCancel: () => void; 
    onDiscard?: () => void;
    discardText?: string;
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-100 dark:border-slate-700 transform scale-100 animate-in zoom-in-95">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{title}</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">{message}</p>
                <div className="flex flex-col gap-3">
                    <Button onClick={onConfirm} className="w-full justify-center shadow-lg shadow-brand-500/20">
                        {confirmText}
                    </Button>
                    {onDiscard && (
                        <Button variant="danger" onClick={onDiscard} className="w-full justify-center">
                            {discardText}
                        </Button>
                    )}
                    <Button variant="ghost" onClick={onCancel} className="w-full justify-center">
                        Cancelar
                    </Button>
                </div>
            </div>
        </div>
    );
};

const ListSelectionModal = ({ user, onSelect, onCancel }: { user: User, onSelect: (testId: string | null, title?: string) => void, onCancel: () => void }) => {
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
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 w-full max-w-md border-2 border-slate-100 dark:border-slate-700 animate-in zoom-in-95 duration-200">
        <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">¿Dónde guardamos esto?</h2>
        {mode === 'existing' && tests.length > 0 ? (
          <div className="space-y-3">
             <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Elige una lista existente:</p>
             <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar">
               {tests.map(t => (
                 <button key={t.id} onClick={() => onSelect(t.id, t.title)} className="w-full text-left p-3 rounded-xl border border-slate-200 bg-slate-50 hover:border-brand-500 hover:bg-brand-50 dark:bg-slate-700 dark:border-slate-600 dark:hover:border-brand-500 dark:text-slate-200 transition-all flex justify-between items-center">
                   <span className="font-medium truncate">{t.title}</span>
                   <span className="text-xs text-slate-400 bg-white dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-100 dark:border-slate-600">{t.questions.length}</span>
                 </button>
               ))}
             </div>
             <div className="pt-4 border-t border-slate-100 dark:border-slate-700 mt-2">
               <Button variant="secondary" onClick={() => setMode('new')} className="w-full dark:bg-slate-700 dark:text-white dark:border-slate-600">+ Crear Nueva Lista</Button>
             </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Crear una lista nueva:</p>
            <Input autoFocus placeholder="Ej: Matemáticas T1" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-white"/>
            <div className="flex gap-2">
               {tests.length > 0 && (<Button variant="ghost" onClick={() => setMode('existing')}>Volver</Button>)}
               <Button className="flex-1" disabled={!newTitle.trim()} onClick={() => onSelect(null, newTitle)}>Crear y Continuar</Button>
            </div>
          </div>
        )}
        <button onClick={onCancel} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"><XCircle /></button>
      </div>
    </div>
  );
};

const SettingsPage = () => {
  const { isDark, toggle } = useDarkMode();
  const navigate = useNavigate();

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300">
      <header className="flex items-center gap-2 mb-8 md:hidden">
         <button onClick={() => navigate('/')} className="p-2 hover:bg-white/50 rounded-full text-slate-700 dark:text-slate-300"><ArrowLeft /></button>
         <h1 className="font-bold text-2xl text-slate-800 dark:text-white">Opciones</h1>
      </header>
      <h1 className="hidden md:block font-bold text-3xl text-slate-800 dark:text-white mb-8">Configuración</h1>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden mb-6">
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
          <button onClick={toggle} className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 ease-in-out ${isDark ? 'bg-brand-600' : 'bg-slate-200'}`}>
            <div className={`bg-white w-6 h-6 rounded-full shadow-sm transform transition-transform duration-300 ${isDark ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>
      
      <div className="text-center p-4">
          <Button variant="danger" onClick={() => signOut(auth)} className="w-full md:w-auto">Cerrar Sesión</Button>
          <p className="text-center text-slate-400 text-xs mt-8">StudySnap v2.2 • Gemini Powered</p>
      </div>
    </div>
  );
};

const HistoryPage = ({ user }: { user: User }) => {
    const [results, setResults] = useState<TestResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedResult, setSelectedResult] = useState<TestResult | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const load = async () => {
            const data = await storageService.getResults(user.uid);
            setResults(data);
            setLoading(false);
        };
        load();
    }, [user]);

    useEffect(() => {
        if (selectedResult) {
            const handlePopState = (event: PopStateEvent) => {
                event.preventDefault();
                setSelectedResult(null);
            };
            window.history.pushState({ modalOpen: true }, '', window.location.href);
            window.addEventListener('popstate', handlePopState);
            return () => {
                window.removeEventListener('popstate', handlePopState);
            };
        }
    }, [selectedResult]);

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if(confirm("¿Borrar este resultado?")) {
            await storageService.deleteResult(id);
            setResults(prev => prev.filter(r => r.id !== id));
            if(selectedResult?.id === id) setSelectedResult(null);
        }
    }

    const handleDeleteAll = async () => {
        if(confirm("¿ESTÁS SEGURO? Se borrará TODO tu historial de resultados.")) {
            await storageService.deleteAllResults(user.uid);
            setResults([]);
        }
    }

    if (loading) return <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-brand-500" size={40}/></div>;

    if (selectedResult) {
        return (
            <div className="fixed inset-0 bg-slate-50 dark:bg-slate-900 z-50 overflow-y-auto animate-in slide-in-from-bottom-5 duration-300 pb-20">
                <header className="sticky top-0 bg-white dark:bg-slate-800 p-4 flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 shadow-sm z-10">
                    <button onClick={() => window.history.back()} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"><ArrowLeft /></button>
                    <div>
                        <h2 className="font-bold text-slate-800 dark:text-white truncate max-w-[200px]">{selectedResult.testTitle}</h2>
                        <p className="text-xs text-slate-500">{new Date(selectedResult.date).toLocaleString()}</p>
                    </div>
                    <div className="ml-auto font-black text-xl text-brand-600 dark:text-brand-400">
                        {selectedResult.score}/10
                    </div>
                </header>
                <div className="p-4 max-w-2xl mx-auto space-y-4">
                    {selectedResult.details.map((ans, idx) => (
                        <div key={idx} className={`bg-white dark:bg-slate-800 p-4 rounded-xl border-l-4 ${ans.isCorrect ? 'border-green-500' : 'border-red-500'} shadow-sm`}>
                            <p className="font-bold text-slate-800 dark:text-white mb-2">{idx + 1}. {ans.questionText}</p>
                            {ans.options.map(opt => {
                                const isSelected = opt.id === ans.selectedOptionId;
                                const isCorrect = opt.id === ans.correctOptionId;
                                let bg = "bg-slate-50 dark:bg-slate-900";
                                if (isCorrect) bg = "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 ring-1 ring-green-500";
                                else if (isSelected) bg = "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 ring-1 ring-red-500";
                                
                                return (
                                    <div key={opt.id} className={`p-3 rounded-lg mb-2 text-sm font-medium ${bg} flex justify-between`}>
                                        <span>{opt.text}</span>
                                        {isCorrect && <CheckCircle size={16}/>}
                                        {isSelected && !isCorrect && <XCircle size={16}/>}
                                    </div>
                                )
                            })}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in zoom-in-95 duration-300">
             <header className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate('/')} className="md:hidden p-2 hover:bg-white/50 rounded-full text-slate-700 dark:text-slate-300"><ArrowLeft /></button>
                    <h1 className="font-bold text-3xl text-slate-800 dark:text-white">Historial</h1>
                </div>
                {results.length > 0 && (
                    <Button variant="danger" size="sm" onClick={handleDeleteAll} className="flex items-center gap-1">
                        <Trash2 size={16}/> Borrar todo
                    </Button>
                )}
             </header>

             {results.length === 0 ? (
                 <div className="text-center py-20 text-slate-400">
                     <HistoryIcon size={48} className="mx-auto mb-4 opacity-50"/>
                     <p>Aún no has completado ningún test.</p>
                 </div>
             ) : (
                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                     {results.map(res => (
                         <div key={res.id} onClick={() => setSelectedResult(res)} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col gap-3 cursor-pointer hover:border-brand-300 transition-colors group">
                             <div className="flex justify-between items-start">
                                 <div className="flex-1 min-w-0 pr-2">
                                     <h3 className="font-bold text-slate-800 dark:text-white text-lg truncate group-hover:text-brand-600 transition-colors">{res.testTitle}</h3>
                                     <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                         <Calendar size={12}/> {new Date(res.date).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                                     </p>
                                 </div>
                                 <div className={`px-3 py-1 rounded-lg font-bold text-sm flex-shrink-0 ${res.score >= 5 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                     {res.score}/10
                                 </div>
                             </div>
                             <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 mt-2">
                                 <div className={`h-2 rounded-full ${res.score >= 5 ? 'bg-green-500' : 'bg-red-500'}`} style={{width: `${res.score * 10}%`}}></div>
                             </div>
                             <div className="flex justify-between items-center pt-2 mt-auto">
                                 <span className="text-xs text-brand-600 dark:text-brand-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Ver detalles</span>
                                 <button onClick={(e) => handleDelete(e, res.id)} className="text-slate-400 hover:text-red-500 text-sm flex items-center gap-1 transition-colors z-10 p-1 hover:bg-red-50 rounded">
                                     <Trash2 size={16}/>
                                 </button>
                             </div>
                         </div>
                     ))}
                 </div>
             )}
        </div>
    );
}

const HomePage = ({ user }: { user: User }) => {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  // Estado para bloquear clicks mientras se crea el enlace
  const [creatingLink, setCreatingLink] = useState(false);

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
  
  const handleShare = async (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    if (creatingLink) return;
    setCreatingLink(true);

    try {
        // 1. Crear copia pública en 'shares'
        const shareId = await storageService.createPublicShare(id);
        const url = `${window.location.origin}/#/share/${shareId}`;

        // 2. Usar compartir nativo
        if (navigator.share) {
            await navigator.share({
                title: 'StudySnap - ' + title,
                text: `¡Haz este test "${title}" en StudySnap!`,
                url: url
            });
        } else {
            // Fallback
            await navigator.clipboard.writeText(url);
            alert("Enlace público copiado al portapapeles. ¡Cualquiera puede importarlo!");
        }
    } catch (err: any) {
        console.error("Error compartiendo:", err);
        alert("No se pudo crear el enlace compartido. Intenta de nuevo.");
    } finally {
        setCreatingLink(false);
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
      <header className="flex justify-between items-center bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-white/50 dark:border-slate-700 md:hidden">
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
           <button onClick={() => navigate('/settings')} className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 rounded-full bg-white dark:bg-slate-700 shadow-sm"><Settings size={20}/></button>
           <button onClick={() => signOut(auth)} className="p-2 text-slate-400 hover:text-red-500 rounded-full bg-white dark:bg-slate-700 shadow-sm"><LogOut size={20}/></button>
        </div>
      </header>
      
      {/* Header Desktop */}
      <div className="hidden md:flex justify-between items-end mb-6">
         <div>
             <h2 className="text-3xl font-bold text-slate-800 dark:text-white">Mis Listas</h2>
             <span className="text-slate-400">{tests.length} listas</span>
         </div>
         <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate('/settings')} className="flex items-center gap-2"><Settings size={18}/> Ajustes</Button>
            <Button variant="ghost" onClick={() => signOut(auth)} className="flex items-center gap-2 text-red-500 hover:bg-red-50"><LogOut size={18}/> Salir</Button>
         </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-brand-500" size={40} /></div>
      ) : tests.length === 0 ? (
        <div className="text-center py-20 text-slate-400 bg-white/60 dark:bg-slate-800/60 rounded-3xl border border-white dark:border-slate-700 shadow-sm mx-auto max-w-lg">
          <div className="bg-slate-100 dark:bg-slate-700 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText size={40} className="text-slate-300 dark:text-slate-500" />
          </div>
          <h2 className="text-xl font-semibold text-slate-600 dark:text-slate-300 mb-2">No tienes listas guardadas</h2>
          <p className="text-slate-500 dark:text-slate-400">Usa el botón + para crear tu primera lista.</p>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
          {tests.map(test => (
            <Card key={test.id} onClick={() => navigate(`/editor/${test.id}`)} className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 hover:border-brand-200 dark:hover:border-brand-700 hover:shadow-lg transition-all cursor-pointer h-full flex flex-col justify-between group">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-brand-50 dark:bg-slate-700 p-3 rounded-xl text-brand-600 dark:text-brand-400 border border-brand-100 dark:border-slate-600">
                    <FileText size={24}/>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={(e) => handleShare(e, test.id, test.title)} disabled={creatingLink} className="text-slate-400 hover:text-brand-600 dark:text-slate-500 dark:hover:text-brand-400 p-2 hover:bg-brand-50 dark:hover:bg-slate-700 rounded-lg transition-colors">
                      {creatingLink ? <Loader2 size={18} className="animate-spin"/> : <Share2 size={18} />}
                    </button>
                    <button onClick={(e) => handleDelete(e, test.id)} className="text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 p-2 hover:bg-red-50 dark:hover:bg-slate-700 rounded-lg transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100 line-clamp-2 mb-2 group-hover:text-brand-600 transition-colors">{test.title}</h3>
                <div className="text-sm text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
                    <Badge color="blue">{test.questions.length} preguntas</Badge>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                 <Button variant="primary" onClick={(e) => {e.stopPropagation(); navigate(`/quiz/${test.id}`)}} className="w-full text-sm py-2 flex justify-center items-center gap-2 shadow-md shadow-brand-200 dark:shadow-none">
                   <Play size={16} /> Jugar
                 </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const SharePage = ({ user }: { user: User }) => {
  const { id } = useParams(); // 'id' aquí será el shareId
  const navigate = useNavigate();
  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      // Ahora usamos getSharedTest en lugar de getTestById
      const t = await storageService.getSharedTest(id);
      if (t) {
        setTest(t);
      } else {
        setError('Enlace no válido o expirado.');
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const handleImport = async () => {
    if (!test || !user) return;
    setLoading(true);
    try {
      // Usamos importTest pasando el objeto que ya descargamos
      const newId = await storageService.importTest(test, user.uid);
      navigate(`/quiz/${newId}`); 
    } catch (e: any) {
      alert("Error al importar: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-brand-500" size={40} /></div>;
  if (error || !test) return <div className="p-8 text-center"><h2 className="text-xl font-bold mb-2">Error</h2><p>{error}</p><Button onClick={() => navigate('/')} className="mt-4">Volver</Button></div>;

  return (
    <div className="max-w-md mx-auto p-6 pt-20 text-center animate-in fade-in zoom-in-95">
       <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl border border-slate-100 dark:border-slate-700">
          <div className="w-20 h-20 bg-brand-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-6">
             <Download size={40} className="text-brand-600 dark:text-brand-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{test.title}</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8">{test.questions.length} preguntas</p>
          
          <Button onClick={handleImport} className="w-full py-3 mb-3 shadow-lg shadow-brand-500/20">
             Añadir a mis listas
          </Button>
          <Button variant="ghost" onClick={() => navigate('/')} className="w-full">Cancelar</Button>
       </div>
    </div>
  );
};

// --- Editor Page (Reconstructed) ---
const EditorPage = ({ user }: { user: User }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ msg: '', percent: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    storageService.getTestById(id).then(t => {
       if (t && t.userId === user.uid) setTest(t);
       else navigate('/'); // No access or not found
       setLoading(false);
    });
  }, [id, user]);

  const handleSave = async () => {
    if (!test) return;
    setSaving(true);
    await storageService.saveTest(test);
    setSaving(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !test) return;
    
    setProcessing(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
         const base64 = (ev.target?.result as string).split(',')[1];
         const questions = await parseFileToQuiz(base64, file.type, (msg, p) => setProgress({msg, percent: p}));
         setTest(prev => prev ? ({ ...prev, questions: [...prev.questions, ...questions] }) : null);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
        alert(err.message);
    } finally {
        setProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const deleteQuestion = (qId: string) => {
      setTest(prev => prev ? ({ ...prev, questions: prev.questions.filter(q => q.id !== qId) }) : null);
  };

  const addQuestion = () => {
      const newQ: Question = {
          id: generateId(),
          text: 'Nueva pregunta',
          options: [
              { id: generateId(), text: 'Opción 1' },
              { id: generateId(), text: 'Opción 2' }
          ],
          correctOptionId: ''
      };
      setTest(prev => prev ? ({ ...prev, questions: [...prev.questions, newQ] }) : null);
  };

  if (loading) return <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-brand-600" size={40} /></div>;
  if (!test) return <div>Test no encontrado</div>;

  return (
    <div className="pb-20 animate-in fade-in zoom-in-95">
       <header className="sticky top-0 bg-slate-50 dark:bg-slate-900 z-20 py-4 flex justify-between items-center mb-4 backdrop-blur-sm bg-opacity-90">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-700 dark:text-slate-300"><ArrowLeft /></button>
          <div className="flex gap-2">
             <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf" onChange={handleFileUpload} />
             <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} disabled={processing}>
                {processing ? `${progress.percent}%` : <><Camera size={16} className="mr-2 inline"/> Escanear</>}
             </Button>
             <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="animate-spin" /> : <Save size={16} />}
             </Button>
          </div>
       </header>
       
       <div className="mb-6">
          <Input 
             value={test.title} 
             onChange={e => setTest({...test, title: e.target.value})} 
             className="text-2xl font-bold bg-transparent border-none px-0 focus:ring-0 text-slate-800 dark:text-white placeholder-slate-400" 
             placeholder="Título del test"
          />
       </div>

       <div className="space-y-6">
           {test.questions.map((q, idx) => (
               <Card key={q.id} className="relative group dark:bg-slate-800 dark:border-slate-700">
                   <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button onClick={() => deleteQuestion(q.id)} className="text-red-400 hover:text-red-600"><Trash2 size={18}/></button>
                   </div>
                   <div className="mb-4 pr-8">
                       <span className="text-xs font-bold text-slate-400 block mb-1">Pregunta {idx + 1}</span>
                       <TextArea 
                          value={q.text} 
                          onChange={e => {
                              const newQs = [...test.questions];
                              newQs[idx].text = e.target.value;
                              setTest({...test, questions: newQs});
                          }}
                          className="w-full text-lg font-medium bg-transparent border-none p-0 focus:ring-0 text-slate-800 dark:text-white"
                          rows={2}
                          placeholder="Escribe la pregunta..."
                       />
                   </div>
                   <div className="space-y-2">
                       {q.options.map((opt, oIdx) => (
                           <div key={opt.id} className="flex items-center gap-2">
                               <button 
                                 onClick={() => {
                                     const newQs = [...test.questions];
                                     newQs[idx].correctOptionId = opt.id;
                                     setTest({...test, questions: newQs});
                                 }}
                                 className={`p-2 rounded-full border transition-colors ${q.correctOptionId === opt.id ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 text-transparent hover:border-brand-400 dark:border-slate-600'}`}
                               >
                                   <CheckCircle size={16} />
                               </button>
                               <Input 
                                  value={opt.text}
                                  onChange={e => {
                                      const newQs = [...test.questions];
                                      newQs[idx].options[oIdx].text = e.target.value;
                                      setTest({...test, questions: newQs});
                                  }}
                                  className="py-2 text-sm flex-1 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                  placeholder={`Opción ${oIdx + 1}`}
                               />
                               <button 
                                 onClick={() => {
                                     const newQs = [...test.questions];
                                     newQs[idx].options = q.options.filter(o => o.id !== opt.id);
                                     setTest({...test, questions: newQs});
                                 }}
                                 className="text-slate-300 hover:text-red-400"
                               >
                                   <X size={16} />
                               </button>
                           </div>
                       ))}
                       <Button variant="ghost" size="sm" onClick={() => {
                           const newQs = [...test.questions];
                           newQs[idx].options.push({id: generateId(), text: ''});
                           setTest({...test, questions: newQs});
                       }} className="text-brand-600 dark:text-brand-400">+ Opción</Button>
                   </div>
               </Card>
           ))}
       </div>
       
       <div className="mt-8 text-center">
           <Button variant="secondary" onClick={addQuestion} className="w-full py-4 border-dashed border-2 dark:border-slate-700 dark:bg-slate-800/50">+ Añadir Pregunta Manualmente</Button>
       </div>
    </div>
  );
};

// --- Quiz Page (Reconstructed) ---
const QuizPage = ({ user }: { user: User }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [test, setTest] = useState<Test | null>(null);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [showResults, setShowResults] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        storageService.getTestById(id).then(t => {
           if (t) setTest(t);
           setLoading(false);
        });
    }, [id]);

    const handleSubmit = async () => {
        if (!test) return;
        let score = 0;
        const details: AnswerDetail[] = test.questions.map(q => {
            const isCorrect = answers[q.id] === q.correctOptionId;
            if (isCorrect) score++;
            return {
                questionId: q.id,
                questionText: q.text,
                selectedOptionId: answers[q.id],
                correctOptionId: q.correctOptionId,
                options: q.options,
                isCorrect
            };
        });

        const finalScore = test.questions.length > 0 ? Math.round((score / test.questions.length) * 10) : 0;
        
        const result: TestResult = {
            id: generateId(),
            userId: user.uid,
            testId: test.id,
            testTitle: test.title,
            date: Date.now(),
            score: finalScore,
            totalQuestions: test.questions.length,
            details
        };

        await storageService.saveResult(result);
        setShowResults(true);
    };

    if (loading) return <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-brand-600" size={40} /></div>;
    if (!test) return <div>Test no encontrado</div>;

    if (showResults) {
        const correctCount = Object.keys(answers).filter(k => answers[k] === test.questions.find(q => q.id === k)?.correctOptionId).length;
        return (
            <div className="p-4 max-w-2xl mx-auto animate-in fade-in pt-20">
                <div className="text-center mb-8">
                    <Trophy size={64} className="mx-auto text-yellow-500 mb-4"/>
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-white">Resultado</h2>
                    <p className="text-xl text-slate-600 dark:text-slate-300 mt-2 mb-6">
                        Has acertado {correctCount} de {test.questions.length}
                    </p>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 mb-8">
                        <div className="bg-brand-500 h-4 rounded-full transition-all duration-1000" style={{width: `${(correctCount / test.questions.length) * 100}%`}}></div>
                    </div>
                    <Button onClick={() => navigate('/')} className="px-8 shadow-xl">Volver al Inicio</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto pb-20 animate-in slide-in-from-right-10 duration-300">
             <header className="mb-6 flex items-center justify-between sticky top-0 bg-slate-50 dark:bg-slate-900 z-10 py-4">
                 <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"><ArrowLeft size={20}/> Salir</button>
                 <span className="font-bold text-slate-800 dark:text-white">{Object.keys(answers).length}/{test.questions.length} Respondidas</span>
             </header>
             
             <div className="space-y-8">
                 {test.questions.map((q, idx) => (
                     <div key={q.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                         <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-white"><span className="text-brand-600 mr-2">#{idx + 1}</span> {q.text}</h3>
                         <div className="grid gap-3">
                             {q.options.map(opt => (
                                 <button 
                                    key={opt.id}
                                    onClick={() => setAnswers(prev => ({...prev, [q.id]: opt.id}))}
                                    className={`p-4 rounded-xl text-left border-2 transition-all ${answers[q.id] === opt.id ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300' : 'border-slate-100 dark:border-slate-700 hover:border-brand-200 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'}`}
                                 >
                                     {opt.text}
                                 </button>
                             ))}
                         </div>
                     </div>
                 ))}
             </div>

             <div className="mt-8 flex justify-end sticky bottom-6">
                 <Button onClick={handleSubmit} disabled={Object.keys(answers).length < test.questions.length} className="px-8 py-3 text-lg shadow-xl shadow-brand-500/20 w-full md:w-auto">
                     Finalizar Test
                 </Button>
             </div>
        </div>
    );
};

// --- Login Page (Reconstructed) ---
const LoginPage = () => (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900 animate-in fade-in duration-500">
        <div className="text-center mb-8">
            <div className="w-20 h-20 bg-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-brand-600/30 transform -rotate-6">
                <FileText className="text-white w-10 h-10" />
            </div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">StudySnap</h1>
            <p className="text-slate-500 dark:text-slate-400 text-lg">Tu compañero de estudio con IA</p>
        </div>
        <Card className="w-full max-w-sm p-8 flex flex-col gap-4 shadow-xl border-0 dark:bg-slate-800">
             <Button onClick={() => signInWithPopup(auth, googleProvider)} className="w-full py-3 flex justify-center items-center gap-3 text-base">
                 <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.64 2 12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c5.19 0 10-3.6 10-10 0-.83-.1-1.28-.1-1.28z"/></svg>
                 Continuar con Google
             </Button>
        </Card>
        <p className="mt-8 text-xs text-slate-400">© 2024 StudySnap. Powered by Gemini.</p>
    </div>
);

// --- APP COMPONENT ---
const AppContent = () => {
    const { user, loading } = useAuth();
    useDarkMode(); // Init dark mode
    const [listModalOpen, setListModalOpen] = useState(false);
    const navigate = useNavigate();

    if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900"><Loader2 className="animate-spin text-brand-600" size={48}/></div>;

    if (!user) return <LoginPage />;

    const handleFabAction = (action: 'scan' | 'create') => {
        // En ambos casos abrimos el modal para elegir/crear lista
        setListModalOpen(true);
    };

    const handleListSelect = async (testId: string | null, title?: string) => {
        setListModalOpen(false);
        if (testId) {
            navigate(`/editor/${testId}`);
        } else if (title) {
            // Create new
            const newTest: Test = {
                id: generateId(),
                userId: user.uid,
                title: title,
                createdAt: Date.now(),
                questions: []
            };
            await storageService.saveTest(newTest);
            navigate(`/editor/${newTest.id}`);
        }
    };

    return (
        <>
            <Layout onFabAction={handleFabAction}>
                <Routes>
                    <Route path="/" element={<HomePage user={user} />} />
                    <Route path="/history" element={<HistoryPage user={user} />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/editor/:id" element={<EditorPage user={user} />} />
                    <Route path="/quiz/:id" element={<QuizPage user={user} />} />
                    <Route path="/share/:id" element={<SharePage user={user} />} />
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </Layout>
            
            {listModalOpen && (
                <ListSelectionModal 
                   user={user} 
                   onSelect={handleListSelect} 
                   onCancel={() => setListModalOpen(false)} 
                />
            )}
        </>
    );
};

export default function App() {
    return (
        <HashRouter>
            <AppContent />
        </HashRouter>
    );
}