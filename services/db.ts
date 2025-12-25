import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { Song } from "../types";

// --- DATABASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyDXGVUSCFHJWkZbxF2BGCap42TTpDPuoEQ",
  authDomain: "serhio-tomasito-music.firebaseapp.com",
  projectId: "serhio-tomasito-music",
  storageBucket: "serhio-tomasito-music.firebasestorage.app",
  messagingSenderId: "1056261408612",
  appId: "1:1056261408612:web:74de275a4bdce1b0b85c71"
};

// --- INITIAL DATA (Fallback) ---
const GLOBAL_LIBRARY: Song[] = [
  {
    id: 'cloud-1',
    title: 'Summer Walk',
    artist: 'Olexy (Global Hit)',
    url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=summer-walk-112694.mp3',
    duration: 0,
    isCloud: true
  },
  {
    id: 'cloud-2',
    title: 'Lofi Chill',
    artist: 'FASSounds',
    url: 'https://cdn.pixabay.com/download/audio/2022/02/10/audio_fc8c8375ae.mp3?filename=lofi-study-112191.mp3',
    duration: 0,
    isCloud: true
  }
];

let db: any = null;
let useFirebase = false;

// --- INITIALIZATION ---
try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  useFirebase = true;
  console.log("🔥 Firebase Initialized (Connection pending...)");
} catch (e) {
  console.warn("Firebase Init Failed (Offline Mode Active):", e);
  useFirebase = false;
}

// --- LOCAL STORAGE HELPERS ---
const startLocalSync = (callback: (songs: Song[]) => void) => {
  const loadLocal = () => {
    try {
      const stored = localStorage.getItem('stm_library');
      if (stored) {
        callback(JSON.parse(stored));
      } else {
        localStorage.setItem('stm_library', JSON.stringify(GLOBAL_LIBRARY));
        callback(GLOBAL_LIBRARY);
      }
    } catch (e) {
      console.error("Local Storage Error:", e);
      callback(GLOBAL_LIBRARY);
    }
  };

  // Load immediately
  loadLocal();

  // Listen for changes
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === 'stm_library') loadLocal();
  };
  
  const handleCustomUpdate = () => loadLocal();

  window.addEventListener('storage', handleStorageChange);
  window.addEventListener('stm_library_update', handleCustomUpdate);

  return () => {
    window.removeEventListener('storage', handleStorageChange);
    window.removeEventListener('stm_library_update', handleCustomUpdate);
  };
};

const saveLocal = (song: Song) => {
  try {
    const stored = localStorage.getItem('stm_library');
    const current = stored ? JSON.parse(stored) : GLOBAL_LIBRARY;
    // Add to beginning
    const updated = [song, ...current];
    localStorage.setItem('stm_library', JSON.stringify(updated));
    window.dispatchEvent(new Event('stm_library_update'));
  } catch(e) { console.error("Save Local Failed", e); }
};

const removeFromLocal = (id: string) => {
  try {
    const stored = localStorage.getItem('stm_library');
    if (!stored) return;
    const current = JSON.parse(stored) as Song[];
    const updated = current.filter(s => s.id !== id);
    localStorage.setItem('stm_library', JSON.stringify(updated));
    window.dispatchEvent(new Event('stm_library_update'));
  } catch(e) { console.error("Remove Local Failed", e); }
};

// --- PUBLIC API ---

export const subscribeToLibrary = (callback: (songs: Song[]) => void) => {
  // If Firebase is disabled or init failed, go straight to local
  if (!useFirebase || !db) {
    return startLocalSync(callback);
  }

  // Try connecting to Firebase
  let localUnsubscribe: (() => void) | null = null;
  let firestoreUnsubscribe: (() => void) | null = null;

  try {
    const q = query(collection(db, "songs"), orderBy("createdAt", "desc"));
    
    firestoreUnsubscribe = onSnapshot(q, 
      (snapshot) => {
        // Success: Update data from cloud
        const songs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Song[];
        callback(songs);
      }, 
      (error) => {
        // Error: Fallback to local
        console.warn("⚠️ Firebase Error (Switching to Local Mode). Reason:", error.code || error.message);
        useFirebase = false; // Disable future attempts
        
        if (!localUnsubscribe) {
            localUnsubscribe = startLocalSync(callback);
        }
      }
    );
  } catch (e) {
    console.warn("Sync Setup Error (Switching to Local Mode):", e);
    useFirebase = false;
    return startLocalSync(callback);
  }

  // Return generic cleanup
  return () => {
    if (firestoreUnsubscribe) firestoreUnsubscribe();
    if (localUnsubscribe) localUnsubscribe();
  };
};

export const addSongToLibrary = async (song: Song) => {
  if (useFirebase && db) {
    try {
      await addDoc(collection(db, "songs"), {
        ...song,
        createdAt: Date.now()
      });
      console.log("Song added to cloud:", song.title);
      return;
    } catch (e) {
      console.error("Cloud Write Error (Falling back to local):", e);
      useFirebase = false;
    }
  }
  // Fallback
  saveLocal(song);
};

export const removeSongFromLibrary = async (id: string) => {
  if (useFirebase && db) {
    try {
      await deleteDoc(doc(db, "songs", id));
      console.log("Song deleted from cloud:", id);
      return;
    } catch (e) {
      console.error("Cloud Delete Error (Falling back to local):", e);
      useFirebase = false;
    }
  }
  // Fallback
  removeFromLocal(id);
};

export const isLiveMode = () => useFirebase;