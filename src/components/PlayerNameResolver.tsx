import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Player } from '../types';

// Global cache for the session
const sessionPlayerCache: Record<string, string> = {};

export function PlayerNameResolver({ 
  playerId, 
  fallbackName,
  className = ''
}: { 
  playerId: string; 
  fallbackName?: string;
  className?: string;
}) {
  const [name, setName] = useState<string>(() => {
    if (!playerId) return fallbackName || '';
    if (playerId.startsWith('temp_')) return fallbackName || playerId.replace('temp_', '').replace(/_/g, ' ');
    if (sessionPlayerCache[playerId]) return sessionPlayerCache[playerId];
    return fallbackName || playerId;
  });
  
  const [loading, setLoading] = useState(() => {
    if (!playerId || playerId.startsWith('temp_')) return false;
    return !sessionPlayerCache[playerId];
  });

  useEffect(() => {
    if (!playerId || playerId.startsWith('temp_')) {
      return;
    }

    if (sessionPlayerCache[playerId]) {
      setName(sessionPlayerCache[playerId]);
      setLoading(false);
      return;
    }

    const fetchPlayer = async () => {
      try {
        const snap = await getDoc(doc(db, 'players', playerId));
        if (snap.exists()) {
          const data = snap.data() as Player;
          sessionPlayerCache[playerId] = data.name;
          setName(data.name);
        } else {
          sessionPlayerCache[playerId] = fallbackName || playerId;
          setName(fallbackName || playerId);
        }
      } catch (err) {
        console.error("Failed to fetch player from players collection", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayer();
  }, [playerId, fallbackName]);

  if (loading) {
    return <span className={`inline-block animate-pulse bg-foreground-muted/20 h-[1em] w-[4em] rounded align-middle ${className}`} />;
  }

  return <>{name}</>;
}
