import { Test, TestResult } from '../types';
import { db } from './firebaseConfig';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  where,
  addDoc
} from 'firebase/firestore';

export const storageService = {
  // --- Tests ---
  
  // Guardar un test (Nuevo o Editar)
  saveTest: async (test: Test): Promise<void> => {
    try {
      await setDoc(doc(db, "tests", test.id), test);
    } catch (e) {
      console.error("Error guardando test: ", e);
      throw e;
    }
  },

  // Obtener todos los tests DE UN USUARIO ESPECÍFICO
  getTests: async (userId: string): Promise<Test[]> => {
    try {
      if (!userId) return [];
      const q = query(
        collection(db, "tests"), 
        where("userId", "==", userId)
      );
      const querySnapshot = await getDocs(q);
      const tests: Test[] = [];
      querySnapshot.forEach((doc) => {
        tests.push(doc.data() as Test);
      });
      return tests.sort((a, b) => b.createdAt - a.createdAt);
    } catch (e) {
      console.error("Error obteniendo tests: ", e);
      return [];
    }
  },

  // Obtener un test privado por ID (Solo funciona si eres el dueño)
  getTestById: async (id: string): Promise<Test | undefined> => {
    try {
      const docRef = doc(db, "tests", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as Test;
      } else {
        return undefined;
      }
    } catch (e) {
      console.error("Error obteniendo test: ", e);
      return undefined;
    }
  },

  // --- LÓGICA DE COMPARTIR (SNAPSHOTS PÚBLICOS) ---

  // 1. Crear una COPIA PÚBLICA del test en la colección 'shares'
  createPublicShare: async (testId: string): Promise<string> => {
      // Leemos el test original (como dueño)
      const original = await storageService.getTestById(testId);
      if (!original) throw new Error("Test original no encontrado");

      // Preparamos la copia pública
      // Generamos un ID nuevo aleatorio para el enlace compartido
      const shareId = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
      
      const sharedTest = {
          ...original,
          id: shareId, // El ID ahora es el del share
          originalId: testId, // Guardamos referencia por si acaso
          sharedAt: Date.now()
          // Mantenemos las preguntas y título, pero esto se guardará en 'shares'
      };

      // Guardamos en la colección 'shares'. 
      // IMPORTANTE: Requiere reglas de seguridad 'allow read: if true' en /shares/{shareId}
      await setDoc(doc(db, "shares", shareId), sharedTest);
      return shareId;
  },

  // 2. Leer un test de la colección 'shares' (Público)
  getSharedTest: async (shareId: string): Promise<Test | undefined> => {
      try {
        const docRef = doc(db, "shares", shareId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          return docSnap.data() as Test;
        }
        return undefined;
      } catch (e) {
        console.error("Error leyendo test compartido:", e);
        return undefined;
      }
  },

  // 3. Importar un test compartido a mis listas privadas
  importTest: async (testData: Test, newUserId: string): Promise<string> => {
      const newId = Math.random().toString(36).substring(2, 9);
      
      // Creamos una copia limpia para el nuevo usuario
      const newTest: Test = {
          ...testData,
          id: newId,
          userId: newUserId,
          title: testData.title, // Mantenemos el título original (más limpio)
          createdAt: Date.now()
      };
      
      // Limpiamos campos residuales de metadatos del share
      if ((newTest as any).sharedAt) delete (newTest as any).sharedAt;
      if ((newTest as any).originalId) delete (newTest as any).originalId;
      
      await setDoc(doc(db, "tests", newId), newTest);
      return newId;
  },

  // Borrar un test
  deleteTest: async (id: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, "tests", id));
    } catch (e) {
      console.error("Error borrando test: ", e);
      throw e;
    }
  },

  // --- Resultados / Historial ---

  saveResult: async (result: TestResult): Promise<void> => {
    try {
      await setDoc(doc(db, "results", result.id), result);
    } catch (e) {
      console.error("Error guardando resultado: ", e);
      throw e;
    }
  },

  getResults: async (userId: string): Promise<TestResult[]> => {
    try {
      if (!userId) return [];
      const q = query(
        collection(db, "results"), 
        where("userId", "==", userId)
      );
      const querySnapshot = await getDocs(q);
      const results: TestResult[] = [];
      querySnapshot.forEach((doc) => {
        results.push(doc.data() as TestResult);
      });
      return results.sort((a, b) => b.date - a.date);
    } catch (e) {
      console.error("Error obteniendo resultados: ", e);
      return [];
    }
  },

  getResultById: async (id: string): Promise<TestResult | undefined> => {
    try {
      const docRef = doc(db, "results", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as TestResult;
      } else {
        return undefined;
      }
    } catch (e) {
      console.error("Error obteniendo resultado: ", e);
      return undefined;
    }
  },

  deleteResult: async (id: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, "results", id));
    } catch (e) {
      console.error("Error borrando resultado: ", e);
      throw e;
    }
  },

  deleteAllResults: async (userId: string): Promise<void> => {
    try {
      const q = query(collection(db, "results"), where("userId", "==", userId));
      const querySnapshot = await getDocs(q);
      const promises = querySnapshot.docs.map(d => deleteDoc(d.ref));
      await Promise.all(promises);
    } catch (e) {
      console.error("Error borrando todo el historial: ", e);
      throw e;
    }
  }
};