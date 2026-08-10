import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { logAudit } from '@/lib/auditLog';

const COLUMNS = [
  { key: 'New', label: 'Nouveau', accent: 'border-blue-500' },
  { key: 'Estimating', label: 'En estimation', accent: 'border-amber-500' },
  { key: 'Quote Ready', label: 'Devis prêt', accent: 'border-purple-500' },
  { key: 'Submitted', label: 'Soumis', accent: 'border-indigo-500' },
  { key: 'Won', label: 'Gagné', accent: 'border-emerald-500' },
];

export default function BidPipeline() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Project.list('-updated_date', 200)
      .then(setProjects)
      .finally(() => setLoading(false));
  }, []);

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    const projectId = result.draggableId;
    const newStatus = COLUMNS[Number(result.destination.droppableId)].key;
    const project = projects.find((p) => p.id === projectId);
    if (!project || project.status === newStatus) return;
    setProjects(projects.map((p) => (p.id === projectId ? { ...p, status: newStatus } : p)));
    await base44.entities.Project.update(projectId, { status: newStatus });
    await logAudit(projectId, 'Statut modifié', `${project.status} → ${newStatus}`);
  };

  const byStatus = (status) => projects.filter((p) => p.status === status);
  const totalByStatus = (status) => byStatus(status).reduce((s, p) => s + (p.estimated_value || 0), 0);

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold text-slate-900">Pipeline des soumissions</h1>
        <p className="text-sm text-slate-500 mt-1">Glissez les projets entre les colonnes pour mettre à jour le statut.</p>
      </div>
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-slate-400">Chargement…</div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex-1 grid grid-cols-5 gap-3 overflow-hidden">
            {COLUMNS.map((col, idx) => {
              const items = byStatus(col.key);
              return (
                <Droppable droppableId={String(idx)} key={col.key}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex flex-col bg-slate-100 rounded-xl border-t-4 ${col.accent} overflow-hidden`}
                    >
                      <div className="px-3 py-2.5 border-b border-slate-200/60">
                        <div className="font-semibold text-slate-700 text-sm">{col.label}</div>
                        <div className="text-[11px] text-slate-400">{items.length} projet(s) · ${totalByStatus(col.key).toLocaleString()}</div>
                      </div>
                      <div className="flex-1 overflow-auto p-2 space-y-2">
                        {items.map((p, i) => (
                          <Draggable draggableId={p.id} index={i} key={p.id}>
                            {(prov) => (
                              <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}>
                                <Link to={`/projects/${p.id}`} className="block bg-white rounded-lg border border-slate-200 p-3 hover:shadow-sm transition-shadow">
                                  <div className="font-medium text-slate-900 text-sm truncate">{p.name}</div>
                                  <div className="text-xs text-slate-500 truncate">{p.customer || '—'}</div>
                                  <div className="flex items-center justify-between mt-2">
                                    <span className="text-sm font-semibold text-slate-900">${(p.estimated_value || 0).toLocaleString()}</span>
                                    {p.bid_date && <span className="text-[10px] text-slate-400">{new Date(p.bid_date).toLocaleDateString('fr-CA')}</span>}
                                  </div>
                                </Link>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {items.length === 0 && <div className="text-xs text-slate-300 text-center py-4">—</div>}
                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>
        </DragDropContext>
      )}
    </div>
  );
}