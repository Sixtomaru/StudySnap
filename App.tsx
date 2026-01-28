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
  Flag,
  PlusSquare,
  List
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

// Modal simple para saltar a una pregunta
const JumpToQuestionModal = ({ 
    isOpen, 
    totalQuestions, 
    onJump, 
    onCancel 
}: { 
    isOpen: boolean; 
    totalQuestions: number; 
    onJump: (index: number) => void; 
    onCancel: () => void;
}) => {
    const [val, setVal] = useState('');
    
    if (!isOpen) return null;

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        const num = parseInt(val);
        if (!isNaN(num) && num >= 1 && num <= totalQuestions) {
            onJump(num - 1);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xs p-6 border border-slate-100 dark:border-slate-700 animate-in zoom-in-95">
                 <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4 text-center">Ir a la pregunta</h3>
                 <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                     <Input 
                        autoFocus 
                        type="number" 
                        min={1} 
                        max={totalQuestions} 
                        placeholder={`1 - ${totalQuestions}`}
                        value={val}
                        onChange={e => setVal(e.target.value)}
                        className="text-center text-xl tracking-widest font-bold dark:bg-slate-700 dark:text-white"
                     />
                     <div className="grid grid-cols-2 gap-2">
                         <Button variant="ghost" onClick={onCancel} type="button">Cancelar</Button>
                         <Button type="submit" disabled={!val}>Ir</Button>
                     </div>
                 </form>
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

// ... Pages and Components remain the same until HomePage ...

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
  const [toast, setToast] = useState<{msg: string, type: 'success'|'error'|'info'} | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  // Estado para bloquear clicks mientras se crea el enlace
  const [creatingLink, setCreatingLink] = useState(false);

  useEffect(() => {
    loadTests();
    // Mostrar mensaje si venimos de importar
    if (location.state?.message) {
        setToast({ msg: location.state.message, type: 'success' });
        // Limpiamos el state para que no salga al refrescar (opcional, pero limpio)
        window.history.replaceState({}, document.title);
    }
  }, [user, location]);

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
            setToast({ msg: "Enlace copiado al portapapeles", type: "success" });
        }
    } catch (err: any) {
        console.error("Error compartiendo:", err);
        setToast({ msg: "Error al compartir", type: "error" });
    } finally {
        setCreatingLink(false);
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      
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

// --- Editor Page (Restaurado: Lista -> Detalle + Validaciones + PC Friendly) ---
const EditorPage = ({ user }: { user: User }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [test, setTest] = useState<Test | null>(null);
  const [initialTestJson, setInitialTestJson] = useState(''); // Para detectar cambios
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ msg: '', percent: 0 });
  
  // Modos de vista: 'list' (resumen) o 'single' (edición paginada)
  const [viewMode, setViewMode] = useState<'list' | 'single'>('list');
  const [currentIndex, setCurrentIndex] = useState(0); 
  const [showJumpModal, setShowJumpModal] = useState(false); 
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    storageService.getTestById(id).then(t => {
       if (t && t.userId === user.uid) {
           setTest(t);
           setInitialTestJson(JSON.stringify(t));
           // Si venimos de "Escanear" desde el FAB, autodisparar input
           if (location.state?.autoTriggerScan) {
               setTimeout(() => fileInputRef.current?.click(), 500);
           }
       }
       else navigate('/'); 
       setLoading(false);
    });
  }, [id, user]);

  const hasChanges = () => {
      if (!test) return false;
      return JSON.stringify(test) !== initialTestJson;
  };

  const validateTest = (t: Test): { valid: boolean, errors: string[] } => {
      const errors = [];
      if (!t.title.trim()) errors.push("El test no tiene título.");
      t.questions.forEach((q, idx) => {
          if (!q.text.trim()) errors.push(`La pregunta ${idx + 1} está vacía.`);
          if (!q.correctOptionId) errors.push(`La pregunta ${idx + 1} no tiene respuesta correcta marcada.`);
          if (q.options.some(o => !o.text.trim())) errors.push(`La pregunta ${idx + 1} tiene opciones vacías.`);
      });
      return { valid: errors.length === 0, errors };
  };

  const handleBack = () => {
      if (viewMode === 'single') {
          setViewMode('list');
          return;
      }
      
      const validation = test ? validateTest(test) : { valid: true, errors: [] };

      if (hasChanges()) {
          if (!window.confirm("Tienes cambios sin guardar. ¿Salir de todos modos?")) return;
      } else if (!validation.valid) {
          // Si no hay cambios pero hay errores (ej: importado incompleto), avisar
          if (!window.confirm(`ATENCIÓN:\n\n${validation.errors.join('\n')}\n\n¿Salir de todos modos?`)) return;
      }
      
      navigate('/');
  };

  const handleSave = async () => {
    if (!test) return;
    const validation = validateTest(test);
    if (!validation.valid) {
        alert(`No se puede guardar:\n\n${validation.errors.join('\n')}`);
        return;
    }

    setSaving(true);
    await storageService.saveTest(test);
    setInitialTestJson(JSON.stringify(test)); // Resetear estado sucio
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
         // Añadir preguntas
         const newQs = [...test.questions, ...questions];
         setTest(prev => prev ? ({ ...prev, questions: newQs }) : null);
         // Permanecer en vista lista para ver lo importado
         setViewMode('list');
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
        alert(err.message);
    } finally {
        setProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const deleteQuestion = (e: React.MouseEvent, qId: string) => {
      e.stopPropagation();
      if (!test) return;
      if (confirm("¿Borrar pregunta?")) {
        const newQs = test.questions.filter(q => q.id !== qId);
        setTest({ ...test, questions: newQs });
        // Si estábamos editando esta, salir a lista
        if (viewMode === 'single') setViewMode('list');
      }
  };

  const addQuestion = () => {
      const newQ: Question = {
          id: generateId(),
          text: '',
          options: [{ id: generateId(), text: '' }, { id: generateId(), text: '' }],
          correctOptionId: ''
      };
      setTest(prev => prev ? ({ ...prev, questions: [...prev.questions, newQ] }) : null);
      // Ir directamente a editar la nueva
      setCurrentIndex(test ? test.questions.length : 0);
      setViewMode('single');
  };

  const handleCardClick = (idx: number) => {
      setCurrentIndex(idx);
      setViewMode('single');
  };

  if (loading) return <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-brand-600" size={40} /></div>;
  if (!test) return <div>Test no encontrado</div>;

  const currentQ = test.questions[currentIndex];
  const totalQ = test.questions.length;

  return (
    <div className="pb-32 animate-in fade-in zoom-in-95 max-w-2xl mx-auto">
       <JumpToQuestionModal 
           isOpen={showJumpModal} 
           totalQuestions={totalQ} 
           onJump={(idx) => { setCurrentIndex(idx); setShowJumpModal(false); }} 
           onCancel={() => setShowJumpModal(false)} 
       />

       {/* HEADER */}
       <header className="sticky top-0 bg-slate-50 dark:bg-slate-900 z-20 py-4 flex justify-between items-center mb-2 backdrop-blur-sm bg-opacity-90">
          <button onClick={handleBack} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-700 dark:text-slate-300">
              <ArrowLeft />
          </button>
          <div className="flex gap-2">
             <Button size="sm" onClick={handleSave} disabled={saving} className={hasChanges() ? 'animate-pulse' : ''}>
                {saving ? <Loader2 className="animate-spin" /> : <Save size={16} />} 
                <span className="ml-2 hidden sm:inline">{hasChanges() ? 'Guardar *' : 'Guardar'}</span>
             </Button>
          </div>
       </header>

       {/* Título editable */}
       <div className="mb-6 px-2">
          <Input 
             value={test.title} 
             onChange={e => setTest({...test, title: e.target.value})} 
             className="text-2xl font-bold bg-transparent border-none px-0 focus:ring-0 text-slate-800 dark:text-white placeholder-slate-400" 
             placeholder="Título del test"
          />
          <p className="text-slate-400 text-sm mt-1">{totalQ} preguntas</p>
       </div>

       {/* --- VISTA DE LISTA (RESUMEN) --- */}
       {viewMode === 'list' && (
           <div className="space-y-4">
               {test.questions.length === 0 && (
                   <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                       <FileText size={32} className="mx-auto mb-2 opacity-50"/>
                       <p>Lista vacía. Añade o escanea preguntas.</p>
                   </div>
               )}

               {test.questions.map((q, idx) => {
                   const isValid = q.text.trim() && q.correctOptionId;
                   return (
                       <Card key={q.id} onClick={() => handleCardClick(idx)} className={`group relative cursor-pointer hover:border-brand-300 dark:bg-slate-800 dark:border-slate-700 ${!isValid ? 'border-red-300 bg-red-50 dark:bg-red-900/10' : ''}`}>
                           <div className="flex justify-between items-start gap-4">
                               <div className="flex items-start gap-3 flex-1 min-w-0">
                                   <span className="font-bold text-brand-600 dark:text-brand-400 text-lg min-w-[24px]">{idx + 1}.</span>
                                   <div className="flex-1">
                                       <p className="font-medium text-slate-800 dark:text-slate-200 line-clamp-2">
                                           {q.text || <span className="text-red-400 italic">Pregunta vacía</span>}
                                       </p>
                                       {!isValid && <span className="text-xs text-red-500 font-bold flex items-center gap-1 mt-1"><AlertTriangle size={12}/> Incompleta</span>}
                                   </div>
                               </div>
                               <button onClick={(e) => deleteQuestion(e, q.id)} className="text-slate-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors">
                                   <Trash2 size={18}/>
                               </button>
                           </div>
                       </Card>
                   )
               })}

               {/* Botones Fijos Abajo (Sticky) */}
               <div className="fixed bottom-6 left-0 right-0 flex justify-center gap-4 px-4 pointer-events-none">
                   <div className="flex gap-3 pointer-events-auto shadow-2xl rounded-full p-1 bg-white/90 dark:bg-slate-800/90 backdrop-blur border border-slate-200 dark:border-slate-700">
                       <button onClick={addQuestion} className="flex items-center gap-2 px-5 py-3 bg-brand-600 text-white rounded-full font-bold hover:bg-brand-700 transition-colors">
                           <PenTool size={18} /> Manual
                       </button>
                       <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf" onChange={handleFileUpload} />
                       <button onClick={() => fileInputRef.current?.click()} disabled={processing} className="flex items-center gap-2 px-5 py-3 bg-slate-800 dark:bg-white text-white dark:text-slate-900 rounded-full font-bold hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors">
                           {processing ? <Loader2 className="animate-spin" size={18} /> : <Camera size={18} />} Escanear
                       </button>
                   </div>
               </div>
           </div>
       )}

       {/* --- VISTA DE EDICIÓN PAGINADA --- */}
       {viewMode === 'single' && currentQ && (
           <div className="animate-in slide-in-from-right-10 duration-200">
                {/* NAVIGATION BAR COMPACTA */}
               <div className="bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 mb-6 flex items-center justify-between gap-1 max-w-xl mx-auto">
                   <button onClick={() => setCurrentIndex(0)} disabled={currentIndex === 0} className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ChevronsLeft size={20} /></button>
                   <button onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0} className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ChevronLeft size={20} /></button>
                   <button onClick={() => setShowJumpModal(true)} className="flex-1 text-center font-bold text-brand-600 bg-brand-50 py-1.5 rounded-md text-sm mx-1 truncate">{currentIndex + 1} / {totalQ}</button>
                   <button onClick={() => setCurrentIndex(Math.min(totalQ - 1, currentIndex + 1))} disabled={currentIndex === totalQ - 1} className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ChevronRight size={20} /></button>
                   <button onClick={() => setCurrentIndex(totalQ - 1)} disabled={currentIndex === totalQ - 1} className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ChevronsRight size={20} /></button>
                   <button onClick={addQuestion} className="w-9 h-9 flex items-center justify-center rounded-lg bg-brand-600 text-white shadow-md ml-1"><Plus size={20} /></button>
               </div>

               {/* EDITOR */}
               <Card className="relative group dark:bg-slate-800 dark:border-slate-700 min-h-[50vh] flex flex-col">
                   <div className="flex justify-between items-center mb-2">
                       <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pregunta</span>
                       <button onClick={(e) => deleteQuestion(e, currentQ.id)} className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                   </div>
                   
                   <TextArea 
                      value={currentQ.text} 
                      onChange={e => {
                          const newQs = [...test.questions];
                          newQs[currentIndex].text = e.target.value;
                          setTest({...test, questions: newQs});
                      }}
                      className="w-full text-lg font-medium bg-slate-50 dark:bg-slate-900 border-none p-4 rounded-xl focus:ring-2 focus:ring-brand-500 mb-6 flex-1 min-h-[120px]"
                      placeholder="Escribe la pregunta..."
                   />
                   
                   <div className="space-y-3">
                       <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Respuestas (Marca la correcta)</span>
                       {currentQ.options.map((opt, oIdx) => (
                           <div key={opt.id} className="flex items-center gap-2 group/opt">
                               <button 
                                 onClick={() => {
                                     const newQs = [...test.questions];
                                     newQs[currentIndex].correctOptionId = opt.id;
                                     setTest({...test, questions: newQs});
                                 }}
                                 className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full border-2 transition-all ${currentQ.correctOptionId === opt.id ? 'bg-green-500 border-green-500 text-white shadow-md' : 'border-slate-300 text-transparent hover:border-brand-400 dark:border-slate-600'}`}
                               >
                                   <CheckCircle size={20} fill="currentColor" className={currentQ.correctOptionId === opt.id ? 'opacity-100' : 'opacity-0 group-hover/opt:opacity-50'} />
                               </button>
                               
                               <div className="flex-1 relative">
                                   <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 w-4">{String.fromCharCode(65 + oIdx)}</div>
                                   <Input 
                                      value={opt.text}
                                      onChange={e => {
                                          const newQs = [...test.questions];
                                          newQs[currentIndex].options[oIdx].text = e.target.value;
                                          setTest({...test, questions: newQs});
                                      }}
                                      className="pl-8 py-3 text-sm w-full dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                      placeholder={`Opción ${oIdx + 1}`}
                                   />
                               </div>
                               <button onClick={() => {
                                     const newQs = [...test.questions];
                                     newQs[currentIndex].options = currentQ.options.filter(o => o.id !== opt.id);
                                     setTest({...test, questions: newQs});
                                 }} className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-lg"><X size={18} /></button>
                           </div>
                       ))}
                       <Button variant="ghost" size="sm" onClick={() => {
                           const newQs = [...test.questions];
                           newQs[currentIndex].options.push({id: generateId(), text: ''});
                           setTest({...test, questions: newQs});
                       }} className="w-full border-2 border-dashed border-slate-200 dark:border-slate-700 py-3 mt-2 hover:border-brand-300 text-slate-400 hover:text-brand-600">
                           + Añadir otra opción
                       </Button>
                   </div>
               </Card>
           </div>
       )}
    </div>
  );
};

// --- Quiz Page (Restaurado: Paso a paso) ---
const QuizPage = ({ user }: { user: User }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [test, setTest] = useState<Test | null>(null);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [showResults, setShowResults] = useState(false);
    const [loading, setLoading] = useState(true);
    // Nuevo: Control del índice actual
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (!id) return;
        storageService.getTestById(id).then(t => {
           if (t) setTest(t);
           setLoading(false);
        });
    }, [id]);

    const handleAnswer = (optionId: string) => {
        if (!test) return;
        setAnswers(prev => ({ ...prev, [test.questions[currentIndex].id]: optionId }));
        // No pasar automáticamente, esperar al botón "Siguiente"
    };

    const handleNext = () => {
        if (!test) return;
        if (currentIndex < test.questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            finishQuiz();
        }
    };

    const finishQuiz = async () => {
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

    const currentQ = test.questions[currentIndex];
    const isLast = currentIndex === test.questions.length - 1;
    const hasAnswered = !!answers[currentQ.id];

    return (
        <div className="max-w-3xl mx-auto pb-20 animate-in slide-in-from-right-10 duration-300">
             <header className="mb-6 flex items-center justify-between sticky top-0 bg-slate-50 dark:bg-slate-900 z-10 py-4">
                 <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"><ArrowLeft size={20}/> Salir</button>
                 <span className="font-bold text-slate-800 dark:text-white">{currentIndex + 1} / {test.questions.length}</span>
             </header>
             
             <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm min-h-[50vh] flex flex-col">
                 <h3 className="text-xl font-bold mb-6 text-slate-800 dark:text-white leading-relaxed">{currentQ.text}</h3>
                 <div className="grid gap-3 flex-1">
                     {currentQ.options.map(opt => (
                         <button 
                            key={opt.id}
                            onClick={() => handleAnswer(opt.id)}
                            className={`p-4 rounded-xl text-left border-2 transition-all ${answers[currentQ.id] === opt.id ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 shadow-md transform scale-[1.02]' : 'border-slate-100 dark:border-slate-700 hover:border-brand-200 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'}`}
                         >
                             {opt.text}
                         </button>
                     ))}
                 </div>
             </div>

             <div className="mt-8 flex justify-end sticky bottom-6">
                 {hasAnswered && (
                     <Button onClick={handleNext} className="px-8 py-3 text-lg shadow-xl shadow-brand-500/20 w-full md:w-auto flex items-center justify-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                         {isLast ? <>Finalizar Test <CheckCircle size={20}/></> : <>Siguiente Pregunta <ChevronRight size={20}/></>}
                     </Button>
                 )}
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
    // Nuevo estado para controlar autodisparo
    const [autoScanTrigger, setAutoScanTrigger] = useState(false); 
    const navigate = useNavigate();

    if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900"><Loader2 className="animate-spin text-brand-600" size={48}/></div>;

    if (!user) return <LoginPage />;

    const handleFabAction = (action: 'scan' | 'create') => {
        if (action === 'scan') setAutoScanTrigger(true);
        else setAutoScanTrigger(false);
        setListModalOpen(true);
    };

    const handleListSelect = async (testId: string | null, title?: string) => {
        setListModalOpen(false);
        const state = autoScanTrigger ? { autoTriggerScan: true } : {};
        
        if (testId) {
            navigate(`/editor/${testId}`, { state });
        } else if (title) {
            const newTest: Test = {
                id: generateId(),
                userId: user.uid,
                title: title,
                createdAt: Date.now(),
                questions: []
            };
            await storageService.saveTest(newTest);
            navigate(`/editor/${newTest.id}`, { state });
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