import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, Bookmark, Trash2, FileText, Search } from 'lucide-react';

export default function PlansTab({ project }) {
  const [documents, setDocuments] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.Document.filter({ project_id: project.id }, '-created_date', 100),
      base44.entities.Bookmark.filter({ project_id: project.id }, '-created_date', 100),
    ]).then(([docs, bms]) => {
      setDocuments(docs);
      setBookmarks(bms);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [project.id]);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        const revision = `Rev ${documents.length + 1}`;
        await base44.entities.Document.create({
          project_id: project.id,
          name: file.name,
          file_url,
          file_type: file.type,
          page_count: 1,
          revision,
        });
      }
      load();
    } catch (err) {
      alert('Échec du téléversement : ' + err.message);
    }
    setUploading(false);
  };

  const removeDoc = async (id) => {
    if (!confirm('Supprimer ce document ?')) return;
    await base44.entities.Document.delete(id);
    load();
  };

  const addBookmark = async () => {
    const note = prompt('Note du signet (ex. « Détail de clôture ») :');
    if (!note) return;
    const doc = documents[0];
    await base44.entities.Bookmark.create({
      project_id: project.id,
      document_id: doc?.id || '',
      page_number: 1,
      note,
    });
    load();
  };

  const removeBookmark = async (id) => {
    await base44.entities.Bookmark.delete(id);
    load();
  };

  const filteredDocs = documents.filter((d) =>
    !search || d.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Documents</h2>
              <label className="flex items-center gap-2 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 text-sm font-medium rounded-lg cursor-pointer">
                <Upload className="w-3.5 h-3.5" /> {uploading ? 'Téléversement…' : 'Téléverser'}
                <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,image/*" onChange={handleUpload} className="hidden" />
              </label>
            </div>
            <div className="px-5 py-3 border-b border-slate-50">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher des documents…"
                  className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
            </div>
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-sm">Chargement…</div>
            ) : filteredDocs.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Aucun document. Téléversez des plans de construction, des PDF ou des images.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {filteredDocs.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">{doc.name}</div>
                      <div className="text-xs text-slate-400">{doc.file_type || 'Document'} · {doc.page_count || 1} page(s) {doc.revision && <span className="text-amber-600 font-medium">· {doc.revision}</span>}</div>
                    </div>
                    {doc.file_url && (
                      <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-xs text-amber-600 hover:underline">Voir</a>
                    )}
                    <button onClick={() => removeDoc(doc.id)} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Signets</h2>
            <button onClick={addBookmark} disabled={documents.length === 0} className="text-amber-600 hover:text-amber-700 disabled:opacity-40">
              <Bookmark className="w-4 h-4" />
            </button>
          </div>
          {bookmarks.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-400">Aucun signet. Marquez les détails de clôture, plans de site, détails de portail, etc.</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {bookmarks.map((bm) => (
                <div key={bm.id} className="flex items-start gap-2 px-5 py-3">
                  <Bookmark className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-900">{bm.note}</div>
                    <div className="text-xs text-slate-400">Page {bm.page_number}</div>
                  </div>
                  <button onClick={() => removeBookmark(bm.id)} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}