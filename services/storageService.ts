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
  orderBy,
  where
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
      // Filtramos por userId
      const q = query(
        collection(db, "tests"), 
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      const tests: Test[] = [];
      querySnapshot.forEach((doc) => {
        tests.push(doc.data() as Test);
      });
      return tests;
    } catch (e) {
      console.error("Error obteniendo tests: ", e);
      return [];
    }
  },

  // Obtener un test por ID
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

  // Guardar resultado
  saveResult: async (result: TestResult): Promise<void> => {
    try {
      await setDoc(doc(db, "results", result.id), result);
    } catch (e) {
      console.error("Error guardando resultado: ", e);
      throw e;
    }
  },

  // Obtener historial DE UN USUARIO
  getResults: async (userId: string): Promise<TestResult[]> => {
    try {
      if (!userId) return [];
      const q = query(
        collection(db, "results"), 
        where("userId", "==", userId),
        orderBy("date", "desc")
      );
      const querySnapshot = await getDocs(q);
      const results: TestResult[] = [];
      querySnapshot.forEach((doc) => {
        results.push(doc.data() as TestResult);
      });
      return results;
    } catch (e) {
      console.error("Error obteniendo resultados: ", e);
      return [];
    }
  }
};