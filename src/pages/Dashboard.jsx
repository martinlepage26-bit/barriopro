import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { TrendingUp, FileText, Trophy, DollarSign, CalendarClock, ArrowRight } from 'lucide-react';
import { projectStatusLabel } from '@/lib/labels';

const statusColors = {
  New: 'bg-blue-100 text-blue-700',
  Estimating: 'bg-amber-100 text-amber-700',
  'Quote Ready': 'bg-purple-100 text-purple-700',
  Submitted: 'bg-indigo-100 text-indigo-700',
  Won: 'bg-emerald-100 text-emerald-700',
  Lost: 'bg-rose-100 text-rose-700',
  Archived: 'bg-slate-100 text-slate-500',
};

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Project.list('-updated_date', 200)
      .then(setProjects)
      .finally(() => setLoading(false));
  }, []);

  const activeBids = projects.filter((p) => !['Won', 'Lost', 'Archived'].includes(p.status));
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 86400000);
  const dueThisWeek = activeBids.filter((p) => p.bid_date && new Date(p.bid_date) >= now && new Date(p.bid_date) <= weekFromNow);
  const quotesReady = projects.filter((p) => p.status === 'Quote Ready');
  const wonThisMonth = projects.filter(
    (p) => p.status === 'Won' && p.updated_date && new Date(p.updated_date) >= new Date(now.getFullYear(), now.getMonth(), 1)
  );
  const pipeline = activeBids.reduce((sum, p) => sum + (p.estimated_value || 0), 0);

  const cards = [
    { label: 'Soumissions actives', value: activeBids.length, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Échéance cette semaine', value: dueThisWeek.length, icon: CalendarClock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Devis prêts', value: quotesReady.length, icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Gagnés ce mois', value: wonThisMonth.length, icon: Trophy, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Pipeline estimé', value: `$${pipeline.toLocaleString()}`, icon: DollarSign, color: 'text-slate-700', bg: 'bg-slate-100' },
  ];

  const upcoming = [...dueThisWeek].sort((a, b) => new Date(a.bid_date) - new Date(b.bid_date)).slice(0, 5);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Tableau de bord</h1>
        <p className="text-sm text-slate-500 mt-1">Bon retour — voici ce qui demande votre attention.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div className="text-2xl font-semibold text-slate-900">{card.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{card.label}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Soumissions à venir</h2>
            <Link to="/bid-calendar" className="text-sm text-amber-600 hover:text-amber-700 flex items-center gap-1">
              Voir le calendrier <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-400">Chargement…</div>
          ) : upcoming.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">Aucune soumission due cette semaine.</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {upcoming.map((p) => {
                const due = new Date(p.bid_date);
                const day = due.toLocaleDateString('fr-FR', { weekday: 'short' });
                const time = due.toLocaleTimeString('fr-FR', { hour: 'numeric', minute: '2-digit' });
                return (
                  <Link key={p.id} to={`/projects/${p.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50">
                    <div className="w-12 text-center">
                      <div className="text-[11px] font-semibold text-amber-600 uppercase">{day}</div>
                      <div className="text-lg font-semibold text-slate-900">{due.getDate()}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900 truncate">{p.name}</div>
                      <div className="text-xs text-slate-500">{p.customer} · Échéance {time}</div>
                    </div>
                    <span className={`text-[11px] px-2 py-1 rounded-full font-medium ${statusColors[p.status] || statusColors.New}`}>
                      {projectStatusLabel(p.status)}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Actions rapides</h2>
          </div>
          <div className="p-4 space-y-2">
            <Link to="/projects" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 border border-slate-100">
              <FolderKanbanIcon /> <span className="text-sm font-medium text-slate-700">Nouveau projet</span>
            </Link>
            <Link to="/products" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 border border-slate-100">
              <TrendingUp className="w-4 h-4 text-slate-400" /> <span className="text-sm font-medium text-slate-700">Gérer les produits</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function FolderKanbanIcon() {
  return (
    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}