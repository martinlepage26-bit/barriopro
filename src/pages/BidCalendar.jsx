import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Plus } from 'lucide-react';

const statusColors = {
  New: 'bg-blue-100 text-blue-700',
  Estimating: 'bg-amber-100 text-amber-700',
  'Quote Ready': 'bg-purple-100 text-purple-700',
  Submitted: 'bg-indigo-100 text-indigo-700',
  Won: 'bg-emerald-100 text-emerald-700',
  Lost: 'bg-rose-100 text-rose-700',
  Archived: 'bg-slate-100 text-slate-500',
};

const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export default function BidCalendar() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(new Date());

  useEffect(() => {
    base44.entities.Project.list('-updated_date', 200).then(setProjects).finally(() => setLoading(false));
  }, []);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const bidsByDate = {};
  projects.forEach((p) => {
    if (p.bid_date && !['Won', 'Lost', 'Archived'].includes(p.status)) {
      const d = new Date(p.bid_date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const key = d.getDate();
        if (!bidsByDate[key]) bidsByDate[key] = [];
        bidsByDate[key].push(p);
      }
    }
  });

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Calendrier des soumissions</h1>
          <p className="text-sm text-slate-500 mt-1">Échéances des soumissions en un coup d'œil</p>
        </div>
        <Link to="/projects" className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium rounded-lg text-sm">
          <Plus className="w-4 h-4" /> Nouveau projet
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 rounded-lg">‹</button>
          <h2 className="font-semibold text-slate-900">{monthNames[month]} {year}</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 rounded-lg">›</button>
            <button onClick={() => setCursor(new Date())} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg">Aujourd'hui</button>
          </div>
        </div>
        <div className="grid grid-cols-7 border-b border-slate-100">
          {dayNames.map((d) => (
            <div key={d} className="px-3 py-2.5 text-[11px] font-semibold text-slate-400 uppercase text-center">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
            const bids = day ? bidsByDate[day] || [] : [];
            return (
              <div key={i} className={`min-h-[110px] border-r border-b border-slate-50 p-2 ${day ? 'bg-white' : 'bg-slate-50/50'}`}>
                {day && (
                  <>
                    <div className={`text-xs font-medium mb-1.5 inline-flex items-center justify-center w-6 h-6 rounded-full ${
                      isToday ? 'bg-amber-500 text-slate-900' : 'text-slate-400'
                    }`}>{day}</div>
                    <div className="space-y-1">
                      {bids.slice(0, 3).map((b) => (
                        <Link key={b.id} to={`/projects/${b.id}`} className="block px-1.5 py-1 rounded text-[11px] bg-amber-50 hover:bg-amber-100 text-amber-800 truncate border border-amber-100">
                          {b.name}
                        </Link>
                      ))}
                      {bids.length > 3 && <div className="text-[10px] text-slate-400 px-1.5">+{bids.length - 3} more</div>}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {loading && <p className="text-center text-slate-400 text-sm mt-4">Chargement…</p>}
    </div>
  );
}