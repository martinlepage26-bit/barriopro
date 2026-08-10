import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Plus, Search, MapPin, Calendar } from 'lucide-react';
import { projectStatusLabel, projectStatusFilterLabels, projectStatusFilters } from '@/lib/labels';

const statusColors = {
  New: 'bg-blue-100 text-blue-700',
  Estimating: 'bg-amber-100 text-amber-700',
  'Quote Ready': 'bg-purple-100 text-purple-700',
  Submitted: 'bg-indigo-100 text-indigo-700',
  Won: 'bg-emerald-100 text-emerald-700',
  Lost: 'bg-rose-100 text-rose-700',
  Archived: 'bg-slate-100 text-slate-500',
};

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  const load = () => {
    setLoading(true);
    base44.entities.Project.list('-updated_date', 200).then(setProjects).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = projects.filter((p) => {
    if (filter !== 'All' && p.status !== filter) return false;
    if (search && !`${p.name} ${p.customer}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Projets</h1>
          <p className="text-sm text-slate-500 mt-1">{projects.length} projet(s) au total</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium rounded-lg text-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Nouveau projet
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        {projectStatusFilters.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === s ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {projectStatusFilterLabels[s]}
          </button>
        ))}
        <div className="relative ml-auto">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher des projets…"
            className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400 text-sm">Chargement des projets…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-slate-400 text-sm mb-4">Aucun projet trouvé.</p>
          <button onClick={() => setShowForm(true)} className="text-amber-600 text-sm font-medium">Créer votre premier projet</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <Link key={p.id} to={`/projects/${p.id}`} className="bg-white rounded-xl border border-slate-200 p-5 hover:border-amber-300 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-slate-900 leading-snug">{p.name}</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${statusColors[p.status] || statusColors.New}`}>
                  {projectStatusLabel(p.status)}
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-500">
                <div className="font-medium text-slate-700">{p.customer || '—'}</div>
                {p.address && (
                  <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {p.address}</div>
                )}
                {p.bid_date && (
                  <div className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Échéance {new Date(p.bid_date).toLocaleDateString('fr-FR')}</div>
                )}
              </div>
              {p.estimated_value > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-50 text-sm font-semibold text-slate-900">
                  ${p.estimated_value.toLocaleString()}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {showForm && <NewProjectForm onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); load(); }} />}
    </div>
  );
}

function NewProjectForm({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', customer: '', address: '', bid_date: '', project_number: '', estimator: '', status: 'New', estimated_value: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.Project.create({
        ...form,
        estimated_value: form.estimated_value ? Number(form.estimated_value) : null,
      });
      onCreated();
    } catch (err) {
      alert('Échec de la création du projet : ' + err.message);
      setSaving(false);
    }
  };

  const field = (key, label, type = 'text') => (
    <div key={key}>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-auto">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="font-semibold text-slate-900">Nouveau projet</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {field('name', 'Nom du projet *')}
          {field('customer', 'Client')}
          {field('address', 'Adresse du projet')}
          <div className="grid grid-cols-2 gap-4">
            {field('bid_date', "Date d'échéance de la soumission", 'date')}
            {field('project_number', 'Numéro de projet')}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {field('estimator', 'Estimateur')}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Statut</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                {projectStatusFilters.slice(1).map((s) => <option key={s} value={s}>{projectStatusLabel(s)}</option>)}
              </select>
            </div>
          </div>
          {field('estimated_value', 'Valeur estimée ($)', 'number')}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Annuler</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-lg disabled:opacity-50">
              {saving ? 'Création…' : 'Créer le projet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}