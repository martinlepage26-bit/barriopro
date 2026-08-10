import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, FileText, Pencil, Ruler, Calculator, FileSignature, History } from 'lucide-react';
import OverviewTab from '@/components/project/OverviewTab';
import PlansTab from '@/components/project/PlansTab';
import TakeoffTab from '@/components/project/TakeoffTab';
import EstimateTab from '@/components/project/EstimateTab';
import QuoteTab from '@/components/project/QuoteTab';
import AuditLogPanel from '@/components/project/AuditLogPanel';

const tabs = [
  { key: 'overview', label: 'Aperçu', icon: FileText },
  { key: 'plans', label: 'Plans', icon: Pencil },
  { key: 'takeoff', label: 'Quantitatif', icon: Ruler },
  { key: 'estimate', label: 'Estimation', icon: Calculator },
  { key: 'quote', label: 'Devis', icon: FileSignature },
  { key: 'audit', label: 'Journal', icon: History },
];

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    base44.entities.Project.get(id).then(setProject).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="p-8 text-slate-400 text-sm">Chargement du projet…</div>;
  if (!project) return <div className="p-8 text-slate-400 text-sm">Projet introuvable.</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 pt-6 pb-4 border-b border-slate-200 bg-white">
        <Link to="/projects" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 mb-2">
          <ArrowLeft className="w-3.5 h-3.5" /> Retour aux projets
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{project.name}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{project.customer || 'Aucun client'} {project.address ? `· ${project.address}` : ''}</p>
          </div>
          <div className="text-right text-xs text-slate-400">
            <div>Projet #{project.project_number || '—'}</div>
            <div>{project.estimator || 'Non assigné'}</div>
          </div>
        </div>
        <div className="flex items-center gap-1 mt-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab.key ? 'bg-amber-500 text-slate-900' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" /> {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-slate-50">
        {activeTab === 'overview' && <OverviewTab project={project} onUpdate={load} />}
        {activeTab === 'plans' && <PlansTab project={project} />}
        {activeTab === 'takeoff' && <TakeoffTab project={project} />}
        {activeTab === 'estimate' && <EstimateTab project={project} />}
        {activeTab === 'quote' && <QuoteTab project={project} />}
        {activeTab === 'audit' && <AuditLogPanel project={project} />}
      </div>
    </div>
  );
}