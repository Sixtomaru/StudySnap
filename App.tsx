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
  Sun
} from 'lucide-react';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth, googleProvider } from './services/firebaseConfig';
import { Button, Card, Input, TextArea, Badge } from './components/UI';
import { storageService } from './services/storageService';
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

  return (
    <div className="pb-24 max-w-lg mx-auto p-4">
      <header className="flex items-center gap-2 mb-8">
         <button onClick={() => navigate('/')} className="p-2 hover:bg-white/50 rounded-full text-slate-700 dark:text-slate-300"><ArrowLeft /></button>
         <h1 className="font-bold text-2xl text-slate-800 dark:text-white">Opciones</h1>
      </header>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="p-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-700">
           <div className="flex items-center gap-3">
             <div className="bg-brand-50 dark:bg-slate-700 p-2 rounded-lg text-brand-600 dark:text-brand-400">
               {isDark ? <Moon size={24} /> : <Sun size={24} />}
             </div>
             <div>
               <h3 className="font-medium text-slate-800 dark:text-white">Modo Oscuro</h3>
               <p className="text-xs text-slate-500 dark:text-slate-400">Cambiar la apariencia de la aplicación</p>
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
      
      <p className="text-center text-slate-400 text-xs mt-8">StudySnap v1.0</p>
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

  const handleLogout = () => {
    if(confirm("¿Cerrar sesión?")) signOut(auth);
  }

  return (
    <div className="space-y-8 pb-24 max-w-7xl mx-auto w-full">
      <header className="flex justify-between items-center bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-white/50 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="bg-brand-100 dark:bg-slate-700 p-2 rounded-full hidden sm:block border border-brand-200 dark:border-slate-600">
            <UserIcon className="text-brand-600 dark:text-brand-400" />
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
          <p className="text-slate-500 dark:text-slate-400">Pulsa el botón + para empezar.</p>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tests.map(test => (
            <Card key={test.id} onClick={() => navigate(`/quiz/${test.id}`)} className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 hover:border-brand-200 dark:hover:border-brand-700 hover:shadow-md transition-all cursor-pointer h-full flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div className="bg-brand-50 dark:bg-slate-700 p-2 rounded-lg text-brand-600 dark:text-brand-400 border border-brand-100 dark:border-slate-600">
                    <FileText size={20}/>
                  </div>
                  <button onClick={(e) => handleDelete(e, test.id)} className="text-slate-300 hover:text-red-500 p-1.5 hover:bg-red-50 dark:hover:bg-slate-700 rounded-md transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 line-clamp-2 mb-1">{test.title}</h3>
                <div className="text-sm text-slate-500 dark:text-slate-400 mb-4">{test.questions.length} preguntas</div>
              </div>
              
              <div className="flex gap-2 mt-auto pt-4 border-t border-slate-100 dark:border-slate-700">
                 <Button 
                    variant="secondary" 
                    className="flex-1 text-sm py-2 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600"
                    onClick={(e) => { e.stopPropagation(); navigate(`/editor/${test.id}?mode=manual`); }}
                 >
                   Editar
                 </Button>
                 <Button variant="primary" className="flex-1 text-sm py-2 flex justify-center items-center gap-1 shadow-md shadow-brand-200 dark:shadow-none">
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

const HistoryPage = ({ user }: { user: User }) => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const longPressTimer = useRef<any>(null);
  const isLongPress = useRef(false);

  useEffect(() => {
    loadResults();
  }, [user]);

  const loadResults = async () => {
    setLoading(true);
    const data = await storageService.getResults(user.uid);
    setResults(data);
    setLoading(false);
  };

  const handlePointerDown = (id: string) => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setSelectionMode(true);
      setSelectedIds(prev => new Set(prev).add(id));
    }, 600); 
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const handleClick = (id: string, e: React.MouseEvent) => {
    if (isLongPress.current) {
      isLongPress.current = false;
      return; 
    }

    if (selectionMode) {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      
      setSelectedIds(newSet);
      if (newSet.size === 0) setSelectionMode(false);
    } else {
      navigate(`/history/${id}`);
    }
  };

  const handleDeleteSelected = async () => {
    if (!confirm(`¿Eliminar ${selectedIds.size} resultados?`)) return;
    try {
      await Promise.all(Array.from(selectedIds).map(id => storageService.deleteResult(id)));
      const newResults = results.filter(r => !selectedIds.has(r.id));
      setResults(newResults);
      setSelectionMode(false);
      setSelectedIds(new Set());
    } catch (e) {
      alert("Error al eliminar.");
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm("¿Borrar TODO el historial? Esta acción no se puede deshacer.")) return;
    try {
      setLoading(true);
      await storageService.deleteAllResults(user.uid);
      setResults([]);
    } catch(e) {
      alert("Error borrando el historial.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-brand-500" /></div>;

  return (
    <div className="space-y-6 pb-24 max-w-5xl mx-auto">
      <div className="flex justify-between items-center bg-white/80 dark:bg-slate-800/80 backdrop-blur p-4 rounded-2xl border border-white/50 dark:border-slate-700">
         <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Historial</h1>
         {selectionMode && (
           <div className="flex gap-2">
             <Button variant="danger" onClick={handleDeleteSelected} className="text-sm px-3">
               Borrar ({selectedIds.size})
             </Button>
             <Button variant="secondary" onClick={() => { setSelectionMode(false); setSelectedIds(new Set()); }} className="text-sm px-3 dark:bg-slate-700 dark:text-white">
               Cancelar
             </Button>
           </div>
         )}
         {!selectionMode && results.length > 0 && (
            <Button variant="ghost" onClick={handleDeleteAll} className="text-red-500 hover:bg-red-50 dark:hover:bg-slate-700">
              Borrar Todo
            </Button>
         )}
      </div>
      
      {results.length === 0 ? (
        <p className="text-slate-500 dark:text-slate-400 text-center py-20">Aún no has realizado ningún test.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map(result => (
            <div 
              key={result.id}
              onPointerDown={() => handlePointerDown(result.id)}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp} 
              onClick={(e) => handleClick(result.id, e)}
              className={`
                bg-white dark:bg-slate-800 rounded-xl shadow-sm border p-4 cursor-pointer transition-all select-none
                ${selectionMode && selectedIds.has(result.id) ? 'ring-2 ring-brand-500 bg-brand-50 dark:bg-brand-900 border-brand-500' : 'border-slate-100 dark:border-slate-700 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600'}
              `}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-3">
                   {selectionMode && (
                     <div className={`mt-1 ${selectedIds.has(result.id) ? 'text-brand-600 dark:text-brand-400' : 'text-slate-300 dark:text-slate-600'}`}>
                       {selectedIds.has(result.id) ? <CheckSquare size={20}/> : <Square size={20}/>}
                     </div>
                   )}
                   <div>
                      <h3 className="font-semibold text-slate-800 dark:text-slate-100 line-clamp-1">{result.testTitle}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(result.date).toLocaleDateString()} {new Date(result.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                   </div>
                </div>
                <div className="text-right">
                  <div className={`text-xl font-bold ${result.score / result.totalQuestions >= 0.5 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {Math.round((result.score / result.totalQuestions) * 100)}%
                  </div>
                  <div className="text-xs text-slate-400 dark:text-slate-500">{result.score}/{result.totalQuestions}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
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
  const [showListSelector, setShowListSelector] = useState(false);
  
  // Inicialización
  useEffect(() => {
    const init = async () => {
      // 1. Si editamos un test existente por URL ID
      if (editId) {
        setIsLoading(true);
        const test = await storageService.getTestById(editId);
        if (test && test.userId === user.uid) {
          setTitle(test.title);
          setQuestions(test.questions);
          // Ir al final para añadir más
          setCurrentQIndex(test.questions.length); 
        } else {
           alert("Error al cargar test.");
           navigate('/');
        }
        setIsLoading(false);
        return;
      }

      // 2. Si venimos de "Nuevo" (Manual o Escáner) SIN ID, pedimos lista primero
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
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64String = (reader.result as string).split(',')[1];
        const extractedQuestions = await parseFileToQuiz(base64String, file.type);
        
        // CORRECCIÓN: Añadir correctamente las preguntas al estado y actualizar índice
        setQuestions(prev => {
           // IMPORTANTE: Aquí aseguramos que se añaden a las existentes
           return [...prev, ...extractedQuestions];
        });
        
        // Avanzamos el índice para que el usuario vea la primera pregunta nueva
        // Usamos functional update con 'questions.length' que puede ser stale, 
        // pero podemos usar la longitud previa + 0 porque 'setQuestions' es async.
        // La mejor manera es simplemente sumar la longitud de las extraídas.
        setCurrentQIndex(prev => prev + extractedQuestions.length); 

      } catch (err: any) {
        alert(err.message);
      } finally {
        setIsLoading(false);
        // Limpiar el input para permitir subir el mismo archivo si es necesario
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

  const handleSave = async () => {
    if (!title.trim()) return alert("Escribe un título para la lista.");
    const validQuestions = questions.filter(q => q.text.trim() !== '');
    if (validQuestions.length === 0) return alert("Añade al menos una pregunta.");
    
    // VALIDACIÓN: Respuesta vacía
    const hasEmptyOptions = validQuestions.some(q => q.options.some(o => !o.text.trim()));
    if (hasEmptyOptions) return alert("No puede haber respuestas vacías. Revisa tus preguntas.");

    const missingAnswers = validQuestions.some(q => !q.correctOptionId);
    if (missingAnswers) return alert("Todas las preguntas deben tener una respuesta correcta marcada.");

    setIsLoading(true);
    
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
       setIsLoading(false);
    }
  };

  // Cuando se selecciona una lista en el modal
  const onListSelectFinal = (id: string | null, newTitle?: string) => {
    if (id) {
       // Navegar a modo edición de esa lista, manteniendo el modo
       navigate(`/editor/${id}?mode=${modeParam}`, { replace: true });
       setShowListSelector(false);
       
       // TRIGGER: Si es cámara, abrir el selector AHORA que se cerró el modal
       if (modeParam === 'camera') {
           setTimeout(() => {
               document.getElementById('file-upload-trigger')?.click();
           }, 100);
       }
    } else if (newTitle) {
      // Nuevo test
      setTitle(newTitle);
      setQuestions([]);
      setCurrentQIndex(0);
      setShowListSelector(false);
      
      // TRIGGER: Si es cámara, abrir el selector AHORA
      if (modeParam === 'camera') {
         setTimeout(() => {
             document.getElementById('file-upload-trigger')?.click();
         }, 100);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 dark:bg-slate-900">
        <Loader2 className="animate-spin text-brand-600 mb-4" size={48} />
        <p className="text-slate-500 dark:text-slate-400">Procesando...</p>
      </div>
    );
  }

  const activeQ = getCurrentQuestion();

  return (
    <div className="pb-24 max-w-4xl mx-auto">
      {/* Modal de Selección */}
      {showListSelector && (
        <ListSelectionModal 
          user={user} 
          onSelect={onListSelectFinal} 
          onCancel={() => navigate('/')} 
        />
      )}

      {/* Input oculto para cámara. Restringimos accept para evitar Video en la medida de lo posible */}
      <input 
        id="file-upload-trigger" 
        type="file" 
        className="hidden" 
        accept="image/png,image/jpeg,image/webp,application/pdf" 
        onChange={handleFileUpload} 
      />

      <header className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur z-20 py-4 border-b border-slate-200 dark:border-slate-800 mb-6 flex justify-between items-center px-4 -mx-4 shadow-sm">
        <div className="flex items-center gap-2">
           <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300"><ArrowLeft /></button>
           <div className="flex flex-col">
             <span className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase">Editando Lista</span>
             <input 
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Título de la lista..."
                className="font-bold text-slate-800 dark:text-white bg-transparent focus:outline-none focus:border-b-2 border-brand-500 w-48 sm:w-auto placeholder:text-slate-300"
             />
           </div>
        </div>
        <div className="flex gap-2">
            <Button variant="secondary" onClick={() => document.getElementById('file-upload-trigger')?.click()} className="p-2 h-12 w-12 rounded-full flex items-center justify-center border-slate-200 dark:border-slate-700 dark:bg-slate-800 shadow-sm">
               <Camera size={20} className="text-slate-600 dark:text-slate-300"/>
            </Button>
            
            <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider mb-1">Guardar</span>
                <Button onClick={handleSave} className="w-12 h-12 rounded-full p-0 flex items-center justify-center shadow-lg shadow-brand-200 dark:shadow-none bg-brand-600 hover:bg-brand-700">
                  <Save size={20} />
                </Button>
            </div>
        </div>
      </header>

      <div className="space-y-6">
        
        {/* Navegación de Preguntas */}
        <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-4">
           <Button variant="ghost" onClick={() => navigateQuestion('prev')} disabled={currentQIndex === 0} className="dark:text-slate-300 dark:hover:bg-slate-700">
             <ChevronLeft /> Anterior
           </Button>
           <span className="font-mono font-bold text-slate-500 dark:text-slate-400">
             {currentQIndex + 1} <span className="text-slate-300 dark:text-slate-600">/</span> {questions.length + (activeQ.text ? 1 : 0)}
           </span>
           <Button variant="ghost" onClick={() => navigateQuestion('next')} className="text-brand-600 dark:text-brand-400 dark:hover:bg-slate-700">
             Siguiente <ChevronRight />
           </Button>
        </div>

        {/* Tarjeta de Edición */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 p-6 relative min-h-[400px]">
            <div className="mb-6">
              <label className="block text-xs uppercase text-slate-400 dark:text-slate-500 font-bold mb-2">Pregunta</label>
              <TextArea 
                value={activeQ.text} 
                onChange={e => updateCurrentQuestion('text', e.target.value)} 
                placeholder="Escribe la pregunta aquí..."
                className="text-lg bg-slate-50 dark:bg-slate-900 dark:text-white dark:border-slate-700 border-slate-200 min-h-[100px] focus:bg-white dark:focus:bg-slate-800 transition-colors"
              />
            </div>

            <div className="space-y-3">
              <label className="block text-xs uppercase text-slate-400 dark:text-slate-500 font-bold mb-2">Respuestas (Marca la correcta)</label>
              {activeQ.options.map((opt, oIndex) => (
                <div key={opt.id} className="flex items-center gap-3 group">
                  <button 
                    onClick={() => setCorrectOption(opt.id)}
                    className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${activeQ.correctOptionId === opt.id ? 'border-green-500 bg-green-500 text-white shadow-md shadow-green-200 dark:shadow-none' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-transparent hover:border-slate-400'}`}
                  >
                    <CheckCircle size={18} fill="currentColor" className={activeQ.correctOptionId === opt.id ? 'text-white' : ''} />
                  </button>
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs font-bold">
                       {String.fromCharCode(65 + oIndex)}
                    </span>
                    <Input 
                      value={opt.text} 
                      onChange={e => updateOption(oIndex, e.target.value)} 
                      placeholder={`Opción ${oIndex + 1}`}
                      className="pl-8 py-3 bg-slate-50 dark:bg-slate-900 dark:text-white dark:border-slate-700 border-slate-200 focus:bg-white dark:focus:bg-slate-800 transition-colors shadow-sm"
                    />
                  </div>
                  <button 
                     onClick={() => {
                        const newOptions = activeQ.options.filter((_, i) => i !== oIndex);
                        updateCurrentQuestion('options', newOptions);
                     }}
                     className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <XCircle size={20} />
                  </button>
                </div>
              ))}
              
              <button 
                onClick={() => {
                   const newOpt = { id: generateId(), text: '' };
                   updateCurrentQuestion('options', [...activeQ.options, newOpt]);
                }}
                className="mt-2 text-sm font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-brand-50 dark:hover:bg-slate-700 transition-colors w-fit"
              >
                <Plus size={16}/> Añadir otra opción
              </button>
            </div>
            
            {activeQ.id && currentQIndex < questions.length && (
               <div className="absolute top-4 right-4">
                  <button 
                    onClick={() => {
                       if(confirm("¿Borrar esta pregunta?")) {
                          const newQs = questions.filter((_, i) => i !== currentQIndex);
                          setQuestions(newQs);
                          if(currentQIndex > 0) setCurrentQIndex(prev => prev -1);
                       }
                    }}
                    className="text-slate-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-full"
                  >
                    <Trash2 size={20}/>
                  </button>
               </div>
            )}
        </div>
      </div>
    </div>
  );
};

const QuizPage = ({ user }: { user: User }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState<Test | undefined>(undefined);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<AnswerDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTest = async () => {
      setLoading(true);
      const loadedTest = await storageService.getTestById(id || '');
      if (loadedTest) {
        setTest(loadedTest);
        const shuffled = [...loadedTest.questions].sort(() => Math.random() - 0.5);
        const fullyShuffled = shuffled.map(q => ({
          ...q,
          options: [...q.options].sort(() => Math.random() - 0.5)
        }));
        setQuestions(fullyShuffled);
      }
      setLoading(false);
    };
    loadTest();
  }, [id]);

  const handleOptionSelect = (optId: string) => {
    if (isAnswerChecked) return;
    setSelectedOptionId(optId);
    
    setIsAnswerChecked(true);
    const currentQ = questions[currentIndex];
    const isCorrect = optId === currentQ.correctOptionId;
    
    if (isCorrect) setScore(prev => prev + 1);

    setAnswers(prev => [...prev, {
      questionId: currentQ.id,
      questionText: currentQ.text,
      selectedOptionId: optId,
      correctOptionId: currentQ.correctOptionId,
      options: currentQ.options,
      isCorrect
    }]);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOptionId(null);
      setIsAnswerChecked(false);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    if (!test) return;
    const result: TestResult = {
      id: generateId(),
      userId: user.uid,
      testId: test.id,
      testTitle: test.title,
      date: Date.now(),
      score: score,
      totalQuestions: answers.length,
      details: answers
    };
    await storageService.saveResult(result);
    navigate(`/history/${result.id}`, { replace: true });
  };

  if (loading) return <div className="flex justify-center h-screen items-center bg-slate-50 dark:bg-slate-900"><Loader2 className="animate-spin text-brand-500" /></div>;
  if (!test) return <div>No se encontró el test.</div>;
  if (questions.length === 0) return <div>Este test no tiene preguntas.</div>;

  const currentQ = questions[currentIndex];
  const labels = ['A', 'B', 'C', 'D', 'E', 'F']; 

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-2xl mx-auto w-full">
      <header className="flex justify-between items-center mb-6 pt-4">
        <button onClick={() => navigate('/')} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><XCircle size={28} /></button>
        <div className="bg-white dark:bg-slate-800 px-4 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 shadow-sm">
          {currentIndex + 1} / {questions.length}
        </div>
        <button onClick={finishQuiz} className="text-brand-600 dark:text-brand-400 font-bold text-sm hover:underline">Terminar</button>
      </header>

      {/* Aplicar scrollbar-hide aquí */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-1">
        <Card className="mb-6 border-l-4 border-l-brand-500 shadow-lg bg-white dark:bg-slate-800 dark:border-none">
           <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white leading-relaxed">{currentQ.text}</h2>
        </Card>

        <div className="space-y-3">
          {currentQ.options.map((opt, index) => {
            let stateStyle = "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300";
            let icon = <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-bold flex items-center justify-center text-sm">{labels[index]}</div>;

            if (isAnswerChecked) {
              if (opt.id === currentQ.correctOptionId) {
                 stateStyle = "border-green-500 bg-green-50 dark:bg-green-900/20 ring-1 ring-green-500";
                 icon = <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center"><CheckCircle size={18}/></div>;
              } else if (opt.id === selectedOptionId) {
                 stateStyle = "border-red-500 bg-red-50 dark:bg-red-900/20 ring-1 ring-red-500";
                 icon = <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center"><XCircle size={18}/></div>;
              } else {
                 stateStyle = "opacity-60 border-slate-100 dark:border-slate-700 grayscale";
              }
            } else if (selectedOptionId === opt.id) {
               stateStyle = "border-brand-500 bg-brand-50 dark:bg-brand-900/20";
            }

            return (
              <div 
                key={opt.id}
                onClick={() => handleOptionSelect(opt.id)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-4 shadow-sm ${stateStyle}`}
              >
                {icon}
                <span className="font-medium text-slate-700 dark:text-slate-200 text-lg">{opt.text}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-200/50 dark:border-slate-700">
        {isAnswerChecked ? (
           <Button onClick={handleNext} className="w-full py-4 text-xl shadow-xl shadow-brand-500/20 dark:shadow-none rounded-2xl animate-in slide-in-from-bottom-2">
             {currentIndex === questions.length - 1 ? 'Ver Resultados' : 'Siguiente Pregunta'}
           </Button>
        ) : (
          <div className="text-center text-slate-400 text-sm font-medium animate-pulse">Selecciona tu respuesta...</div>
        )}
      </div>
    </div>
  );
};

const ResultViewPage = ({ user }: { user: User }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState<TestResult | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadResult = async () => {
      setLoading(true);
      const results = await storageService.getResults(user.uid);
      const found = results.find(r => r.id === id);
      setResult(found);
      setLoading(false);
    };
    loadResult();
  }, [id, user]);

  if (loading) return <div className="flex justify-center pt-10"><Loader2 className="animate-spin text-brand-500" /></div>;
  if (!result) return <div>Resultado no encontrado.</div>;

  const percentage = Math.round((result.score / result.totalQuestions) * 100);

  return (
    <div className="pb-24 max-w-3xl mx-auto">
       <header className="flex items-center gap-2 mb-6">
         <button onClick={() => navigate('/history')} className="p-2 hover:bg-white rounded-full dark:text-white dark:hover:bg-slate-700"><ArrowLeft /></button>
         <h1 className="font-bold text-xl text-slate-800 dark:text-white">Resumen</h1>
       </header>

       <Card className="text-center py-10 mb-8 bg-gradient-to-br from-brand-600 to-brand-700 text-white border-none shadow-xl shadow-brand-500/20 dark:shadow-none">
          <h2 className="text-brand-100 font-medium mb-4 text-lg">{result.testTitle}</h2>
          <div className="text-7xl font-bold mb-4 tracking-tighter">{percentage}%</div>
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full border border-white/10">
            <CheckCircle size={16} className="text-green-300"/> 
            <span className="font-medium">{result.score} aciertos</span>
            <span className="opacity-50 mx-1">|</span>
            <span className="font-medium">{result.totalQuestions} total</span>
          </div>
       </Card>

       <h3 className="font-bold text-lg mb-4 text-slate-700 dark:text-slate-300 px-2">Revisión de respuestas</h3>
       <div className="space-y-4">
         {result.details.map((detail, i) => (
           <div key={i} className={`bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border-l-4 ${detail.isCorrect ? 'border-l-green-500' : 'border-l-red-500'}`}>
             <div className="flex gap-3 mb-3">
               <span className="font-bold text-slate-300 dark:text-slate-600">#{i+1}</span>
               <p className="font-semibold text-slate-800 dark:text-slate-200">{detail.questionText}</p>
             </div>
             <div className="space-y-2 pl-8">
               {detail.options.map(opt => {
                 const isSelected = opt.id === detail.selectedOptionId;
                 const isCorrect = opt.id === detail.correctOptionId;
                 let style = "text-slate-500 dark:text-slate-400";
                 let icon = null;

                 if (isCorrect) {
                   style = "text-green-700 dark:text-green-400 font-bold bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded -ml-2";
                   icon = <CheckCircle size={16} className="inline mr-2"/>;
                 } else if (isSelected && !isCorrect) {
                   style = "text-red-600 dark:text-red-400 font-medium line-through decoration-red-600/50 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded -ml-2";
                   icon = <XCircle size={16} className="inline mr-2"/>;
                 }

                 return (
                   <div key={opt.id} className={`${style} flex items-center text-sm`}>
                     {icon} {opt.text}
                   </div>
                 );
               })}
             </div>
           </div>
         ))}
       </div>
    </div>
  );
};

// --- Layout & Router ---

const FabMenu = ({ onAction }: { onAction: (action: 'manual' | 'camera') => void }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Clases para animación de botones hijos: salen desde la posición del botón padre
  const btnCommon = "absolute left-1/2 -translate-x-1/2 w-12 h-12 rounded-full shadow-lg flex items-center justify-center border border-slate-200 dark:border-slate-600 transition-all duration-300 ease-out";
  
  // Posiciones: 
  // Manual: arriba a la izquierda (-50px, -60px) -> Simplificaremos a Vertical para que sea "detrás" como pediste
  // El usuario pidió: "desplazarse a su posición". Vamos a hacer que salgan verticalmente hacia arriba.
  
  return (
    <div className="relative -top-6 h-16 w-16 flex justify-center items-center">
       
       {/* Botón Manual */}
       <button 
         onClick={() => { setIsOpen(false); onAction('manual'); }}
         className={`${btnCommon} ${isOpen ? '-translate-y-[85px] opacity-100' : 'translate-y-0 opacity-0 pointer-events-none'} bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-slate-600 z-0`}
       >
         <PenTool size={20} />
         <span className={`absolute top-full mt-1 bg-white/80 dark:bg-slate-800/80 backdrop-blur px-2 rounded text-[10px] font-bold text-slate-600 dark:text-slate-300 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>Manual</span>
       </button>

       {/* Botón Escanear */}
       <button 
         onClick={() => { setIsOpen(false); onAction('camera'); }}
         className={`${btnCommon} ${isOpen ? '-translate-y-[150px] opacity-100' : 'translate-y-0 opacity-0 pointer-events-none'} bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-slate-600 z-0`}
       >
         <Camera size={20} />
         <span className={`absolute top-full mt-1 bg-white/80 dark:bg-slate-800/80 backdrop-blur px-2 rounded text-[10px] font-bold text-slate-600 dark:text-slate-300 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>Escanear</span>
       </button>

       {/* Botón Principal (+) */}
       <button 
         onClick={() => setIsOpen(!isOpen)} 
         className={`
           relative z-10 w-16 h-16 rounded-full shadow-xl flex items-center justify-center transition-all duration-300
           ${isOpen ? 'bg-slate-800 dark:bg-slate-600 rotate-45 scale-90' : 'bg-brand-600 hover:scale-105 hover:bg-brand-700'}
           text-white
         `}
       >
         <Plus size={32} />
       </button>
       
       {/* Overlay para cerrar al hacer click fuera */}
       {isOpen && (
         <div className="fixed inset-0 z-[-1] bg-black/10 backdrop-blur-[1px]" onClick={() => setIsOpen(false)}></div>
       )}
    </div>
  );
};

const Layout = ({ children, user }: { children?: React.ReactNode, user: User }) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  if (location.pathname.startsWith('/quiz/')) {
    return <div className="max-w-4xl mx-auto min-h-screen p-4">{children}</div>;
  }

  return (
    <div className="w-full min-h-screen flex flex-col">
      <main className="flex-1 p-4 w-full">
        {children}
      </main>
      
      <nav className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 fixed bottom-0 left-0 right-0 z-50 shadow-lg pb-safe">
        <div className="max-w-md mx-auto flex justify-around items-center h-16 px-4 relative">
          <button 
            onClick={() => navigate('/')} 
            className={`flex flex-col items-center p-2 rounded-xl transition-colors w-16 ${location.pathname === '/' ? 'text-brand-600 bg-brand-50 dark:bg-slate-800 dark:text-brand-400' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'}`}
          >
            <HomeIcon size={24} />
            <span className="text-[10px] font-bold mt-1">Inicio</span>
          </button>
          
          <FabMenu onAction={(action) => navigate(`/editor?mode=${action}`)} />
          
          <button 
            onClick={() => navigate('/history')} 
            className={`flex flex-col items-center p-2 rounded-xl transition-colors w-16 ${location.pathname.startsWith('/history') ? 'text-brand-600 bg-brand-50 dark:bg-slate-800 dark:text-brand-400' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'}`}
          >
            <HistoryIcon size={24} />
            <span className="text-[10px] font-bold mt-1">Historial</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

const App = () => {
  const { user, loading } = useAuth();
  const { isDark } = useDarkMode(); // Initialize dark mode hook

  if (loading) {
     return <div className="h-screen flex items-center justify-center bg-brand-50 dark:bg-slate-900"><Loader2 className="animate-spin text-brand-500" size={32}/></div>;
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <HashRouter>
      <Layout user={user}>
        <Routes>
          <Route path="/" element={<HomePage user={user} />} />
          <Route path="/editor" element={<EditorPage user={user} />} />
          <Route path="/editor/:id" element={<EditorPage user={user} />} />
          <Route path="/quiz/:id" element={<QuizPage user={user} />} />
          <Route path="/history" element={<HistoryPage user={user} />} />
          <Route path="/history/:id" element={<ResultViewPage user={user} />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;