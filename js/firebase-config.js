/**
 * Firebase Configuration and Initialization
 * Handles Firebase setup and exports db and auth instances
 */

const firebaseConfig = {
  apiKey: "AIzaSyC9NPNASthcKod0aNh1d7W-oCYcWMm7ZA0",
  authDomain: "book-library-95091.firebaseapp.com",
  projectId: "book-library-95091",
  storageBucket: "book-library-95091.firebasestorage.app",
  messagingSenderId: "976306987324",
  appId: "1:976306987324:web:dcfc79a6ae3fbfc045be39",
  measurementId: "G-4N8VD1SPLB"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
var db = firebase.firestore();
var auth = firebase.auth();
