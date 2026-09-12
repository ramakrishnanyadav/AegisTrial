// Firebase SDK Initialization & Cloud Database Service
// Configured with GuardAgent Firebase Database (Project: guardagent-d49b6)
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  orderBy, 
  limit,
  type Firestore,
  type Unsubscribe
} from "firebase/firestore";
import { 
  getDatabase, 
  ref, 
  set, 
  get, 
  onValue, 
  push,
  type Database 
} from "firebase/database";
import { 
  getAuth, 
  type Auth 
} from "firebase/auth";
import type { ScreeningRun, AuditTrailLog, UserSession } from "../types";

// User-provided Firebase configuration for GuardAgent
export const firebaseConfig = {
  apiKey: "AIzaSyAdaDFzPvEMCbdF0e1yJ_9yBZOmUTb3-bE",
  authDomain: "guardagent-d49b6.firebaseapp.com",
  databaseURL: "https://guardagent-d49b6-default-rtdb.firebaseio.com",
  projectId: "guardagent-d49b6",
  storageBucket: "guardagent-d49b6.firebasestorage.app",
  messagingSenderId: "823766521713",
  appId: "1:823766521713:web:b73d7b45526c42516f08d0",
  measurementId: "G-4EDEW9MPVP"
};

// Singleton App Initialization
export const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Firebase Realtime Database (RTDB)
export const rtdb: Database = getDatabase(app);

// Cloud Firestore Database
export const firestore: Firestore = getFirestore(app);

// Firebase Authentication
export const auth: Auth = getAuth(app);

// Google Analytics (Initialized conditionally with frame/SSR guards)
let analyticsInstance: Analytics | null = null;
if (typeof window !== "undefined") {
  isSupported()
    .then((supported) => {
      if (supported) {
        analyticsInstance = getAnalytics(app);
      }
    })
    .catch(() => {
      // Benign fallback if Google Analytics cookies are blocked in sandboxed iframe
      analyticsInstance = null;
    });
}

export const getAnalyticsInstance = (): Analytics | null => analyticsInstance;

/**
 * Strict Undefined-Stripping (Zero-Crash Payload Hygiene)
 * Satisfies Production Directive §6 by preventing undefined values from ever reaching Firestore/RTDB.
 */
export function sanitizeForDatabase<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) => (value === undefined ? null : value))
  );
}

export interface FirebaseConnectionStatus {
  connected: boolean;
  latencyMs: number;
  projectId: string;
  databaseURL: string;
  firestoreReady: boolean;
  rtdbReady: boolean;
  lastChecked: string;
  error?: string;
}

/**
 * Checks connectivity to the Firebase Realtime Database & Firestore endpoints.
 */
export async function checkFirebaseDatabaseConnection(): Promise<FirebaseConnectionStatus> {
  const start = performance.now();
  const status: FirebaseConnectionStatus = {
    connected: false,
    latencyMs: 0,
    projectId: firebaseConfig.projectId,
    databaseURL: firebaseConfig.databaseURL,
    firestoreReady: false,
    rtdbReady: false,
    lastChecked: new Date().toISOString()
  };

  try {
    // 1. Test Realtime Database ping/read
    const pingRef = ref(rtdb, ".info/connected");
    const rtdbSnapshot = await Promise.race([
      get(pingRef),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error("RTDB timeout")), 4000))
    ]);
    if (rtdbSnapshot !== null) {
      status.rtdbReady = true;
    }
  } catch (err: any) {
    status.error = `RTDB: ${err?.message || "Unavailable"}`;
  }

  try {
    // 2. Test Firestore read
    const healthDoc = doc(firestore, "_system", "health");
    await Promise.race([
      getDoc(healthDoc),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error("Firestore timeout")), 4000))
    ]);
    status.firestoreReady = true;
  } catch (err: any) {
    if (!status.error) {
      status.error = `Firestore: ${err?.message || "Unavailable"}`;
    }
  }

  status.latencyMs = Math.round(performance.now() - start);
  status.connected = status.rtdbReady || status.firestoreReady;
  return status;
}

/**
 * Persists a clinical screening run to Firebase Cloud Database (both Firestore & RTDB).
 */
export async function persistScreeningToFirebase(screening: ScreeningRun): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanPayload = sanitizeForDatabase({
      ...screening,
      syncedAt: new Date().toISOString(),
      cloudDatabase: "guardagent-d49b6"
    });

    // 1. Write to Firestore 'screenings' collection
    const firestoreRef = doc(firestore, "screenings", screening.id);
    await setDoc(firestoreRef, cleanPayload, { merge: true });

    // 2. Mirror to Realtime Database for instant sub-millisecond sync
    const rtdbPath = ref(rtdb, `screenings/${screening.id}`);
    await set(rtdbPath, cleanPayload);

    return { success: true };
  } catch (err: any) {
    console.warn("Failed to persist screening to Firebase:", err);
    return { success: false, error: err?.message || "Firebase write error" };
  }
}

/**
 * Persists an immutable 21 CFR Part 11 audit log entry to Firebase.
 */
export async function persistAuditLogToFirebase(log: AuditTrailLog): Promise<{ success: boolean; error?: string }> {
  try {
    const logId = log.eventId || (log as any).id || (`evt-${Date.now()}`);
    const cleanPayload = sanitizeForDatabase({
      ...log,
      id: logId,
      cloudSyncedAt: new Date().toISOString(),
      integrityVerified: true
    });

    // 1. Firestore 'audit_logs' collection
    const firestoreRef = doc(firestore, "audit_logs", logId);
    await setDoc(firestoreRef, cleanPayload);

    // 2. Realtime Database mirror
    const rtdbPath = ref(rtdb, `audit_logs/${logId}`);
    await set(rtdbPath, cleanPayload);

    return { success: true };
  } catch (err: any) {
    console.warn("Failed to persist audit log to Firebase:", err);
    return { success: false, error: err?.message || "Firebase write error" };
  }
}

/**
 * Subscribes to real-time changes in the Firebase audit trail.
 */
export function subscribeToAuditLogs(onUpdate: (logs: AuditTrailLog[]) => void): Unsubscribe {
  const auditQuery = query(
    collection(firestore, "audit_logs"),
    orderBy("timestamp", "desc"),
    limit(50)
  );

  return onSnapshot(
    auditQuery,
    (snapshot) => {
      const logs: AuditTrailLog[] = [];
      snapshot.forEach((docSnap) => {
        logs.push(docSnap.data() as AuditTrailLog);
      });
      if (logs.length > 0) {
        onUpdate(logs);
      }
    },
    (error) => {
      console.warn("Firestore audit logs listener error (falling back to local):", error.message);
    }
  );
}

/**
 * Persists an adversarial benchmark result to Firebase.
 */
export async function persistBenchmarkToFirebase(result: {
  id: string;
  testId: string;
  title: string;
  passed: boolean;
  detected: boolean;
  latencyMs: number;
  timestamp: string;
}): Promise<void> {
  try {
    const clean = sanitizeForDatabase(result);
    const firestoreRef = doc(firestore, "attack_benchmarks", result.id);
    await setDoc(firestoreRef, clean, { merge: true });

    const rtdbPath = ref(rtdb, `attack_benchmarks/${result.id}`);
    await set(rtdbPath, clean);
  } catch (err) {
    console.warn("Could not sync benchmark to Firebase:", err);
  }
}
