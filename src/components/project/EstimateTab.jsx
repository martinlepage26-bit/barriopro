import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Calculator, RefreshCw, Save, Plus, Trash2 } from 'lucide-react';

export default function EstimateTab({ project }) {
  const [estimate, setEstimate] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assemblies, setAssemblies] = useState([]);

  const load = async () => {
    setLoading(true);
    const [ests, mats, segs, asms] = await Promise.all([
      base44.entities.Estimate.filter({ project_id: project.id }, '-created_date', 10),
      base44.entities.MaterialLine.filter({ project_id: project.id }, '-created_date', 200),
      base44.entities.FenceSegment.list('-created_date', 200),
      base44.entities.FenceAssembly.list('-created_date', 100),
    ]);
    let est = ests[0];
    if (!est) {
      est = await base44.entities.Estimate.create({
        project_id: project.id,
        material_cost: 0, labor_cost: 0, labor_hours: 0, labor_rate: 65,
        equipment_cost: 0, subcontractor_cost: 0, other_cost: 0,
        waste_percentage: 10, overhead_percentage: 0, markup_percentage: 20, sales_tax_percentage: 0,
      });
    }
    setEstimate(est);
    setMaterials(mats);
    setSegments(segs.filter((s) => s.takeoff_id));
    setAssemblies(asms);
    setLoading(false);
  };

  useEffect(() => { load(); }, [project.id]);

  const totalLF = segments.reduce((s, seg) => s + (seg.length_feet || 0), 0);
  const totalGates = segments.reduce((s, seg) => s + (seg.gate_count || 0), 0);
  const totalPosts = segments.reduce((s, seg) => s + Math.ceil((seg.length_feet || 0) / 10), 0);

  const generateMaterials = async () => {
    if (totalLF === 0) {
      alert("Aucun segment de clôture trouvé. Tracez des lignes de clôture dans l'onglet Quantitatif d'abord.");
      return;
    }
    setSaving(true);
    // Clear existing
    for (const m of materials) {
      await base44.entities.MaterialLine.delete(m.id);
    }
    const wasteFactor = 1 + (estimate.waste_percentage || 0) / 100;
    const lines = [];

    // Assembly-based generation
    const byAssembly = {};
    const unassigned = [];
    segments.forEach((seg) => {
      if (seg.assembly_id) {
        if (!byAssembly[seg.assembly_id]) byAssembly[seg.assembly_id] = [];
        byAssembly[seg.assembly_id].push(seg);
      } else {
        unassigned.push(seg);
      }
    });

    Object.entries(byAssembly).forEach(([assemblyId, segs]) => {
      const assembly = assemblies.find((a) => a.id === assemblyId);
      if (!assembly || !assembly.components) return;
      const segLF = segs.reduce((s, seg) => s + (seg.length_feet || 0), 0);
      const segGates = segs.reduce((s, seg) => s + (seg.gate_count || 0), 0);
      const multiplier = segLF / 100;
      assembly.components.forEach((comp) => {
        const measuredQty = Math.round(comp.quantity_per_100lf * multiplier * 10) / 10;
        const wastePct = comp.waste_percentage || 0;
        const purchaseQty = Math.ceil(measuredQty * (1 + wastePct / 100) * 10) / 10;
        lines.push({
          product_name: comp.product_name,
          quantity: measuredQty,
          waste_percentage: wastePct,
          purchase_qty: purchaseQty,
          sell_qty: Math.ceil(purchaseQty),
          unit: comp.unit,
          cost: comp.cost || 0,
          category: comp.category || 'Other',
        });
      });
    });

    // Fallback for segments without assembly
    if (unassigned.length > 0) {
      const uLF = unassigned.reduce((s, seg) => s + (seg.length_feet || 0), 0);
      const uGates = unassigned.reduce((s, seg) => s + (seg.gate_count || 0), 0);
      const uPosts = unassigned.reduce((s, seg) => s + Math.ceil((seg.length_feet || 0) / 10), 0);
      const withQty = (name, qty, unit, cost, category, waste = 5) => ({
        product_name: name, quantity: qty, waste_percentage: waste,
        purchase_qty: Math.ceil(qty * (1 + waste / 100) * 10) / 10,
        sell_qty: Math.ceil(qty * (1 + waste / 100)),
        unit, cost, category,
      });
      lines.push(
        withQty('Chain Link Fabric', Math.round(uLF * wasteFactor), 'LF', 2.5, 'Fabric', 2),
        withQty('Line Posts', uPosts, 'EA', 10, 'Posts', 0),
        withQty('Terminal Posts', unassigned.reduce((s, seg) => s + (seg.end_count || 2), 0), 'EA', 30, 'Posts', 0),
        withQty('Corner Posts', unassigned.reduce((s, seg) => s + (seg.corner_count || 0), 0), 'EA', 30, 'Posts', 0),
        withQty('Top Rail', Math.round(uLF * wasteFactor), 'LF', 1.2, 'Rails', 3),
        withQty('Tension Wire', Math.round(uLF * wasteFactor), 'LF', 0.3, 'Fabric', 3),
        withQty('Tension Bands', uPosts * 5, 'EA', 0.5, 'Fittings', 2),
        withQty('Brace Bands', uPosts * 2, 'EA', 0.75, 'Fittings', 2),
        withQty('Tie Wires', uPosts * 12, 'EA', 0.1, 'Fasteners', 5),
        withQty('Concrete', Math.ceil(uPosts * 0.5), 'CY', 130, 'Concrete', 5),
        withQty('Gate', uGates, 'EA', 450, 'Gates', 0),
        withQty('Gate Hardware', uGates, 'Lot', 75, 'Hardware', 0),
      );
    }

    const created = await base44.entities.MaterialLine.bulkCreate(
      lines.filter((l) => l.quantity > 0).map((l) => ({ ...l, project_id: project.id, is_labor: false }))
    );
    setSaving(false);
    setMaterials(created);
    setSaving(false);
  };

  const updateMaterial = (id, field, value) => {
    setMaterials(materials.map((m) => {
      if (m.id !== id) return m;
      const updated = { ...m, [field]: field === 'quantity' || field === 'cost' || field === 'waste_percentage' || field === 'purchase_qty' || field === 'sell_qty' ? Number(value) : value };
      if (field === 'quantity' || field === 'waste_percentage') {
        updated.purchase_qty = Math.ceil((updated.quantity || 0) * (1 + (updated.waste_percentage || 0) / 100) * 10) / 10;
        updated.sell_qty = Math.ceil(updated.purchase_qty);
      }
      return updated;
    }));
  };

  const addMaterial = () => {
    base44.entities.MaterialLine.create({ project_id: project.id, product_name: 'New Item', quantity: 1, unit: 'EA', cost: 0, category: 'Other', is_labor: false })
      .then((m) => setMaterials([...materials, m]));
  };

  const removeMaterial = async (id) => {
    await base44.entities.MaterialLine.delete(id);
    setMaterials(materials.filter((m) => m.id !== id));
  };

  const saveEstimate = async () => {
    setSaving(true);
    await base44.entities.Estimate.update(estimate.id, {
      ...estimate,
      labor_rate: Number(estimate.labor_rate) || 0,
      labor_hours: Number(estimate.labor_hours) || 0,
      waste_percentage: Number(estimate.waste_percentage) || 0,
      overhead_percentage: Number(estimate.overhead_percentage) || 0,
      markup_percentage: Number(estimate.markup_percentage) || 0,
      sales_tax_percentage: Number(estimate.sales_tax_percentage) || 0,
    });
    // Save material changes
    for (const m of materials) {
      await base44.entities.MaterialLine.update(m.id, { quantity: m.quantity, cost: m.cost });
    }
    setSaving(false);
  };

  if (loading || !estimate) return <div className="p-8 text-slate-400 text-sm">Chargement de l'estimation…</div>;

  const materialCost = materials.reduce((s, m) => s + (m.purchase_qty || m.quantity || 0) * (m.cost || 0), 0);
  const laborCost = (estimate.labor_hours || 0) * (estimate.labor_rate || 0);
  const directCost = materialCost + laborCost + (estimate.equipment_cost || 0) + (estimate.subcontractor_cost || 0) + (estimate.other_cost || 0);
  const overheadAmount = directCost * ((estimate.overhead_percentage || 0) / 100);
  const markupAmount = (directCost + overheadAmount) * ((estimate.markup_percentage || 0) / 100);
  const sellingPrice = directCost + overheadAmount + markupAmount;
  const taxAmount = sellingPrice * ((estimate.sales_tax_percentage || 0) / 100);
  const customerTotal = sellingPrice + taxAmount;
  const grossMargin = sellingPrice > 0 ? ((sellingPrice - directCost) / sellingPrice) * 100 : 0;

  const numField = (key, label, opts = {}) => (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input
        type="number"
        value={estimate[key] ?? 0}
        onChange={(e) => setEstimate({ ...estimate, [key]: e.target.value })}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
      />
    </div>
  );

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Estimation</h2>
          <p className="text-sm text-slate-500">Résumé du quantitatif : {totalLF.toFixed(1)} pi · {totalGates} portail(s) · {totalPosts} poteau(x)</p>
        </div>
        <div className="flex gap-2">
          <button onClick={generateMaterials} disabled={saving} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg">
            <RefreshCw className="w-3.5 h-3.5" /> Générer les matériaux
          </button>
          <button onClick={saveEstimate} disabled={saving} className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 text-sm font-medium rounded-lg">
            <Save className="w-3.5 h-3.5" /> Enregistrer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Material list */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 text-sm">Liste des matériaux</h3>
            <button onClick={addMaterial} className="text-amber-600 hover:text-amber-700"><Plus className="w-4 h-4" /></button>
          </div>
          {materials.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-400">
              Aucun matériau. Cliquez sur « Générer les matériaux » pour calculer automatiquement à partir de votre quantitatif.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Article</th>
                  <th className="text-center px-4 py-2 font-medium w-16">Qté mes.</th>
                  <th className="text-center px-4 py-2 font-medium w-14">Perte %</th>
                  <th className="text-center px-4 py-2 font-medium w-16">Qté achat</th>
                  <th className="text-center px-4 py-2 font-medium w-14">Unité</th>
                  <th className="text-right px-4 py-2 font-medium w-20">Coût</th>
                  <th className="text-right px-4 py-2 font-medium w-24">Total</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {materials.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-2">
                      <input value={m.product_name} onChange={(e) => updateMaterial(m.id, 'product_name', e.target.value)}
                        className="w-full text-sm font-medium text-slate-900 bg-transparent border-0 focus:outline-none focus:ring-0 p-0" />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" value={m.quantity} onChange={(e) => updateMaterial(m.id, 'quantity', e.target.value)}
                        className="w-14 text-center text-sm border border-slate-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-amber-400" />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" value={m.waste_percentage || 0} onChange={(e) => updateMaterial(m.id, 'waste_percentage', e.target.value)}
                        className="w-12 text-center text-sm border border-slate-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-amber-400" />
                    </td>
                    <td className="px-4 py-2 text-center text-slate-600 text-sm">{m.purchase_qty || m.quantity || 0}</td>
                    <td className="px-4 py-2 text-center text-slate-500">{m.unit}</td>
                    <td className="px-4 py-2 text-right">
                      <input type="number" value={m.cost} onChange={(e) => updateMaterial(m.id, 'cost', e.target.value)}
                        className="w-18 text-right text-sm border border-slate-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-amber-400" />
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-slate-900">${((m.purchase_qty || m.quantity || 0) * (m.cost || 0)).toFixed(2)}</td>
                    <td className="px-2 py-2"><button onClick={() => removeMaterial(m.id)} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="px-5 py-3 border-t border-slate-100 flex justify-between text-sm">
            <span className="text-slate-500">Sous-total matériaux</span>
            <span className="font-semibold text-slate-900">${materialCost.toFixed(2)}</span>
          </div>
        </div>

        {/* Cost summary */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 text-sm mb-4">Facteurs de coût</h3>
            <div className="space-y-3">
              {numField('labor_hours', "Heures de main-d'œuvre")}
              {numField('labor_rate', "Taux de main-d'œuvre ($/h)")}
              {numField('equipment_cost', "Coût d'équipement ($)")}
              {numField('subcontractor_cost', 'Sous-traitant ($)')}
              {numField('other_cost', 'Autres coûts ($)')}
              <div className="grid grid-cols-2 gap-3">
                {numField('waste_percentage', 'Perte %')}
                {numField('overhead_percentage', 'Frais généraux %')}
                {numField('markup_percentage', 'Majoration %')}
                {numField('sales_tax_percentage', 'Taxe de vente %')}
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-xl p-5 text-white">
            <h3 className="font-semibold text-sm mb-3 text-slate-300">Résumé des coûts</h3>
            <div className="space-y-2 text-sm">
              <Line label="Matériaux" value={materialCost} />
              <Line label="Main-d'œuvre" value={laborCost} />
              <Line label="Équipement" value={estimate.equipment_cost || 0} />
              <Line label="Sous-traitant" value={estimate.subcontractor_cost || 0} />
              <Line label="Autres" value={estimate.other_cost || 0} />
              <div className="border-t border-slate-700 pt-2"><Line label="Coût direct" value={directCost} bold /></div>
              <Line label="Frais généraux" value={overheadAmount} />
              <Line label="Majoration" value={markupAmount} />
              <div className="border-t border-slate-700 pt-2"><Line label="Prix de vente" value={sellingPrice} bold /></div>
              <Line label="Taxe de vente" value={taxAmount} />
              <div className="border-t border-slate-600 pt-2 mt-1">
                <div className="flex justify-between items-baseline">
                  <span className="font-semibold">Total client</span>
                  <span className="text-xl font-bold text-amber-400">${customerTotal.toFixed(2)}</span>
                </div>
              </div>
              <div className="mt-2 bg-slate-800 rounded-lg px-3 py-2 flex justify-between items-center">
                <span className="text-xs text-slate-400">Marge brute</span>
                <span className="text-sm font-bold text-emerald-400">{grossMargin.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Line({ label, value, bold }) {
  return (
    <div className="flex justify-between">
      <span className={bold ? 'font-semibold' : 'text-slate-400'}>{label}</span>
      <span className={bold ? 'font-semibold' : ''}>${value.toFixed(2)}</span>
    </div>
  );
}