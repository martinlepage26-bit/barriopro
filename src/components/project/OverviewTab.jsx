import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Save } from 'lucide-react';
import { projectStatusLabel } from '@/lib/labels';

const statusOptions = ['New', 'Estimating', 'Quote Ready', 'Submitted', 'Won', 'Lost', 'Archived'];

export default function OverviewTab({ project, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(project);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await base44.entities.Project.update(project.id, {
        ...form,
        estimated_value: form.estimated_value ? Number(form.estimated_value) : null,
      });
      setEditing(false);
      onUpdate();
    } catch (err) {
      alert('Échec de l\'enregistrement : ' + err.message);
    }
    setSaving(false);
  };

  const Row = ({ label, value }) => (
    <div className="flex justify-between py-2.5 border-b border-slate-50">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900 text-right">{value || '—'}</span>
    </div>
  );

  const Field = ({ keyName, label, type = 'text' }) => (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input type={type} value={form[keyName] || ''} onChange={(e) => setForm({ ...form, [keyName]: e.target.value })}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400" />
    </div>
  );

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Informations du projet</h2>
          {editing ? (
            <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 text-sm font-medium rounded-lg disabled:opacity-50">
              <Save className="w-3.5 h-3.5" /> {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          ) : (
            <button onClick={() => { setForm(project); setEditing(true); }} className="text-sm text-amber-600 hover:text-amber-700 font-medium">Modifier</button>
          )}
        </div>
        <div className="p-6">
          {editing ? (
            <div className="space-y-4">
              <Field keyName="name" label="Nom du projet" />
              <div className="grid grid-cols-2 gap-4">
                <Field keyName="customer" label="Client" />
                <Field keyName="project_number" label="Numéro de projet" />
              </div>
              <Field keyName="address" label="Adresse du projet" />
              <div className="grid grid-cols-2 gap-4">
                <Field keyName="bid_date" label="Date d'échéance" type="date" />
                <Field keyName="estimator" label="Estimateur" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Statut</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400">
                    {statusOptions.map((s) => <option key={s} value={s}>{projectStatusLabel(s)}</option>)}
                  </select>
                </div>
                <Field keyName="estimated_value" label="Valeur estimée ($)" type="number" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                <textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <button onClick={() => setEditing(false)} className="text-sm text-slate-500 hover:text-slate-700">Annuler</button>
            </div>
          ) : (
            <div>
              <Row label="Client" value={project.customer} />
              <Row label="Adresse" value={project.address} />
              <Row label="Date d'échéance" value={project.bid_date ? new Date(project.bid_date).toLocaleDateString('fr-FR') : ''} />
              <Row label="Numéro de projet" value={project.project_number} />
              <Row label="Estimateur" value={project.estimator} />
              <Row label="Statut" value={projectStatusLabel(project.status)} />
              <Row label="Valeur estimée" value={project.estimated_value ? `$${Number(project.estimated_value).toLocaleString()}` : ''} />
              {project.notes && (
                <div className="pt-3">
                  <div className="text-sm text-slate-500 mb-1">Notes</div>
                  <div className="text-sm text-slate-700 whitespace-pre-wrap">{project.notes}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-5">
        <h3 className="font-semibold text-slate-900 text-sm mb-1">Comment BarrioPro fonctionne</h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          BarrioPro assiste l'estimateur — il n'identifie pas automatiquement les lignes de clôture. Vous interprétez les plans et tracez la clôture.
          Utilisez les onglets ci-dessus : téléversez les plans, définissez l'échelle dans le Quantitatif, tracez les lignes de clôture, attribuez les spécifications, puis générez les matériaux, l'estimation et le devis.
        </p>
      </div>
    </div>
  );
}