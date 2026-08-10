import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Package, ChevronDown, ChevronRight } from 'lucide-react';

export default function AssemblyLibraryModal({ assemblies, onAssembliesChange, onClose }) {
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', height: '', material: '' });

  const createAssembly = async () => {
    const created = await base44.entities.FenceAssembly.create({
      name: form.name,
      description: form.description,
      height: Number(form.height) || 0,
      material: form.material,
      components: [],
    });
    onAssembliesChange([created, ...assemblies]);
    setExpandedId(created.id);
    setShowForm(false);
    setForm({ name: '', description: '', height: '', material: '' });
  };

  const deleteAssembly = async (id) => {
    if (!confirm('Supprimer cet assemblage ?')) return;
    await base44.entities.FenceAssembly.delete(id);
    onAssembliesChange(assemblies.filter((a) => a.id !== id));
  };

  const addComponent = async (assemblyId) => {
    const assembly = assemblies.find((a) => a.id === assemblyId);
    if (!assembly) return;
    const updated = await base44.entities.FenceAssembly.update(assemblyId, {
      components: [...(assembly.components || []), { product_name: 'Nouveau composant', quantity_per_100lf: 0, unit: 'EA', cost: 0, category: 'Other', waste_percentage: 0 }],
    });
    onAssembliesChange(assemblies.map((a) => (a.id === assemblyId ? updated : a)));
  };

  const updateComponent = async (assemblyId, index, field, value) => {
    const assembly = assemblies.find((a) => a.id === assemblyId);
    if (!assembly) return;
    const newComponents = [...(assembly.components || [])];
    newComponents[index] = { ...newComponents[index], [field]: field === 'quantity_per_100lf' || field === 'cost' || field === 'waste_percentage' ? Number(value) : value };
    const updated = await base44.entities.FenceAssembly.update(assemblyId, { components: newComponents });
    onAssembliesChange(assemblies.map((a) => (a.id === assemblyId ? updated : a)));
  };

  const removeComponent = async (assemblyId, index) => {
    const assembly = assemblies.find((a) => a.id === assemblyId);
    if (!assembly) return;
    const newComponents = (assembly.components || []).filter((_, i) => i !== index);
    const updated = await base44.entities.FenceAssembly.update(assemblyId, { components: newComponents });
    onAssembliesChange(assemblies.map((a) => (a.id === assemblyId ? updated : a)));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-500" />
            <h2 className="font-semibold text-slate-900">Bibliothèque d'assemblages</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 text-xl leading-none hover:text-slate-600">×</button>
        </div>
        <div className="p-6 overflow-auto flex-1">
          <p className="text-xs text-slate-400 mb-4">Définissez des assemblages de clôture réutilisables avec leurs composants par 100 pi linéaire. Les segments auxquels un assemblage est attribué génèrent automatiquement leurs matériaux dans l'estimation.</p>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 text-sm font-medium rounded-lg mb-4">
            <Plus className="w-3.5 h-3.5" /> Nouvel assemblage
          </button>
          {showForm && (
            <div className="border border-slate-200 rounded-xl p-4 mb-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Nom *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Matériau</label>
                  <input value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Hauteur (pi)</label>
                  <input type="number" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                  <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
              </div>
              <button onClick={createAssembly} disabled={!form.name} className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg disabled:opacity-50">Créer l'assemblage</button>
            </div>
          )}
          {assemblies.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Aucun assemblage. Créez un assemblage de clôture avec ses composants (par 100 pi) pour générer automatiquement les matériaux.</p>
          ) : (
            <div className="space-y-2">
              {assemblies.map((assembly) => {
                const expanded = expandedId === assembly.id;
                const componentCost = (assembly.components || []).reduce((s, c) => s + (c.quantity_per_100lf || 0) * (c.cost || 0), 0);
                return (
                  <div key={assembly.id} className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50" onClick={() => setExpandedId(expanded ? null : assembly.id)}>
                      <div className="flex items-center gap-2">
                        {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                        <div>
                          <div className="font-medium text-slate-900 text-sm">{assembly.name}</div>
                          <div className="text-xs text-slate-500">
                            {assembly.height ? `${assembly.height}' · ` : ''}{assembly.material || '—'}
                            {' · '}{(assembly.components || []).length} composant(s)
                            {' · '}${componentCost.toFixed(2)}/100pi
                          </div>
                        </div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); deleteAssembly(assembly.id); }} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    {expanded && (
                      <div className="border-t border-slate-100 bg-slate-50 p-3">
                        <table className="w-full text-xs">
                          <thead className="text-slate-400 uppercase">
                            <tr>
                              <th className="text-left py-1 font-medium">Composant</th>
                              <th className="text-center py-1 font-medium w-20">/100 pi</th>
                              <th className="text-center py-1 font-medium w-14">Unité</th>
                              <th className="text-center py-1 font-medium w-16">Perte %</th>
                              <th className="text-right py-1 font-medium w-20">Coût</th>
                              <th className="w-8"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(assembly.components || []).map((comp, i) => (
                              <tr key={i}>
                                <td className="py-1.5">
                                  <input value={comp.product_name} onChange={(e) => updateComponent(assembly.id, i, 'product_name', e.target.value)}
                                    className="w-full text-xs font-medium text-slate-900 bg-white border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400" />
                                </td>
                                <td className="py-1.5">
                                  <input type="number" value={comp.quantity_per_100lf} onChange={(e) => updateComponent(assembly.id, i, 'quantity_per_100lf', e.target.value)}
                                    className="w-16 text-center text-xs border border-slate-200 rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400" />
                                </td>
                                <td className="py-1.5">
                                  <input value={comp.unit} onChange={(e) => updateComponent(assembly.id, i, 'unit', e.target.value)}
                                    className="w-12 text-center text-xs border border-slate-200 rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400" />
                                </td>
                                <td className="py-1.5">
                                  <input type="number" value={comp.waste_percentage || 0} onChange={(e) => updateComponent(assembly.id, i, 'waste_percentage', e.target.value)}
                                    className="w-14 text-center text-xs border border-slate-200 rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400" />
                                </td>
                                <td className="py-1.5">
                                  <input type="number" value={comp.cost} onChange={(e) => updateComponent(assembly.id, i, 'cost', e.target.value)}
                                    className="w-20 text-right text-xs border border-slate-200 rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400" />
                                </td>
                                <td className="py-1.5"><button onClick={() => removeComponent(assembly.id, i)} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-3 h-3" /></button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <button onClick={() => addComponent(assembly.id)} className="flex items-center gap-1 mt-2 text-xs text-amber-600 hover:text-amber-700"><Plus className="w-3 h-3" /> Ajouter un composant</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}