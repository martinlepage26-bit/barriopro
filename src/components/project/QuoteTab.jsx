import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { FileSignature, Save, Printer, Download, LayoutTemplate } from 'lucide-react';
import { exportQuoteToCSV } from '@/lib/quoteExport';
import QuoteTemplateModal from '@/components/quote/QuoteTemplateModal';
import { logAudit } from '@/lib/auditLog';

export default function QuoteTab({ project }) {
  const [quote, setQuote] = useState(null);
  const [estimate, setEstimate] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [showTemplates, setShowTemplates] = useState(false);

  const load = async () => {
    setLoading(true);
    const [quotes, ests, mats, segs, comps, tpls] = await Promise.all([
      base44.entities.Quote.filter({ project_id: project.id }, '-created_date', 10),
      base44.entities.Estimate.filter({ project_id: project.id }, '-created_date', 10),
      base44.entities.MaterialLine.filter({ project_id: project.id }, '-created_date', 200),
      base44.entities.FenceSegment.list('-created_date', 200),
      base44.entities.CompanyProfile.list('-created_date', 5),
      base44.entities.QuoteTemplate.list('-created_date', 50),
    ]);
    setCompany(comps[0]);
    setTemplates(tpls);
    let q = quotes[0];
    if (!q) {
      const qNum = `Q-${Date.now().toString().slice(-6)}`;
      q = await base44.entities.Quote.create({
        project_id: project.id,
        quote_number: qNum,
        scope_of_work: '',
        subtotal: 0, tax: 0, total: 0,
        expiration_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        status: 'Draft',
        terms: '50% deposit required to secure project. Balance due upon completion. Quote valid for 30 days.',
        notes: '',
      });
    }
    setQuote(q);
    setEstimate(ests[0]);
    setMaterials(mats);
    setSegments(segs.filter((s) => s.takeoff_id));
    setLoading(false);
  };

  useEffect(() => { load(); }, [project.id]);

  if (loading || !quote) return <div className="p-8 text-slate-400 text-sm">Loading quote…</div>;

  const materialCost = materials.reduce((s, m) => s + (m.quantity || 0) * (m.cost || 0), 0);
  const laborCost = estimate ? (estimate.labor_hours || 0) * (estimate.labor_rate || 0) : 0;
  const directCost = materialCost + laborCost + (estimate?.equipment_cost || 0) + (estimate?.subcontractor_cost || 0) + (estimate?.other_cost || 0);
  const overheadAmount = directCost * ((estimate?.overhead_percentage || 0) / 100);
  const markupAmount = (directCost + overheadAmount) * ((estimate?.markup_percentage || 0) / 100);
  const sellingPrice = directCost + overheadAmount + markupAmount;
  const taxAmount = sellingPrice * ((estimate?.sales_tax_percentage || 0) / 100);
  const customerTotal = sellingPrice + taxAmount;

  const totalLF = segments.reduce((s, seg) => s + (seg.length_feet || 0), 0);
  const totalGates = segments.reduce((s, seg) => s + (seg.gate_count || 0), 0);

  const save = async () => {
    setSaving(true);
    await base44.entities.Quote.update(quote.id, {
      ...quote,
      subtotal: sellingPrice,
      tax: taxAmount,
      total: customerTotal,
    });
    await logAudit(project.id, 'Devis enregistré', `#${quote.quote_number} · Total: ${customerTotal.toFixed(2)}$`);
    setSaving(false);
  };

  const printQuote = () => {
    window.print();
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6 no-print">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Quote</h2>
          <p className="text-sm text-slate-500">Quote #{quote.quote_number} · Status: {quote.status}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowTemplates(true)} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg">
            <LayoutTemplate className="w-3.5 h-3.5" /> Modèles
          </button>
          <button onClick={() => exportQuoteToCSV({ project, quote, estimate, materials, segments, company })} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg">
            <Download className="w-3.5 h-3.5" /> Exporter vers Contremaitre
          </button>
          <button onClick={printQuote} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg">
            <Printer className="w-3.5 h-3.5" /> Print / PDF
          </button>
          <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 text-sm font-medium rounded-lg disabled:opacity-50">
            <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save Quote'}
          </button>
        </div>
      </div>

      {/* Quote document */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-0" id="quote-doc">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center overflow-hidden">
                {company?.logo_url ? <img src={company.logo_url} alt="logo" className="w-full h-full object-cover" /> : <FileSignature className="w-5 h-5 text-slate-900" />}
              </div>
              <span className="font-semibold text-slate-900 text-lg">{company?.name || 'BarrioPro'}</span>
            </div>
            <div className="text-xs text-slate-500">Fence Estimating & Quote</div>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold text-slate-900 mb-1">QUOTE</h1>
            <div className="text-sm text-slate-500">#{quote.quote_number}</div>
            <div className="text-xs text-slate-400 mt-1">Expires: {quote.expiration_date ? new Date(quote.expiration_date).toLocaleDateString() : '—'}</div>
          </div>
        </div>

        {/* Customer & Project info */}
        <div className="px-8 py-5 grid grid-cols-2 gap-6 border-b border-slate-100">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Quote To</div>
            <div className="font-medium text-slate-900">{project.customer || '—'}</div>
            <div className="text-sm text-slate-500">{project.address || ''}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Project</div>
            <div className="font-medium text-slate-900">{project.name}</div>
            <div className="text-sm text-slate-500">{project.address || ''}</div>
            {project.project_number && <div className="text-xs text-slate-400 mt-1">Project #{project.project_number}</div>}
          </div>
        </div>

        {/* Scope of work */}
        <div className="px-8 py-5 border-b border-slate-100">
          <div className="text-xs font-semibold text-slate-400 uppercase mb-2">Scope of Work</div>
          <textarea
            value={quote.scope_of_work || ''}
            onChange={(e) => setQuote({ ...quote, scope_of_work: e.target.value })}
            rows={3}
            placeholder="Describe the scope of work…"
            className="w-full text-sm text-slate-700 border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-amber-400 no-print"
          />
          {quote.scope_of_work && <div className="text-sm text-slate-700 whitespace-pre-wrap print:block hidden">{quote.scope_of_work}</div>}
          <div className="mt-3 flex gap-4 text-sm text-slate-600">
            <span><strong className="text-slate-900">{totalLF.toFixed(1)}</strong> LF of fencing</span>
            <span><strong className="text-slate-900">{totalGates}</strong> gate(s)</span>
          </div>
        </div>

        {/* Materials table */}
        <div className="px-8 py-5 border-b border-slate-100">
          <div className="text-xs font-semibold text-slate-400 uppercase mb-3">Materials & Pricing</div>
          <table className="w-full text-sm">
            <thead className="text-slate-400 text-xs border-b border-slate-100">
              <tr>
                <th className="text-left py-2 font-medium">Item</th>
                <th className="text-center py-2 font-medium">Qty</th>
                <th className="text-center py-2 font-medium">Unit</th>
                <th className="text-right py-2 font-medium">Unit Cost</th>
                <th className="text-right py-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {materials.map((m) => (
                <tr key={m.id}>
                  <td className="py-2 text-slate-900">{m.product_name}</td>
                  <td className="py-2 text-center text-slate-600">{m.quantity}</td>
                  <td className="py-2 text-center text-slate-500">{m.unit}</td>
                  <td className="py-2 text-right text-slate-600">${(m.cost || 0).toFixed(2)}</td>
                  <td className="py-2 text-right font-medium text-slate-900">${((m.quantity || 0) * (m.cost || 0)).toFixed(2)}</td>
                </tr>
              ))}
              {materials.length === 0 && (
                <tr><td colSpan={5} className="py-4 text-center text-slate-400 text-sm">No materials — generate from the Estimate tab.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="px-8 py-5 flex justify-end">
          <div className="w-64 space-y-2 text-sm">
            <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>${sellingPrice.toFixed(2)}</span></div>
            <div className="flex justify-between text-slate-600"><span>Sales Tax ({estimate?.sales_tax_percentage || 0}%)</span><span>${taxAmount.toFixed(2)}</span></div>
            <div className="flex justify-between text-lg font-bold text-slate-900 border-t border-slate-200 pt-2">
              <span>Total</span><span>${customerTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Terms */}
        <div className="px-8 py-5 border-t border-slate-100 bg-slate-50 rounded-b-xl">
          <div className="text-xs font-semibold text-slate-400 uppercase mb-2">Terms & Conditions</div>
          <textarea
            value={quote.terms || ''}
            onChange={(e) => setQuote({ ...quote, terms: e.target.value })}
            rows={2}
            className="w-full text-xs text-slate-600 border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-amber-400 no-print"
          />
          <div className="text-xs text-slate-600 print:block hidden whitespace-pre-wrap">{quote.terms}</div>
          {quote.notes && (
            <div className="mt-3">
              <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Notes</div>
              <div className="text-xs text-slate-600">{quote.notes}</div>
            </div>
          )}
        </div>
      </div>
      {showTemplates && (
        <QuoteTemplateModal
          templates={templates}
          onTemplatesChange={setTemplates}
          onApply={(tpl) => {
            setQuote({ ...quote, scope_of_work: tpl.scope_of_work || quote.scope_of_work, terms: tpl.terms || quote.terms, notes: tpl.notes || quote.notes });
            setShowTemplates(false);
          }}
          onClose={() => setShowTemplates(false)}
        />
      )}
    </div>
  );
}