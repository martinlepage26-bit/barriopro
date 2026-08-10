import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Ruler, Upload, ChevronRight, Camera, Package } from 'lucide-react';
import { logAudit } from '@/lib/auditLog';
import TakeoffCanvas from '@/components/takeoff/TakeoffCanvas';
import SitePhotosModal from '@/components/takeoff/SitePhotosModal';
import AssemblyLibraryModal from '@/components/takeoff/AssemblyLibraryModal';

export default function TakeoffTab({ project }) {
  const [takeoffs, setTakeoffs] = useState([]);
  const [segments, setSegments] = useState([]);
  const [specs, setSpecs] = useState([]);
  const [activeTakeoff, setActiveTakeoff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTakeoffForm, setShowTakeoffForm] = useState(false);
  const [showSpecForm, setShowSpecForm] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [showPhotosModal, setShowPhotosModal] = useState(false);
  const [photoFilterSegment, setPhotoFilterSegment] = useState(null);
  const [layers, setLayers] = useState([]);
  const [assemblies, setAssemblies] = useState([]);
  const [showAssemblyModal, setShowAssemblyModal] = useState(false);

  const load = async () => {
    setLoading(true);
    const [tos, sps, phs, asms] = await Promise.all([
      base44.entities.Takeoff.filter({ project_id: project.id }, '-created_date', 50),
      base44.entities.FenceSpec.list('-created_date', 100),
      base44.entities.SitePhoto.filter({ project_id: project.id }, '-created_date', 200),
      base44.entities.FenceAssembly.list('-created_date', 100),
    ]);
    setTakeoffs(tos);
    setSpecs(sps);
    setPhotos(phs);
    setAssemblies(asms);
    if (tos.length > 0 && !activeTakeoff) {
      setActiveTakeoff(tos[0]);
      await loadSegments(tos[0].id);
    }
    setLoading(false);
  };

  const loadSegments = async (takeoffId) => {
    const [segs, lys] = await Promise.all([
      base44.entities.FenceSegment.filter({ takeoff_id: takeoffId }, '-created_date', 200),
      base44.entities.TakeoffLayer.filter({ takeoff_id: takeoffId }, 'sort_order', 50),
    ]);
    setSegments(segs);
    if (lys.length === 0) {
      const defaults = [
        { name: 'Nouvelle clôture', color: '#3b82f6', sort_order: 0 },
        { name: 'Clôture existante', color: '#64748b', sort_order: 1 },
        { name: 'Portails', color: '#f59e0b', sort_order: 2 },
      ];
      const created = await base44.entities.TakeoffLayer.bulkCreate(
        defaults.map((d) => ({ takeoff_id: takeoffId, name: d.name, color: d.color, visible: true, sort_order: d.sort_order }))
      );
      setLayers(created);
    } else {
      setLayers(lys);
    }
  };

  useEffect(() => { load(); }, [project.id]);

  const selectTakeoff = async (to) => {
    setActiveTakeoff(to);
    await loadSegments(to.id);
  };

  const createTakeoff = async (name, bgUrl) => {
    const to = await base44.entities.Takeoff.create({
      project_id: project.id,
      name,
      background_image_url: bgUrl || '',
      scale_ratio: 0.2,
      scale_label: '1" = 20\'',
    });
    setShowTakeoffForm(false);
    setActiveTakeoff(to);
    setTakeoffs([to, ...takeoffs]);
    await loadSegments(to.id);
  };

  const saveSegments = async (newSegments) => {
    setSegments(newSegments);
    if (!activeTakeoff) return;
    // Simple: delete all and recreate
    const existing = await base44.entities.FenceSegment.filter({ takeoff_id: activeTakeoff.id }, '-created_date', 200);
    for (const seg of existing) {
      await base44.entities.FenceSegment.delete(seg.id);
    }
    for (const seg of newSegments) {
      await base44.entities.FenceSegment.create({
        takeoff_id: activeTakeoff.id,
        label: seg.label,
        geometry: seg.geometry,
        length_feet: seg.length_feet,
        gate_count: seg.gate_count || 0,
        corner_count: seg.corner_count || 0,
        end_count: seg.end_count || 0,
        layer_id: seg.layer_id || '',
        assembly_id: seg.assembly_id || '',
        scope_note: seg.scope_note || '',
      });
    }
    await logAudit(project.id, 'Quantitatif modifié', `${newSegments.length} segment(s) · ${newSegments.reduce((s, seg) => s + (seg.length_feet || 0), 0).toFixed(1)} pi`);
  };

  const updateScale = async (scaleRatio, scaleLabel) => {
    if (!activeTakeoff) return;
    const updated = await base44.entities.Takeoff.update(activeTakeoff.id, {
      scale_ratio: scaleRatio,
      scale_label: scaleLabel,
    });
    setActiveTakeoff(updated);
    setTakeoffs(takeoffs.map((t) => (t.id === updated.id ? updated : t)));
  };

  const addLayer = async (name, color) => {
    if (!activeTakeoff) return;
    const layer = await base44.entities.TakeoffLayer.create({
      takeoff_id: activeTakeoff.id,
      name,
      color,
      visible: true,
      sort_order: layers.length,
    });
    setLayers([...layers, layer]);
  };

  const toggleLayerVisible = async (layer) => {
    const updated = await base44.entities.TakeoffLayer.update(layer.id, { visible: !layer.visible });
    setLayers(layers.map((l) => (l.id === layer.id ? updated : l)));
  };

  const deleteLayer = async (layerId) => {
    const layerSegs = segments.filter((s) => s.layer_id === layerId);
    if (layerSegs.length > 0 && !confirm(`Ce calque contient ${layerSegs.length} segment(s). Supprimer le calque et ses segments ?`)) return;
    for (const seg of layerSegs) {
      await base44.entities.FenceSegment.delete(seg.id);
    }
    setSegments(segments.filter((s) => s.layer_id !== layerId));
    await base44.entities.TakeoffLayer.delete(layerId);
    setLayers(layers.filter((l) => l.id !== layerId));
  };

  const totalLength = segments.reduce((s, seg) => s + (seg.length_feet || 0), 0);
  const totalGates = segments.reduce((s, seg) => s + (seg.gate_count || 0), 0);

  return (
    <div className="flex h-full">
      {/* Takeoff list sidebar */}
      <div className="w-56 bg-white border-r border-slate-200 overflow-auto flex-shrink-0">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 text-sm">Quantitatifs</h3>
          <button onClick={() => setShowTakeoffForm(true)} className="text-amber-600 hover:text-amber-700"><Plus className="w-4 h-4" /></button>
        </div>
        {takeoffs.length === 0 ? (
          <div className="p-4 text-xs text-slate-400">Créez un quantitatif pour commencer à tracer des lignes de clôture.</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {takeoffs.map((to) => (
              <button
                key={to.id}
                onClick={() => selectTakeoff(to)}
                className={`w-full text-left px-4 py-3 hover:bg-slate-50 ${activeTakeoff?.id === to.id ? 'bg-amber-50 border-l-2 border-amber-500' : ''}`}
              >
                <div className="text-sm font-medium text-slate-900">{to.name}</div>
                <div className="text-xs text-slate-400">{to.scale_label || 'Échelle non définie'}</div>
              </button>
            ))}
          </div>
        )}

        <div className="px-4 py-3 border-t border-slate-100">
          <button onClick={() => setShowSpecForm(true)} className="w-full flex items-center justify-between text-sm text-slate-600 hover:text-slate-900 py-1">
            <span>Spécifications de clôture</span><ChevronRight className="w-4 h-4" />
          </button>
          <div className="text-xs text-slate-400 mt-1">{specs.length} spec(s) enregistrée(s)</div>
        </div>
        <div className="px-4 py-3 border-t border-slate-100">
          <button onClick={() => { setPhotoFilterSegment(null); setShowPhotosModal(true); }} className="w-full flex items-center justify-between text-sm text-slate-600 hover:text-slate-900 py-1">
            <span>Photos du site</span><Camera className="w-4 h-4" />
          </button>
          <div className="text-xs text-slate-400 mt-1">{photos.length} photo(s)</div>
        </div>
        <div className="px-4 py-3 border-t border-slate-100">
          <button onClick={() => setShowAssemblyModal(true)} className="w-full flex items-center justify-between text-sm text-slate-600 hover:text-slate-900 py-1">
            <span>Bibliothèque d'assemblages</span><Package className="w-4 h-4" />
          </button>
          <div className="text-xs text-slate-400 mt-1">{assemblies.length} assemblage(s)</div>
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 flex flex-col">
        {activeTakeoff ? (
          <>
            <div className="px-4 py-2 bg-white border-b border-slate-100 flex items-center gap-4 text-xs text-slate-500">
              <span className="font-medium text-slate-700">{activeTakeoff.name}</span>
              <span>·</span>
              <span>{totalLength.toFixed(1)} LF total</span>
              <span>·</span>
              <span>{totalGates} gate(s)</span>
              <span className="ml-auto text-amber-600">BarrioPro assiste — vous interprétez les plans et tracez la clôture.</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <TakeoffCanvas
                takeoff={activeTakeoff}
                segments={segments}
                onSegmentsChange={saveSegments}
                backgroundImage={activeTakeoff.background_image_url}
                onScaleChange={updateScale}
                photos={photos}
                onSegmentPhotos={(segId) => { setPhotoFilterSegment(segId); setShowPhotosModal(true); }}
                layers={layers}
                onAddLayer={addLayer}
                onToggleVisible={toggleLayerVisible}
                onDeleteLayer={deleteLayer}
                assemblies={assemblies}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Ruler className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-slate-700 font-medium mb-1">Aucun quantitatif sélectionné</h3>
              <p className="text-sm text-slate-400 mb-4">Créez un quantitatif pour commencer à tracer des lignes de clôture sur vos plans.</p>
              <button onClick={() => setShowTakeoffForm(true)} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 text-sm font-medium rounded-lg">
                Créer un quantitatif
              </button>
            </div>
          </div>
        )}
      </div>

      {showTakeoffForm && <TakeoffForm onClose={() => setShowTakeoffForm(false)} onCreate={createTakeoff} />}
      {showSpecForm && <SpecModal specs={specs} setSpecs={setSpecs} onClose={() => setShowSpecForm(false)} />}
      {showAssemblyModal && (
        <AssemblyLibraryModal
          assemblies={assemblies}
          onAssembliesChange={setAssemblies}
          onClose={() => setShowAssemblyModal(false)}
        />
      )}
      {showPhotosModal && (
        <SitePhotosModal
          projectId={project.id}
          segments={segments}
          photos={photos}
          onPhotosChange={setPhotos}
          filterSegmentId={photoFilterSegment}
          onClose={() => { setShowPhotosModal(false); setPhotoFilterSegment(null); }}
        />
      )}
    </div>
  );
}

function TakeoffForm({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [bgUrl, setBgUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setBgUrl(file_url);
    } catch (err) {
      alert('Échec du téléversement : ' + err.message);
    }
    setUploading(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Nouveau quantitatif</h2>
          <button onClick={onClose} className="text-slate-400 text-xl">×</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nom du quantitatif *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex. Quantitatif du plan de site"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Image de fond (optionnel)</label>
            <p className="text-xs text-slate-400 mb-2">Téléversez un plan de site, une capture de page PDF ou une image satellite pour tracer par-dessus.</p>
            <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 text-sm text-slate-600">
              <Upload className="w-4 h-4" /> {uploading ? 'Téléversement…' : bgUrl ? 'Image téléversée ✓' : 'Choisir une image'}
              <input type="file" accept="image/*" onChange={upload} className="hidden" />
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Annuler</button>
            <button onClick={() => onCreate(name || 'Quantitatif sans titre', bgUrl)} disabled={!name}
              className="px-4 py-2 text-sm font-medium bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-lg disabled:opacity-50">
              Créer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SpecModal({ specs, setSpecs, onClose }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', height: '', material: '', mesh: '', gauge: '', post_spacing: '10', post_type: '', rail: '', fabric: '', finish: '', pickets: '', description: '' });

  const save = async () => {
    const created = await base44.entities.FenceSpec.create({
      ...form,
      height: Number(form.height) || 0,
      post_spacing: Number(form.post_spacing) || 10,
    });
    setSpecs([created, ...specs]);
    setShowForm(false);
    setForm({ name: '', height: '', material: '', mesh: '', gauge: '', post_spacing: '10', post_type: '', rail: '', fabric: '', finish: '', pickets: '', description: '' });
  };

  const remove = async (id) => {
    if (!confirm('Supprimer cette spec ?')) return;
    await base44.entities.FenceSpec.delete(id);
    setSpecs(specs.filter((s) => s.id !== id));
  };

  const f = (key, label, type = 'text') => (
    <div key={key}>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input type={type} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400" />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-auto">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="font-semibold text-slate-900">Spécifications de clôture</h2>
          <button onClick={onClose} className="text-slate-400 text-xl">×</button>
        </div>
        <div className="p-6">
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 text-sm font-medium rounded-lg mb-4">
            <Plus className="w-3.5 h-3.5" /> Nouvelle spec
          </button>
          {showForm && (
            <div className="border border-slate-200 rounded-xl p-4 mb-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {f('name', 'Nom de la spec *')}
                {f('height', 'Hauteur (pi)', 'number')}
                {f('material', 'Matériau')}
                {f('mesh', 'Maille')}
                {f('gauge', 'Jauge')}
                {f('post_spacing', 'Espacement des poteaux (pi)', 'number')}
                {f('post_type', 'Type de poteau')}
                {f('rail', 'Rail')}
                {f('fabric', 'Toile')}
                {f('finish', 'Finition')}
                {f('pickets', 'Lattes')}
              </div>
              <button onClick={save} className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg">Enregistrer la spec</button>
            </div>
          )}
          {specs.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Aucune spécification de clôture. Créez des specs réutilisables comme « Clôture chaînée noire 6 pi » ou « Clôture de bois 8 pi ».</p>
          ) : (
            <div className="space-y-2">
              {specs.map((s) => (
                <div key={s.id} className="flex items-start justify-between p-3 border border-slate-100 rounded-lg">
                  <div>
                    <div className="font-medium text-slate-900 text-sm">{s.name}</div>
                    <div className="text-xs text-slate-500">
                      {s.height}' · {s.material || '—'} · {s.post_spacing}' post spacing
                      {s.mesh ? ` · ${s.mesh} mesh` : ''}
                    </div>
                  </div>
                  <button onClick={() => remove(s.id)} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}