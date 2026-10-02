import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
// CRITICAL: Must pass firebaseConfig.firestoreDatabaseId as the second parameter
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

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
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connectivity as per Firestore skill directives
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline check: please verify network or Firebase config.');
    }
  }
}

/**
 * 1. Store Login Data in Firestore
 * Updates /users/{userId} with lastLoginAt and writes an audit document to /auth_events
 */
export async function recordLoginData(userId: string, email: string, name: string, role = 'supporter') {
  const now = new Date().toISOString();
  try {
    const { setDoc } = await import('firebase/firestore');
    await setDoc(doc(db, 'users', userId), {
      id: userId,
      name,
      email,
      role,
      lastLoginAt: now,
      createdAt: now
    }, { merge: true });

    const eventId = `login_${userId}_${Date.now()}`;
    await setDoc(doc(db, 'auth_events', eventId), {
      userId,
      email,
      eventType: 'login',
      timestamp: now
    });
    return { success: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
  }
}

/**
 * 2. Store Logout Data in Firestore
 * Updates /users/{userId} with lastLogoutAt and writes an audit document to /auth_events
 */
export async function recordLogoutData(userId: string, email: string) {
  const now = new Date().toISOString();
  try {
    const { setDoc } = await import('firebase/firestore');
    await setDoc(doc(db, 'users', userId), {
      lastLogoutAt: now
    }, { merge: true });

    const eventId = `logout_${userId}_${Date.now()}`;
    await setDoc(doc(db, 'auth_events', eventId), {
      userId,
      email,
      eventType: 'logout',
      timestamp: now
    });
    return { success: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
  }
}

/**
 * 3. Store Connect / Contact Data in Firestore
 * Writes inquiry document to /contacts/{contactId}
 */
export async function recordConnectData(data: {
  name: string;
  email: string;
  phone?: string;
  reason?: string;
  message: string;
}) {
  const contactId = `contact_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const path = `contacts/${contactId}`;
  try {
    const { setDoc } = await import('firebase/firestore');
    await setDoc(doc(db, 'contacts', contactId), {
      name: data.name,
      email: data.email,
      phone: data.phone || '',
      reason: data.reason || 'General Inquiry',
      message: data.message,
      createdAt: new Date().toISOString()
    });
    return { success: true, contactId };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * 4. Store Newsletter Subscribe Data in Firestore
 * Writes subscriber document to /subscribers/{subscriberId}
 */
export async function recordSubscribeData(email: string) {
  const cleanEmail = email.trim().toLowerCase();
  const subscriberId = `sub_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;
  const path = `subscribers/${subscriberId}`;
  try {
    const { setDoc } = await import('firebase/firestore');
    await setDoc(doc(db, 'subscribers', subscriberId), {
      email: cleanEmail,
      createdAt: new Date().toISOString()
    });
    return { success: true, subscriberId };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}
