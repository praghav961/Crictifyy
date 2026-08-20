import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { AuditLog } from '../../lib/audit';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Activity } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { hasRole } = useAuth();

  useEffect(() => {
    async function fetchLogs() {
      try {
        const q = query(
          collection(db, 'auditLogs'),
          orderBy('timestamp', 'desc'),
          limit(100)
        );
        const snapshot = await getDocs(q);
        const fetchedLogs: AuditLog[] = [];
        snapshot.forEach(doc => {
          fetchedLogs.push({ id: doc.id, ...doc.data() } as AuditLog);
        });
        setLogs(fetchedLogs);
      } catch (error) {
        console.error("Failed to fetch audit logs", error);
      } finally {
        setLoading(false);
      }
    }

    if (hasRole('SUPER_ADMIN')) {
      fetchLogs();
    } else {
      setLoading(false); // They shouldn't see it anyway due to route guard, but just in case
    }
  }, [hasRole]);

  if (!hasRole('SUPER_ADMIN')) {
    return <div className="p-8 text-center">You do not have permission to view audit logs.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            System Audit Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center p-4">Loading logs...</div>
          ) : logs.length === 0 ? (
            <div className="text-center p-4 text-foreground-muted">No audit logs found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-surface-hover text-foreground-muted uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Context</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface-hover/50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : 'N/A'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{log.userId}</td>
                      <td className="px-4 py-3 font-medium text-primary">{log.action}</td>
                      <td className="px-4 py-3 text-foreground-muted">
                        {log.tournamentId && <div className="text-xs">Tournament: {log.tournamentId}</div>}
                        {log.matchId && <div className="text-xs">Match: {log.matchId}</div>}
                        {log.metadata && <pre className="text-[10px] mt-1 p-1 bg-surface rounded max-w-[200px] overflow-auto">{JSON.stringify(log.metadata, null, 2)}</pre>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
