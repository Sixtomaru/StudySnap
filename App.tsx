import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, useNavigate, useLocation, useParams, Navigate, useSearchParams } from 'react-router-dom';
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
  List,
  Shuffle,
  AlertCircle,
  Check
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

const shuffleArray = <T,>(array: T[]): T[] => {
    return [...array].sort(() => Math.random() - 0.5);
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

// Overlay "¡Guardado!"
const SavedOverlay = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
        <div className="bg-slate-800/90 dark:bg-white/90 backdrop-blur-md text-white dark:text-slate-900 px-8 py-6 rounded-2xl shadow-2xl flex flex-col items-center gap-3 animate-in zoom-in-50 fade-in duration-300">
            <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                <Check size={32} className="text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">¡Guardado!</span>
        </div>
    </div>
);

// Modal de Error/Alerta
const AlertModal = ({ 
    isOpen, 
    title = "Error", 
    message, 
    onClose 
}: { 
    isOpen: boolean; 
    title?: string; 
    message: string; 
    onClose: () => void; 
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-100 dark:border-slate-700 animate-in zoom-in-95">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600 mb-4 mx-auto">
                    <AlertCircle size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2 text-center">{title}</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6 text-center leading-relaxed">{message}</p>
                <Button onClick={onClose} className="w-full justify-center">
                    Aceptar
                </Button>
            </div>
        </div>
    );
};

// Modal de Confirmación Genérico
const ConfirmationModal = ({ 
    isOpen, 
    title, 
    message, 
    onConfirm, 
    confirmText = "Confirmar",
    confirmVariant = "primary",
    onCancel, 
    onDiscard,
    discardText = "Descartar",
    discardVariant = "danger",
    variant = "primary" // Fallback
}: { 
    isOpen: boolean; 
    title: string; 
    message: string; 
    onConfirm: () => void; 
    confirmText?: string;
    confirmVariant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
    onCancel: () => void; 
    onDiscard?: () => void;
    discardText?: string;
    discardVariant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
    variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-100 dark:border-slate-700 transform scale-100 animate-in zoom-in-95">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{title}</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">{message}</p>
                <div className="flex flex-col gap-3">
                    <Button onClick={onConfirm} variant={confirmVariant} className="w-full justify-center">
                        {confirmText}
                    </Button>
                    {onDiscard && (
                        <Button variant={discardVariant} onClick={onDiscard} className="w-full justify-center">
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
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
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

    const handleDelete = async () => {
        if (!deleteId) return;
        await storageService.deleteResult(deleteId);
        setResults(prev => prev.filter(r => r.id !== deleteId));
        if(selectedResult?.id === deleteId) setSelectedResult(null);
        setDeleteId(null);
    }

    const handleDeleteAll = async () => {
        await storageService.deleteAllResults(user.uid);
        setResults([]);
        setDeleteAllConfirm(false);
    }

    const getPercentage = (score: number, total: number) => {
        if (total === 0) return 0;
        return Math.round((score / total) * 100);
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
                        {Math.round((selectedResult.score / 10) * 100)}%
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
             {/* Modales de confirmación */}
             <ConfirmationModal 
                isOpen={!!deleteId}
                title="¿Borrar resultado?"
                message="Esta acción no se puede deshacer."
                confirmText="Borrar"
                confirmVariant="danger"
                onConfirm={handleDelete}
                onCancel={() => setDeleteId(null)}
             />
             <ConfirmationModal 
                isOpen={deleteAllConfirm}
                title="¿Borrar TODO?"
                message="Se eliminará todo tu historial de resultados permanentemente."
                confirmText="Borrar Todo"
                confirmVariant="danger"
                onConfirm={handleDeleteAll}
                onCancel={() => setDeleteAllConfirm(false)}
             />

             <header className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate('/')} className="md:hidden p-2 hover:bg-white/50 rounded-full text-slate-700 dark:text-slate-300"><ArrowLeft /></button>
                    <h1 className="font-bold text-3xl text-slate-800 dark:text-white">Historial</h1>
                </div>
                {results.length > 0 && (
                    <Button variant="danger" size="sm" onClick={() => setDeleteAllConfirm(true)} className="flex items-center gap-1">
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
                     {results.map(res => {
                         const percent = Math.round((res.score / 10) * 100); // Score is always out of 10
                         return (
                             <div key={res.id} onClick={() => setSelectedResult(res)} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col gap-3 cursor-pointer hover:border-brand-300 transition-colors group">
                                 <div className="flex justify-between items-start">
                                     <div className="flex-1 min-w-0 pr-2">
                                         <h3 className="font-bold text-slate-800 dark:text-white text-lg truncate group-hover:text-brand-600 transition-colors">{res.testTitle}</h3>
                                         <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                             <Calendar size={12}/> {new Date(res.date).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                                         </p>
                                     </div>
                                     <div className={`px-3 py-1 rounded-lg font-bold text-sm flex-shrink-0 ${percent >= 50 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                         {percent}%
                                     </div>
                                 </div>
                                 <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 mt-2">
                                     <div className={`h-2 rounded-full ${percent >= 50 ? 'bg-green-500' : 'bg-red-500'}`} style={{width: `${percent}%`}}></div>
                                 </div>
                                 <div className="flex justify-between items-center pt-2 mt-auto">
                                     <span className="text-xs text-brand-600 dark:text-brand-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Ver detalles</span>
                                     <button onClick={(e) => { e.stopPropagation(); setDeleteId(res.id); }} className="text-slate-400 hover:text-red-500 text-sm flex items-center gap-1 transition-colors z-10 p-1 hover:bg-red-50 rounded">
                                         <Trash2 size={16}/>
                                     </button>
                                 </div>
                             </div>
                         )
                     })}
                 </div>
             )}
        </div>
    );
}

const HomePage = ({ user }: { user: User }) => {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{msg: string, type: 'success'|'error'|'info'} | null>(null);
  const [randomSettings, setRandomSettings] = useState<{shuffleQ: boolean, shuffleA: boolean}>(() => {
      const saved = localStorage.getItem('randomSettings');
      return saved ? JSON.parse(saved) : { shuffleQ: false, shuffleA: false };
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const [creatingLink, setCreatingLink] = useState(false);

  useEffect(() => {
    loadTests();
    if (location.state?.message) {
        setToast({ msg: location.state.message, type: 'success' });
        window.history.replaceState({}, document.title);
    }
  }, [user, location]);

  useEffect(() => {
      localStorage.setItem('randomSettings', JSON.stringify(randomSettings));
  }, [randomSettings]);

  const loadTests = async () => {
    setLoading(true);
    const data = await storageService.getTests(user.uid);
    setTests(data);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await storageService.deleteTest(deleteId);
    setTests(prev => prev.filter(t => t.id !== deleteId));
    setDeleteId(null);
  };
  
  const handleShare = async (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    if (creatingLink) return;
    setCreatingLink(true);

    try {
        const shareId = await storageService.createPublicShare(id);
        const url = `${window.location.origin}/#/share/${shareId}`;

        if (navigator.share) {
            await navigator.share({
                title: 'StudySnap - ' + title,
                text: `¡Haz este test "${title}" en StudySnap!`,
                url: url
            });
        } else {
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

  const toggleRandom = (e: React.MouseEvent, type: 'Q' | 'A') => {
      e.stopPropagation();
      setRandomSettings(prev => ({
          ...prev,
          shuffleQ: type === 'Q' ? !prev.shuffleQ : prev.shuffleQ,
          shuffleA: type === 'A' ? !prev.shuffleA : prev.shuffleA
      }));
  };

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* Modal borrar lista */}
      <ConfirmationModal
         isOpen={!!deleteId}
         title="¿Eliminar lista?"
         message="Se perderán todas las preguntas de esta lista."
         confirmText="Eliminar"
         confirmVariant="danger"
         onConfirm={handleDelete}
         onCancel={() => setDeleteId(null)}
      />

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
                    <button onClick={(e) => {e.stopPropagation(); setDeleteId(test.id)}} className="text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 p-2 hover:bg-red-50 dark:hover:bg-slate-700 rounded-lg transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100 line-clamp-2 mb-2 group-hover:text-brand-600 transition-colors">{test.title}</h3>
                <div className="text-sm text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
                    <Badge color="blue">{test.questions.length} preguntas</Badge>
                </div>
                
                {/* Opciones de aleatoriedad */}
                <div className="flex gap-2 mt-4 flex-wrap">
                    <button onClick={(e) => toggleRandom(e, 'Q')} className={`text-xs px-2 py-1 rounded-md border flex items-center gap-1 transition-colors ${randomSettings.shuffleQ ? 'bg-brand-100 border-brand-200 text-brand-700 dark:bg-brand-900/40 dark:border-brand-700 dark:text-brand-300' : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-400'}`}>
                        Preguntas <Shuffle size={12}/>
                    </button>
                    <button onClick={(e) => toggleRandom(e, 'A')} className={`text-xs px-2 py-1 rounded-md border flex items-center gap-1 transition-colors ${randomSettings.shuffleA ? 'bg-brand-100 border-brand-200 text-brand-700 dark:bg-brand-900/40 dark:border-brand-700 dark:text-brand-300' : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-400'}`}>
                        Respuestas <Shuffle size={12}/>
                    </button>
                </div>

              </div>
              <div className="pt-4 border-t border-slate-100 dark:border-slate-700 mt-4">
                 <Button variant="primary" onClick={(e) => {
                     e.stopPropagation(); 
                     // Pasar settings via URL para que QuizPage las lea
                     navigate(`/quiz/${test.id}?rndQ=${randomSettings.shuffleQ}&rndA=${randomSettings.shuffleA}`)
                 }} className="w-full text-sm py-2 flex justify-center items-center gap-2 shadow-md shadow-brand-200 dark:shadow-none">
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
  const [showSavedOverlay, setShowSavedOverlay] = useState(false);
  
  // States para Modales
  const [errorModal, setErrorModal] = useState<{isOpen: boolean, msg: string}>({isOpen: false, msg: ''});
  const [unsavedModalOpen, setUnsavedModalOpen] = useState(false);
  const [deleteQId, setDeleteQId] = useState<string | null>(null);
  const [toast, setToast] = useState<{msg: string, type: 'success'|'error'|'info'} | null>(null);
  
  // States para Validaciones al salir
  const [validationModal, setValidationModal] = useState<{ type: 'empty' | 'correct' | null, index: number, isExiting: boolean }>({ type: null, index: -1, isExiting: false });

  // Modos de vista: 'list' (resumen) o 'single' (edición paginada)
  const [viewMode, setViewMode] = useState<'list' | 'single'>('list');
  const [currentIndex, setCurrentIndex] = useState(0); 
  const [showJumpModal, setShowJumpModal] = useState(false); 
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    storageService.getTestById(id).then(t => {
       if (t && t.userId === user.uid) {
           let loadedTest = t;
           // Auto-crear pregunta si venimos de modo manual
           if (location.state?.autoCreateQuestion) {
               const newQ: Question = {
                  id: generateId(),
                  text: '',
                  // AHORA CON 4 OPCIONES POR DEFECTO
                  options: [
                      { id: generateId(), text: '' },
                      { id: generateId(), text: '' },
                      { id: generateId(), text: '' },
                      { id: generateId(), text: '' }
                  ],
                  correctOptionId: ''
               };
               loadedTest = { ...t, questions: [...t.questions, newQ] };
               setCurrentIndex(t.questions.length); // Ir a la nueva
               setViewMode('single'); // Entrar a editar
           }

           setTest(loadedTest);
           setInitialTestJson(JSON.stringify(t)); // Base original es la guardada

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

  const checkValidationAndSave = async (skipEmptyCheck = false, skipCorrectCheck = false) => {
      if (!test) return;
      
      // 1. Chequeo de opciones vacías
      if (!skipEmptyCheck) {
          const emptyOptionIndex = test.questions.findIndex(q => q.options.some(o => !o.text.trim()));
          if (emptyOptionIndex !== -1) {
              setValidationModal({ type: 'empty', index: emptyOptionIndex, isExiting: true });
              return; // Detenemos guardado
          }
      }

      // 2. Chequeo de respuesta correcta no marcada
      if (!skipCorrectCheck) {
          const noCorrectIndex = test.questions.findIndex(q => !q.correctOptionId);
          if (noCorrectIndex !== -1) {
              setValidationModal({ type: 'correct', index: noCorrectIndex, isExiting: true });
              return; // Detenemos guardado
          }
      }

      // Si pasa todo, guardamos y salimos
      await performSave(true);
  };

  const handleBack = () => {
      if (viewMode === 'single') {
          setViewMode('list');
          return;
      }
      
      if (hasChanges()) {
          setUnsavedModalOpen(true);
      } else {
          navigate('/');
      }
  };

  const performSave = async (shouldExit = false) => {
      if (!test) return;
      if (!test.title.trim()) {
          setErrorModal({isOpen: true, msg: "El test no tiene título."});
          return;
      }

      setSaving(true);
      await storageService.saveTest(test);
      setInitialTestJson(JSON.stringify(test));
      setSaving(false);
      
      setShowSavedOverlay(true);
      setTimeout(() => {
          setShowSavedOverlay(false);
          if (shouldExit) navigate('/');
      }, 1500);
  };

  const handleManualSave = () => {
      // Guardado manual simple (sin validaciones bloqueantes de salida, solo feedback visual)
      performSave(false); 
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !test) return;
    
    setProcessing(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
         try {
             const base64 = (ev.target?.result as string).split(',')[1];
             const questions = await parseFileToQuiz(base64, file.type, (msg, p) => setProgress({msg, percent: p}));
             // Añadir preguntas
             const newQs = [...test.questions, ...questions];
             setTest(prev => prev ? ({ ...prev, questions: newQs }) : null);
             
             // AL FINALIZAR:
             setProcessing(false);
             setToast({msg: "¡Cargados!", type: 'success'});
             // Ir al final de la lista para ver los nuevos
             // Pequeño delay para que se renderice y el toast se vea
             setTimeout(() => {
                 window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
             }, 500);

         } catch (err: any) {
             setProcessing(false);
             setErrorModal({isOpen: true, msg: err.message || "Error al procesar el archivo."});
         }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
        setProcessing(false);
        setErrorModal({isOpen: true, msg: err.message});
    } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const deleteQuestion = () => {
      if (!test || !deleteQId) return;
      const newQs = test.questions.filter(q => q.id !== deleteQId);
      setTest({ ...test, questions: newQs });
      setDeleteQId(null);
      
      // Si estábamos editando esta, salir a lista
      if (viewMode === 'single') setViewMode('list');
  };

  const addQuestion = () => {
      const newQ: Question = {
          id: generateId(),
          text: '',
          // 4 OPCIONES POR DEFECTO
          options: [
              { id: generateId(), text: '' },
              { id: generateId(), text: '' },
              { id: generateId(), text: '' },
              { id: generateId(), text: '' }
          ],
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
       {/* Modales */}
       <AlertModal 
            isOpen={errorModal.isOpen}
            message={errorModal.msg}
            onClose={() => setErrorModal({isOpen: false, msg: ''})}
       />
       {/* Modal "Cambios sin guardar" al salir */}
       <ConfirmationModal 
            isOpen={unsavedModalOpen}
            title="Cambios sin guardar"
            message="Tienes cambios pendientes. ¿Qué deseas hacer?"
            confirmText="Guardar y Salir"
            confirmVariant="success"
            onConfirm={() => { setUnsavedModalOpen(false); checkValidationAndSave(); }}
            discardText="Salir sin guardar"
            discardVariant="danger"
            onDiscard={() => { setUnsavedModalOpen(false); navigate('/'); }}
            onCancel={() => setUnsavedModalOpen(false)}
       />
       
       {/* Validación 1: Respuesta Vacía */}
       <ConfirmationModal 
            isOpen={validationModal.type === 'empty'}
            title="Respuesta vacía"
            message="Hay una pregunta con una respuesta vacía. Si no la rellenas, no aparecerá en los test. ¿Quieres rellenarla ahora?"
            confirmText="Sí, ir a la pregunta"
            confirmVariant="primary"
            onConfirm={() => {
                const idx = validationModal.index;
                setValidationModal({ ...validationModal, type: null });
                setCurrentIndex(idx);
                setViewMode('single');
            }}
            discardText="No, guardar así"
            discardVariant="secondary"
            onDiscard={() => {
                setValidationModal({ ...validationModal, type: null });
                checkValidationAndSave(true, false); // Saltar chequeo de vacías
            }}
            onCancel={() => {}} // No hay cancel, es flujo bloqueante
       />

       {/* Validación 2: Sin respuesta correcta */}
       <ConfirmationModal 
            isOpen={validationModal.type === 'correct'}
            title="Sin respuesta correcta"
            message="No está marcada la respuesta correcta de una pregunta. Si no lo haces, esa pregunta no aparecerá en los test. ¿Quieres seleccionarla ahora?"
            confirmText="Sí, ir a marcarla"
            confirmVariant="primary"
            onConfirm={() => {
                const idx = validationModal.index;
                setValidationModal({ ...validationModal, type: null });
                setCurrentIndex(idx);
                setViewMode('single');
            }}
            discardText="No, guardar así"
            discardVariant="secondary"
            onDiscard={() => {
                setValidationModal({ ...validationModal, type: null });
                checkValidationAndSave(true, true); // Saltar ambos chequeos
            }}
            onCancel={() => {}} 
       />

       <ConfirmationModal 
            isOpen={!!deleteQId}
            title="¿Borrar pregunta?"
            message="Esta pregunta se eliminará permanentemente de la lista."
            confirmText="Borrar"
            confirmVariant="danger"
            onConfirm={deleteQuestion}
            onCancel={() => setDeleteQId(null)}
       />

       {/* Toast y Overlay */}
       {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
       {showSavedOverlay && <SavedOverlay />}

       {/* OVERLAY DE PROGRESO DE ESCANEO */}
       {processing && (
           <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
               <div className="w-full max-w-sm">
                   <div className="flex justify-between text-white mb-2 font-bold">
                       <span>{progress.msg}</span>
                       <span>{progress.percent}%</span>
                   </div>
                   <div className="w-full h-4 bg-slate-700 rounded-full overflow-hidden shadow-inner">
                       <div 
                         className="h-full bg-brand-500 transition-all duration-300 ease-out shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                         style={{width: `${progress.percent}%`}}
                       />
                   </div>
                   <p className="text-slate-400 text-sm mt-4 text-center">Por favor espera, la IA está analizando...</p>
               </div>
           </div>
       )}

       {/* HEADER */}
       <header className="sticky top-0 bg-slate-50 dark:bg-slate-900 z-20 py-4 flex justify-between items-center mb-2 backdrop-blur-sm bg-opacity-90">
          <button onClick={handleBack} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-700 dark:text-slate-300">
              <ArrowLeft />
          </button>
          <div className="flex gap-2">
             <Button size="sm" onClick={handleManualSave} disabled={saving} className={hasChanges() ? 'animate-pulse' : ''}>
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
                               <button onClick={(e) => { e.stopPropagation(); setDeleteQId(q.id); }} className="text-slate-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors">
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
                       <button onClick={() => setDeleteQId(currentQ.id)} className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
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
    const [searchParams] = useSearchParams();
    const [test, setTest] = useState<Test | null>(null);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [showResults, setShowResults] = useState(false);
    const [loading, setLoading] = useState(true);
    // Nuevo: Control del índice actual
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (!id) return;
        storageService.getTestById(id).then(t => {
           if (t) {
               // Aplicar aleatoriedad si se solicita
               let processedTest = { ...t };
               const rndQ = searchParams.get('rndQ') === 'true';
               const rndA = searchParams.get('rndA') === 'true';

               if (rndQ) {
                   processedTest.questions = shuffleArray(processedTest.questions);
               }
               if (rndA) {
                   processedTest.questions = processedTest.questions.map(q => ({
                       ...q,
                       options: shuffleArray(q.options)
                   }));
               }
               setTest(processedTest);
           }
           setLoading(false);
        });
    }, [id]);

    const handleAnswer = (optionId: string) => {
        if (!test) return;
        // Solo permitir responder si no se ha respondido aún (para feedback visual inmediato)
        if (!answers[test.questions[currentIndex].id]) {
            setAnswers(prev => ({ ...prev, [test.questions[currentIndex].id]: optionId }));
        }
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
        
        // Calcular preguntas contestadas
        const answeredQuestions = test.questions.filter(q => answers[q.id]);
        
        const details: AnswerDetail[] = answeredQuestions.map(q => {
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

        // La puntuación es sobre las contestadas, según petición
        const totalAnswered = answeredQuestions.length;
        const finalScore = totalAnswered > 0 ? Math.round((score / totalAnswered) * 10) : 0;
        
        const result: TestResult = {
            id: generateId(),
            userId: user.uid,
            testId: test.id,
            testTitle: test.title,
            date: Date.now(),
            score: finalScore,
            totalQuestions: totalAnswered, // Guardamos el total de las contestadas
            details
        };

        await storageService.saveResult(result);
        setShowResults(true);
    };

    if (loading) return <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-brand-600" size={40} /></div>;
    if (!test) return <div>Test no encontrado</div>;

    if (showResults) {
        const correctCount = Object.keys(answers).filter(k => answers[k] === test.questions.find(q => q.id === k)?.correctOptionId).length;
        const totalAnswered = Object.keys(answers).length;
        const percentage = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

        return (
            <div className="p-4 max-w-2xl mx-auto animate-in fade-in pt-20">
                <div className="text-center mb-8">
                    <Trophy size={64} className="mx-auto text-yellow-500 mb-4"/>
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-white">Resultado</h2>
                    <p className="text-xl text-slate-600 dark:text-slate-300 mt-2 mb-6">
                        Has acertado {correctCount} de {totalAnswered} ({percentage}%)
                    </p>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 mb-8">
                        <div className="bg-brand-500 h-4 rounded-full transition-all duration-1000" style={{width: `${percentage}%`}}></div>
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
                 <div className="flex items-center gap-4">
                     <span className="font-bold text-slate-800 dark:text-white">{currentIndex + 1} / {test.questions.length}</span>
                     <Button size="sm" variant="danger" onClick={finishQuiz} className="text-xs">Terminar Test</Button>
                 </div>
             </header>
             
             <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm min-h-[50vh] flex flex-col">
                 <h3 className="text-xl font-bold mb-6 text-slate-800 dark:text-white leading-relaxed">{currentQ.text}</h3>
                 <div className="grid gap-3 flex-1">
                     {currentQ.options.map(opt => {
                         const isSelected = answers[currentQ.id] === opt.id;
                         const isCorrect = opt.id === currentQ.correctOptionId;
                         
                         let style = 'border-slate-100 dark:border-slate-700 hover:border-brand-200 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300';
                         
                         // Feedback inmediato
                         if (hasAnswered) {
                             if (isCorrect) {
                                 style = 'bg-green-100 border-green-500 text-green-800 dark:bg-green-900/30 dark:text-green-300';
                             } else if (isSelected) {
                                 style = 'bg-red-100 border-red-500 text-red-800 dark:bg-red-900/30 dark:text-red-300';
                             } else {
                                 style = 'opacity-50 border-transparent';
                             }
                         } else if (isSelected) {
                             // Selección provisional antes de confirmar (aunque ahora es inmediato)
                             style = 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 shadow-md transform scale-[1.02]';
                         }

                         return (
                             <button 
                                key={opt.id}
                                onClick={() => handleAnswer(opt.id)}
                                disabled={hasAnswered}
                                className={`p-4 rounded-xl text-left border-2 transition-all flex justify-between items-center ${style}`}
                             >
                                 <span>{opt.text}</span>
                                 {hasAnswered && isCorrect && <CheckCircle className="text-green-600" size={20}/>}
                                 {hasAnswered && isSelected && !isCorrect && <XCircle className="text-red-600" size={20}/>}
                             </button>
                         )
                     })}
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
    // Nuevo estado para controlar autodisparo o auto-creación
    const [fabActionType, setFabActionType] = useState<'scan' | 'create'>('create');
    const navigate = useNavigate();

    if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900"><Loader2 className="animate-spin text-brand-600" size={48}/></div>;

    if (!user) return <LoginPage />;

    const handleFabAction = (action: 'scan' | 'create') => {
        setFabActionType(action);
        setListModalOpen(true);
    };

    const handleListSelect = async (testId: string | null, title?: string) => {
        setListModalOpen(false);
        const state = {
             autoTriggerScan: fabActionType === 'scan',
             autoCreateQuestion: fabActionType === 'create'
        };
        
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