
import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

// This is the robust way to initialize, especially for Next.js environments.
// It relies on Google-provided environment variables in production (like App Hosting)
// and can use a service account locally if you set GOOGLE_APPLICATION_CREDENTIALS.
if (!getApps().length) {
  try {
    admin.initializeApp();
    console.log("Firebase Admin SDK initialized successfully.");
  } catch (e: any) {
    console.error("Firebase Admin SDK initialization error:", e.message);
    // This will prevent the app from crashing if initialization fails,
    // but subsequent Firestore calls will fail.
  }
}

export const adminDb = admin.firestore();
