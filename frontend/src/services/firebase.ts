import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  Auth,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
  Firestore,
} from 'firebase/firestore';

// Firebase Project Configuration
// Reads strictly from Vite environment variables (configured in frontend/.env)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
};

// Singleton initialization
export const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);

/**
 * Helper to check if real Firebase API credentials are configured in .env
 */
export const isFirebaseConfigured = (): boolean => {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey;
  return Boolean(
    apiKey &&
    apiKey.length > 10 &&
    !apiKey.includes('Demo') &&
    !apiKey.includes('ForTestingOnly')
  );
};

// Providers
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export interface UserAccountData {
  uid: string;
  name: string;
  email: string;
  facility?: string;
  photoURL?: string;
  authProvider: 'google' | 'email' | 'demo';
  createdAt?: any;
  lastLogin?: any;
}

export type UserProfile = UserAccountData;

/**
 * Real Google Authentication using Firebase Auth & Firestore
 */
export const signInWithGoogle = async (): Promise<UserAccountData> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const fbUser = result.user;

    const userData: UserAccountData = {
      uid: fbUser.uid,
      name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Engineer',
      email: fbUser.email || '',
      photoURL: fbUser.photoURL || undefined,
      authProvider: 'google',
    };

    // Save or update user profile in Firestore
    try {
      const userRef = doc(db, 'users', fbUser.uid);
      await setDoc(
        userRef,
        {
          ...userData,
          lastLogin: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (firestoreErr) {
      console.warn('Firestore user doc sync notice (check Firestore security rules):', firestoreErr);
    }

    return userData;
  } catch (error: any) {
    console.error('Firebase Google sign-in error:', error);
    throw error;
  }
};

/**
 * Register a new user with Email and Password
 */
export const registerWithEmail = async (
  name: string,
  email: string,
  password: string,
  facility?: string
): Promise<UserAccountData> => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const fbUser = result.user;

    const userData: UserAccountData = {
      uid: fbUser.uid,
      name: name.trim() || email.split('@')[0],
      email: fbUser.email || email,
      facility: facility?.trim() || 'Plant Alpha',
      authProvider: 'email',
    };

    // Persist to Firestore database
    try {
      const userRef = doc(db, 'users', fbUser.uid);
      await setDoc(userRef, {
        ...userData,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      });
    } catch (firestoreErr) {
      console.warn('Firestore registration doc write notice:', firestoreErr);
    }

    return userData;
  } catch (error: any) {
    console.error('Firebase email registration error:', error);
    throw error;
  }
};

/**
 * Sign In existing user with Email and Password
 */
export const loginWithEmail = async (
  email: string,
  password: string
): Promise<UserAccountData> => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const fbUser = result.user;

    let facility = 'Plant Alpha';
    let name = fbUser.displayName || email.split('@')[0];

    // Fetch existing details from Firestore
    try {
      const userRef = doc(db, 'users', fbUser.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.name) name = data.name;
        if (data.facility) facility = data.facility;
      }

      await setDoc(
        userRef,
        {
          lastLogin: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (firestoreErr) {
      console.warn('Firestore login doc read notice:', firestoreErr);
    }

    const userData: UserAccountData = {
      uid: fbUser.uid,
      name,
      email: fbUser.email || email,
      facility,
      authProvider: 'email',
    };

    return userData;
  } catch (error: any) {
    console.error('Firebase email login error:', error);
    throw error;
  }
};

/**
 * Sign out current user
 */
export const logoutUser = async (): Promise<void> => {
  try {
    await fbSignOut(auth);
  } catch (error) {
    console.error('Firebase sign-out error:', error);
  }
};

/**
 * Save Contact Inquiry to Firestore Database
 */
export const saveContactInquiry = async (inquiry: {
  fullName: string;
  email: string;
  company: string;
  topic: string;
  message: string;
}): Promise<string> => {
  try {
    const inquiriesCol = collection(db, 'inquiries');
    const docRef = await addDoc(inquiriesCol, {
      ...inquiry,
      timestamp: serverTimestamp(),
      source: 'landing_page_contact_form',
    });
    return docRef.id;
  } catch (err) {
    console.warn('Firestore inquiry write notice:', err);
    return 'local_inquiry_' + Date.now();
  }
};

/**
 * Save What-If Simulation Scenario to Firestore Database
 */
export const saveSimulationScenario = async (scenario: {
  cycleTime: number;
  stationCapacity: number;
  utilization: number;
  productionRate: number;
  simulatedOutputs: Record<string, any>;
  userId?: string;
}): Promise<string> => {
  try {
    const simCol = collection(db, 'simulations');
    const docRef = await addDoc(simCol, {
      ...scenario,
      timestamp: serverTimestamp(),
    });
    return docRef.id;
  } catch (err) {
    console.warn('Firestore simulation write notice:', err);
    return 'local_sim_' + Date.now();
  }
};
