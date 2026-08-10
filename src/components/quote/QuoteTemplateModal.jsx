import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, LayoutTemplate, Check } from 'lucide-react';

export default function QuoteTemplateModal({ templates, onTemplatesChange, onApply, onClose }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', scope_of_work: '', terms: '', notes: '', default_markup_percentage: 20 });

  const create = async () => {
    const created = await base44.entities.QuoteTemplate.create({
      ...form,
      default_markup_percentage: Number(form.default_markup_percentage) || 20,
    });
    onTemplatesChange([created, ...templates]);
    setShowForm(false);
    setForm({ name: '', scope_of_work: '', terms: '', notes: '', default_markup_percentage: 20 });
  };

  const remove = async (id) => {
    if (!confirm('Supprimer ce modèle ?')) return;
    await base44.entities.QuoteTemplate.delete(id);
    onTemplatesChange(templates.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5 text-amber-500" />
            <h2 className="font-semibold text-slate-900">Modèles de devis</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 text-xl leading-none hover:text-slate-600">×</button>
        </div>
        <div className="p-6 overflow-auto flex-1">
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 text-sm font-medium rounded-lg mb-4">
            <Plus className="w-3.5 h-3.5" /> Nouveau modèle
          </button>
          {showForm && (
            <div className="border border-slate-200 rounded-xl p-4 mb-4 space-y-3">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nom du modèle *"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400" />
              <textarea value={form.scope_of_work} onChange={(e) => setForm({ ...form, scope_of_work: e.target.value })} placeholder="Portée des travaux" rows={2}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400" />
              <textarea value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} placeholder="Termes et conditions" rows={2}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400" />
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" rows={1}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400" />
              <button onClick={create} disabled={!form.name} className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg disabled:opacity-50">Enregistrer</button>
            </div>
          )}
          {templates.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Aucun modèle. Créez des modèles réutilisables avec portée, termes et notes pré-remplis.</p>
          ) : (
            <div className="space-y-2">
              {templates.map((tpl) => (
                <div key={tpl.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 text-sm">{tpl.name}</div>
                    <div className="text-xs text-slate-500 truncate">{tpl.scope_of_work || '—'}</div>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <button onClick={() => onApply(tpl)} className="flex items-center gap-1 px-2 py-1 text-xs text-amber-600 hover:bg-amber-50 rounded font-medium">
                      <Check className="w-3 h-3" /> Appliquer
                    </button>
                    <button onClick={() => remove(tpl.id)} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}