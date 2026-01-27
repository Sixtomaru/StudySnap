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
  Calendar
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

// --- Pages ---

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
          <p className="text-center text-slate-400 text-xs mt-8">StudySnap v1.7 • Gemini Powered</p>
      </div>
    </div>
  );
};

const HistoryPage = ({ user }: { user: User }) => {
    const [results, setResults] = useState<TestResult[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const load = async () => {
            const data = await storageService.getResults(user.uid);
            setResults(data);
            setLoading(false);
        };
        load();
    }, [user]);

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if(confirm("¿Borrar este resultado?")) {
            await storageService.deleteResult(id);
            setResults(prev => prev.filter(r => r.id !== id));
        }
    }

    if (loading) return <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-brand-500" size={40}/></div>;

    return (
        <div className="animate-in fade-in zoom-in-95 duration-300">
             <header className="flex items-center gap-2 mb-6">
                <button onClick={() => navigate('/')} className="md:hidden p-2 hover:bg-white/50 rounded-full text-slate-700 dark:text-slate-300"><ArrowLeft /></button>
                <h1 className="font-bold text-3xl text-slate-800 dark:text-white">Mis Resultados</h1>
             </header>

             {results.length === 0 ? (
                 <div className="text-center py-20 text-slate-400">
                     <Trophy size={48} className="mx-auto mb-4 opacity-50"/>
                     <p>Aún no has completado ningún test.</p>
                 </div>
             ) : (
                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                     {results.map(res => (
                         <div key={res.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col gap-3">
                             <div className="flex justify-between items-start">
                                 <div>
                                     <h3 className="font-bold text-slate-800 dark:text-white text-lg">{res.testTitle}</h3>
                                     <p className="text-xs text-slate-500 flex items-center gap-1">
                                         <Calendar size={12}/> {new Date(res.date).toLocaleDateString()} • {new Date(res.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                     </p>
                                 </div>
                                 <div className={`px-3 py-1 rounded-lg font-bold text-sm ${res.score >= 5 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                     {res.score}/10
                                 </div>
                             </div>
                             <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 mt-2">
                                 <div className={`h-2 rounded-full ${res.score >= 5 ? 'bg-green-500' : 'bg-red-500'}`} style={{width: `${res.score * 10}%`}}></div>
                             </div>
                             <div className="flex justify-end pt-2">
                                 <button onClick={(e) => handleDelete(e, res.id)} className="text-slate-400 hover:text-red-500 text-sm flex items-center gap-1 transition-colors">
                                     <Trash2 size={14}/> Borrar
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
       alert("Enlace copiado al portapapeles!");
    } catch(err) {
       alert("No se pudo copiar: " + url);
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
                    <button onClick={(e) => handleShare(e, test.id)} className="text-slate-400 hover:text-brand-600 dark:text-slate-500 dark:hover:text-brand-400 p-2 hover:bg-brand-50 dark:hover:bg-slate-700 rounded-lg transition-colors">
                      <Share2 size={18} />
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

// --- EDITOR PAGE (Redesigned & Fixed) ---

interface PDFState {
    base64: string;
    totalPages: number;
    nextPage: number;
    lastProcessedPage: number;
}

const EditorPage = ({ user }: { user: User }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const modeParam = searchParams.get('mode'); 
  const { id: editId } = useParams();
  const isMobile = useIsMobile();

  const [testId, setTestId] = useState<string | null>(editId || null);
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'detail' | 'scanner'>('list'); 
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [lastEditedIndex, setLastEditedIndex] = useState<number | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [progressPercent, setProgressPercent] = useState(0); 
  const [showListSelector, setShowListSelector] = useState(false);
  
  const [pdfState, setPdfState] = useState<PDFState | null>(null);
  const [resumeMetadata, setResumeMetadata] = useState<PDFProgress | null>(null);

  useEffect(() => {
    const init = async () => {
      if (editId) {
        setIsLoading(true);
        const test = await storageService.getTestById(editId);
        if (test && test.userId === user.uid) {
          setTitle(test.title);
          setQuestions(test.questions);
          if (test.pdfMetadata && test.pdfMetadata.lastProcessedPage < test.pdfMetadata.totalPages) {
             setResumeMetadata(test.pdfMetadata);
          }
          if (modeParam === 'camera') setViewMode('scanner');
          else if (modeParam === 'manual') setViewMode('detail'); 
          else setViewMode('list'); 
        } else {
           navigate('/');
        }
        setIsLoading(false);
      } else if (modeParam && !editId) {
        setShowListSelector(true);
      }
    };
    init();
  }, [editId, modeParam, user]);

  const saveToStorage = async (qs: Question[], t: string, silent = false) => {
      if(!testId && !t) return;
      const validQs = qs.filter(q => q.text.trim()); 
      
      let pdfMeta: PDFProgress | null = null; // Important: null instead of undefined for Firestore
      if (pdfState) {
          pdfMeta = { totalPages: pdfState.totalPages, lastProcessedPage: pdfState.lastProcessedPage };
      } else if (resumeMetadata) {
          pdfMeta = resumeMetadata;
      }

      const test: Test = {
        id: testId || generateId(),
        userId: user.uid,
        title: t,
        createdAt: Date.now(),
        questions: validQs,
        pdfMetadata: pdfMeta || undefined // Clean undefined if null is issue, but usually null works. Firestore needs null or omission. Undefined throws error.
      };
      // Firestore strict check: undefined is not allowed. 
      if(pdfMeta === null) delete test.pdfMetadata;
      else test.pdfMetadata = pdfMeta;

      if(!testId) setTestId(test.id); 
      try {
        await storageService.saveTest(test);
        if(!silent) console.log("Guardado exitoso");
      } catch(e) {
        console.error("Error guardando:", e);
        if(!silent) alert("Error al guardar en la nube");
      }
      return test.id;
  };

  const handleAutoSave = () => saveToStorage(questions, title, true);

  const validateQuestion = (q: Question) => {
      const hasText = q.text.trim().length > 0;
      const hasCorrect = !!q.correctOptionId;
      const hasEmptyOption = q.options.some(o => !o.text.trim());
      return { hasText, hasCorrect, hasEmptyOption };
  };

  const handleExitOrSave = async () => {
     const invalidIndex = questions.findIndex(q => {
         const v = validateQuestion(q);
         return v.hasText && (!v.hasCorrect || v.hasEmptyOption);
     });

     if(invalidIndex !== -1) {
         const confirmFix = confirm(
             `La pregunta ${invalidIndex + 1} está incompleta.\n\n` +
             `¿Quieres corregirla ahora? (Cancelar para salir y guardar, se ignorarán las incompletas)`
         );
         if(confirmFix) {
             setCurrentQIndex(invalidIndex);
             setViewMode('detail');
             return;
         }
     }

     if (!title.trim()) { alert("Ponle un título a la lista"); return; }
     
     setIsLoading(true);
     await saveToStorage(questions, title);
     navigate('/');
     setIsLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let startPage = 1;
    if (resumeMetadata && file.type.includes('pdf')) {
        if (confirm(`¿Continuar desde página ${resumeMetadata.lastProcessedPage + 1}?`)) {
            startPage = resumeMetadata.lastProcessedPage + 1;
        }
    }

    setIsLoading(true);
    setProgressMsg("Procesando...");
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64String = (reader.result as string).split(',')[1];
        let newQuestions: Question[] = [];
        let totalPages = 0;

        if(file.type.includes('pdf')) {
            totalPages = await getPDFPageCount(base64String);
            const pagesToRead = Math.min(5, totalPages - startPage + 1);
            if(pagesToRead > 0) {
                 newQuestions = await processPDFBatch(base64String, startPage, pagesToRead, (m, p) => { setProgressMsg(m); setProgressPercent(p); });
                 setPdfState({ base64: base64String, totalPages, lastProcessedPage: startPage + pagesToRead - 1, nextPage: startPage + pagesToRead });
                 setResumeMetadata(null);
            }
        } else {
            newQuestions = await parseFileToQuiz(base64String, file.type, (m, p) => { setProgressMsg(m); setProgressPercent(p); });
            setPdfState(null);
        }

        const updatedQuestions = [...questions, ...newQuestions];
        setQuestions(updatedQuestions);
        await saveToStorage(updatedQuestions, title, true);
        setViewMode('list'); 

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

  const goToDetail = (index: number) => {
      setCurrentQIndex(index);
      setLastEditedIndex(index);
      setViewMode('detail');
  };

  const goBackFromDetail = () => {
      handleAutoSave();
      setViewMode('list');
  };

  const goToLastEdited = () => {
      if(lastEditedIndex !== null && lastEditedIndex < questions.length) {
          setCurrentQIndex(lastEditedIndex);
      } else {
          setCurrentQIndex(questions.length > 0 ? questions.length - 1 : 0);
      }
      setViewMode('detail');
  };
  
  const jumpToPage = () => {
      const p = prompt(`Ir a pregunta (1 - ${questions.length}):`);
      if(p) {
          const idx = parseInt(p) - 1;
          if(!isNaN(idx) && idx >= 0 && idx < questions.length) {
              setCurrentQIndex(idx);
          }
      }
  }

  const addNewQuestionInDetail = () => {
      const newQ = { id: generateId(), text: '', options: Array(4).fill(null).map(() => ({ id: generateId(), text: '' })), correctOptionId: '' };
      const newQs = [...questions, newQ];
      setQuestions(newQs);
      setCurrentQIndex(newQs.length - 1);
  };

  if (isLoading) return <div className="fixed inset-0 z-50 bg-white/90 dark:bg-slate-900/90 flex flex-col items-center justify-center"><Loader2 className="animate-spin text-brand-600 mb-4" size={48}/><p className="text-slate-800 dark:text-white font-bold">{progressMsg || "Cargando..."}</p><div className="w-64 h-2 bg-slate-200 rounded-full mt-4 overflow-hidden"><div className="h-full bg-brand-600 transition-all duration-300" style={{width: `${progressPercent}%`}}></div></div></div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-safe">
      {showListSelector && <ListSelectionModal user={user} onSelect={(id, t) => { 
          if(id) { navigate(`/editor/${id}?mode=${modeParam}`, { replace: true }); setShowListSelector(false); }
          else if(t) { setTitle(t); setShowListSelector(false); if(modeParam === 'camera') setViewMode('scanner'); else setViewMode('detail'); }
      }} onCancel={() => navigate('/')} />}

      <input id="file-upload" type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileUpload} />

      {/* --- HEADER EDITOR --- */}
      <header className="sticky top-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
            <button onClick={viewMode === 'list' ? handleExitOrSave : goBackFromDetail} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300">
                <ArrowLeft size={24}/>
            </button>
            <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{viewMode === 'scanner' ? 'ESCANEAR' : 'EDITOR MANUAL'}</span>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título..." className="bg-transparent font-bold text-slate-800 dark:text-white focus:outline-none w-32 md:w-64"/>
            </div>
        </div>
        
        <div className="flex items-center gap-3">
             {viewMode !== 'detail' && (
                 <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 hidden md:block">{isMobile ? 'Escanear' : 'Subir PDF'}</span>
                    <Button onClick={() => document.getElementById('file-upload')?.click()} className="w-10 h-10 md:w-auto md:h-10 md:px-4 rounded-xl flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white shadow-sm p-0 md:py-2">
                        {isMobile ? <Camera size={20}/> : <><Upload size={18} className="mr-2"/> Subir PDF</>}
                    </Button>
                 </div>
             )}

             <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider mb-1">Guardar</span>
                <Button onClick={handleExitOrSave} className="w-10 h-10 rounded-xl flex items-center justify-center bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-500/30 p-0">
                    <Save size={20} className="text-white"/>
                </Button>
             </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4">
        
        {viewMode === 'list' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {(pdfState || resumeMetadata) && (
                    <div className="bg-blue-50 dark:bg-slate-800 border border-blue-100 dark:border-slate-700 p-4 rounded-xl flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                            <BookOpen className="text-blue-500" size={24}/>
                            <div>
                                <p className="font-bold text-slate-700 dark:text-white text-sm">Escaneo PDF Activo</p>
                                <p className="text-xs text-slate-500">Pág. {pdfState ? pdfState.lastProcessedPage : resumeMetadata?.lastProcessedPage}</p>
                            </div>
                        </div>
                        {pdfState && pdfState.nextPage <= pdfState.totalPages && (
                            <Button size="sm" onClick={() => document.getElementById('file-upload')?.click()} className="text-xs bg-blue-600">Continuar</Button>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3 mb-6">
                    <button onClick={() => { setCurrentQIndex(questions.length); setViewMode('detail'); }} className="p-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-500 hover:border-brand-500 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-slate-800 transition-all flex flex-col items-center gap-2">
                        <Plus size={24}/> <span className="font-medium">Añadir Manual</span>
                    </button>
                    <button onClick={() => document.getElementById('file-upload')?.click()} className="p-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-500 hover:border-brand-500 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-slate-800 transition-all flex flex-col items-center gap-2">
                        {isMobile ? <Camera size={24}/> : <Upload size={24}/>} <span className="font-medium">{isMobile ? 'Escanear' : 'Subir'}</span>
                    </button>
                </div>

                <div className="space-y-2">
                    {questions.map((q, idx) => {
                        const validation = validateQuestion(q);
                        const isInvalid = !validation.hasCorrect || validation.hasEmptyOption;
                        
                        return (
                            <div key={q.id || idx} onClick={() => goToDetail(idx)} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4 cursor-pointer hover:border-brand-300 transition-colors">
                                <span className="font-mono font-bold text-slate-300 dark:text-slate-600 text-lg w-8">{idx + 1}.</span>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-slate-800 dark:text-white truncate">{q.text || <span className="text-slate-400 italic">Sin texto...</span>}</p>
                                    {isInvalid && (
                                        <div className="flex items-center gap-1 text-xs text-amber-500 mt-1 font-medium">
                                            <AlertTriangle size={12}/> Incompleta
                                        </div>
                                    )}
                                </div>
                                <ChevronRight size={18} className="text-slate-300"/>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}

        {viewMode === 'detail' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 h-full">
                <div className="flex justify-between items-center mb-4 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                    <div className="flex gap-1">
                        <Button variant="ghost" onClick={() => setCurrentQIndex(0)} disabled={currentQIndex === 0}><ChevronsLeft size={20}/></Button>
                        <Button variant="ghost" onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))} disabled={currentQIndex === 0}><ChevronLeft size={20}/></Button>
                    </div>
                    
                    <button onClick={jumpToPage} className="font-mono font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 px-3 py-1 rounded hover:bg-brand-100 transition-colors">
                        {currentQIndex + 1} / {questions.length > currentQIndex ? questions.length : currentQIndex + 1}
                    </button>
                    
                    <div className="flex gap-1">
                        <Button variant="ghost" onClick={() => setCurrentQIndex(prev => prev + 1)} disabled={currentQIndex >= questions.length}><ChevronRight size={20}/></Button>
                        <Button variant="ghost" onClick={goToLastEdited} title="Última editada"><ChevronsRight size={20}/></Button>
                        <Button variant="secondary" onClick={addNewQuestionInDetail} title="Nueva pregunta" className="ml-1"><Plus size={18}/></Button>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-100 dark:border-slate-700 p-6 relative">
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Pregunta</label>
                    <TextArea 
                        value={questions[currentQIndex]?.text || ''} 
                        onChange={e => {
                            const newQs = [...questions];
                            if(!newQs[currentQIndex]) newQs[currentQIndex] = { id: generateId(), text: '', options: Array(4).fill(null).map(() => ({id: generateId(), text: ''})), correctOptionId: '' };
                            newQs[currentQIndex].text = e.target.value;
                            setQuestions(newQs);
                        }}
                        className="text-lg min-h-[120px] mb-6 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 dark:text-white"
                        placeholder="Escribe la pregunta..."
                    />

                    <label className="block text-xs font-bold text-slate-400 uppercase mb-3">Respuestas (Toca el círculo para marcar correcta)</label>
                    <div className="space-y-3">
                        {(questions[currentQIndex]?.options || Array(4).fill(null).map(() => ({id: generateId(), text: ''}))).map((opt, oIdx) => (
                            <div key={opt.id} className="flex items-center gap-3">
                                <button 
                                    onClick={() => {
                                        const newQs = [...questions];
                                        newQs[currentQIndex].correctOptionId = opt.id;
                                        setQuestions(newQs);
                                    }}
                                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                                        questions[currentQIndex]?.correctOptionId === opt.id 
                                        ? 'bg-green-500 border-green-500 text-white shadow-md shadow-green-200 dark:shadow-none' 
                                        : 'border-slate-300 dark:border-slate-600 hover:border-slate-400'
                                    }`}
                                >
                                    {questions[currentQIndex]?.correctOptionId === opt.id && <CheckCircle size={16} fill="currentColor"/>}
                                </button>
                                <div className="flex-1 relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{String.fromCharCode(65 + oIdx)}</span>
                                    <Input 
                                        value={opt.text}
                                        onChange={e => {
                                            const newQs = [...questions];
                                            if(!newQs[currentQIndex]) return;
                                            newQs[currentQIndex].options[oIdx].text = e.target.value;
                                            setQuestions(newQs);
                                        }}
                                        className="pl-8 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 dark:text-white"
                                    />
                                </div>
                                <button onClick={() => {
                                     const newQs = [...questions];
                                     newQs[currentQIndex].options.splice(oIdx, 1);
                                     setQuestions(newQs);
                                }} className="text-slate-300 hover:text-red-400"><XCircle size={20}/></button>
                            </div>
                        ))}
                    </div>
                    
                    <button onClick={() => {
                        const newQs = [...questions];
                        if(!newQs[currentQIndex]) return;
                        newQs[currentQIndex].options.push({ id: generateId(), text: '' });
                        setQuestions(newQs);
                    }} className="mt-4 flex items-center gap-2 text-sm font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-slate-700 px-3 py-2 rounded-lg transition-colors">
                        <Plus size={16}/> Añadir otra opción
                    </button>
                    
                    <button onClick={() => {
                        if(confirm("¿Borrar pregunta?")) {
                            const newQs = questions.filter((_, i) => i !== currentQIndex);
                            setQuestions(newQs);
                            if(newQs.length === 0) setViewMode('list');
                            else if(currentQIndex >= newQs.length) setCurrentQIndex(newQs.length - 1);
                        }
                    }} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 p-2"><Trash2 size={20}/></button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

// --- QUIZ PAGE (Refactored for Immediate Feedback) ---
const QuizPage = ({ user }: { user: User }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  // Quiz State
  const [answered, setAnswered] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<AnswerDetail[]>([]);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    const loadTest = async () => {
      if (!id) return;
      const t = await storageService.getTestById(id);
      if (t) {
        const validQuestions = t.questions.filter(q => 
            q.text.trim().length > 0 && 
            q.correctOptionId && 
            q.options.every(o => o.text.trim().length > 0)
        );
        setTest({ ...t, questions: validQuestions });
      }
      setLoading(false);
    };
    loadTest();
  }, [id]);

  const handleOptionClick = (optId: string) => {
      if (answered || !test) return;
      
      const currentQ = test.questions[currentQuestionIndex];
      const isCorrect = optId === currentQ.correctOptionId;
      
      setSelectedOptionId(optId);
      setAnswered(true);

      const newAnswer: AnswerDetail = {
          questionId: currentQ.id,
          questionText: currentQ.text,
          selectedOptionId: optId,
          correctOptionId: currentQ.correctOptionId,
          options: currentQ.options,
          isCorrect
      };
      
      setAnswers(prev => [...prev, newAnswer]);
  };

  const nextQuestion = async () => {
      if (!test) return;
      
      if (currentQuestionIndex < test.questions.length - 1) {
          setAnswered(false);
          setSelectedOptionId(null);
          setCurrentQuestionIndex(prev => prev + 1);
      } else {
          // Finish
          const score = answers.filter(a => a.isCorrect).length; // answers already includes current one
          await storageService.saveResult({
            id: generateId(),
            userId: user.uid,
            testId: test.id,
            testTitle: test.title,
            date: Date.now(),
            score: Math.round((score / test.questions.length) * 10),
            totalQuestions: test.questions.length,
            details: answers
          });
          setShowResult(true);
      }
  };

  if (loading) return <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-brand-500" /></div>;
  if (!test || test.questions.length === 0) return <div className="p-8 text-center"><h2 className="text-xl font-bold mb-2">Oops...</h2><p>Este test no tiene preguntas válidas.</p><Button onClick={() => navigate('/')} className="mt-4">Volver</Button></div>;

  if (showResult) {
    const correctCount = answers.filter(a => a.isCorrect).length;
    const totalCount = test.questions.length;
    const percentage = Math.round((correctCount / totalCount) * 100);

    return (
      <div className="max-w-2xl mx-auto p-6 pb-24 animate-in zoom-in-95">
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 text-center shadow-sm border border-slate-100 dark:border-slate-700 mb-6">
           <div className="text-6xl font-black text-brand-600 dark:text-brand-400 mb-2">{percentage}%</div>
           <p className="text-slate-500 dark:text-slate-400 mb-6 font-medium uppercase tracking-wide">
               Aciertos: {correctCount} de {totalCount}
           </p>
           <Button onClick={() => navigate('/')} className="w-full py-3 shadow-lg shadow-brand-500/20">Volver al Inicio</Button>
        </div>
        
        {/* Detail Review */}
        <div className="space-y-4">
          {answers.map((ans, idx) => (
            <div key={idx} className={`bg-white dark:bg-slate-800 p-4 rounded-xl border-l-4 ${ans.isCorrect ? 'border-green-500' : 'border-red-500'} shadow-sm`}>
               <p className="font-bold text-slate-800 dark:text-white mb-2">{idx + 1}. {ans.questionText}</p>
               {ans.options.map(opt => {
                 const isSelected = opt.id === ans.selectedOptionId;
                 const isCorrect = opt.id === ans.correctOptionId;
                 let bg = "bg-slate-50 dark:bg-slate-900";
                 // Highlight correct answer always if wrong, or just correct if right
                 if (isCorrect) bg = "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 ring-1 ring-green-500";
                 else if (isSelected && !isCorrect) bg = "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 ring-1 ring-red-500";
                 
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

  const question = test.questions[currentQuestionIndex];

  return (
    <div className="max-w-xl mx-auto p-4 flex flex-col h-screen bg-white dark:bg-slate-900">
      <div className="flex justify-between items-center py-4">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X size={24} className="text-slate-400"/></button>
        <div className="h-2 w-32 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-brand-500 transition-all duration-300" style={{width: `${((currentQuestionIndex + 1) / test.questions.length) * 100}%`}}></div></div>
        <span className="font-bold text-slate-400 text-sm">{currentQuestionIndex + 1}/{test.questions.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-8 leading-relaxed">{question.text}</h2>
        <div className="space-y-3">
          {question.options.map(opt => {
             // Visual State Logic
             let stateClass = 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-brand-200 dark:hover:border-slate-600';
             let textClass = 'text-slate-700 dark:text-slate-300';
             
             if (answered) {
                 if (opt.id === question.correctOptionId) {
                     stateClass = 'border-green-500 bg-green-50 dark:bg-green-900/20';
                     textClass = 'text-green-700 dark:text-green-300';
                 } else if (opt.id === selectedOptionId) {
                     stateClass = 'border-red-500 bg-red-50 dark:bg-red-900/20';
                     textClass = 'text-red-700 dark:text-red-300';
                 } else {
                     stateClass = 'opacity-50 border-slate-200 dark:border-slate-800';
                 }
             }

             return (
                <button
                  key={opt.id}
                  onClick={() => handleOptionClick(opt.id)}
                  disabled={answered}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-200 group relative ${stateClass}`}
                >
                  <span className={`font-medium ${textClass}`}>{opt.text}</span>
                  {answered && opt.id === question.correctOptionId && <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500" size={20}/>}
                  {answered && opt.id === selectedOptionId && opt.id !== question.correctOptionId && <XCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500" size={20}/>}
                </button>
             );
          })}
        </div>
      </div>

      <div className="py-6">
        {answered && (
            <Button onClick={nextQuestion} className="w-full py-4 text-lg shadow-xl shadow-brand-500/20 animate-in slide-in-from-bottom-2 fade-in">
              {currentQuestionIndex === test.questions.length - 1 ? 'Ver Resultados' : 'Siguiente Pregunta'}
            </Button>
        )}
      </div>
    </div>
  );
};

// --- SHARE PAGE ---

const SharePage = ({ user }: { user: User }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const t = await storageService.getTestById(id);
      if (t) {
        setTest(t);
      } else {
        setError('Test no encontrado');
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const handleImport = async () => {
    if (!id || !user) return;
    setLoading(true);
    try {
      const newId = await storageService.copyTest(id, user.uid);
      navigate(`/quiz/${newId}`); 
    } catch (e: any) {
      alert("Error al importar: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-brand-500" size={40} /></div>;
  if (error || !test) return <div className="p-8 text-center"><h2 className="text-xl font-bold mb-2">Error</h2><p>{error || 'No encontrado'}</p><Button onClick={() => navigate('/')} className="mt-4">Volver</Button></div>;

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

const LoginPage = () => {
  const [errorMessage, setErrorMessage] = useState('');
  const handleGoogleLogin = async () => {
    try { setErrorMessage(''); await signInWithPopup(auth, googleProvider); } catch (err: any) { setErrorMessage(err.message); }
  };
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-slate-50 dark:bg-slate-900">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl max-w-sm w-full border border-slate-100 dark:border-slate-700">
        <div className="bg-brand-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-brand-500/30">
          <FileText className="text-white" size={32} />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">StudySnap</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8">Tu estudio, simplificado con IA.</p>
        <Button variant="primary" onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-3 py-3">
          <span>Entrar con Google</span>
        </Button>
      </div>
    </div>
  );
};

// --- APP ROOT ---

const App = () => {
  const { user, loading } = useAuth();
  useDarkMode(); // Init dark mode logic

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900"><Loader2 className="animate-spin text-brand-600" size={32} /></div>;
  if (!user) return <LoginPage />;

  return (
    <HashRouter>
      <Layout onFabAction={(action) => {
         const path = action === 'scan' ? '/editor?mode=camera' : '/editor?mode=manual';
         // Navegación manual ya que el layout está fuera del router en props pero dentro en contexto
         window.location.hash = path; 
      }}>
        <Routes>
          <Route path="/" element={<HomePage user={user} />} />
          <Route path="/history" element={<HistoryPage user={user} />} />
          <Route path="/editor" element={<EditorPage user={user} />} />
          <Route path="/editor/:id" element={<EditorPage user={user} />} />
          <Route path="/quiz/:id" element={<QuizPage user={user} />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/share/:id" element={<SharePage user={user} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;