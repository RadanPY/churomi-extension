// Churomi defaults (safe to ship in extension)
// Note: Firebase `apiKey` is not a secret; it identifies your Firebase project for client-side calls.
// Backend secrets (Stripe secret key, Firebase Admin private key) must NEVER be stored here.

/* global self */

self.CHUROMI_FIREBASE = {
  apiKey: 'AIzaSyARbeEdX9o6qitX0YW2w-OkxrZPutSP7JM',
  authDomain: 'churomi-2d1fe.firebaseapp.com',
  projectId: 'churomi-2d1fe',
  storageBucket: 'churomi-2d1fe.firebasestorage.app',
  messagingSenderId: '118009164920',
  appId: '1:118009164920:web:27a4fa9242d16b41e3698d',
  measurementId: 'G-EF6MEXE401'
};

self.CHUROMI_DEFAULTS = {
  siteUrl: 'https://churomi.com',
  backendUrl: 'https://api.churomi.com',
  firebaseApiKey: self.CHUROMI_FIREBASE.apiKey
};
