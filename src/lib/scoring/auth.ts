import { logAudit } from '../audit';
import { db } from '../firebase';
import { doc, getDoc, setDoc, writeBatch, increment } from 'firebase/firestore';
import { ScoringCode, ScoringSession } from '../../types';

export async function hashAccessCode(code: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(code);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function generateSecureAccessCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const randomBytes = new Uint8Array(8);
  crypto.getRandomValues(randomBytes);
  let code = 'CRICTIFY-';
  for (let i = 0; i < 4; i++) code += chars[randomBytes[i] % chars.length];
  code += '-';
  for (let i = 4; i < 8; i++) code += chars[randomBytes[i] % chars.length];
  return code;
}

export async function createScoringCode(
  matchId: string, 
  tournamentId: string, 
  role: 'SCORER' | 'MATCH_ADMIN',
  assignedUserId?: string
): Promise<string> {
  const rawCode = generateSecureAccessCode();
  const codeHash = await hashAccessCode(rawCode);
  
  const scoringCode: ScoringCode = {
    id: codeHash,
    matchId,
    tournamentId,
    role,
    assignedUserId: assignedUserId || null,
    createdAt: Date.now(),
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
    maxUses: 1,
    usedCount: 0,
    active: true,
    revoked: false
  };

  await setDoc(doc(db, 'scoringCodes', codeHash), scoringCode);
  return rawCode;
}

export async function redeemScoringCode(rawCode: string, userId: string, matchId: string): Promise<boolean> {
  const codeHash = await hashAccessCode(rawCode);
  const codeRef = doc(db, 'scoringCodes', codeHash);
  const codeSnap = await getDoc(codeRef);
  
  if (!codeSnap.exists()) {
    throw new Error('Invalid or expired code.');
  }
  
  const codeData = codeSnap.data() as ScoringCode;
  
  if (codeData.matchId !== matchId) {
    throw new Error('Code is not valid for this match.');
  }
  if (!codeData.active || codeData.revoked) {
    throw new Error('Code has been revoked or is inactive.');
  }
  if (codeData.expiresAt < Date.now()) {
    throw new Error('Code has expired.');
  }
  if (codeData.usedCount >= codeData.maxUses) {
    throw new Error('Code has reached maximum uses.');
  }
  if (codeData.assignedUserId && codeData.assignedUserId !== userId) {
    throw new Error('Code is assigned to another user.');
  }

  const sessionId = `${matchId}_${userId}`;
  const sessionRef = doc(db, 'scoringSessions', sessionId);
  
  const session: ScoringSession = {
    id: sessionId,
    userId,
    matchId: codeData.matchId,
    tournamentId: codeData.tournamentId,
    role: codeData.role,
    createdAt: Date.now(),
    expiresAt: codeData.expiresAt,
    lastActivityAt: Date.now(),
    revoked: false,
    codeHash
  };

  const batch = writeBatch(db);
  batch.set(sessionRef, session);
  batch.update(codeRef, { usedCount: increment(1) });
  
  await batch.commit();
  return true;
}

export async function getScoringSession(matchId: string, userId: string): Promise<ScoringSession | null> {
  const sessionId = `${matchId}_${userId}`;
  const snap = await getDoc(doc(db, 'scoringSessions', sessionId));
  if (snap.exists()) {
    const data = snap.data() as ScoringSession;
    if (!data.revoked && data.expiresAt > Date.now()) {
      return data;
    }
  }
  return null;
}
