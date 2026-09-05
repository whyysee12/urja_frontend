/**
 * CO2 & Environmental Impact Calculation Engine
 * 
 * Based on authentic standards from:
 * 1. Central Electricity Authority (CEA) of India - CO2 Baseline Database for the Indian Power Sector (Ver. 20.0)
 *    - National Weighted Average Grid Emission Factor: ~0.727 kg CO2 / kWh
 *    - Northern Regional / Rajasthan Grid Emission Factor: ~0.780 kg CO2 / kWh
 * 2. IPCC Guidelines for National Greenhouse Gas Inventories & NITI Aayog (e-AMRIT portal):
 *    - Diesel Fuel Emission Factor: ~2.68 kg CO2 / Liter of diesel burned
 *    - Standard 9m-12m City Diesel Bus Efficiency: ~3.5 km / Liter -> ~1.35 kg CO2 / km
 *    - Electric City Bus Energy Consumption: ~1.15 kWh / km
 *    - Light Commercial EV / Ambulance Baseline: ~0.20 kg CO2 / km, EV consumption: ~0.20 kWh / km
 * 3. US EPA & Indian Council of Forestry Research:
 *    - Mature Urban Tree Absorption: ~21.77 kg CO2 / tree / year (~0.0596 kg CO2 / day)
 */

export interface EmissionCoefficients {
  gridEmissionFactorKgPerKwh: number; // CEA Baseline
  dieselEmissionFactorKgPerLiter: number;
  dieselBusKmPerLiter: number;
  dieselBusTailpipeKgPerKm: number;
  dieselLightTailpipeKgPerKm: number;
  evBusKwhPerKm: number;
  evLightKwhPerKm: number;
  treeAbsorptionKgPerYear: number;
  dieselPriceInrPerLiter: number;
  pm25GramsPerDieselBusKm: number;
  noxGramsPerDieselBusKm: number;
}

export const DEFAULT_EMISSION_COEFFICIENTS: EmissionCoefficients = {
  gridEmissionFactorKgPerKwh: 0.727, // CEA India weighted average
  dieselEmissionFactorKgPerLiter: 2.68,
  dieselBusKmPerLiter: 3.5,
  dieselBusTailpipeKgPerKm: 1.35,
  dieselLightTailpipeKgPerKm: 0.20,
  evBusKwhPerKm: 1.15,
  evLightKwhPerKm: 0.20,
  treeAbsorptionKgPerYear: 21.77,
  dieselPriceInrPerLiter: 90.0,
  pm25GramsPerDieselBusKm: 0.28,
  noxGramsPerDieselBusKm: 8.5,
};

export interface FleetSegmentData {
  type: string;
  name: string;
  count: number;
  avgDailyKmPerUnit: number;
  evConsumptionKwhPerKm: number;
  baselineDieselKgPerKm: number;
}

export interface ImpactMetrics {
  totalDistanceKm: number;
  baselineDieselEmissionsKg: number;
  evGridEmissionsKg: number;
  netCo2AvoidedKg: number;
  netCo2AvoidedTons: number;
  dieselLitersSaved: number;
  fuelCostSavingsInr: number;
  treesEquivalent: number;
  pm25AvoidedKg: number;
  noxAvoidedKg: number;
}

/**
 * Calculate net CO2 avoided and environmental impact metrics
 */
export function calculateImpactMetrics(
  totalKm: number,
  vehicleType: string = 'electric_bus',
  solarSharePct: number = 25, // Depot solar generation offset %
  customCoeffs: Partial<EmissionCoefficients> = {}
): ImpactMetrics {
  const coeffs = { ...DEFAULT_EMISSION_COEFFICIENTS, ...customCoeffs };
  
  const isBus = vehicleType === 'electric_bus';
  const baselineKgPerKm = isBus ? coeffs.dieselBusTailpipeKgPerKm : coeffs.dieselLightTailpipeKgPerKm;
  const evKwhPerKm = isBus ? coeffs.evBusKwhPerKm : coeffs.evLightKwhPerKm;
  
  // Baseline ICE Emissions (kg CO2)
  const baselineDieselEmissionsKg = totalKm * baselineKgPerKm;
  
  // EV Grid Emissions accounting for depot renewable/solar share (kg CO2)
  const effectiveGridFactor = coeffs.gridEmissionFactorKgPerKwh * (1 - Math.max(0, Math.min(100, solarSharePct)) / 100);
  const evGridEmissionsKg = totalKm * evKwhPerKm * effectiveGridFactor;
  
  // Net CO2 avoided (kg and Tons)
  const netCo2AvoidedKg = Math.max(0, baselineDieselEmissionsKg - evGridEmissionsKg);
  const netCo2AvoidedTons = netCo2AvoidedKg / 1000;
  
  // Diesel liters saved
  const dieselLitersSaved = isBus 
    ? totalKm / coeffs.dieselBusKmPerLiter 
    : totalKm / 14.0; // Light vehicle ~14 km/L
    
  const fuelCostSavingsInr = dieselLitersSaved * coeffs.dieselPriceInrPerLiter;
  
  // Trees planted equivalent
  const treesEquivalent = netCo2AvoidedKg / coeffs.treeAbsorptionKgPerYear;
  
  // Toxic air criteria pollutants avoided
  const pm25AvoidedKg = (totalKm * (isBus ? coeffs.pm25GramsPerDieselBusKm : 0.05)) / 1000;
  const noxAvoidedKg = (totalKm * (isBus ? coeffs.noxGramsPerDieselBusKm : 1.2)) / 1000;
  
  return {
    totalDistanceKm: roundTo(totalKm, 1),
    baselineDieselEmissionsKg: roundTo(baselineDieselEmissionsKg, 2),
    evGridEmissionsKg: roundTo(evGridEmissionsKg, 2),
    netCo2AvoidedKg: roundTo(netCo2AvoidedKg, 2),
    netCo2AvoidedTons: roundTo(netCo2AvoidedTons, 3),
    dieselLitersSaved: roundTo(dieselLitersSaved, 1),
    fuelCostSavingsInr: Math.round(fuelCostSavingsInr),
    treesEquivalent: Math.round(treesEquivalent),
    pm25AvoidedKg: roundTo(pm25AvoidedKg, 2),
    noxAvoidedKg: roundTo(noxAvoidedKg, 2),
  };
}

/**
 * Calculate multi-segment municipal fleet cumulative impact
 */
export function calculateMunicipalFleetImpact(
  segments: FleetSegmentData[],
  operatingDays: number = 365,
  solarSharePct: number = 25,
  coeffs: Partial<EmissionCoefficients> = {}
): ImpactMetrics {
  let totalKm = 0;
  let totalBaselineEmissions = 0;
  let totalEvEmissions = 0;
  let totalDieselLiters = 0;
  
  const c = { ...DEFAULT_EMISSION_COEFFICIENTS, ...coeffs };
  const effectiveGridFactor = c.gridEmissionFactorKgPerKwh * (1 - solarSharePct / 100);

  for (const seg of segments) {
    const segKm = seg.count * seg.avgDailyKmPerUnit * operatingDays;
    totalKm += segKm;
    totalBaselineEmissions += segKm * seg.baselineDieselKgPerKm;
    totalEvEmissions += segKm * seg.evConsumptionKwhPerKm * effectiveGridFactor;
    totalDieselLiters += seg.type === 'electric_bus' ? segKm / c.dieselBusKmPerLiter : segKm / 14.0;
  }

  const netCo2AvoidedKg = Math.max(0, totalBaselineEmissions - totalEvEmissions);
  const netCo2AvoidedTons = netCo2AvoidedKg / 1000;
  const fuelCostSavingsInr = totalDieselLiters * c.dieselPriceInrPerLiter;
  const treesEquivalent = netCo2AvoidedKg / c.treeAbsorptionKgPerYear;
  const pm25AvoidedKg = (totalKm * c.pm25GramsPerDieselBusKm * 0.8) / 1000;
  const noxAvoidedKg = (totalKm * c.noxGramsPerDieselBusKm * 0.8) / 1000;

  return {
    totalDistanceKm: roundTo(totalKm, 1),
    baselineDieselEmissionsKg: roundTo(totalBaselineEmissions, 2),
    evGridEmissionsKg: roundTo(totalEvEmissions, 2),
    netCo2AvoidedKg: roundTo(netCo2AvoidedKg, 2),
    netCo2AvoidedTons: roundTo(netCo2AvoidedTons, 3),
    dieselLitersSaved: roundTo(totalDieselLiters, 1),
    fuelCostSavingsInr: Math.round(fuelCostSavingsInr),
    treesEquivalent: Math.round(treesEquivalent),
    pm25AvoidedKg: roundTo(pm25AvoidedKg, 2),
    noxAvoidedKg: roundTo(noxAvoidedKg, 2),
  };
}

/**
 * Real-time incremental offset calculation per tick
 * When active vehicles are driving at speed_kph over intervalSeconds
 */
export function calculateLiveTickIncrementKg(
  activeVehicles: Array<{ speed_kph?: number | null; vehicle_type?: string }>,
  intervalSeconds: number = 2,
  solarSharePct: number = 25
): number {
  if (!activeVehicles || activeVehicles.length === 0) {
    return 0.006 * (intervalSeconds / 2);
  }

  let totalIncrementKg = 0;
  const c = DEFAULT_EMISSION_COEFFICIENTS;
  const effectiveGridFactor = c.gridEmissionFactorKgPerKwh * (1 - solarSharePct / 100);

  for (const v of activeVehicles) {
    const speed = v.speed_kph && v.speed_kph > 0 ? v.speed_kph : 28; // Default ~28 km/h city bus speed
    const distKm = (speed / 3600) * intervalSeconds;
    const isBus = v.vehicle_type === 'electric_bus' || !v.vehicle_type;

    const baselineKg = distKm * (isBus ? c.dieselBusTailpipeKgPerKm : c.dieselLightTailpipeKgPerKm);
    const evKg = distKm * (isBus ? c.evBusKwhPerKm : c.evLightKwhPerKm) * effectiveGridFactor;
    const netSavedKg = Math.max(0, baselineKg - evKg);
    totalIncrementKg += netSavedKg;
  }

  return totalIncrementKg;
}

function roundTo(val: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}
