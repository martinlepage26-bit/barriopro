import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Upload, Trash2, Camera } from 'lucide-react';

export default function SitePhotosModal({ projectId, segments, photos, onPhotosChange, filterSegmentId, onClose }) {
  const [uploading, setUploading] = useState(false);

  const upload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const created = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        const photo = await base44.entities.SitePhoto.create({
          project_id: projectId,
          photo_url: file_url,
          caption: '',
          fence_segment_id: filterSegmentId || '',
        });
        created.push(photo);
      }
      onPhotosChange([...photos, ...created]);
    } catch (err) {
      alert("Échec du téléversement : " + err.message);
    }
    setUploading(false);
    e.target.value = '';
  };

  const updatePhoto = async (id, data) => {
    const updated = await base44.entities.SitePhoto.update(id, data);
    onPhotosChange(photos.map((p) => (p.id === id ? updated : p)));
  };

  const deletePhoto = async (id) => {
    if (!confirm('Supprimer cette photo ?')) return;
    await base44.entities.SitePhoto.delete(id);
    onPhotosChange(photos.filter((p) => p.id !== id));
  };

  const filteredPhotos = filterSegmentId
    ? photos.filter((p) => p.fence_segment_id === filterSegmentId)
    : photos;

  const filterSeg = segments.find((s) => s.id === filterSegmentId);

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-amber-500" />
            <h2 className="font-semibold text-slate-900">
              {filterSeg ? `Photos — ${filterSeg.label}` : 'Photos du site'}
            </h2>
            <span className="text-sm text-slate-400">({filteredPhotos.length})</span>
          </div>
          <button onClick={onClose} className="text-slate-400 text-xl leading-none hover:text-slate-600">×</button>
        </div>
        <div className="p-6 overflow-auto flex-1">
          <label className="flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 text-sm text-slate-600 mb-4">
            <Upload className="w-4 h-4" />
            {uploading ? 'Téléversement…' : 'Téléverser des photos'}
            <input type="file" accept="image/*" multiple onChange={upload} className="hidden" />
          </label>
          {filteredPhotos.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">
              Aucune photo. Téléversez des photos prises sur le site pour documenter{filterSeg ? ' ce segment.' : '.'}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {filteredPhotos.map((photo) => (
                <PhotoCard
                  key={photo.id}
                  photo={photo}
                  segments={segments}
                  onUpdate={updatePhoto}
                  onDelete={deletePhoto}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PhotoCard({ photo, segments, onUpdate, onDelete }) {
  const [caption, setCaption] = useState(photo.caption || '');
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <img src={photo.photo_url} alt={caption} className="w-full h-40 object-cover" />
      <div className="p-3 space-y-2">
        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onBlur={() => {
            if (caption !== (photo.caption || '')) onUpdate(photo.id, { caption });
          }}
          placeholder="Légende…"
          className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-amber-400"
        />
        <select
          value={photo.fence_segment_id || ''}
          onChange={(e) => onUpdate(photo.id, { fence_segment_id: e.target.value })}
          className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-amber-400"
        >
          <option value="">Non associé</option>
          {segments.map((s) => (
            <option key={s.id} value={s.id}>{s.label} ({s.length_feet} pi)</option>
          ))}
        </select>
        <button onClick={() => onDelete(photo.id)} className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-600">
          <Trash2 className="w-3 h-3" /> Supprimer
        </button>
      </div>
    </div>
  );
}