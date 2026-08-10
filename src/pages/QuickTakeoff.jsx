import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Upload, Zap, Save } from 'lucide-react';
import TakeoffCanvas from '@/components/takeoff/TakeoffCanvas';

export default function QuickTakeoff() {
  const navigate = useNavigate();
  const [bgUrl, setBgUrl] = useState('');
  const [takeoff, setTakeoff] = useState(null);
  const [segments, setSegments] = useState([]);
  const [assemblies, setAssemblies] = useState([]);
  const [layers, setLayers] = useState([
    { id: 'quick-1', name: 'Nouvelle clôture', color: '#3b82f6', visible: true, sort_order: 0 },
  ]);
  const [saving, setSaving] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [showSave, setShowSave] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    base44.entities.FenceAssembly.list('-created_date', 100).then(setAssemblies);
  }, []);

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setBgUrl(file_url);
      setTakeoff({
        id: 'temp',
        name: 'Quantitatif rapide',
        background_image_url: file_url,
        scale_ratio: 0.2,
        scale_label: '1" = 20\'',
      });
    } catch (err) {
      alert('Échec du téléversement : ' + err.message);
    }
    setUploading(false);
  };

  const updateScale = (scaleRatio, scaleLabel) => {
    setTakeoff({ ...takeoff, scale_ratio: scaleRatio, scale_label: scaleLabel });
  };

  const addLayer = (name, color) => setLayers([...layers, { id: crypto.randomUUID(), name, color, visible: true, sort_order: layers.length }]);
  const toggleLayerVisible = (layer) => setLayers(layers.map((l) => (l.id === layer.id ? { ...l, visible: !l.visible } : l)));
  const deleteLayer = (layerId) => {
    setSegments(segments.filter((s) => s.layer_id !== layerId));
    setLayers(layers.filter((l) => l.id !== layerId));
  };

  const totalLF = segments.reduce((s, seg) => s + (seg.length_feet || 0), 0);

  const materialPreview = [];
  const byAssembly = {};
  segments.forEach((seg) => {
    if (seg.assembly_id) {
      if (!byAssembly[seg.assembly_id]) byAssembly[seg.assembly_id] = [];
      byAssembly[seg.assembly_id].push(seg);
    }
  });
  Object.entries(byAssembly).forEach(([assemblyId, segs]) => {
    const assembly = assemblies.find((a) => a.id === assemblyId);
    if (!assembly?.components) return;
    const segLF = segs.reduce((s, seg) => s + (seg.length_feet || 0), 0);
    const multiplier = segLF / 100;
    assembly.components.forEach((comp) => {
      const existing = materialPreview.find((m) => m.product_name === comp.product_name);
      const qty = Math.round(comp.quantity_per_100lf * multiplier * 10) / 10;
      if (existing) existing.quantity += qty;
      else materialPreview.push({ product_name: comp.product_name, quantity: qty, unit: comp.unit });
    });
  });

  const saveAsProject = async () => {
    setSaving(true);
    const project = await base44.entities.Project.create({
      name: projectName || 'Quantitatif rapide',
      status: 'Estimating',
    });
    const to = await base44.entities.Takeoff.create({
      project_id: project.id,
      name: 'Quantitatif rapide',
      background_image_url: bgUrl,
      scale_ratio: takeoff.scale_ratio,
      scale_label: takeoff.scale_label,
    });
    const createdLayers = await base44.entities.TakeoffLayer.bulkCreate(
      layers.map((l) => ({ takeoff_id: to.id, name: l.name, color: l.color, visible: l.visible, sort_order: l.sort_order }))
    );
    const layerMap = {};
    createdLayers.forEach((cl, i) => { layerMap[layers[i].id] = cl.id; });
    for (const seg of segments) {
      await base44.entities.FenceSegment.create({
        takeoff_id: to.id,
        label: seg.label,
        geometry: seg.geometry,
        length_feet: seg.length_feet,
        gate_count: seg.gate_count || 0,
        corner_count: seg.corner_count || 0,
        end_count: seg.end_count || 0,
        layer_id: layerMap[seg.layer_id] || createdLayers[0]?.id || '',
        assembly_id: seg.assembly_id || '',
        scope_note: seg.scope_note || '',
      });
    }
    navigate(`/projects/${project.id}`);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-3 bg-white border-b border-slate-200 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          <h1 className="text-lg font-semibold text-slate-900">Quantitatif rapide</h1>
          {takeoff && <span className="text-sm text-slate-400">· {totalLF.toFixed(1)} pi · {segments.length} segment(s)</span>}
        </div>
        {takeoff && (
          <button onClick={() => setShowSave(true)} className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 text-sm font-medium rounded-lg">
            <Save className="w-3.5 h-3.5" /> Enregistrer comme projet
          </button>
        )}
      </div>

      {!takeoff ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Upload className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h2 className="text-slate-700 font-medium mb-2">Téléversez un plan pour commencer</h2>
            <p className="text-sm text-slate-400 mb-4 max-w-md">Importez une image de plan, définissez l'échelle, tracez la clôture, obtenez les quantités — puis sauvegardez en projet.</p>
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 text-sm font-medium rounded-lg cursor-pointer">
              <Upload className="w-4 h-4" /> {uploading ? 'Téléversement…' : 'Choisir une image'}
              <input type="file" accept="image/*" onChange={upload} className="hidden" />
            </label>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <TakeoffCanvas
            takeoff={takeoff}
            segments={segments}
            onSegmentsChange={setSegments}
            backgroundImage={bgUrl}
            onScaleChange={updateScale}
            photos={[]}
            onSegmentPhotos={() => {}}
            layers={layers}
            onAddLayer={addLayer}
            onToggleVisible={toggleLayerVisible}
            onDeleteLayer={deleteLayer}
            assemblies={assemblies}
          />
        </div>
      )}

      {showSave && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Enregistrer comme projet</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nom du projet</label>
                <input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="ex. Riverside Apartments" autoFocus
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div className="text-xs text-slate-500">
                {totalLF.toFixed(1)} pi linéaire · {segments.length} segment(s) · {materialPreview.length} matériau(x) estimé(s)
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowSave(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Annuler</button>
                <button onClick={saveAsProject} disabled={saving} className="px-4 py-2 text-sm font-medium bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-lg disabled:opacity-50">
                  {saving ? 'Création…' : 'Créer le projet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}