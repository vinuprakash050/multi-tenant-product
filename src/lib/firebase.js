import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'demo.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-project',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'demo.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '000000000000',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || 'demo-app-id',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const mapSnapshot = (snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));

export async function fetchCollection(name) {
  const snapshot = await getDocs(collection(db, name));
  return mapSnapshot(snapshot);
}

export async function createOrder(order) {
  const document = await addDoc(collection(db, 'orders'), {
    ...order,
    createdAt: serverTimestamp(),
  });
  return document.id;
}

export async function updateOrder(orderId, values) {
  await updateDoc(doc(db, 'orders', orderId), values);
}

export { db };
