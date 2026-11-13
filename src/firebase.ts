import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  signOut,
  type User as FirebaseUser
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  getDocs
} from 'firebase/firestore';
import appletConfig from '../firebase-applet-config.json';

export const SUPER_ADMIN_EMAIL = 'enikersom2020@gmail.com';

export function isEmailSuperAdmin(email?: string | null): boolean {
  return Boolean(email && email.trim().toLowerCase() === SUPER_ADMIN_EMAIL);
}

// ============================================================================
// CONFIGURAÇÃO DO FIREBASE FIRESTORE & AUTH (GOOGLE CLOUD)
// ============================================================================
function carregarConfigFirebase() {
  // 1. Prioridade Máxima: Configuração provisionada automaticamente pelo AI Studio
  if (appletConfig && appletConfig.projectId && appletConfig.apiKey) {
    return {
      config: {
        apiKey: appletConfig.apiKey,
        authDomain: appletConfig.authDomain || `${appletConfig.projectId}.firebaseapp.com`,
        projectId: appletConfig.projectId,
        storageBucket: appletConfig.storageBucket || `${appletConfig.projectId}.firebasestorage.app`,
        messagingSenderId: appletConfig.messagingSenderId || "",
        appId: appletConfig.appId || "",
        databaseId: appletConfig.firestoreDatabaseId || "(default)"
      },
      fonte: 'applet' as const
    };
  }

  // 2. Tenta carregar das variáveis de ambiente (Netlify / Vite)
  const envConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
    databaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || ""
  };

  if (envConfig.projectId && envConfig.apiKey) {
    return { config: envConfig, fonte: 'env' as const };
  }

  // 3. Tenta carregar do localStorage (Configuração salva pelo usuário no painel)
  try {
    if (typeof window !== 'undefined') {
      const salvo = localStorage.getItem('hubwash_firebase_config');
      if (salvo) {
        const parsed = JSON.parse(salvo);
        if (parsed.projectId && parsed.apiKey) {
          return { config: parsed, fonte: 'local' as const };
        }
      }
    }
  } catch (e) {
    console.warn('Erro ao ler hubwash_firebase_config:', e);
  }

  // 4. Configuração oficial do projeto hubwash-pro
  return {
    config: {
      apiKey: "AIzaSyDyAQAQ3m-fdTLMce9lIc40_2soI3Ro0yA",
      authDomain: "hubwash-pro.firebaseapp.com",
      projectId: "hubwash-pro",
      storageBucket: "hubwash-pro.firebasestorage.app",
      messagingSenderId: "282309703337",
      appId: "1:282309703337:web:6682da99bc8871a4b55bb8",
      databaseId: "(default)"
    },
    fonte: 'applet' as const
  };
}

const { config: firebaseConfig, fonte: configFonte } = carregarConfigFirebase();

// Inicialização segura do Firebase App, Auth e Firestore
const app = getApps().length > 0
  ? getApp()
  : initializeApp(firebaseConfig);

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

const db = firebaseConfig.databaseId && firebaseConfig.databaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.databaseId)
  : getFirestore(app);

// ============================================================================
// TRATAMENTO PADRONIZADO DE ERROS DE PERMISSÃO FIRESTORE
// ============================================================================
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
  rethrow = false
): FirestoreErrorInfo {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Error:', JSON.stringify(errInfo));
  if (rethrow) {
    throw new Error(JSON.stringify(errInfo));
  }
  return errInfo;
}

// Teste inicial de conectividade com o Firestore conforme padrão da skill Firebase
async function testConnection() {
  if (typeof window === 'undefined') return;
  try {
    await getDocFromServer(doc(db, 'teste_conexao', 'ping'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export function getFirebaseStatus(): {
  configurado: boolean;
  projectId: string;
  fonte: 'applet' | 'env' | 'local' | 'demo';
  modoReal: boolean;
  databaseId?: string;
} {
  const modoReal = Boolean(firebaseConfig.projectId && !firebaseConfig.projectId.includes('preview'));
  return {
    configurado: modoReal,
    projectId: firebaseConfig.projectId || '',
    fonte: configFonte as 'applet' | 'env' | 'local' | 'demo',
    modoReal,
    databaseId: firebaseConfig.databaseId || '(default)'
  };
}

export function salvarFirebaseConfig(novaConfig: {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  databaseId?: string;
}) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('hubwash_firebase_config', JSON.stringify(novaConfig));
      window.location.reload();
    }
  } catch (e) {
    console.error('Erro ao salvar hubwash_firebase_config:', e);
  }
}

export function limparFirebaseConfig() {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('hubwash_firebase_config');
      window.location.reload();
    }
  } catch {}
}

export {
  app,
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  signOut,
  type FirebaseUser,
  db,
  collection,
  addDoc,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  firebaseConfig
};
