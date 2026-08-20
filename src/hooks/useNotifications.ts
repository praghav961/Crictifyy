import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db, getMessagingInstance } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { getToken, onMessage } from 'firebase/messaging';

export interface NotificationPreferences {
  matchReminder: boolean;
  matchStarted: boolean;
  wicket: boolean;
  fifty: boolean;
  century: boolean;
  fiveWicketHaul: boolean;
  inningsCompleted: boolean;
  matchCompleted: boolean;
  fixtureCreated: boolean;
  tournamentUpdate: boolean;
  pointsTableUpdate: boolean;
}

export const defaultPreferences: NotificationPreferences = {
  matchReminder: true,
  matchStarted: true,
  wicket: true,
  fifty: true,
  century: true,
  fiveWicketHaul: true,
  inningsCompleted: true,
  matchCompleted: true,
  fixtureCreated: true,
  tournamentUpdate: true,
  pointsTableUpdate: true,
};

export function useNotifications() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'default'
  );

  useEffect(() => {
    if (!user) return;
    
    const loadPreferences = async () => {
      try {
        const docRef = doc(db, 'users', user.uid, 'settings', 'notifications');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setPreferences({ ...defaultPreferences, ...snap.data() });
        } else {
          await setDoc(docRef, defaultPreferences);
        }
      } catch (err) {
        console.error("Failed to load preferences", err);
      } finally {
        setLoading(false);
      }
    };
    
    loadPreferences();
  }, [user]);

  useEffect(() => {
    const setupForegroundMessaging = async () => {
      const messaging = await getMessagingInstance();
      if (!messaging) return;
      onMessage(messaging, (payload) => {
        console.log("Foreground message received:", payload);
        if ('Notification' in window && Notification.permission === 'granted') {
           new Notification(payload.notification?.title || 'CRICTIFY', {
              body: payload.notification?.body,
              icon: '/icon.png'
           });
        }
      });
    };
    setupForegroundMessaging();
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) return false;
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm === 'granted' && user) {
        const messaging = await getMessagingInstance();
        if (messaging) {
          const token = await getToken(messaging);
          if (token) {
             const docRef = doc(db, 'users', user.uid, 'settings', 'notifications');
             await updateDoc(docRef, { fcmToken: token });
          }
        }
      }
      return perm === 'granted';
    } catch (err) {
      console.error("Permission request failed", err);
      return false;
    }
  };

  const updatePreferences = async (newPrefs: Partial<NotificationPreferences>) => {
    if (!user) return;
    const updated = { ...preferences, ...newPrefs };
    setPreferences(updated);
    try {
      const docRef = doc(db, 'users', user.uid, 'settings', 'notifications');
      await updateDoc(docRef, newPrefs);
    } catch (err) {
      console.error("Failed to update preferences", err);
    }
  };

  return {
    preferences,
    loading,
    permission,
    requestPermission,
    updatePreferences
  };
}
