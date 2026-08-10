import { useState } from 'react';
import { Plus, Trash2, Eye, EyeOff, Layers } from 'lucide-react';

const LAYER_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'];

export default function LayersPanel({ layers, activeLayerId, onActiveLayerChange, onAddLayer, onToggleVisible, onDeleteLayer, segmentCounts }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(LAYER_COLORS[0]);

  const addLayer = () => {
    if (!newName.trim()) return;
    onAddLayer(newName.trim(), newColor);
    setNewName('');
    setNewColor(LAYER_COLORS[0]);
    setShowAddForm(false);
  };

  return (
    <div className="border-b border-slate-100">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-slate-500" />
          <h3 className="font-semibold text-slate-900 text-sm">Calques</h3>
        </div>
        <button onClick={() => setShowAddForm(!showAddForm)} className="text-amber-600 hover:text-amber-700"><Plus className="w-4 h-4" /></button>
      </div>
      {showAddForm && (
        <div className="px-4 pb-3 space-y-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addLayer(); }}
            placeholder="Nom du calque"
            className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-amber-400"
            autoFocus
          />
          <div className="flex gap-1 flex-wrap">
            {LAYER_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className={`w-5 h-5 rounded-full ${newColor === c ? 'ring-2 ring-slate-900 ring-offset-1' : ''}`}
                style={{ background: c }}
              />
            ))}
          </div>
          <button onClick={addLayer} className="w-full px-2 py-1 text-xs font-medium bg-slate-900 text-white rounded">
            Ajouter
          </button>
        </div>
      )}
      <div className="divide-y divide-slate-50">
        {layers.map((layer) => (
          <div
            key={layer.id}
            className={`flex items-center gap-2 px-4 py-2 cursor-pointer ${activeLayerId === layer.id ? 'bg-amber-50' : 'hover:bg-slate-50'}`}
            onClick={() => onActiveLayerChange(layer.id)}
          >
            <button
              onClick={(e) => { e.stopPropagation(); onToggleVisible(layer); }}
              className="text-slate-400 hover:text-slate-700"
            >
              {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: layer.color }} />
            <span className={`text-xs flex-1 truncate ${layer.visible ? 'text-slate-700' : 'text-slate-400 line-through'}`}>{layer.name}</span>
            <span className="text-[10px] text-slate-400">{segmentCounts[layer.id] || 0}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onDeleteLayer(layer.id); }}
              className="text-slate-300 hover:text-rose-500"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}