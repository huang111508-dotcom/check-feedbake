import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot, 
  Firestore, 
  writeBatch 
} from "firebase/firestore";
import { CloudConfig, DailyReport } from "../types";

// We use a fixed collection and document ID for this simple team tool.
// In a complex app, this would be dynamic based on login.
const COLLECTION_NAME = "dingtalk_reports";
const DOC_ID = "team_daily_summary";

let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let unsubscribe: (() => void) | undefined;

export const initFirebase = (config: CloudConfig) => {
  if (!config.enabled || !config.apiKey) return;

  try {
    // Avoid re-initializing if config hasn't theoretically changed, 
    // but for safety in this simple implementation, we check getApps
    if (getApps().length === 0) {
      app = initializeApp({
        apiKey: config.apiKey,
        authDomain: config.authDomain,
        projectId: config.projectId,
        storageBucket: config.storageBucket,
        messagingSenderId: config.messagingSenderId,
        appId: config.appId
      });
    } else {
      app = getApp();
    }
    db = getFirestore(app);
  } catch (error) {
    console.error("Error initializing Firebase:", error);
    throw error;
  }
};

export const subscribeToReports = (
  onData: (data: DailyReport[]) => void, 
  onError: (msg: string) => void
) => {
  if (!db) return;

  // Real-time listener
  const docRef = doc(db, COLLECTION_NAME, DOC_ID);
  
  unsubscribe = onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data && Array.isArray(data.reports)) {
        onData(data.reports);
      }
    } else {
      // Document doesn't exist yet, that's fine, it's an empty list
      onData([]);
    }
  }, (error) => {
    console.error("Firestore Listen Error:", error);
    if (error.code === 'permission-denied') {
      onError("Permission Denied. Check Firestore Rules.");
    } else {
      onError(error.message);
    }
  });

  return unsubscribe;
};

export const saveReportsToFirebase = async (reports: DailyReport[]) => {
  if (!db) throw new Error("Firebase not initialized");

  const docRef = doc(db, COLLECTION_NAME, DOC_ID);

  try {
    // Determine size roughly to prevent hitting strict 1MB document limit gracefully
    const jsonString = JSON.stringify({ reports });
    const sizeInBytes = new Blob([jsonString]).size;
    
    // Firestore limit is 1MB (1,048,576 bytes). Let's warn at 900KB.
    if (sizeInBytes > 900000) {
      throw new Error("STORAGE_FULL");
    }

    await setDoc(docRef, { 
      reports,
      lastUpdated: new Date().toISOString() 
    });
  } catch (error: any) {
    console.error("Firestore Save Error:", error);
    throw error;
  }
};

export const clearFirebaseData = async () => {
  if (!db) throw new Error("Firebase not initialized");
  const docRef = doc(db, COLLECTION_NAME, DOC_ID);
  await setDoc(docRef, { reports: [], lastUpdated: new Date().toISOString() });
};