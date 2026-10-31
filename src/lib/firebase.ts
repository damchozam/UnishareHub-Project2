
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
  type Auth,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyDMVYiE5THRn-oz7q4dLQVvhC09J9tIpoo',
  authDomain: 'unisharehub-project2.firebaseapp.com',
  projectId: 'unisharehub-project2',
  storageBucket: 'unisharehub-project2.firebasestorage.app',
  messagingSenderId: '443477649578',
  appId: '1:443477649578:web:f641a45c7b12bfe35bc8d3',
};

const app = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApp();

let auth: Auth;

try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

const db = getFirestore(app);

export { app, auth, db };
