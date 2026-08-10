import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Building2, Upload, Save } from 'lucide-react';

export default function Settings() {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    const profiles = await base44.entities.CompanyProfile.list('-created_date', 5);
    if (profiles.length > 0) {
      setCompany(profiles[0]);
    } else {
      setCompany({ name: '', logo_url: '', address: '', phone: '', email: '', color: '#f59e0b' });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    if (company.id) {
      await base44.entities.CompanyProfile.update(company.id, company);
    } else {
      const created = await base44.entities.CompanyProfile.create(company);
      setCompany(created);
    }
    setSaving(false);
  };

  const uploadLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setCompany({ ...company, logo_url: file_url });
    setUploading(false);
  };

  if (loading || !company) return <div className="p-8 text-slate-400 text-sm">Chargement…</div>;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Paramètres</h1>
        <p className="text-sm text-slate-500 mt-1">Identité de l'entreprise affichée sur les devis et exports.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="w-5 h-5 text-amber-500" />
          <h2 className="font-semibold text-slate-900">Profil d'entreprise</h2>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Nom de l'entreprise</label>
          <input value={company.name || ''} onChange={(e) => setCompany({ ...company, name: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Logo</label>
          <div className="flex items-center gap-3">
            {company.logo_url && <img src={company.logo_url} alt="logo" className="w-12 h-12 rounded-lg object-cover border border-slate-200" />}
            <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 text-sm text-slate-600">
              <Upload className="w-4 h-4" /> {uploading ? 'Téléversement…' : 'Choisir un logo'}
              <input type="file" accept="image/*" onChange={uploadLogo} className="hidden" />
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Adresse</label>
          <input value={company.address || ''} onChange={(e) => setCompany({ ...company, address: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Téléphone</label>
            <input value={company.phone || ''} onChange={(e) => setCompany({ ...company, phone: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Courriel</label>
            <input value={company.email || ''} onChange={(e) => setCompany({ ...company, email: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
        </div>

        <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 text-sm font-medium rounded-lg disabled:opacity-50">
          <Save className="w-3.5 h-3.5" /> {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  );
}