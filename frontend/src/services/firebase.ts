import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  signOut as fbSignOut,
  User,
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
// Strictly read from Vite environment variables (configured via .env)
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

// Providers
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export interface UserAccountData {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  facility?: string;
  role?: string;
  phone?: string;
  department?: string;
  authProvider: 'google' | 'email';
  createdAt?: any;
  lastLogin?: any;
}

export type UserProfile = UserAccountData;

/**
 * Format Firebase Auth errors into clear, professional, user-friendly messages.
 */
export const formatAuthError = (err: any): string => {
  const code = String(err?.code || '').toLowerCase();
  const message = String(err?.message || '');

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid credentials. Please verify your email and password.';
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists. Please sign in instead.';
    case 'auth/weak-password':
      return 'Weak password. Passwords must be at least 6 characters.';
    case 'auth/invalid-email':
      return 'Please enter a valid work email address.';
    case 'auth/popup-closed-by-user':
      return 'Popup closed. Google sign-in was cancelled before completion.';
    case 'auth/cancelled-popup-request':
      return 'Sign-in cancelled. Another popup is already open.';
    case 'auth/popup-blocked':
      return 'Google sign-in popup was blocked by your browser. Please allow popups for localhost.';
    case 'auth/network-request-failed':
      return 'Network error. Please verify your internet connection.';
    case 'auth/operation-not-allowed':
      return 'Authentication provider is not enabled in Firebase Console. Please enable Email/Password and Google sign-in methods.';
    case 'auth/unauthorized-domain':
      return 'Domain not authorized. Add localhost (or your domain) to Authorized Domains in Firebase Console > Authentication > Settings.';
    default:
      if (message.includes('API key not valid') || code.includes('api-key')) {
        return 'Firebase API key error. Please check your VITE_FIREBASE_API_KEY in .env.';
      }
      return message || 'Authentication failed. Please try again.';
  }
};

/**
 * Maps a real Firebase User instance to our strongly-typed UserAccountData.
 */
export const mapFirebaseUser = (fbUser: User, facilityOverride?: string): UserAccountData => {
  const isGoogle = fbUser.providerData.some((p) => p.providerId === 'google.com');
  return {
    uid: fbUser.uid,
    name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Engineer',
    email: fbUser.email || '',
    photoURL: fbUser.photoURL || undefined,
    facility: facilityOverride || 'Plant Alpha',
    authProvider: isGoogle ? 'google' : 'email',
  };
};

/**
 * Subscribe to real-time Firebase Auth session state changes.
 * Used for session initialization and restoring state across page reloads.
 */
export const subscribeToAuthChanges = (
  callback: (user: UserAccountData | null) => void
): (() => void) => {
  return onAuthStateChanged(auth, async (fbUser) => {
    if (!fbUser) {
      callback(null);
      return;
    }

    let facility = 'Plant Alpha';
    let customName = fbUser.displayName;
    let role = 'Industrial Quality Lead';
    let phone = '';
    let department = 'Surface Integrity & NDT QA';

    // 1. Check local storage cache for rapid offline/instant recovery
    try {
      const cached = localStorage.getItem(`forgemind_user_profile_${fbUser.uid}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.name) customName = parsed.name;
        if (parsed.facility) facility = parsed.facility;
        if (parsed.role) role = parsed.role;
        if (parsed.phone) phone = parsed.phone;
        if (parsed.department) department = parsed.department;
      }
    } catch {
      // Non-blocking localStorage read
    }

    // 2. Firestore sync for profile metadata
    try {
      const userDocRef = doc(db, 'users', fbUser.uid);
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.facility) facility = data.facility;
        if (data.name) customName = data.name;
        if (data.role) role = data.role;
        if (data.phone) phone = data.phone;
        if (data.department) department = data.department;
      }
    } catch {
      // Non-blocking Firestore lookup
    }

    const userData: UserAccountData = {
      ...mapFirebaseUser(fbUser, facility),
      name: customName || fbUser.displayName || fbUser.email?.split('@')[0] || 'Engineer',
      role,
      phone,
      department,
    };

    callback(userData);
  });
};

/**
 * Real Google Authentication using Firebase OAuth Popup
 */
export const signInWithGoogle = async (): Promise<UserAccountData> => {
  const result = await signInWithPopup(auth, googleProvider);
  const fbUser = result.user;
  const userData = mapFirebaseUser(fbUser);

  // Sync profile to Firestore
  try {
    const userRef = doc(db, 'users', fbUser.uid);
    await setDoc(
      userRef,
      {
        uid: userData.uid,
        name: userData.name,
        email: userData.email,
        photoURL: userData.photoURL || null,
        authProvider: 'google',
        lastLogin: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (firestoreErr) {
    console.warn('Firestore profile sync notice:', firestoreErr);
  }

  return userData;
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
  const result = await createUserWithEmailAndPassword(auth, email, password);
  const fbUser = result.user;

  // Set displayName on the Firebase Auth user object
  if (name.trim()) {
    try {
      await updateProfile(fbUser, { displayName: name.trim() });
    } catch (profileErr) {
      console.warn('Could not update Firebase displayName:', profileErr);
    }
  }

  const userData = mapFirebaseUser(fbUser, facility?.trim() || 'Plant Alpha');
  userData.name = name.trim() || userData.name;

  // Persist user record in Firestore
  try {
    const userRef = doc(db, 'users', fbUser.uid);
    await setDoc(userRef, {
      uid: userData.uid,
      name: userData.name,
      email: userData.email,
      facility: userData.facility,
      authProvider: 'email',
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
    });
  } catch (firestoreErr) {
    console.warn('Firestore user registration notice:', firestoreErr);
  }

  return userData;
};

/**
 * Sign In existing user with Email and Password
 */
export const loginWithEmail = async (
  email: string,
  password: string
): Promise<UserAccountData> => {
  const result = await signInWithEmailAndPassword(auth, email, password);
  const fbUser = result.user;

  let facility = 'Plant Alpha';
  let name = fbUser.displayName || email.split('@')[0];

  // Try fetching additional details from Firestore
  try {
    const userRef = doc(db, 'users', fbUser.uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data.name) name = data.name;
      if (data.facility) facility = data.facility;
    }
    await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
  } catch (firestoreErr) {
    console.warn('Firestore login sync notice:', firestoreErr);
  }

  const userData: UserAccountData = {
    uid: fbUser.uid,
    name,
    email: fbUser.email || email,
    photoURL: fbUser.photoURL || undefined,
    facility,
    authProvider: 'email',
  };

  return userData;
};

/**
 * Sign out current user from Firebase Auth
 */
export const logoutUser = async (): Promise<void> => {
  await fbSignOut(auth);
};

/**
 * Update current user's profile in Firebase Auth, Firestore, and local persistent cache.
 */
export const updateCurrentUserProfile = async (updates: {
  name: string;
  facility?: string;
  role?: string;
  phone?: string;
  department?: string;
}): Promise<UserAccountData> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No authenticated user session found.');
  }

  const trimmedName = updates.name.trim();

  // 1. Update Firebase Auth displayName
  if (trimmedName && trimmedName !== user.displayName) {
    try {
      await updateProfile(user, { displayName: trimmedName });
    } catch (profileErr) {
      console.warn('Firebase Auth updateProfile notice:', profileErr);
    }
  }

  const facility = updates.facility?.trim() || 'Plant Alpha';
  const role = updates.role?.trim() || 'Industrial Quality Lead';
  const phone = updates.phone?.trim() || '';
  const department = updates.department?.trim() || 'Surface Integrity & NDT QA';

  // 2. Persist to local cache for guaranteed persistence
  try {
    localStorage.setItem(
      `forgemind_user_profile_${user.uid}`,
      JSON.stringify({
        name: trimmedName || user.displayName || 'Engineer',
        facility,
        role,
        phone,
        department,
        updatedAt: new Date().toISOString(),
      })
    );
  } catch {
    // Non-blocking localStorage
  }

  // 3. Persist to Firestore database
  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(
      userRef,
      {
        uid: user.uid,
        name: trimmedName || user.displayName || 'Engineer',
        facility,
        role,
        phone,
        department,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (firestoreErr) {
    console.warn('Firestore profile sync notice:', firestoreErr);
  }

  return {
    uid: user.uid,
    name: trimmedName || user.displayName || 'Engineer',
    email: user.email || '',
    photoURL: user.photoURL || undefined,
    facility,
    role,
    phone,
    department,
    authProvider: user.providerData.some((p) => p.providerId === 'google.com') ? 'google' : 'email',
  };
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
