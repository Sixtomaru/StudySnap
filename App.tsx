import React, { useState, useEffect } from 'react';
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
  ArrowLeft,
  Save,
  Loader2,
  MoreVertical,
  Play,
  LogOut,
  User as UserIcon,
  Copy,
  ExternalLink
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

// --- Pages ---

const LoginPage = () => {
  const [errorType, setErrorType] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentDomain, setCurrentDomain] = useState('');

  // Efecto para detectar el dominio al montar el componente de forma robusta
  useEffect(() => {
    // Intentamos obtener host (incluye puerto) o hostname
    const detected = window.location.host || window.location.hostname || window.location.href || '';
    setCurrentDomain(detected);
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setErrorType(null);
      setErrorMessage('');
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Login Error:", err);
      
      if (err.code === 'auth/unauthorized-domain') {
        setErrorType('DOMAIN_ERROR');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setErrorMessage("Has cerrado la ventana de inicio de sesión.");
      } else {
        setErrorMessage(err.message || "Error desconocido al iniciar sesión.");
      }
    }
  };

  const copyToClipboard = () => {
    const textToCopy = currentDomain || window.location.href; 

    if (!textToCopy) {
      alert("No hay texto para copiar. Por favor escribe el dominio manualmente.");
      return;
    }

    const fallbackCopyTextToClipboard = (text: string) => {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.position = "fixed";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        const successful = document.execCommand('copy');
        if (successful) alert("Dominio copiado: " + text);
        else prompt("Cópialo manualmente:", text);
      } catch (err) {
        prompt("Cópialo manualmente:", text);
      }
      document.body.removeChild(textArea);
    }

    if (!navigator.clipboard) {
      fallbackCopyTextToClipboard(textToCopy);
      return;
    }

    navigator.clipboard.writeText(textToCopy).then(function() {
      alert("Dominio copiado: " + textToCopy);
    }, function(err) {
      fallbackCopyTextToClipboard(textToCopy);
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full border border-slate-100">
        <div className="bg-brand-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
          <FileText className="text-brand-600" size={32} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">StudySnap</h1>
        <p className="text-slate-500 mb-8">Escanea tus tests y estudia en cualquier lugar.</p>
        
        <Button 
          variant="secondary"
          onClick={handleGoogleLogin} 
          className="w-full flex items-center justify-center gap-3 py-3"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          <span>Continuar con Google</span>
        </Button>
        
        {errorMessage && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left shadow-inner">
            <p className="text-red-700 text-sm font-bold flex items-center gap-2">
                <XCircle size={16}/> {errorMessage}
            </p>
          </div>
        )}

        {errorType === 'DOMAIN_ERROR' && (
          <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg text-left shadow-inner">
             <p className="text-orange-800 font-bold text-sm mb-2 flex items-center gap-2">
               <XCircle size={16}/> Dominio no autorizado
             </p>
             <p className="text-xs text-slate-700 mb-3 leading-relaxed">
               Firebase bloqueó el acceso. Autoriza esta dirección:
             </p>
             <div className="flex items-center gap-2 mb-3">
               <input 
                 value={currentDomain}
                 onChange={(e) => setCurrentDomain(e.target.value)}
                 className="flex-1 bg-white border border-orange-300 p-2 rounded text-xs font-mono text-slate-900 font-bold"
               />
               <button onClick={copyToClipboard} className="p-2 bg-white border border-slate-200 rounded hover:bg-slate-50" title="Copiar"><Copy size={16}/></button>
             </div>
             <p className="text-xs text-slate-500">Añádelo en Firebase Console &gt; Authentication &gt; Settings &gt; Authorized Domains</p>
          </div>
        )}
      </div>
      <p className="mt-8 text-xs text-slate-400">Tus datos se guardan de forma segura en la nube.</p>
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
    if (confirm('¿Estás seguro de que quieres eliminar este test?')) {
      await storageService.deleteTest(id);
      setTests(prev => prev.filter(t => t.id !== id));
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mis Tests</h1>
          <p className="text-slate-500 text-sm">Hola, {user.displayName?.split(' ')[0]}</p>
        </div>
        <Button variant="primary" onClick={() => navigate('/editor')} className="flex items-center gap-2">
          <Plus size={20} /> <span className="hidden sm:inline">Nuevo</span>
        </Button>
      </header>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-brand-500" size={32} />
        </div>
      ) : tests.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <FileText size={48} className="mx-auto mb-4 opacity-50" />
          <p>No tienes tests guardados.</p>
          <p className="text-sm">¡Crea uno nuevo para empezar!</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tests.map(test => (
            <Card key={test.id} onClick={() => navigate(`/quiz/${test.id}`)} className="relative group hover:border-brand-300">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg line-clamp-2">{test.title}</h3>
                <button onClick={(e) => handleDelete(e, test.id)} className="text-slate-400 hover:text-red-500 p-1">
                  <Trash2 size={18} />
                </button>
              </div>
              <div className="text-sm text-slate-500 flex justify-between items-center">
                <span>{test.questions.length} preguntas</span>
                <span className="text-xs">{new Date(test.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="mt-4 flex gap-2">
                 <Button 
                    variant="secondary" 
                    className="flex-1 text-sm py-1.5"
                    onClick={(e) => { e.stopPropagation(); navigate(`/editor/${test.id}`); }}
                 >
                   Editar
                 </Button>
                 <Button variant="primary" className="flex-1 text-sm py-1.5 flex justify-center items-center gap-1">
                   <Play size={14} /> Empezar
                 </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      
      {/* Quick Actions (Floating for Mobile) */}
      <div className="fixed bottom-20 right-4 flex flex-col gap-3 sm:hidden">
        <button onClick={() => navigate('/editor?mode=camera')} className="bg-brand-600 text-white p-4 rounded-full shadow-lg hover:bg-brand-700">
          <Camera size={24} />
        </button>
        <button onClick={() => navigate('/editor?mode=manual')} className="bg-brand-600 text-white p-4 rounded-full shadow-lg hover:bg-brand-700">
          <PenTool size={24} />
        </button>
      </div>
    </div>
  );
};

const HistoryPage = ({ user }: { user: User }) => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadResults = async () => {
      setLoading(true);
      const data = await storageService.getResults(user.uid);
      setResults(data);
      setLoading(false);
    };
    loadResults();
  }, [user]);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-brand-500" /></div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
         <h1 className="text-2xl font-bold text-slate-900">Historial</h1>
         <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden sm:inline">{user.email}</span>
            <button onClick={() => signOut(auth)} className="text-slate-500 hover:text-red-500">
              <LogOut size={20} />
            </button>
         </div>
      </div>
      
      {results.length === 0 ? (
        <p className="text-slate-500 text-center py-10">Aún no has realizado ningún test.</p>
      ) : (
        <div className="space-y-4">
          {results.map(result => (
            <Card key={result.id} className="flex justify-between items-center" onClick={() => navigate(`/history/${result.id}`)}>
              <div>
                <h3 className="font-semibold text-slate-800">{result.testTitle}</h3>
                <p className="text-xs text-slate-500">{new Date(result.date).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <div className={`text-lg font-bold ${result.score / result.totalQuestions >= 0.5 ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.round((result.score / result.totalQuestions) * 100)}%
                </div>
                <div className="text-xs text-slate-500">{result.score}/{result.totalQuestions} aciertos</div>
              </div>
            </Card>
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
  const mode = searchParams.get('mode');
  const { id: editId } = useParams();

  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(!editId && !mode);

  useEffect(() => {
    const loadData = async () => {
      if (editId) {
        setIsLoading(true);
        const test = await storageService.getTestById(editId);
        if (test && test.userId === user.uid) {
          setTitle(test.title);
          setQuestions(test.questions);
        } else if (test) {
           alert("No tienes permiso para editar este test.");
           navigate('/');
        }
        setIsLoading(false);
      } else if (mode === 'camera' || mode === 'pdf') {
        setIsAiModalOpen(true);
      }
    };
    loadData();
  }, [editId, mode, user, navigate]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setIsAiModalOpen(false);

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64String = (reader.result as string).split(',')[1];
        const extractedQuestions = await parseFileToQuiz(base64String, file.type);
        setQuestions(prev => [...prev, ...extractedQuestions]);
        if (!title) setTitle(file.name.split('.')[0]);
      } catch (err: any) {
        console.error("Error procesando archivo:", err);
        // Mostramos el mensaje limpio, sin "Error: " duplicado si ya lo incluye el throw
        alert(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const addQuestion = () => {
    const newQ: Question = {
      id: generateId(),
      text: '',
      options: [
        { id: generateId(), text: '' },
        { id: generateId(), text: '' }
      ],
      correctOptionId: ''
    };
    setQuestions([...questions, newQ]);
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const newQs = [...questions];
    (newQs[index] as any)[field] = value;
    setQuestions(newQs);
  };

  const updateOption = (qIndex: number, oIndex: number, text: string) => {
    const newQs = [...questions];
    newQs[qIndex].options[oIndex].text = text;
    setQuestions(newQs);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!title.trim()) return alert("El test necesita un título");
    if (questions.length === 0) return alert("Añade al menos una pregunta");
    
    const missingAnswers = questions.some(q => !q.correctOptionId);
    if (missingAnswers) return alert("Todas las preguntas deben tener una respuesta correcta marcada.");

    setIsLoading(true);
    const test: Test = {
      id: editId || generateId(),
      userId: user.uid,
      title,
      createdAt: Date.now(),
      questions
    };

    await storageService.saveTest(test);
    setIsLoading(false);
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
        <Loader2 className="animate-spin text-brand-600 mb-4" size={48} />
        <h2 className="text-xl font-semibold">Procesando...</h2>
        <p className="text-slate-500 mt-2">Guardando datos o analizando imagen.</p>
        <p className="text-xs text-slate-400 mt-4 max-w-xs text-center">Esto puede tardar unos segundos. Si tarda mucho, verifica tu API Key.</p>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <header className="sticky top-0 bg-slate-50/95 backdrop-blur z-10 py-4 border-b border-slate-200 mb-6 flex justify-between items-center px-4 -mx-4">
        <button onClick={() => navigate('/')}><ArrowLeft /></button>
        <h1 className="font-bold text-lg">{editId ? 'Editar Test' : 'Nuevo Test'}</h1>
        <Button onClick={handleSave} disabled={questions.length === 0} className="flex items-center gap-1">
          <Save size={18} /> <span className="hidden sm:inline">Guardar</span>
        </Button>
      </header>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Título del Test</label>
          <Input 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            placeholder="Ej: Historia Tema 1" 
            className="text-lg font-semibold"
          />
        </div>

        {/* Action Bar for Adding content */}
        <div className="flex gap-2 mb-4">
           <Button variant="secondary" onClick={addQuestion} className="flex-1 flex justify-center items-center gap-2">
             <Plus size={18}/> Manual
           </Button>
           <label className="flex-1">
             <div className="flex justify-center items-center gap-2 bg-brand-50 text-brand-700 border border-brand-200 px-4 py-2 rounded-lg font-medium cursor-pointer hover:bg-brand-100 transition-colors">
               <Camera size={18}/> Escanear (Foto/PDF)
             </div>
             <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileUpload} />
           </label>
        </div>

        {questions.map((q, qIndex) => (
          <Card key={q.id} className="relative">
            <button onClick={() => removeQuestion(qIndex)} className="absolute top-2 right-2 text-slate-300 hover:text-red-500">
              <Trash2 size={18} />
            </button>
            <div className="mb-4 pr-6">
              <label className="block text-xs uppercase text-slate-400 font-bold mb-1">Pregunta {qIndex + 1}</label>
              <TextArea 
                value={q.text} 
                onChange={e => updateQuestion(qIndex, 'text', e.target.value)} 
                placeholder="Escribe la pregunta..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              {q.options.map((opt, oIndex) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <button 
                    onClick={() => updateQuestion(qIndex, 'correctOptionId', opt.id)}
                    className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${q.correctOptionId === opt.id ? 'border-green-500 bg-green-50 text-green-600' : 'border-slate-300 text-transparent'}`}
                  >
                    <CheckCircle size={14} fill="currentColor" />
                  </button>
                  <Input 
                    value={opt.text} 
                    onChange={e => updateOption(qIndex, oIndex, e.target.value)} 
                    placeholder={`Opción ${oIndex + 1}`}
                    className="py-1 text-sm"
                  />
                  <button 
                     onClick={() => {
                        const newOptions = q.options.filter((_, i) => i !== oIndex);
                        updateQuestion(qIndex, 'options', newOptions);
                     }}
                     className="text-slate-300 hover:text-red-400"
                  >
                    <XCircle size={16} />
                  </button>
                </div>
              ))}
              <button 
                onClick={() => {
                   const newOpt = { id: generateId(), text: '' };
                   updateQuestion(qIndex, 'options', [...q.options, newOpt]);
                }}
                className="text-brand-600 text-sm font-medium hover:underline ml-8"
              >
                + Añadir opción
              </button>
            </div>
            {!q.correctOptionId && (
              <div className="mt-2 text-red-500 text-xs flex items-center gap-1">
                <XCircle size={12}/> Selecciona la respuesta correcta pulsando el círculo.
              </div>
            )}
          </Card>
        ))}
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

  if (loading) return <div className="flex justify-center h-screen items-center"><Loader2 className="animate-spin text-brand-500" /></div>;
  if (!test) return <div>No se encontró el test.</div>;
  if (questions.length === 0) return <div>Este test no tiene preguntas.</div>;

  const currentQ = questions[currentIndex];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <header className="flex justify-between items-center mb-6">
        <button onClick={() => navigate('/')} className="text-slate-500"><XCircle /></button>
        <div className="text-sm font-medium text-slate-600">
          Pregunta {currentIndex + 1} de {questions.length}
        </div>
        <button onClick={finishQuiz} className="text-brand-600 font-medium text-sm">Terminar</button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <h2 className="text-xl font-bold text-slate-900 mb-6">{currentQ.text}</h2>

        <div className="space-y-3">
          {currentQ.options.map(opt => {
            let stateStyle = "border-slate-200 bg-white hover:bg-slate-50";
            if (isAnswerChecked) {
              if (opt.id === currentQ.correctOptionId) stateStyle = "border-green-500 bg-green-50 text-green-700";
              else if (opt.id === selectedOptionId) stateStyle = "border-red-500 bg-red-50 text-red-700";
              else stateStyle = "opacity-50 border-slate-200";
            } else if (selectedOptionId === opt.id) {
               stateStyle = "border-brand-500 bg-brand-50";
            }

            return (
              <div 
                key={opt.id}
                onClick={() => handleOptionSelect(opt.id)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${stateStyle}`}
              >
                {opt.text}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-100">
        {isAnswerChecked ? (
           <Button onClick={handleNext} className="w-full py-3 text-lg">
             {currentIndex === questions.length - 1 ? 'Ver Resultados' : 'Siguiente Pregunta'}
           </Button>
        ) : (
          <p className="text-center text-slate-400 text-sm">Selecciona una respuesta</p>
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
    <div className="pb-20">
       <header className="flex items-center gap-2 mb-6">
         <button onClick={() => navigate('/history')}><ArrowLeft /></button>
         <h1 className="font-bold text-lg">Resultados</h1>
       </header>

       <Card className="text-center py-8 mb-6 bg-gradient-to-br from-brand-50 to-white">
          <h2 className="text-slate-500 mb-2">{result.testTitle}</h2>
          <div className="text-5xl font-bold text-slate-900 mb-2">{percentage}%</div>
          <p className="text-slate-600">Has acertado {result.score} de {result.totalQuestions}</p>
       </Card>

       <h3 className="font-bold text-lg mb-4">Detalle de Respuestas</h3>
       <div className="space-y-4">
         {result.details.map((detail, i) => (
           <Card key={i} className={`border-l-4 ${detail.isCorrect ? 'border-l-green-500' : 'border-l-red-500'}`}>
             <p className="font-medium mb-3">{i+1}. {detail.questionText}</p>
             <div className="space-y-2 text-sm">
               {detail.options.map(opt => {
                 const isSelected = opt.id === detail.selectedOptionId;
                 const isCorrect = opt.id === detail.correctOptionId;
                 let style = "text-slate-500";
                 let icon = null;

                 if (isCorrect) {
                   style = "text-green-700 font-medium";
                   icon = <CheckCircle size={14} className="inline mr-1"/>;
                 } else if (isSelected && !isCorrect) {
                   style = "text-red-600 font-medium line-through decoration-red-600/50";
                   icon = <XCircle size={14} className="inline mr-1"/>;
                 }

                 return (
                   <div key={opt.id} className={`${style} flex items-center`}>
                     {icon} {opt.text}
                   </div>
                 );
               })}
             </div>
           </Card>
         ))}
       </div>
    </div>
  );
};

// --- Layout & Router ---

const Layout = ({ children, user }: { children?: React.ReactNode, user: User }) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  if (location.pathname.startsWith('/quiz/')) {
    return <div className="max-w-md mx-auto min-h-screen bg-slate-50 p-4">{children}</div>;
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col">
      <main className="flex-1 p-4 overflow-y-auto">
        {children}
      </main>
      
      <nav className="bg-white border-t border-slate-200 fixed bottom-0 left-0 right-0 max-w-md mx-auto flex justify-around items-center h-16 px-4 z-50">
        <button 
          onClick={() => navigate('/')} 
          className={`flex flex-col items-center p-2 rounded-lg transition-colors ${location.pathname === '/' ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <HomeIcon size={24} />
          <span className="text-xs font-medium mt-1">Inicio</span>
        </button>
        <div className="relative -top-5">
           <button 
             onClick={() => navigate('/editor')} 
             className="bg-brand-600 text-white p-4 rounded-full shadow-lg hover:bg-brand-700 transition-transform hover:scale-105"
           >
             <Plus size={28} />
           </button>
        </div>
        <button 
          onClick={() => navigate('/history')} 
          className={`flex flex-col items-center p-2 rounded-lg transition-colors ${location.pathname.startsWith('/history') ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <HistoryIcon size={24} />
          <span className="text-xs font-medium mt-1">Historial</span>
        </button>
      </nav>
    </div>
  );
};

const App = () => {
  const { user, loading } = useAuth();

  if (loading) {
     return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-brand-500"/></div>;
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