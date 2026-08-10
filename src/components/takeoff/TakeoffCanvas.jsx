import { useRef, useState, useEffect, useCallback } from 'react';
import { Ruler, Undo2, Redo2, Trash2, Hand, MousePointer2, Plus, Move, Crosshair, Camera } from 'lucide-react';
import LayersPanel from './LayersPanel';

const PRESET_SCALES = [
  { label: '1" = 10\'', ratio: 10 },
  { label: '1" = 20\'', ratio: 20 },
  { label: '1" = 30\'', ratio: 30 },
  { label: '1" = 40\'', ratio: 40 },
  { label: '1" = 50\'', ratio: 50 },
  { label: '1" = 100\'', ratio: 100 },
];

// ratio = feet per pixel on screen at current zoom
export default function TakeoffCanvas({ takeoff, segments, onSegmentsChange, backgroundImage, onScaleChange, photos, onSegmentPhotos, layers, onAddLayer, onToggleVisible, onDeleteLayer, assemblies }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [tool, setTool] = useState('draw'); // draw, pan, measure
  const [scale, setScale] = useState(takeoff?.scale_ratio || 1);
  const [scaleLabel, setScaleLabel] = useState(takeoff?.scale_label || '1" = 20\'');
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [currentPoints, setCurrentPoints] = useState([]);
  const [activeSegmentId, setActiveSegmentId] = useState(null);
  const [activeLayerId, setActiveLayerId] = useState(null);
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState(null);
  const [measurePoints, setMeasurePoints] = useState([]);
  const [calibratePoints, setCalibratePoints] = useState([]);
  const [calibrateDistance, setCalibrateDistance] = useState('');
  const [imgLoaded, setImgLoaded] = useState(false);
  const imgRef = useRef(null);
  const [imgNaturalSize, setImgNaturalSize] = useState({ w: 0, h: 0 });

  // Set active layer when layers change
  useEffect(() => {
    if (layers && layers.length > 0 && !layers.find((l) => l.id === activeLayerId)) {
      setActiveLayerId(layers[0].id);
    }
  }, [layers, activeLayerId]);

  // Load background image
  useEffect(() => {
    if (backgroundImage) {
      const img = new Image();
      img.onload = () => {
        imgRef.current = img;
        setImgNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
        setImgLoaded(true);
      };
      img.src = backgroundImage;
    } else {
      setImgLoaded(false);
      imgRef.current = null;
    }
  }, [backgroundImage]);

  const getCanvasPoint = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - offset.x) / zoom,
      y: (e.clientY - rect.top - offset.y) / zoom,
    };
  }, [offset, zoom]);

  const pixelDist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
  const toFeet = (px) => px * scale;

  const handleMouseDown = (e) => {
    if (tool === 'pan') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
      return;
    }
    const pt = getCanvasPoint(e);
    if (tool === 'draw') {
      setCurrentPoints((prev) => [...prev, pt]);
    } else if (tool === 'measure') {
      setMeasurePoints((prev) => {
        if (prev.length >= 2) return [pt];
        return [...prev, pt];
      });
    } else if (tool === 'calibrate') {
      setCalibratePoints((prev) => {
        if (prev.length >= 2) return [pt];
        return [...prev, pt];
      });
    }
  };

  const finishSegment = () => {
    if (currentPoints.length < 2) {
      setCurrentPoints([]);
      return;
    }
    const length = currentPoints.reduce((sum, p, i) => (i === 0 ? 0 : sum + pixelDist(currentPoints[i - 1], p)), 0);
    const newSeg = {
    id: crypto.randomUUID(),
    label: `Ligne ${segments.length + 1}`,
      geometry: currentPoints,
      length_feet: Math.round(toFeet(length) * 10) / 10,
      gate_count: 0,
      corner_count: Math.max(0, currentPoints.length - 2),
      end_count: 2,
      layer_id: activeLayerId,
    };
    setHistory((h) => [...h, segments]);
    setRedoStack([]);
    onSegmentsChange([...segments, newSeg]);
    setCurrentPoints([]);
    setActiveSegmentId(newSeg.id);
  };

  const cancelDraw = () => setCurrentPoints([]);

  const applyCalibration = () => {
    if (calibratePoints.length !== 2 || !calibrateDistance) return;
    const pxDist = pixelDist(calibratePoints[0], calibratePoints[1]);
    if (pxDist === 0) return;
    const newScale = Number(calibrateDistance) / pxDist;
    const label = `Calibré : ${Number(calibrateDistance).toFixed(0)} pi`;
    setScale(newScale);
    setScaleLabel(label);
    if (onScaleChange) onScaleChange(newScale, label);
    setCalibratePoints([]);
    setCalibrateDistance('');
    setTool('draw');
  };

  const resetCalibration = () => {
    setCalibratePoints([]);
    setCalibrateDistance('');
  };

  const undo = () => {
    if (history.length === 0) return;
    setRedoStack((r) => [...r, segments]);
    onSegmentsChange(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    setHistory((h) => [...h, segments]);
    onSegmentsChange(redoStack[redoStack.length - 1]);
    setRedoStack((r) => r.slice(0, -1));
  };

  const deleteSegment = (id) => {
    setHistory((h) => [...h, segments]);
    onSegmentsChange(segments.filter((s) => s.id !== id));
    if (activeSegmentId === id) setActiveSegmentId(null);
  };

  const updateSegment = (id, field, value) => {
    onSegmentsChange(segments.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  // Wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(5, Math.max(0.2, zoom * delta));
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setOffset({
      x: mx - (mx - offset.x) * (newZoom / zoom),
      y: my - (my - offset.y) * (newZoom / zoom),
    });
    setZoom(newZoom);
  };

  useEffect(() => {
    const handleMove = (e) => {
      if (!isPanning) return;
      setOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    };
    const handleUp = () => setIsPanning(false);
    if (isPanning) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isPanning, panStart]);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);

    // Draw grid if no image
    if (!imgLoaded) {
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1 / zoom;
      const gridSize = 50;
      const startX = Math.floor(-offset.x / zoom / gridSize) * gridSize;
      const startY = Math.floor(-offset.y / zoom / gridSize) * gridSize;
      const endX = startX + rect.width / zoom + gridSize;
      const endY = startY + rect.height / zoom + gridSize;
      for (let x = startX; x < endX; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, startY); ctx.lineTo(x, endY); ctx.stroke();
      }
      for (let y = startY; y < endY; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(startX, y); ctx.lineTo(endX, y); ctx.stroke();
      }
    } else if (imgRef.current) {
      ctx.drawImage(imgRef.current, 0, 0);
    }

    // Draw segments
    segments.forEach((seg) => {
      const layer = layers?.find((l) => l.id === seg.layer_id);
      if (layer && !layer.visible) return;
      const segColor = layer?.color || '#0f172a';
      const isActive = seg.id === activeSegmentId;
      ctx.strokeStyle = isActive ? '#f59e0b' : segColor;
      ctx.lineWidth = (isActive ? 4 : 3) / zoom;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      seg.geometry.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
      // Points
      seg.geometry.forEach((p, i) => {
        ctx.fillStyle = isActive ? '#f59e0b' : segColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5 / zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2 / zoom, 0, Math.PI * 2);
        ctx.fill();
      });
      // Label at midpoint
      if (seg.geometry.length >= 2) {
        const mid = seg.geometry[Math.floor(seg.geometry.length / 2)];
        ctx.fillStyle = segColor;
        ctx.font = `bold ${12 / zoom}px sans-serif`;
        ctx.fillText(`${seg.length_feet} pi`, mid.x + 8 / zoom, mid.y - 8 / zoom);
      }
    });

    // Draw current drawing
    if (currentPoints.length > 0) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3 / zoom;
      ctx.setLineDash([8 / zoom, 4 / zoom]);
      ctx.beginPath();
      currentPoints.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
      currentPoints.forEach((p) => {
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5 / zoom, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Draw measurement
    if (measurePoints.length === 2) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2 / zoom;
      ctx.setLineDash([4 / zoom, 4 / zoom]);
      ctx.beginPath();
      ctx.moveTo(measurePoints[0].x, measurePoints[0].y);
      ctx.lineTo(measurePoints[1].x, measurePoints[1].y);
      ctx.stroke();
      ctx.setLineDash([]);
      const dist = toFeet(pixelDist(measurePoints[0], measurePoints[1]));
      const mid = { x: (measurePoints[0].x + measurePoints[1].x) / 2, y: (measurePoints[0].y + measurePoints[1].y) / 2 };
      ctx.fillStyle = '#3b82f6';
      ctx.font = `${12 / zoom}px sans-serif`;
      ctx.fillText(`${dist.toFixed(1)} pi`, mid.x + 8 / zoom, mid.y);
    }

    // Draw calibration points
    if (calibratePoints.length > 0) {
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2 / zoom;
      if (calibratePoints.length === 2) {
        ctx.setLineDash([6 / zoom, 4 / zoom]);
        ctx.beginPath();
        ctx.moveTo(calibratePoints[0].x, calibratePoints[0].y);
        ctx.lineTo(calibratePoints[1].x, calibratePoints[1].y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      calibratePoints.forEach((p, i) => {
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 7 / zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${9 / zoom}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${i + 1}`, p.x, p.y);
        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';
      });
    }

    ctx.restore();
  }, [segments, currentPoints, measurePoints, calibratePoints, offset, zoom, imgLoaded, activeSegmentId, scale, layers]);

  const totalLength = segments.reduce((sum, s) => sum + (s.length_feet || 0), 0);
  const segmentCounts = {};
  segments.forEach((s) => {
    const lid = s.layer_id || '';
    segmentCounts[lid] = (segmentCounts[lid] || 0) + 1;
  });

  return (
    <div className="flex h-full">
      {/* Toolbar */}
      <div className="w-14 bg-slate-900 flex flex-col items-center py-3 gap-1">
        <ToolBtn active={tool === 'draw'} onClick={() => setTool('draw')} icon={MousePointer2} label="Tracer" />
        <ToolBtn active={tool === 'measure'} onClick={() => setTool('measure')} icon={Ruler} label="Mesurer" />
        <ToolBtn active={tool === 'calibrate'} onClick={() => { setTool('calibrate'); resetCalibration(); }} icon={Crosshair} label="Calibrer l'échelle" />
        <ToolBtn active={tool === 'pan'} onClick={() => setTool('pan')} icon={Hand} label="Déplacer" />
        <div className="w-8 border-t border-slate-700 my-1" />
        <ToolBtn onClick={undo} icon={Undo2} label="Annuler" disabled={history.length === 0} />
        <ToolBtn onClick={redo} icon={Redo2} label="Rétablir" disabled={redoStack.length === 0} />
      </div>

      {/* Canvas */}
      <div className="flex-1 relative" ref={containerRef}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onWheel={handleWheel}
          className={`w-full h-full ${tool === 'pan' ? 'cursor-grab' : 'cursor-crosshair'}`}
          style={{ background: imgLoaded ? '#1e293b' : '#f8fafc' }}
        />
        {/* Top bar */}
        <div className="absolute top-3 left-3 right-3 flex items-center gap-2">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 px-3 py-1.5 flex items-center gap-2">
            <span className="text-xs text-slate-500">Échelle :</span>
            <select
              value={scaleLabel}
              onChange={(e) => {
                const preset = PRESET_SCALES.find((p) => p.label === e.target.value);
                setScaleLabel(e.target.value);
                if (preset) {
                  setScale(preset.ratio / 100);
                  if (onScaleChange) onScaleChange(preset.ratio / 100, preset.label);
                }
              }}
              className="text-xs font-medium border-0 focus:outline-none bg-transparent"
            >
              {PRESET_SCALES.map((s) => <option key={s.label}>{s.label}</option>)}
              {!PRESET_SCALES.find((p) => p.label === scaleLabel) && <option value={scaleLabel}>{scaleLabel}</option>}
            </select>
            <span className="text-xs text-slate-400">({scale.toFixed(3)} pi/px)</span>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 px-3 py-1.5 text-xs text-slate-600">
          Zoom : {Math.round(zoom * 100)}%
          </div>
          {currentPoints.length > 0 && (
            <div className="bg-amber-500 rounded-lg shadow-sm px-3 py-1.5 flex items-center gap-2">
              <span className="text-xs text-slate-900 font-medium">{currentPoints.length} points</span>
              <button onClick={finishSegment} className="text-xs bg-slate-900 text-white px-2 py-0.5 rounded font-medium">Terminer</button>
              <button onClick={cancelDraw} className="text-xs text-slate-700 px-1">✕</button>
            </div>
          )}
          {measurePoints.length === 2 && (
            <div className="bg-blue-500 text-white rounded-lg shadow-sm px-3 py-1.5 text-xs font-medium">
              {toFeet(pixelDist(measurePoints[0], measurePoints[1])).toFixed(1)} pi
            </div>
          )}
        </div>
        {/* Bottom bar */}
        <div className="absolute bottom-3 left-3 bg-white rounded-lg shadow-sm border border-slate-200 px-3 py-1.5 text-xs text-slate-600">
          Total : <span className="font-semibold text-slate-900">{totalLength.toFixed(1)} pi</span> · {segments.length} segment(s)
        </div>
        {tool === 'calibrate' && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-lg border border-slate-200 p-4 w-80 z-10">
            <div className="flex items-center gap-2 mb-3">
              <Crosshair className="w-4 h-4 text-emerald-500" />
              <h4 className="font-semibold text-slate-900 text-sm">Calibrer l'échelle</h4>
            </div>
            {calibratePoints.length < 2 ? (
              <div>
                <p className="text-xs text-slate-500 mb-2">
                  Cliquez sur deux points du plan dont vous connaissez la distance réelle.
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className={`w-2.5 h-2.5 rounded-full ${calibratePoints.length >= 1 ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                    <span className={`w-2.5 h-2.5 rounded-full ${calibratePoints.length >= 2 ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                  </div>
                  <span className="text-xs font-medium text-emerald-600">{calibratePoints.length}/2 points placés</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Distance connue (pi)</label>
                  <input
                    type="number"
                    value={calibrateDistance}
                    onChange={(e) => setCalibrateDistance(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') applyCalibration(); }}
                    placeholder="ex. 100"
                    autoFocus
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    {(pixelDist(calibratePoints[0], calibratePoints[1])).toFixed(1)} px → {calibrateDistance ? (Number(calibrateDistance) / pixelDist(calibratePoints[0], calibratePoints[1])).toFixed(4) + ' pi/px' : '—'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={resetCalibration}
                    className="flex-1 px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
                  >
                    Reprendre
                  </button>
                  <button
                    onClick={applyCalibration}
                    disabled={!calibrateDistance || Number(calibrateDistance) <= 0}
                    className="flex-1 px-3 py-2 text-xs font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg disabled:opacity-50"
                  >
                    Appliquer
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right panel: Layers + Segments */}
      <div className="w-72 bg-white border-l border-slate-200 overflow-auto">
        <LayersPanel
          layers={layers || []}
          activeLayerId={activeLayerId}
          onActiveLayerChange={setActiveLayerId}
          onAddLayer={onAddLayer}
          onToggleVisible={onToggleVisible}
          onDeleteLayer={onDeleteLayer}
          segmentCounts={segmentCounts}
        />
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900 text-sm">Lignes de clôture</h3>
        </div>
        {segments.length === 0 ? (
          <div className="p-4 text-xs text-slate-400 text-center">
            Sélectionnez l'outil Tracer et cliquez sur le canevas pour placer des points. Cliquez sur « Terminer » pour compléter une ligne de clôture.
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {segments.map((seg) => (
              <div key={seg.id} className={`p-3 ${activeSegmentId === seg.id ? 'bg-amber-50' : ''}`} onClick={() => setActiveSegmentId(seg.id)}>
                <div className="flex items-center justify-between mb-2">
                  <input
                    value={seg.label}
                    onChange={(e) => updateSegment(seg.id, 'label', e.target.value)}
                    className="text-sm font-medium text-slate-900 bg-transparent border-0 focus:outline-none focus:ring-0 w-full"
                  />
                  <button onClick={() => deleteSegment(seg.id)} className="text-slate-300 hover:text-rose-500 ml-2"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <div className="text-lg font-semibold text-slate-900">{seg.length_feet} ft</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <select
                    value={seg.layer_id || ''}
                    onChange={(e) => updateSegment(seg.id, 'layer_id', e.target.value)}
                    className="px-1.5 py-1 text-[11px] border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-amber-400"
                  >
                    {(layers || []).map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                  <select
                    value={seg.assembly_id || ''}
                    onChange={(e) => updateSegment(seg.id, 'assembly_id', e.target.value)}
                    className="px-1.5 py-1 text-[11px] border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-amber-400"
                  >
                    <option value="">— Assemblage —</option>
                    {(assemblies || []).map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-1 mt-2 text-[11px]">
                  <NumField label="Portails" value={seg.gate_count} onChange={(v) => updateSegment(seg.id, 'gate_count', v)} />
                  <NumField label="Coins" value={seg.corner_count} onChange={(v) => updateSegment(seg.id, 'corner_count', v)} />
                  <NumField label="Extr." value={seg.end_count} onChange={(v) => updateSegment(seg.id, 'end_count', v)} />
                </div>
                <textarea
                  value={seg.scope_note || ''}
                  onChange={(e) => updateSegment(seg.id, 'scope_note', e.target.value)}
                  placeholder="Note de portée (ex. Vérifier la ligne de propriété)"
                  rows={2}
                  className="w-full mt-2 text-[11px] border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none"
                />
                {photos && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onSegmentPhotos?.(seg.id); }}
                    className="flex items-center gap-1 mt-2 text-[11px] text-slate-500 hover:text-amber-600"
                  >
                    <Camera className="w-3 h-3" />
                    {photos.filter((p) => p.fence_segment_id === seg.id).length} photo(s)
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ToolBtn({ active, onClick, icon: Icon, label, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30 ${
        active ? 'bg-amber-500 text-slate-900' : 'text-slate-400 hover:text-white hover:bg-slate-800'
      }`}
    >
      <Icon className="w-[18px] h-[18px]" />
    </button>
  );
}

function NumField({ label, value, onChange }) {
  return (
    <div>
      <div className="text-slate-400 mb-0.5">{label}</div>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full px-1.5 py-1 text-xs border border-slate-200 rounded text-center focus:outline-none focus:ring-1 focus:ring-amber-400"
      />
    </div>
  );
}