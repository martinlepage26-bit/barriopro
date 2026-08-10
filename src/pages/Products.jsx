import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Search, Trash2 } from 'lucide-react';
import { productCategoryLabels } from '@/lib/labels';

const categories = ['Posts', 'Fabric', 'Rails', 'Gates', 'Fittings', 'Hardware', 'Concrete', 'Lumber', 'Fasteners', 'Labor', 'Equipment', 'Other'];
const units = ['LF', 'EA', 'Lot', 'SF', 'CY', 'HR', 'Day', 'LS'];

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [showForm, setShowForm] = useState(false);

  const load = () => {
    setLoading(true);
    base44.entities.Product.list('-updated_date', 200).then(setProducts).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = products.filter((p) => {
    if (filter !== 'All' && p.category !== filter) return false;
    if (search && !`${p.name} ${p.sku}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const remove = async (id) => {
    if (!confirm('Delete this product?')) return;
    await base44.entities.Product.delete(id);
    load();
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Catalogue de produits</h1>
          <p className="text-sm text-slate-500 mt-1">{products.length} produit(s) dans le catalogue</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium rounded-lg text-sm">
          <Plus className="w-4 h-4" /> Ajouter un produit
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        <button
          onClick={() => setFilter('All')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium ${filter === 'All' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
        >Tous</button>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium ${filter === c ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >{productCategoryLabels[c]}</button>
        ))}
        <div className="relative ml-auto">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher des produits…"
            className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg w-56 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400 text-sm">Chargement…</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-5 py-3 font-medium">Nom</th>
                <th className="text-left px-5 py-3 font-medium">SKU</th>
                <th className="text-left px-5 py-3 font-medium">Catégorie</th>
                <th className="text-left px-5 py-3 font-medium">Unité</th>
                <th className="text-right px-5 py-3 font-medium">Coût</th>
                <th className="text-right px-5 py-3 font-medium">Vente</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-900">{p.name}</td>
                  <td className="px-5 py-3 text-slate-500">{p.sku || '—'}</td>
                  <td className="px-5 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{productCategoryLabels[p.category] || p.category}</span></td>
                  <td className="px-5 py-3 text-slate-500">{p.unit || '—'}</td>
                  <td className="px-5 py-3 text-right text-slate-700">${(p.cost || 0).toFixed(2)}</td>
                  <td className="px-5 py-3 text-right text-slate-700">${(p.sell_price || 0).toFixed(2)}</td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => remove(p.id)} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="p-8 text-center text-slate-400 text-sm">Aucun produit trouvé.</div>}
        </div>
      )}

      {showForm && <ProductForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </div>
  );
}

function ProductForm({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', sku: '', description: '', category: 'Other', unit: 'EA', cost: '', sell_price: '', supplier: '', material_type: '', active: true });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.Product.create({
        ...form,
        cost: Number(form.cost) || 0,
        sell_price: Number(form.sell_price) || 0,
      });
      onSaved();
    } catch (err) {
      alert('Failed: ' + err.message);
      setSaving(false);
    }
  };

  const input = (key, label, type = 'text') => (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input type={type} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400" />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-auto">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="font-semibold text-slate-900">Ajouter un produit</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {input('name', 'Nom du produit *')}
          <div className="grid grid-cols-2 gap-4">{input('sku', 'SKU')}{input('supplier', 'Fournisseur')}</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Catégorie</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400">
                {categories.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Unité</label>
              <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400">
                {units.map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">{input('cost', 'Coût ($)', 'number')}{input('sell_price', 'Prix de vente ($)', 'number')}</div>
          {input('material_type', 'Type de matériau')}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Annuler</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-lg disabled:opacity-50">
              {saving ? 'Enregistrement…' : 'Enregistrer le produit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}