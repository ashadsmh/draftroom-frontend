import { useState, useEffect } from 'react';
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from '../lib/firebase';
import { Player, SavedTeam } from '../types';

export function useFirestoreData(user: User | null) {
  const [watchlist, setWatchlist] = useState<Player[]>([]);
  const [savedTeams, setSavedTeams] = useState<SavedTeam[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load from Firestore when user logs in, fall back to localStorage when logged out
  useEffect(() => {
    if (!user) {
      // Not logged in — use localStorage
      try {
        const storedWatchlist = localStorage.getItem('draftroom_watchlist');
        if (storedWatchlist) setWatchlist(JSON.parse(storedWatchlist));
        const storedTeams = localStorage.getItem('draftroom_saved_teams');
        if (storedTeams) setSavedTeams(JSON.parse(storedTeams));
      } catch (e) {
        console.error('localStorage parse error', e);
      }
      return;
    }

    // Logged in — subscribe to Firestore
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setWatchlist(data.watchlist || []);
        setSavedTeams(data.savedTeams || []);
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Persist watchlist
  useEffect(() => {
    if (!user) {
      localStorage.setItem('draftroom_watchlist', JSON.stringify(watchlist));
      return;
    }
    // Debounce Firestore writes slightly
    const timer = setTimeout(() => {
      const userDocRef = doc(db, 'users', user.uid);
      setDoc(userDocRef, { watchlist }, { merge: true }).catch(console.error);
    }, 500);
    return () => clearTimeout(timer);
  }, [watchlist, user]);

  // Persist saved teams
  useEffect(() => {
    if (!user) {
      localStorage.setItem('draftroom_saved_teams', JSON.stringify(savedTeams));
      return;
    }
    const timer = setTimeout(() => {
      const userDocRef = doc(db, 'users', user.uid);
      setDoc(userDocRef, { savedTeams }, { merge: true }).catch(console.error);
    }, 500);
    return () => clearTimeout(timer);
  }, [savedTeams, user]);

  // On first login, migrate localStorage data to Firestore
  useEffect(() => {
    if (!user) return;

    const migrate = async () => {
      setIsSyncing(true);
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userDocRef);

        if (!snap.exists()) {
          // First time — migrate localStorage
          const storedWatchlist = localStorage.getItem('draftroom_watchlist');
          const storedTeams = localStorage.getItem('draftroom_saved_teams');
          const migratedWatchlist = storedWatchlist ? JSON.parse(storedWatchlist) : [];
          const migratedTeams = storedTeams ? JSON.parse(storedTeams) : [];

          await setDoc(userDocRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            watchlist: migratedWatchlist,
            savedTeams: migratedTeams,
            createdAt: Date.now(),
          });
        }
      } catch (e) {
        console.error('Migration error', e);
      } finally {
        setIsSyncing(false);
      }
    };

    migrate();
  }, [user]);

  return { watchlist, setWatchlist, savedTeams, setSavedTeams, isSyncing };
}
