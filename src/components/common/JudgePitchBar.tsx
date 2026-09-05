import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Zap, Play, Pause, X, Loader2, Radio } from 'lucide-react';
import { useCity } from '../../context/CityContext';
import { publicApi } from '../../api/publicApi';

export const JudgePitchBar: React.FC = () => {
  const location = useLocation();
  const { selectedCity, setSelectedCity, availableCities } = useCity();

  const [simRunning, setSimRunning] = useState<boolean>(false);
  const [activeVehicles, setActiveVehicles] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    const saved = sessionStorage.getItem('urja_pitch_bar_collapsed');
    return saved !== null ? saved === 'true' : true; // Default collapsed so it never blocks page content
  });

  const setCollapsedState = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
    sessionStorage.setItem('urja_pitch_bar_collapsed', String(collapsed));
  };

  // Poll simulator status periodically
  useEffect(() => {
    let isMounted = true;
    const checkSim = async () => {
      try {
        const data = await publicApi.getSimulationStatus();
        if (isMounted && data) {
          setSimRunning(data.is_running);
          if (data.active_vehicles !== undefined) {
            setActiveVehicles(data.active_vehicles);
          }
        }
      } catch (err) {
        // Backend simulator might not be accessible in static mode
      }
    };

    checkSim();
    const interval = setInterval(checkSim, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleToggleSim = async () => {
    try {
      setLoading(true);
      const res = await publicApi.toggleSimulation();
      setSimRunning(res.is_running);
      if (res.active_vehicles !== undefined) {
        setActiveVehicles(res.active_vehicles);
      }
    } catch (err) {
      console.error('Failed to toggle fleet simulation:', err);
    } finally {
      setLoading(false);
    }
  };

  const isSimulationPage = location.pathname === '/simulation';

  // If collapsed, show small floating pill
  if (isCollapsed) {
    return (
      <aside
        aria-label="Judge pitch controls"
        className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
      >
        <button
          onClick={() => setCollapsedState(false)}
          className="bg-[#111827]/95 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-bold shadow-2xl border border-emerald-500/40 hover:bg-[#1f2937] hover:border-emerald-400 transition-all flex items-center gap-2 group cursor-pointer"
          title="Open Judge Pitch Controller"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <Zap className="w-3.5 h-3.5 text-emerald-400" />
          <span>Pitch Mode</span>
          <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded font-mono border border-emerald-800/60 font-semibold">
            {simRunning ? 'SIM LIVE' : 'PAUSED'}
          </span>
        </button>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Judge pitch controls"
      className="fixed bottom-4 right-4 z-50 max-w-sm w-[92vw] sm:w-88 bg-[#111827]/95 backdrop-blur-md text-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] border border-emerald-500/30 p-3.5 transition-all text-xs animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
          <span className="font-extrabold uppercase tracking-wider text-[11px] text-emerald-400 flex items-center gap-1">
            <Zap className="w-3 h-3 text-emerald-400 inline" />
            Judge Pitch Controller
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {!isSimulationPage && (
            <Link
              to="/simulation"
              className="text-[10px] bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded font-bold border border-emerald-700/50 transition-colors"
            >
              Digital Twin ↗
            </Link>
          )}
          <button
            onClick={() => setCollapsedState(true)}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-800 transition-colors cursor-pointer"
            title="Minimize"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Simulator Engine Status & Toggle */}
      <div className="flex items-center justify-between py-2.5">
        <div>
          <div className="font-bold text-gray-200 flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-emerald-400" />
            <span>Telemetry Simulator</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">
            {simRunning
              ? `Streaming live GPS (${activeVehicles > 0 ? activeVehicles : 5} buses)`
              : 'Paused. Click to start live GPS feed.'}
          </div>
        </div>
        <button
          onClick={handleToggleSim}
          disabled={loading}
          className={`px-3 py-1.5 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 shrink-0 ml-2 cursor-pointer ${
            simRunning
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
              : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700'
          }`}
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : simRunning ? (
            <Pause className="w-3.5 h-3.5" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
          <span>{simRunning ? 'Running' : 'Start Sim'}</span>
        </button>
      </div>

      {/* Quick City Switcher Pills */}
      <div className="pt-2 border-t border-gray-800/80">
        <div className="text-[10px] uppercase font-bold text-gray-400 mb-1.5 flex items-center justify-between">
          <span>Quick City Switcher (Active: {selectedCity})</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {availableCities.slice(0, 4).map((c) => {
            const isCur = c.name.toLowerCase() === selectedCity.toLowerCase();
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCity(c.name)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  isCur
                    ? 'bg-emerald-500 text-gray-950 font-bold shadow-xs'
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700/60'
                }`}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
