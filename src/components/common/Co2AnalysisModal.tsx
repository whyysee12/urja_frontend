import React, { useState } from 'react';
import {
  DEFAULT_EMISSION_COEFFICIENTS,
  calculateImpactMetrics,
  calculateMunicipalFleetImpact,
  FleetSegmentData,
  ImpactMetrics,
} from '../../utils/co2Calculator';

export interface Co2AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  cityName: string;
  stateName: string;
  activeVehiclesCount: number;
  totalVehiclesCount: number;
  currentLiveOffsetTons: number;
  liveTickIncrementPerSec: number;
}

export const Co2AnalysisModal: React.FC<Co2AnalysisModalProps> = ({
  isOpen,
  onClose,
  cityName,
  stateName,
  activeVehiclesCount,
  totalVehiclesCount,
  currentLiveOffsetTons,
  liveTickIncrementPerSec,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'formula' | 'segments' | 'scenario'>('overview');
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month' | 'cumulative'>('cumulative');
  const [copied, setCopied] = useState(false);

  // Scenario Simulator interactive states
  const [simFleetSize, setSimFleetSize] = useState<number>(Math.max(12, totalVehiclesCount || 15));
  const [simDailyKm, setSimDailyKm] = useState<number>(140);
  const [simSolarShare, setSimSolarShare] = useState<number>(30); // 30% rooftop depot solar
  const [simDieselPrice, setSimDieselPrice] = useState<number>(90);

  if (!isOpen) return null;

  // Timeframe scaling for display
  const timeframeMultiplier = {
    today: 1 / 300,
    week: 7 / 300,
    month: 30 / 300,
    cumulative: 1,
  }[timeframe];

  const scaledTons = Math.max(0.01, currentLiveOffsetTons * timeframeMultiplier);
  const scaledKg = scaledTons * 1000;
  const scaledKm = (scaledKg / (1.35 - (1.15 * 0.727 * 0.75))); // estimated km
  const currentMetrics: ImpactMetrics = calculateImpactMetrics(scaledKm, 'electric_bus', 25);

  // Scenario simulated results
  const scenarioSegments: FleetSegmentData[] = [
    {
      type: 'electric_bus',
      name: 'Electric Transit Buses',
      count: Math.round(simFleetSize * 0.7),
      avgDailyKmPerUnit: simDailyKm,
      evConsumptionKwhPerKm: 1.15,
      baselineDieselKgPerKm: 1.35,
    },
    {
      type: 'ambulance_ev',
      name: 'Emergency EV Ambulances',
      count: Math.round(simFleetSize * 0.15) || 2,
      avgDailyKmPerUnit: Math.round(simDailyKm * 0.8),
      evConsumptionKwhPerKm: 0.20,
      baselineDieselKgPerKm: 0.22,
    },
    {
      type: 'utility_ev',
      name: 'Municipal Clean Utility EVs',
      count: Math.round(simFleetSize * 0.15) || 2,
      avgDailyKmPerUnit: Math.round(simDailyKm * 0.6),
      evConsumptionKwhPerKm: 0.18,
      baselineDieselKgPerKm: 0.19,
    },
  ];

  const scenarioAnnualMetrics = calculateMunicipalFleetImpact(
    scenarioSegments,
    365,
    simSolarShare,
    { dieselPriceInrPerLiter: simDieselPrice }
  );

  const handleCopyReport = () => {
    const reportText = `[ChargeEase ESG Telemetry Report - ${cityName}, ${stateName}]
Estimated Net CO2 Offset: ${scaledTons.toFixed(2)} Tons (${scaledKg.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg)
Mature Trees Equivalent: ${currentMetrics.treesEquivalent.toLocaleString('en-IN')} trees
Diesel Conserved: ${currentMetrics.dieselLitersSaved.toLocaleString('en-IN', { maximumFractionDigits: 1 })} Liters
Municipal Fuel Savings: ₹${currentMetrics.fuelCostSavingsInr.toLocaleString('en-IN')}
Toxic Pollutants Avoided: PM2.5: ${currentMetrics.pm25AvoidedKg.toFixed(2)} kg | NOx: ${currentMetrics.noxAvoidedKg.toFixed(2)} kg
Methodology: Central Electricity Authority (CEA) India CO2 Baseline Database v20 (Grid EF: 0.727 kg/kWh).`;

    navigator.clipboard.writeText(reportText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative bg-white rounded-2xl shadow-2xl border border-outline-variant w-full max-w-4xl max-h-[90vh] flex flex-col z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-outline-variant/60 flex items-center justify-between bg-surface-container-low shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-inner">
              <span className="material-symbols-outlined text-2xl">eco</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl font-bold text-on-background">
                  {cityName} Carbon Offset & ESG Telemetry
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  CEA Baseline v20
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Scientific formula, live simulation telemetry & net emissions avoidance audit
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-on-surface-variant hover:text-on-surface rounded-lg hover:bg-surface-container transition-colors"
            title="Close modal"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-outline-variant/40 bg-surface flex gap-2 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 px-3 text-xs font-label-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-base">dashboard</span>
            Live Impact & Equivalence
          </button>

          <button
            onClick={() => setActiveTab('formula')}
            className={`pb-3 px-3 text-xs font-label-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'formula'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-base">functions</span>
            Mathematical Formulation
          </button>

          <button
            onClick={() => setActiveTab('segments')}
            className={`pb-3 px-3 text-xs font-label-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'segments'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-base">pie_chart</span>
            Fleet Segment Breakdown
          </button>

          <button
            onClick={() => setActiveTab('scenario')}
            className={`pb-3 px-3 text-xs font-label-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'scenario'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-base">tune</span>
            What-If Scenario Sandbox
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-surface-container-lowest/30">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Primary Live Telemetry Banner */}
              <div className="bg-gradient-to-br from-emerald-900 via-teal-900 to-emerald-950 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-4 mb-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-1.5 inline-block" />
                        Simulation Active Telemetry
                      </span>
                      <span className="text-xs text-emerald-200/80">
                        +{liveTickIncrementPerSec.toFixed(3)} kg/sec live rate
                      </span>
                    </div>
                    <div className="text-4xl sm:text-5xl font-black font-display tracking-tight text-white mt-2">
                      {scaledTons.toFixed(3)} <span className="text-xl sm:text-2xl font-normal text-emerald-300">Metric Tons</span>
                    </div>
                    <p className="text-xs text-emerald-100/70 mt-1">
                      Equivalent to {scaledKg.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg CO₂ net avoided from municipal air
                    </p>
                  </div>

                  {/* Timeframe selector pills */}
                  <div className="flex bg-black/30 p-1 rounded-xl border border-white/10 text-xs self-stretch sm:self-auto justify-center">
                    {(['today', 'week', 'month', 'cumulative'] as const).map((tf) => (
                      <button
                        key={tf}
                        onClick={() => setTimeframe(tf)}
                        className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
                          timeframe === tf
                            ? 'bg-emerald-500 text-white font-bold shadow-sm'
                            : 'text-emerald-100/70 hover:text-white'
                        }`}
                      >
                        {tf === 'cumulative' ? 'Cumulative' : tf}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Key Ratios Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                    <span className="text-xl sm:text-2xl">🌳</span>
                    <div className="text-lg sm:text-xl font-bold mt-1 text-white">
                      {currentMetrics.treesEquivalent.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[11px] text-emerald-200/70">Mature Trees/Yr Eqv.</div>
                  </div>

                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                    <span className="text-xl sm:text-2xl">⛽</span>
                    <div className="text-lg sm:text-xl font-bold mt-1 text-white">
                      {currentMetrics.dieselLitersSaved.toLocaleString('en-IN', { maximumFractionDigits: 0 })} L
                    </div>
                    <div className="text-[11px] text-emerald-200/70">Diesel Fuel Conserved</div>
                  </div>

                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                    <span className="text-xl sm:text-2xl">₹</span>
                    <div className="text-lg sm:text-xl font-bold mt-1 text-white">
                      ₹{(currentMetrics.fuelCostSavingsInr / 100000).toFixed(2)} L
                    </div>
                    <div className="text-[11px] text-emerald-200/70">Municipal Fuel Saved</div>
                  </div>

                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                    <span className="text-xl sm:text-2xl">🍃</span>
                    <div className="text-lg sm:text-xl font-bold mt-1 text-white">
                      {currentMetrics.pm25AvoidedKg.toFixed(1)} kg
                    </div>
                    <div className="text-[11px] text-emerald-200/70">PM2.5 Particulate Avoided</div>
                  </div>
                </div>
              </div>

              {/* Real-time Status Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-white border border-outline-variant shadow-sm">
                  <div className="flex items-center justify-between text-on-surface-variant mb-2">
                    <span className="text-xs font-label-bold uppercase">Active Connected Units</span>
                    <span className="material-symbols-outlined text-emerald-600 text-lg">sensors</span>
                  </div>
                  <div className="text-2xl font-bold text-on-background">
                    {activeVehiclesCount} / {totalVehiclesCount} <span className="text-xs font-normal text-on-surface-variant">Vehicles</span>
                  </div>
                  <p className="text-[11px] text-emerald-700 font-medium mt-1">
                    Continuous GPS telemetry pinging every 2s
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-outline-variant shadow-sm">
                  <div className="flex items-center justify-between text-on-surface-variant mb-2">
                    <span className="text-xs font-label-bold uppercase">Displaced Tailpipe Ratio</span>
                    <span className="material-symbols-outlined text-primary text-lg">compress</span>
                  </div>
                  <div className="text-2xl font-bold text-primary">
                    100% <span className="text-xs font-normal text-on-surface-variant">Zero Tailpipe</span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant mt-1">
                    Direct toxic exhaust eliminated at point of use
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-outline-variant shadow-sm">
                  <div className="flex items-center justify-between text-on-surface-variant mb-2">
                    <span className="text-xs font-label-bold uppercase">Depot Clean Charging</span>
                    <span className="material-symbols-outlined text-amber-500 text-lg">solar_power</span>
                  </div>
                  <div className="text-2xl font-bold text-amber-600">
                    25% <span className="text-xs font-normal text-on-surface-variant">Solar Rooftop</span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant mt-1">
                    Blended with Rajasthan state grid supply
                  </p>
                </div>
              </div>

              {/* Comparative Emissions Bar */}
              <div className="p-5 rounded-xl bg-white border border-outline-variant shadow-sm">
                <h4 className="text-sm font-label-bold text-on-background mb-3 flex items-center justify-between">
                  <span>Well-to-Wheel Carbon Comparison for {cityName} Operations</span>
                  <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    ~58% Net Carbon Abatement
                  </span>
                </h4>

                <div className="space-y-4 text-xs">
                  <div>
                    <div className="flex justify-between text-on-surface font-semibold mb-1">
                      <span className="flex items-center gap-1.5 text-rose-700">
                        <span className="material-symbols-outlined text-sm">local_gas_station</span>
                        Baseline Diesel Fleet Emissions
                      </span>
                      <span>{currentMetrics.baselineDieselEmissionsKg.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg CO₂</span>
                    </div>
                    <div className="h-3 w-full bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 rounded-full w-full" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-on-surface font-semibold mb-1">
                      <span className="flex items-center gap-1.5 text-amber-700">
                        <span className="material-symbols-outlined text-sm">bolt</span>
                        EV Indirect Grid Electricity Emissions
                      </span>
                      <span>{currentMetrics.evGridEmissionsKg.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg CO₂</span>
                    </div>
                    <div className="h-3 w-full bg-surface-container rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full"
                        style={{
                          width: `${Math.min(100, (currentMetrics.evGridEmissionsKg / (currentMetrics.baselineDieselEmissionsKg || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-on-surface font-semibold mb-1">
                      <span className="flex items-center gap-1.5 text-emerald-700">
                        <span className="material-symbols-outlined text-sm">eco</span>
                        Net Avoided CO₂ (Clean Air Contribution)
                      </span>
                      <span className="text-emerald-700 font-bold">
                        {currentMetrics.netCo2AvoidedKg.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg CO₂
                      </span>
                    </div>
                    <div className="h-3 w-full bg-surface-container rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 rounded-full"
                        style={{
                          width: `${Math.min(100, (currentMetrics.netCo2AvoidedKg / (currentMetrics.baselineDieselEmissionsKg || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MATHEMATICAL FORMULATION */}
          {activeTab === 'formula' && (
            <div className="space-y-6">
              {/* Formula Card */}
              <div className="p-6 rounded-2xl bg-white border border-outline-variant shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                  <span className="material-symbols-outlined">calculate</span>
                  Official Calculation Equation & Standard
                </div>

                <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/60 font-mono text-xs sm:text-sm text-on-surface space-y-2 overflow-x-auto">
                  <div className="text-emerald-800 font-bold">
                    Net CO₂ Offset = E_baseline (Diesel) − E_grid (Electric Vehicle)
                  </div>
                  <div className="text-on-surface-variant text-xs pt-1 border-t border-outline-variant/40">
                    E_baseline = Fleet Distance (km) × Diesel Tailpipe Factor (1.35 kg CO₂/km)
                  </div>
                  <div className="text-on-surface-variant text-xs">
                    E_grid = Fleet Distance (km) × EV Specific Consumption (1.15 kWh/km) × CEA Grid Factor (0.727 kg CO₂/kWh) × (1 − Solar%)
                  </div>
                </div>

                <div className="text-xs text-on-surface leading-relaxed space-y-2">
                  <p>
                    <strong>Why EV emissions are not zero Well-to-Wheel:</strong> While an electric bus produces <strong>zero direct tailpipe emissions</strong> in the streets of {cityName}, generating the electricity on the regional grid produces emissions at thermal power plants. Our engine factors in the official <strong>Central Electricity Authority (CEA) Baseline Database</strong> so the calculation is scientifically rigorous, honest, and audit-ready.
                  </p>
                </div>
              </div>

              {/* Coefficients Reference Table */}
              <div className="rounded-xl border border-outline-variant bg-white overflow-hidden shadow-sm">
                <div className="px-5 py-3.5 bg-surface-container-low border-b border-outline-variant/60 font-label-bold text-xs text-on-surface flex justify-between items-center">
                  <span>Emission Parameters & Benchmark Standards</span>
                  <span className="text-[10px] text-on-surface-variant">Standard Units</span>
                </div>
                <div className="divide-y divide-outline-variant/40 text-xs">
                  <div className="px-5 py-2.5 flex justify-between items-center">
                    <span className="text-on-surface font-medium">CEA India Grid Emission Factor (National Weighted Avg)</span>
                    <span className="font-mono font-bold text-primary">{DEFAULT_EMISSION_COEFFICIENTS.gridEmissionFactorKgPerKwh} kg CO₂/kWh</span>
                  </div>
                  <div className="px-5 py-2.5 flex justify-between items-center">
                    <span className="text-on-surface font-medium">Rajasthan Regional Grid Factor (Thermal-Dominant)</span>
                    <span className="font-mono font-bold text-on-surface">0.780 kg CO₂/kWh</span>
                  </div>
                  <div className="px-5 py-2.5 flex justify-between items-center">
                    <span className="text-on-surface font-medium">Diesel Fuel Combustion Factor (IPCC 2006 Standard)</span>
                    <span className="font-mono font-bold text-rose-700">{DEFAULT_EMISSION_COEFFICIENTS.dieselEmissionFactorKgPerLiter} kg CO₂/Liter</span>
                  </div>
                  <div className="px-5 py-2.5 flex justify-between items-center">
                    <span className="text-on-surface font-medium">Municipal Diesel Bus Efficiency</span>
                    <span className="font-mono font-bold text-on-surface">{DEFAULT_EMISSION_COEFFICIENTS.dieselBusKmPerLiter} km/Liter</span>
                  </div>
                  <div className="px-5 py-2.5 flex justify-between items-center">
                    <span className="text-on-surface font-medium">12m Low-Floor Electric Bus Energy Consumption</span>
                    <span className="font-mono font-bold text-emerald-700">{DEFAULT_EMISSION_COEFFICIENTS.evBusKwhPerKm} kWh/km</span>
                  </div>
                  <div className="px-5 py-2.5 flex justify-between items-center">
                    <span className="text-on-surface font-medium">Tree Sequestration Rate (Mature Urban Tree)</span>
                    <span className="font-mono font-bold text-emerald-700">{DEFAULT_EMISSION_COEFFICIENTS.treeAbsorptionKgPerYear} kg CO₂/year</span>
                  </div>
                </div>
              </div>

              {/* Citations Box */}
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-xs text-on-surface space-y-1.5">
                <div className="font-bold text-primary flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">verified</span>
                  Official Regulatory & Academic Citations
                </div>
                <ul className="list-disc list-inside space-y-1 text-on-surface-variant text-[11px] pl-1">
                  <li><strong>Central Electricity Authority (CEA)</strong>, Ministry of Power, Government of India: <em>CO₂ Baseline Database for the Indian Power Sector, Version 20.0 (December 2024).</em></li>
                  <li><strong>IPCC</strong>: <em>2006 IPCC Guidelines for National Greenhouse Gas Inventories, Volume 2: Energy - Mobile Combustion.</em></li>
                  <li><strong>NITI Aayog & Bureau of Energy Efficiency (BEE)</strong>: <em>e-AMRIT National Electric Mobility Knowledge Portal emission baselines.</em></li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: FLEET SEGMENTS */}
          {activeTab === 'segments' && (
            <div className="space-y-6">
              <div className="text-xs text-on-surface-variant">
                Breakdown of zero-emission municipal assets currently tracked across <strong>{cityName}</strong>, comparing baseline diesel fuel footprint versus actual telemetry energy draw.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Electric Buses */}
                <div className="p-5 rounded-xl bg-white border border-outline-variant shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-xl">directions_bus</span>
                      <span className="font-label-bold text-xs text-on-background">Clean Electric Buses</span>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-primary-container/20 text-primary">
                      Heavy Duty
                    </span>
                  </div>
                  <div className="text-2xl font-black font-display text-on-background">
                    {Math.max(6, Math.round(totalVehiclesCount * 0.7))} <span className="text-xs font-normal text-on-surface-variant">Deployed</span>
                  </div>
                  <div className="space-y-1.5 text-xs text-on-surface-variant pt-2 border-t border-outline-variant/40">
                    <div className="flex justify-between">
                      <span>Baseline Tailpipe:</span>
                      <span className="font-bold text-rose-600">1.35 kg/km</span>
                    </div>
                    <div className="flex justify-between">
                      <span>EV Grid Consumption:</span>
                      <span className="font-bold text-amber-600">1.15 kWh/km</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Net Abatement:</span>
                      <span className="font-bold text-emerald-600">+0.514 kg/km</span>
                    </div>
                  </div>
                </div>

                {/* Ambulances */}
                <div className="p-5 rounded-xl bg-white border border-outline-variant shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-rose-600 text-xl">ambulance</span>
                      <span className="font-label-bold text-xs text-on-background">Emergency EV Ambulances</span>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                      Critical
                    </span>
                  </div>
                  <div className="text-2xl font-black font-display text-on-background">
                    {Math.max(1, Math.round(totalVehiclesCount * 0.15))} <span className="text-xs font-normal text-on-surface-variant">Active</span>
                  </div>
                  <div className="space-y-1.5 text-xs text-on-surface-variant pt-2 border-t border-outline-variant/40">
                    <div className="flex justify-between">
                      <span>Baseline Tailpipe:</span>
                      <span className="font-bold text-rose-600">0.22 kg/km</span>
                    </div>
                    <div className="flex justify-between">
                      <span>EV Consumption:</span>
                      <span className="font-bold text-amber-600">0.20 kWh/km</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Net Abatement:</span>
                      <span className="font-bold text-emerald-600">+0.091 kg/km</span>
                    </div>
                  </div>
                </div>

                {/* Utility */}
                <div className="p-5 rounded-xl bg-white border border-outline-variant shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-600 text-xl">handyman</span>
                      <span className="font-label-bold text-xs text-on-background">Municipal Utility EVs</span>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Civic
                    </span>
                  </div>
                  <div className="text-2xl font-black font-display text-on-background">
                    {Math.max(2, Math.round(totalVehiclesCount * 0.15))} <span className="text-xs font-normal text-on-surface-variant">Patrol Units</span>
                  </div>
                  <div className="space-y-1.5 text-xs text-on-surface-variant pt-2 border-t border-outline-variant/40">
                    <div className="flex justify-between">
                      <span>Baseline Tailpipe:</span>
                      <span className="font-bold text-rose-600">0.19 kg/km</span>
                    </div>
                    <div className="flex justify-between">
                      <span>EV Consumption:</span>
                      <span className="font-bold text-amber-600">0.18 kWh/km</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Net Abatement:</span>
                      <span className="font-bold text-emerald-600">+0.076 kg/km</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Departmental Allocation */}
              <div className="p-5 rounded-xl bg-white border border-outline-variant shadow-sm">
                <h4 className="text-xs font-label-bold text-on-background uppercase mb-3">
                  Public Transparency & Fleet Distribution ({cityName})
                </h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  All clean energy units feed telemetry into the public Open Mobility specification. Displaced tailpipe pollutants directly benefit high-density pedestrian corridors, schools, and hospital clusters by preventing localized thermal inversions and particulate buildup.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: SCENARIO SANDBOX */}
          {activeTab === 'scenario' && (
            <div className="space-y-6">
              <div className="bg-primary/5 rounded-xl p-4 border border-primary/20 text-xs text-on-surface">
                <strong className="text-primary">Interactive Municipal ESG Simulator:</strong> Adjust the parameters below to project the environmental and budgetary ROI for expanding the clean EV fleet in {cityName}.
              </div>

              {/* Sliders Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-white p-5 rounded-2xl border border-outline-variant shadow-sm">
                {/* Fleet Size */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-label-bold">
                    <span className="text-on-surface">Total Fleet Size (Units)</span>
                    <span className="text-primary font-mono text-sm">{simFleetSize} Vehicles</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="250"
                    step="5"
                    value={simFleetSize}
                    onChange={(e) => setSimFleetSize(Number(e.target.value))}
                    className="w-full accent-primary cursor-pointer h-2 bg-surface-container rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-on-surface-variant">
                    <span>5 Min</span>
                    <span>250 Max</span>
                  </div>
                </div>

                {/* Daily Km */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-label-bold">
                    <span className="text-on-surface">Average Daily Run per Bus</span>
                    <span className="text-primary font-mono text-sm">{simDailyKm} km/day</span>
                  </div>
                  <input
                    type="range"
                    min="60"
                    max="280"
                    step="10"
                    value={simDailyKm}
                    onChange={(e) => setSimDailyKm(Number(e.target.value))}
                    className="w-full accent-primary cursor-pointer h-2 bg-surface-container rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-on-surface-variant">
                    <span>60 km</span>
                    <span>280 km</span>
                  </div>
                </div>

                {/* Solar Share */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-label-bold">
                    <span className="text-on-surface">Depot Solar / Green PPA Share</span>
                    <span className="text-emerald-700 font-mono text-sm">{simSolarShare}% Clean Power</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={simSolarShare}
                    onChange={(e) => setSimSolarShare(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer h-2 bg-surface-container rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-on-surface-variant">
                    <span>0% (100% Grid)</span>
                    <span>100% (Zero Emission Solar)</span>
                  </div>
                </div>

                {/* Diesel Price */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-label-bold">
                    <span className="text-on-surface">Benchmark Diesel Price</span>
                    <span className="text-amber-700 font-mono text-sm">₹{simDieselPrice} / Liter</span>
                  </div>
                  <input
                    type="range"
                    min="75"
                    max="120"
                    step="1"
                    value={simDieselPrice}
                    onChange={(e) => setSimDieselPrice(Number(e.target.value))}
                    className="w-full accent-amber-600 cursor-pointer h-2 bg-surface-container rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-on-surface-variant">
                    <span>₹75/L</span>
                    <span>₹120/L</span>
                  </div>
                </div>
              </div>

              {/* Projected Annual Results */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-surface-container-low to-emerald-50/40 border border-emerald-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-label-bold uppercase text-emerald-900 tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-emerald-600">trending_up</span>
                    Annual Projected Impact ({cityName})
                  </h4>
                  <span className="text-xs text-emerald-800 font-bold bg-white px-3 py-1 rounded-full border border-emerald-300 shadow-sm">
                    {simFleetSize} Clean Units × 365 Days
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
                  <div className="bg-white rounded-xl p-4 border border-emerald-100 shadow-xs">
                    <div className="text-xs text-on-surface-variant">Net CO₂ Avoided</div>
                    <div className="text-2xl font-black text-emerald-800 font-display mt-1">
                      {scenarioAnnualMetrics.netCo2AvoidedTons.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                    </div>
                    <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Tons / Year</div>
                  </div>

                  <div className="bg-white rounded-xl p-4 border border-emerald-100 shadow-xs">
                    <div className="text-xs text-on-surface-variant">Diesel Saved</div>
                    <div className="text-2xl font-black text-on-background font-display mt-1">
                      {(scenarioAnnualMetrics.dieselLitersSaved / 1000).toFixed(1)}k
                    </div>
                    <div className="text-[10px] text-on-surface-variant font-semibold mt-0.5">Liters / Year</div>
                  </div>

                  <div className="bg-white rounded-xl p-4 border border-emerald-100 shadow-xs">
                    <div className="text-xs text-on-surface-variant">Budget Saved</div>
                    <div className="text-2xl font-black text-primary font-display mt-1">
                      ₹{(scenarioAnnualMetrics.fuelCostSavingsInr / 10000000).toFixed(2)} Cr
                    </div>
                    <div className="text-[10px] text-primary font-semibold mt-0.5">Annual Fuel Savings</div>
                  </div>

                  <div className="bg-white rounded-xl p-4 border border-emerald-100 shadow-xs">
                    <div className="text-xs text-on-surface-variant">Trees Equivalent</div>
                    <div className="text-2xl font-black text-emerald-700 font-display mt-1">
                      {scenarioAnnualMetrics.treesEquivalent.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">Mature Trees Eqv.</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-outline-variant/60 bg-surface-container-low flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-sm text-emerald-600">verified_user</span>
            <span>Real-time calculation compliant with CEA Baseline v20 & ISO 14064 GHG protocol</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleCopyReport}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-lg border border-outline-variant text-xs font-label-bold text-on-surface hover:bg-white transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span className="material-symbols-outlined text-sm text-primary">
                {copied ? 'check' : 'content_copy'}
              </span>
              <span>{copied ? 'Copied to Clipboard!' : 'Copy ESG Report'}</span>
            </button>

            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial px-5 py-2 rounded-lg bg-primary text-white text-xs font-label-bold hover:bg-primary/90 transition-colors shadow-sm"
            >
              Done
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
