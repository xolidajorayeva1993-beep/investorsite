import { initializeApp, getApps, cert, type ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function getServiceAccount(): ServiceAccount | undefined {
  // JSON string sifatida berilgan bo'lsa
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    try {
      return JSON.parse(json) as ServiceAccount;
    } catch {
      console.error("FIREBASE_SERVICE_ACCOUNT_JSON parse xatosi");
    }
  }

  // Fayl yo'li sifatida berilgan bo'lsa
  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (path) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require(path) as ServiceAccount;
    } catch {
      console.error("FIREBASE_SERVICE_ACCOUNT_PATH fayl topilmadi:", path);
    }
  }

  return undefined;
}

if (!getApps().length) {
  const sa = getServiceAccount();
  const projectId = process.env.FIREBASE_PROJECT_ID || "fathai-d90bc";
  const storageBucket =
    process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`;
  if (sa) {
    initializeApp({ credential: cert(sa), projectId, storageBucket });
  } else {
    // Firebase App Hosting / Cloud Run — ADC (Application Default Credentials) ishlatadi
    initializeApp({ projectId, storageBucket });
  }
}

export const db = getFirestore();
