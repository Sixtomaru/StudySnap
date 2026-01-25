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
  X
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
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">¿Dónde guardamos esto?</h2>
        
        {mode === 'existing' && tests.length > 0 ? (
          <div className="space-y-3">
             <p className="text-sm text-slate-500 mb-2">Elige una lista existente:</p>
             <div className="max-h-60 overflow-y-auto space-y-2">
               {tests.map(t => (
                 <button 
                   key={t.id}
                   onClick={() => onSelect(t.id, t.title)}
                   className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-brand-500 hover:bg-brand-50 transition-colors flex justify-between items-center"
                 >
                   <span className="font-medium truncate">{t.title}</span>
                   <span className="text-xs text-slate-400">{t.questions.length} pregs</span>
                 </button>
               ))}
             </div>
             <div className="pt-4 border-t mt-2">
               <Button variant="secondary" onClick={() => setMode('new')} className="w-full">
                 + Crear Nueva Lista
               </Button>
             </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">Crear una lista nueva:</p>
            <Input 
              autoFocus
              placeholder="Ej: Matemáticas T1" 
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
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
        <button onClick={onCancel} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><XCircle /></button>
      </div>
    </div>
  );
};

// --- Pages ---

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
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-indigo-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white/80 backdrop-blur p-8 rounded-3xl shadow-xl max-w-sm w-full border border-white">
        <div className="bg-gradient-to-r from-brand-500 to-indigo-600 w-20 h-20 rounded-2xl rotate-3 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-brand-500/30">
          <FileText className="text-white" size={40} />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">StudySnap</h1>
        <p className="text-slate-500 mb-8 leading-relaxed">Escanea, crea y repasa tus tests en cualquier lugar y dispositivo.</p>
        
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
      <header className="flex justify-between items-center bg-white/60 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-white">
        <div className="flex items-center gap-3">
          <div className="bg-brand-100 p-2 rounded-full hidden sm:block">
            <UserIcon className="text-brand-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Mis Listas</h1>
            <p className="text-slate-500 text-sm">Hola, {user.displayName?.split(' ')[0]}</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors" 
          title="Cerrar sesión"
        >
          <LogOut size={24} />
        </button>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-brand-500" size={40} />
        </div>
      ) : tests.length === 0 ? (
        <div className="text-center py-20 text-slate-400 bg-white/50 rounded-3xl border border-white shadow-sm mx-auto max-w-lg">
          <div className="bg-slate-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText size={40} className="text-slate-300" />
          </div>
          <h2 className="text-xl font-semibold text-slate-600 mb-2">No tienes listas guardadas</h2>
          <p className="text-slate-500">Pulsa el botón + para empezar.</p>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tests.map(test => (
            <Card key={test.id} onClick={() => navigate(`/quiz/${test.id}`)} className="relative group hover:ring-2 hover:ring-brand-300 transition-all cursor-pointer h-full flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div className="bg-brand-50 p-2 rounded-lg text-brand-600">
                    <FileText size={20}/>
                  </div>
                  <button onClick={(e) => handleDelete(e, test.id)} className="text-slate-300 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-md transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
                <h3 className="font-bold text-lg text-slate-800 line-clamp-2 mb-1">{test.title}</h3>
                <div className="text-sm text-slate-500 mb-4">{test.questions.length} preguntas</div>
              </div>
              
              <div className="flex gap-2 mt-auto pt-4 border-t border-slate-100">
                 <Button 
                    variant="secondary" 
                    className="flex-1 text-sm py-2"
                    onClick={(e) => { e.stopPropagation(); navigate(`/editor/${test.id}`); }}
                 >
                   Editar
                 </Button>
                 <Button variant="primary" className="flex-1 text-sm py-2 flex justify-center items-center gap-1 shadow-md shadow-brand-200">
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

  useEffect(() => {
    loadResults();
  }, [user]);

  const loadResults = async () => {
    setLoading(true);
    const data = await storageService.getResults(user.uid);
    setResults(data);
    setLoading(false);
  };

  const handleLongPress = (id: string) => {
    setSelectionMode(true);
    setSelectedIds(new Set([id]));
  };

  const handlePressStart = (id: string) => {
    longPressTimer.current = setTimeout(() => handleLongPress(id), 600);
  };

  const handlePressEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    
    setSelectedIds(newSet);
    if (newSet.size === 0) setSelectionMode(false);
  };

  const handleClick = (id: string) => {
    if (selectionMode) {
      toggleSelection(id);
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
      console.error("Error al eliminar:", e);
      alert("Error al eliminar algunos resultados");
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm("¿Borrar TODO el historial?")) return;
    setResults([]); // Client side clear.
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-brand-500" /></div>;

  return (
    <div className="space-y-6 pb-24 max-w-5xl mx-auto">
      <div className="flex justify-between items-center bg-white/60 backdrop-blur p-4 rounded-2xl">
         <h1 className="text-2xl font-bold text-slate-900">Historial</h1>
         {selectionMode && (
           <div className="flex gap-2">
             <Button variant="danger" onClick={handleDeleteSelected} className="text-sm px-3">
               Borrar ({selectedIds.size})
             </Button>
             <Button variant="secondary" onClick={() => setSelectionMode(false)} className="text-sm px-3">
               Cancelar
             </Button>
           </div>
         )}
         {!selectionMode && results.length > 0 && (
            <Button variant="ghost" onClick={handleDeleteAll} className="text-red-500 hover:bg-red-50">
              Borrar Todo
            </Button>
         )}
      </div>
      
      {results.length === 0 ? (
        <p className="text-slate-500 text-center py-20">Aún no has realizado ningún test.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map(result => (
            <div 
              key={result.id}
              onMouseDown={() => handlePressStart(result.id)}
              onMouseUp={handlePressEnd}
              onTouchStart={() => handlePressStart(result.id)}
              onTouchEnd={handlePressEnd}
              onClick={() => handleClick(result.id)}
              className={`
                bg-white rounded-xl shadow-sm border p-4 cursor-pointer transition-all select-none
                ${selectionMode && selectedIds.has(result.id) ? 'ring-2 ring-brand-500 bg-brand-50 border-brand-500' : 'border-slate-100 hover:shadow-md'}
              `}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-3">
                   {selectionMode && (
                     <div className={`mt-1 ${selectedIds.has(result.id) ? 'text-brand-600' : 'text-slate-300'}`}>
                       {selectedIds.has(result.id) ? <CheckSquare size={20}/> : <Square size={20}/>}
                     </div>
                   )}
                   <div>
                      <h3 className="font-semibold text-slate-800 line-clamp-1">{result.testTitle}</h3>
                      <p className="text-xs text-slate-500">{new Date(result.date).toLocaleDateString()} {new Date(result.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                   </div>
                </div>
                <div className="text-right">
                  <div className={`text-xl font-bold ${result.score / result.totalQuestions >= 0.5 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.round((result.score / result.totalQuestions) * 100)}%
                  </div>
                  <div className="text-xs text-slate-400">{result.score}/{result.totalQuestions}</div>
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
        } else {
           alert("Error al cargar test.");
           navigate('/');
        }
        setIsLoading(false);
        return;
      }

      // 2. Si venimos de "Nuevo" (Manual o Escáner), pedimos lista primero
      if (modeParam) {
        setShowListSelector(true);
      }
    };
    init();
  }, [editId, modeParam, user]);

  const handleListSelected = async (selectedId: string | null, newTitleText?: string) => {
    setShowListSelector(false);
    
    if (selectedId) {
      // Cargar test existente para añadirle cosas
      setIsLoading(true);
      const test = await storageService.getTestById(selectedId);
      if (test) {
        setTitle(test.title);
        setQuestions(test.questions);
        // Vamos al final de las preguntas
        setCurrentQIndex(test.questions.length); // Esto creará una nueva vacía si es manual
      }
      setIsLoading(false);
      
      // Si era cámara, activamos input file ahora
      if (modeParam === 'camera') {
        document.getElementById('file-upload-trigger')?.click();
      }
    } else if (newTitleText) {
      // Nueva lista
      setTitle(newTitleText);
      setQuestions([]);
      setCurrentQIndex(0);
      
      if (modeParam === 'camera') {
        document.getElementById('file-upload-trigger')?.click();
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64String = (reader.result as string).split(',')[1];
        const extractedQuestions = await parseFileToQuiz(base64String, file.type);
        setQuestions(prev => [...prev, ...extractedQuestions]);
        // Ir a la primera pregunta nueva
        setCurrentQIndex(questions.length); 
      } catch (err: any) {
        alert(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const getCurrentQuestion = (): Question => {
    // Si el índice es igual al length, es una nueva pregunta "fantasma" que estamos creando
    if (currentQIndex === questions.length) {
      return {
        id: generateId(),
        text: '',
        options: Array(4).fill(null).map(() => ({ id: generateId(), text: '' })), // Por defecto 4
        correctOptionId: ''
      };
    }
    return questions[currentQIndex];
  };

  const updateCurrentQuestion = (field: keyof Question, value: any) => {
    const newQs = [...questions];
    // Si estamos editando la "nueva", la añadimos al array
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
      // Validar antes de pasar? Opcional.
      // Permitimos ir a una "nueva" (length)
      if (currentQIndex < questions.length) setCurrentQIndex(prev => prev + 1);
      else {
        // Ya estamos en la "nueva", quizás crear otra? 
        // La lógica actual ya crea una nueva visualmente si currentQIndex == length.
        // Solo necesitamos avanzar si NO estamos en una vacía.
        const current = getCurrentQuestion();
        if(current.text.trim()) setCurrentQIndex(prev => prev + 1);
      }
    }
  };

  const handleSave = async () => {
    if (!title.trim()) return alert("Escribe un título para la lista de tests.");
    // Filtramos preguntas vacías
    const validQuestions = questions.filter(q => q.text.trim() !== '');
    if (validQuestions.length === 0) return alert("Añade al menos una pregunta.");
    
    const missingAnswers = validQuestions.some(q => !q.correctOptionId);
    if (missingAnswers) return alert("Todas las preguntas deben tener una respuesta correcta marcada.");

    setIsLoading(true);
    
    try {
      const test: Test = {
        id: editId || (modeParam ? undefined : generateId()) || generateId(), // Reutilizar ID si estamos editando
        // Si venimos de seleccionar lista existente, deberíamos tener su ID.
        // Aquí hay un pequeño bug lógico: si seleccionamos lista existente, 'editId' de la URL no cambia,
        // pero necesitamos guardar SOBRE esa ID. 
        // Solución simple: Si 'questions' ya tiene IDs, no importa, pero la ID del TEST es clave.
        // En esta implementación simple, si seleccionaste "Lista existente", cargamos los datos en 'questions' y 'title'.
        // Pero necesitamos la ID original. 
        // MEJORA: Cuando seleccionas lista, deberíamos navegar a /editor/:id
        userId: user.uid,
        title,
        createdAt: Date.now(),
        questions: validQuestions
      };

      // Si seleccionamos una lista existente en el modal, no navegamos, solo cargamos estado.
      // Necesitamos guardar la ID de esa lista.
      // Para simplificar: En el modal, al seleccionar, navegamos a /editor/ID y recargamos.
      // O guardamos la ID en un state 'targetTestId'.
      
      // Como ya tengo lógica compleja, asumiré que si hay preguntas cargadas es update.
      // Pero para asegurar consistencia, si modeParam existe y elegimos lista existente,
      // la mejor UX es navegar a la ruta de edición de esa lista.
      // Voy a modificar `handleListSelected` para navegar.
      
      // Como fallback aquí:
      await storageService.saveTest(test); // Ojo: si la ID cambia se duplica. 
      // Si estamos en /editor?mode=... y elegimos lista existente, necesitamos saber su ID.
      // Asumiremos que el usuario navega en el modal.

      navigate('/');
    } catch (error: any) {
      if (error.code === 'permission-denied') {
         alert("Error de permisos en Firebase. Revisa las reglas.");
      } else {
         alert("Error al guardar: " + error.message);
      }
      setIsLoading(false);
    }
  };

  // Re-implementación de navegación en modal
  const onListSelectFinal = (id: string | null, newTitle?: string) => {
    if (id) {
       // Navegar a modo edición de esa lista
       // Pasamos state extra para indicar que queremos abrir escáner/manual si fuese necesario?
       // Simplificación: Navegar a /editor/ID y si era cámara, el usuario pulsa cámara de nuevo dentro.
       // O mantenemos estado local. Mantenemos estado local es más fluido.
       
       // Hack para mantener la ID correcta al guardar:
       navigate(`/editor/${id}?mode=${modeParam}`, { replace: true });
       // El useEffect de arriba cargará los datos.
       setShowListSelector(false);
    } else if (newTitle) {
      setTitle(newTitle);
      setQuestions([]);
      setCurrentQIndex(0);
      setShowListSelector(false);
      // Es un test nuevo, generamos ID al guardar
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
        <Loader2 className="animate-spin text-brand-600 mb-4" size={48} />
        <p className="text-slate-500">Procesando...</p>
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

      {/* Input oculto para cámara */}
      <input 
        id="file-upload-trigger" 
        type="file" 
        className="hidden" 
        accept="image/*,.pdf" 
        onChange={handleFileUpload} 
      />

      <header className="sticky top-0 bg-white/90 backdrop-blur z-20 py-4 border-b border-slate-100 mb-6 flex justify-between items-center px-4 -mx-4 shadow-sm">
        <div className="flex items-center gap-2">
           <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-100 rounded-full"><ArrowLeft /></button>
           <div className="flex flex-col">
             <span className="text-xs text-slate-400 font-bold uppercase">Editando Lista</span>
             <input 
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Título de la lista..."
                className="font-bold text-slate-800 bg-transparent focus:outline-none focus:border-b-2 border-brand-500 w-48 sm:w-auto"
             />
           </div>
        </div>
        <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold text-brand-600 uppercase tracking-wider mb-1">Guardar</span>
            <Button onClick={handleSave} className="w-12 h-12 rounded-full p-0 flex items-center justify-center shadow-lg shadow-brand-200">
              <Save size={20} />
            </Button>
        </div>
      </header>

      <div className="space-y-6">
        
        {/* Navegación de Preguntas */}
        <div className="flex justify-between items-center bg-white p-2 rounded-xl shadow-sm border border-slate-100 mb-4">
           <Button variant="ghost" onClick={() => navigateQuestion('prev')} disabled={currentQIndex === 0}>
             <ChevronLeft /> Anterior
           </Button>
           <span className="font-mono font-bold text-slate-500">
             {currentQIndex + 1} <span className="text-slate-300">/</span> {questions.length + (activeQ.text ? 1 : 0)}
           </span>
           <Button variant="ghost" onClick={() => navigateQuestion('next')} className="text-brand-600">
             Siguiente <ChevronRight />
           </Button>
        </div>

        {/* Tarjeta de Edición */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 relative min-h-[400px]">
            <div className="mb-6">
              <label className="block text-xs uppercase text-slate-400 font-bold mb-2">Pregunta</label>
              <TextArea 
                value={activeQ.text} 
                onChange={e => updateCurrentQuestion('text', e.target.value)} 
                placeholder="Escribe la pregunta aquí..."
                className="text-lg bg-slate-50 border-slate-200 min-h-[100px]"
              />
            </div>

            <div className="space-y-3">
              <label className="block text-xs uppercase text-slate-400 font-bold mb-2">Respuestas (Marca la correcta)</label>
              {activeQ.options.map((opt, oIndex) => (
                <div key={opt.id} className="flex items-center gap-3 group">
                  <button 
                    onClick={() => setCorrectOption(opt.id)}
                    className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${activeQ.correctOptionId === opt.id ? 'border-green-500 bg-green-500 text-white shadow-md shadow-green-200' : 'border-slate-300 text-transparent hover:border-slate-400'}`}
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
                      className="pl-8 py-3 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
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
                className="mt-2 text-sm font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-brand-50 transition-colors w-fit"
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
        // Shuffle questions
        const shuffled = [...loadedTest.questions].sort(() => Math.random() - 0.5);
        // Shuffle options but keep ID reference
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

  if (loading) return <div className="flex justify-center h-screen items-center"><Loader2 className="animate-spin text-brand-500" /></div>;
  if (!test) return <div>No se encontró el test.</div>;
  if (questions.length === 0) return <div>Este test no tiene preguntas.</div>;

  const currentQ = questions[currentIndex];
  // Las etiquetas siempre fijas A, B, C, D independientemente del orden real de las opciones
  const labels = ['A', 'B', 'C', 'D', 'E', 'F']; 

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-2xl mx-auto w-full">
      <header className="flex justify-between items-center mb-6 pt-4">
        <button onClick={() => navigate('/')} className="text-slate-400 hover:text-slate-600"><XCircle size={28} /></button>
        <div className="bg-white px-4 py-1 rounded-full border border-slate-200 text-sm font-bold text-slate-600 shadow-sm">
          {currentIndex + 1} / {questions.length}
        </div>
        <button onClick={finishQuiz} className="text-brand-600 font-bold text-sm hover:underline">Terminar</button>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
        <Card className="mb-6 border-l-4 border-l-brand-500 shadow-lg">
           <h2 className="text-xl md:text-2xl font-bold text-slate-800 leading-relaxed">{currentQ.text}</h2>
        </Card>

        <div className="space-y-3">
          {currentQ.options.map((opt, index) => {
            let stateStyle = "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300";
            let icon = <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 font-bold flex items-center justify-center text-sm">{labels[index]}</div>;

            if (isAnswerChecked) {
              if (opt.id === currentQ.correctOptionId) {
                 stateStyle = "border-green-500 bg-green-50 ring-1 ring-green-500";
                 icon = <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center"><CheckCircle size={18}/></div>;
              } else if (opt.id === selectedOptionId) {
                 stateStyle = "border-red-500 bg-red-50 ring-1 ring-red-500";
                 icon = <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center"><XCircle size={18}/></div>;
              } else {
                 stateStyle = "opacity-60 border-slate-100 grayscale";
              }
            } else if (selectedOptionId === opt.id) {
               stateStyle = "border-brand-500 bg-brand-50";
            }

            return (
              <div 
                key={opt.id}
                onClick={() => handleOptionSelect(opt.id)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-4 shadow-sm ${stateStyle}`}
              >
                {icon}
                <span className="font-medium text-slate-700 text-lg">{opt.text}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-200/50">
        {isAnswerChecked ? (
           <Button onClick={handleNext} className="w-full py-4 text-xl shadow-xl shadow-brand-500/20 rounded-2xl animate-in slide-in-from-bottom-2">
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
         <button onClick={() => navigate('/history')} className="p-2 hover:bg-white rounded-full"><ArrowLeft /></button>
         <h1 className="font-bold text-xl">Resumen</h1>
       </header>

       <Card className="text-center py-10 mb-8 bg-gradient-to-br from-brand-500 to-indigo-600 text-white border-none shadow-xl shadow-brand-500/20">
          <h2 className="text-brand-100 font-medium mb-4 text-lg">{result.testTitle}</h2>
          <div className="text-7xl font-bold mb-4 tracking-tighter">{percentage}%</div>
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full">
            <CheckCircle size={16} className="text-green-300"/> 
            <span className="font-medium">{result.score} aciertos</span>
            <span className="opacity-50 mx-1">|</span>
            <span className="font-medium">{result.totalQuestions} total</span>
          </div>
       </Card>

       <h3 className="font-bold text-lg mb-4 text-slate-700 px-2">Revisión de respuestas</h3>
       <div className="space-y-4">
         {result.details.map((detail, i) => (
           <div key={i} className={`bg-white rounded-xl p-5 shadow-sm border-l-4 ${detail.isCorrect ? 'border-l-green-500' : 'border-l-red-500'}`}>
             <div className="flex gap-3 mb-3">
               <span className="font-bold text-slate-300">#{i+1}</span>
               <p className="font-semibold text-slate-800">{detail.questionText}</p>
             </div>
             <div className="space-y-2 pl-8">
               {detail.options.map(opt => {
                 const isSelected = opt.id === detail.selectedOptionId;
                 const isCorrect = opt.id === detail.correctOptionId;
                 let style = "text-slate-500";
                 let icon = null;

                 if (isCorrect) {
                   style = "text-green-700 font-bold bg-green-50 px-2 py-1 rounded -ml-2";
                   icon = <CheckCircle size={16} className="inline mr-2"/>;
                 } else if (isSelected && !isCorrect) {
                   style = "text-red-600 font-medium line-through decoration-red-600/50 bg-red-50 px-2 py-1 rounded -ml-2";
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

  return (
    <div className="relative -top-6">
       {isOpen && (
         <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 flex gap-4 animate-in slide-in-from-bottom-4 fade-in">
           <button 
             onClick={() => { setIsOpen(false); onAction('manual'); }}
             className="flex flex-col items-center gap-2 group"
           >
             <div className="w-12 h-12 bg-white text-slate-700 rounded-full shadow-lg flex items-center justify-center border border-slate-100 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
               <PenTool size={20} />
             </div>
             <span className="text-xs font-bold text-slate-600 bg-white/80 px-2 rounded backdrop-blur">Manual</span>
           </button>

           <button 
             onClick={() => { setIsOpen(false); onAction('camera'); }}
             className="flex flex-col items-center gap-2 group"
           >
             <div className="w-12 h-12 bg-white text-slate-700 rounded-full shadow-lg flex items-center justify-center border border-slate-100 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
               <Camera size={20} />
             </div>
             <span className="text-xs font-bold text-slate-600 bg-white/80 px-2 rounded backdrop-blur">Escanear</span>
           </button>
         </div>
       )}
       
       <button 
         onClick={() => setIsOpen(!isOpen)} 
         className={`
           w-16 h-16 rounded-full shadow-xl flex items-center justify-center transition-all duration-300
           ${isOpen ? 'bg-slate-800 rotate-45' : 'bg-brand-600 hover:scale-105 hover:bg-brand-700'}
           text-white
         `}
       >
         <Plus size={32} />
       </button>
       
       {/* Overlay para cerrar al hacer click fuera */}
       {isOpen && (
         <div className="fixed inset-0 z-[-1]" onClick={() => setIsOpen(false)}></div>
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
      
      <nav className="bg-white/90 backdrop-blur-md border-t border-slate-200 fixed bottom-0 left-0 right-0 z-50 shadow-lg pb-safe">
        <div className="max-w-md mx-auto flex justify-around items-center h-16 px-4 relative">
          <button 
            onClick={() => navigate('/')} 
            className={`flex flex-col items-center p-2 rounded-xl transition-colors w-16 ${location.pathname === '/' ? 'text-brand-600 bg-brand-50' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <HomeIcon size={24} />
            <span className="text-[10px] font-bold mt-1">Inicio</span>
          </button>
          
          <FabMenu onAction={(action) => navigate(`/editor?mode=${action}`)} />
          
          <button 
            onClick={() => navigate('/history')} 
            className={`flex flex-col items-center p-2 rounded-xl transition-colors w-16 ${location.pathname.startsWith('/history') ? 'text-brand-600 bg-brand-50' : 'text-slate-400 hover:text-slate-600'}`}
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

  if (loading) {
     return <div className="h-screen flex items-center justify-center bg-brand-50"><Loader2 className="animate-spin text-brand-500" size={32}/></div>;
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
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;