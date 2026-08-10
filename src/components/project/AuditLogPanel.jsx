import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { History } from 'lucide-react';

export default function AuditLogPanel({ project }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    base44.entities.AuditLog.filter({ project_id: project.id }, '-created_date', 100)
      .then(setLogs)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [project.id]);

  if (loading) return <div className="p-8 text-slate-400 text-sm">Chargement…</div>;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <History className="w-5 h-5 text-slate-400" />
        <h2 className="text-lg font-semibold text-slate-900">Journal d'audit</h2>
      </div>
      {logs.length === 0 ? (
        <p className="text-sm text-slate-400">Aucune activité enregistrée. Les modifications de statut, quantitatifs, estimations et devis apparaîtront ici.</p>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="flex gap-3 bg-white rounded-lg border border-slate-200 p-3">
              <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-900">{log.action}</div>
                <div className="text-xs text-slate-500">{log.details}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {log.user_name} · {new Date(log.created_date).toLocaleString('fr-CA')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}