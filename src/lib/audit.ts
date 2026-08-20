import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface AuditLog {
  id?: string;
  userId: string;
  action: string;
  matchId?: string;
  tournamentId?: string;
  timestamp: any;
  metadata?: Record<string, any>;
}

export const logAudit = async (
  userId: string,
  action: string,
  params?: {
    matchId?: string;
    tournamentId?: string;
    metadata?: Record<string, any>;
  }
) => {
  if (!userId) return;
  try {
    const logData: AuditLog = {
      userId,
      action,
      timestamp: serverTimestamp(),
      ...params,
    };
    await addDoc(collection(db, 'auditLogs'), logData);
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
};
