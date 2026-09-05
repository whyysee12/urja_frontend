import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import { useCity } from '../context/CityContext';
import { publicApi } from '../api/publicApi';
import { Route, Stop, ChargingCenter, VehiclePublic } from '../types';
import { MapContainer, TileStyle } from '../components/map/MapContainer';
import { RoutePolyline } from '../components/map/RoutePolyline';
import { StopMarker } from '../components/map/StopMarker';
import { ChargingMarker } from '../components/map/ChargingMarker';
import { VehicleMarker } from '../components/map/VehicleMarker';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import {
  FALLBACK_JAIPUR_ROUTES,
  FALLBACK_JAIPUR_STOPS,
  FALLBACK_JAIPUR_CHARGING_CENTERS,
  FALLBACK_JAIPUR_VEHICLES,
  getRouteMeta,
  calculateRoutesBoundingBox
} from '../data/fallbackNetworkData';

type NetworkTab = 'corridors' | 'stops' | 'charging';
type CategoryFilter = 'all' | 'rapid' | 'express' | 'heritage' | 'airport' | 'industrial';

export const NetworkPage: React.FC = () => {
  const { selectedCity, activeCityObj, openCityModal, setSelectedCity, availableCities } = useCity();

  // Data states
  const [routes, setRoutes] = useState<Route[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [chargingStations, setChargingStations] = useState<ChargingCenter[]>([]);
  const [vehicles, setVehicles] = useState<VehiclePublic[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Active selection states
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);
  const [hoveredRouteId, setHoveredRouteId] = useState<string | null>(null);
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [selectedCharger, setSelectedCharger] = useState<ChargingCenter | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [activeTab, setActiveTab] = useState<NetworkTab>('corridors');

  // Layer toggles
  const [showCorridors, setShowCorridors] = useState<boolean>(true);
  const [showStops, setShowStops] = useState<boolean>(true);
  const [showChargers, setShowChargers] = useState<boolean>(true);
  const [showBuses, setShowBuses] = useState<boolean>(true);
  const [tileStyle, setTileStyle] = useState<TileStyle>('osm');

  // Map state
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [mapZoom, setMapZoom] = useState<number>(12);

  // City center coordinates
  const cityCenter: [number, number] = useMemo(() => {
    if (activeCityObj?.longitude && activeCityObj?.latitude) {
      return [activeCityObj.longitude, activeCityObj.latitude];
    }
    if (selectedCity?.toLowerCase() === 'jaipur') {
      return [75.7873, 26.9124];
    }
    return [73.3119, 28.0229];
  }, [activeCityObj, selectedCity]);

  // Fetch transit data for the selected city
  useEffect(() => {
    let isMounted = true;
    const fetchNetworkData = async () => {
      try {
        setLoading(true);
        setActiveRouteId(null);
        setSelectedStop(null);
        setSelectedCharger(null);

        const [rData, sData, cData, vData] = await Promise.all([
          publicApi.getRoutes(selectedCity).catch(() => []),
          publicApi.getStops(selectedCity).catch(() => []),
          publicApi.getChargingCenters({ city: selectedCity }).catch(() => []),
          publicApi.getVehicles({ city: selectedCity, vehicle_type: 'electric_bus' }).catch(() => []),
        ]);

        if (!isMounted) return;

        // Fallback integration if database returns empty or backend is slow
        let finalRoutes = (rData && rData.length > 0) ? rData : [];
        let finalStops = (sData && sData.length > 0) ? sData : [];
        let finalChargers = (cData && cData.length > 0) ? cData : [];
        let finalVehicles = (vData && vData.length > 0) ? vData : [];

        if (finalRoutes.length === 0) {
          const isJaipur = selectedCity.toLowerCase() === 'jaipur';
          if (isJaipur) {
            finalRoutes = FALLBACK_JAIPUR_ROUTES;
            finalStops = FALLBACK_JAIPUR_STOPS;
            finalChargers = FALLBACK_JAIPUR_CHARGING_CENTERS;
            finalVehicles = FALLBACK_JAIPUR_VEHICLES;
          } else {
            // Geographically offset fallback to selected city center
            const targetLng = activeCityObj?.longitude || cityCenter[0];
            const targetLat = activeCityObj?.latitude || cityCenter[1];
            const dLng = targetLng - 75.7873;
            const dLat = targetLat - 26.9124;

            finalRoutes = FALLBACK_JAIPUR_ROUTES.map(r => ({
              ...r,
              name: r.name.replace(/Jaipur/g, selectedCity),
              city: selectedCity,
              geometry: r.geometry ? {
                ...r.geometry,
                coordinates: ((r.geometry as any).coordinates || []).map((pt: [number, number]) => [pt[0] + dLng, pt[1] + dLat])
              } : undefined
            }));

            finalStops = FALLBACK_JAIPUR_STOPS.map(s => ({
              ...s,
              city: selectedCity,
              latitude: s.latitude + dLat,
              longitude: s.longitude + dLng
            }));

            finalChargers = (cData && cData.length > 0) ? cData : FALLBACK_JAIPUR_CHARGING_CENTERS.map(c => ({
              ...c,
              city: selectedCity,
              latitude: c.latitude + dLat,
              longitude: c.longitude + dLng
            }));

            finalVehicles = (vData && vData.length > 0) ? vData : FALLBACK_JAIPUR_VEHICLES.map(v => ({
              ...v,
              department_name: v.department_name.replace(/Jaipur/g, selectedCity),
              latitude: v.latitude + dLat,
              longitude: v.longitude + dLng
            }));
          }
        }

        setRoutes(finalRoutes);
        setStops(finalStops);
        setChargingStations(finalChargers);
        setVehicles(finalVehicles);
      } catch (err) {
        console.error('Failed to load transit network:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchNetworkData();

    return () => {
      isMounted = false;
    };
  }, [selectedCity]);

  // Live polling for moving electric buses on network corridors
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const vData = await publicApi.getVehicles({ city: selectedCity, vehicle_type: 'electric_bus' });
        if (vData && vData.length > 0) {
          setVehicles(vData);
        }
      } catch {
        // quiet error
      }
    }, 4000);

    return () => clearInterval(pollInterval);
  }, [selectedCity]);

  // Auto-fit network bounds whenever routes change and map is ready
  useEffect(() => {
    if (!map || routes.length === 0) return;
    const bounds = calculateRoutesBoundingBox(routes);
    if (bounds) {
      try {
        map.fitBounds(bounds, { padding: 60, duration: 1200, maxZoom: 13.5 });
      } catch (e) {
        map.flyTo({ center: cityCenter, zoom: 12 });
      }
    }
  }, [map, routes, cityCenter]);

  // Active route object
  const activeRoute = useMemo(() => {
    return routes.find((r) => r.id === activeRouteId) || null;
  }, [routes, activeRouteId]);

  // Filtered routes based on search & category
  const filteredRoutes = useMemo(() => {
    return routes.filter((r) => {
      const meta = getRouteMeta(r.code);
      const matchesCategory =
        selectedCategory === 'all' || meta.category === selectedCategory;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.name.toLowerCase().includes(q) ||
        (r.code && r.code.toLowerCase().includes(q)) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        (r.stops && r.stops.some((s) => s.name.toLowerCase().includes(q)));

      return matchesCategory && matchesSearch;
    });
  }, [routes, searchQuery, selectedCategory]);

  // Filtered stops
  const filteredStops = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return stops;
    return stops.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.code && s.code.toLowerCase().includes(q)) ||
        (s.address && s.address.toLowerCase().includes(q))
    );
  }, [stops, searchQuery]);

  // Filtered charging centers
  const filteredChargers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return chargingStations;
    return chargingStations.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.address && c.address.toLowerCase().includes(q))
    );
  }, [chargingStations, searchQuery]);

  // Map of stop ID to list of routes serving that stop (for transfer/interchange badge)
  const stopTransferMap = useMemo(() => {
    const mapObj: Record<string, Route[]> = {};
    for (const r of routes) {
      if (r.stops) {
        for (const s of r.stops) {
          if (!mapObj[s.name]) {
            mapObj[s.name] = [];
          }
          if (!mapObj[s.name].some((existing) => existing.id === r.id)) {
            mapObj[s.name].push(r);
          }
        }
      }
    }
    return mapObj;
  }, [routes]);

  // Total network track length calculation
  const totalNetworkKm = useMemo(() => {
    let km = 0;
    for (const r of routes) {
      const meta = getRouteMeta(r.code);
      km += meta.lengthKm;
    }
    return Math.round(km * 10) / 10;
  }, [routes]);

  // Zoom to a specific route
  const handleRouteSelect = (route: Route) => {
    if (activeRouteId === route.id) {
      setActiveRouteId(null);
      setSelectedStop(null);
      return;
    }

    setActiveRouteId(route.id);
    setSelectedStop(null);

    if (map) {
      const bounds = calculateRoutesBoundingBox([route]);
      if (bounds) {
        map.fitBounds(bounds, { padding: 80, duration: 1000 });
      } else if (route.geometry && (route.geometry as any).coordinates) {
        const coords = (route.geometry as any).coordinates;
        const mid = coords[Math.floor(coords.length / 2)];
        map.flyTo({ center: mid, zoom: 13, essential: true });
      }
    }
  };

  // Zoom to a specific stop
  const handleStopSelect = (stop: Stop) => {
    setSelectedStop(stop);
    if (map && stop.longitude && stop.latitude) {
      map.flyTo({
        center: [stop.longitude, stop.latitude],
        zoom: 15,
        essential: true,
      });
    }
  };

  // Zoom to a charging station
  const handleChargerSelect = (station: ChargingCenter) => {
    setSelectedCharger(station);
    if (map && station.longitude && station.latitude) {
      map.flyTo({
        center: [station.longitude, station.latitude],
        zoom: 15.5,
        essential: true,
      });
    }
  };

  // Reset to full network view
  const handleResetToEntireNetwork = () => {
    setActiveRouteId(null);
    setSelectedStop(null);
    setSelectedCharger(null);
    if (map && routes.length > 0) {
      const bounds = calculateRoutesBoundingBox(routes);
      if (bounds) {
        map.fitBounds(bounds, { padding: 50, duration: 1000 });
      } else {
        map.flyTo({ center: cityCenter, zoom: 12, essential: true });
      }
    }
  };

  // Active buses on the selected route
  const activeBusesOnSelectedRoute = useMemo(() => {
    if (!activeRoute) return [];
    return vehicles.filter(
      (v) =>
        v.route_id === activeRoute.id ||
        (v.route_code && activeRoute.code && v.route_code === activeRoute.code)
    );
  }, [vehicles, activeRoute]);

  // Stops associated with the selected route
  const activeRouteStops = useMemo(() => {
    if (!activeRoute) return [];
    if (activeRoute.stops && activeRoute.stops.length > 0) {
      return activeRoute.stops;
    }
    return [];
  }, [activeRoute]);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-background">
      {/* 1. Header & Dynamic Network KPI Bar */}
      <div className="bg-white border-b border-outline-variant shrink-0 z-20 shadow-xs">
        {/* Main Title Row */}
        <div className="px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-xs">
              <span className="material-symbols-outlined text-2xl">alt_route</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-headline-sm text-lg font-bold text-on-background tracking-tight">
                  {selectedCity} Clean Transit Network
                </h1>
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  100% Zero Emission
                </span>
              </div>
              <p className="text-xs text-on-surface-variant font-medium">
                Integrated Municipal EV Corridors • Passenger Interchanges • Fast Charging Grid
              </p>
            </div>
          </div>

          {/* Quick Actions & City Selector */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetToEntireNetwork}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition-colors border border-primary/20"
              title="Fit entire transit network on map"
            >
              <span className="material-symbols-outlined text-base">zoom_out_map</span>
              <span>Fit Entire Network</span>
            </button>

            {/* City Dropdown Switcher */}
            <div className="relative">
              <button
                onClick={openCityModal}
                className="flex items-center gap-2 bg-surface-container hover:bg-surface-container-high border border-outline-variant px-3 py-1.5 rounded-lg text-xs font-label-bold text-on-surface transition-all shadow-2xs"
              >
                <span className="material-symbols-outlined text-primary text-base">location_on</span>
                <span className="font-bold">{selectedCity}</span>
                <span className="text-[10px] bg-primary text-white px-1.5 py-0.2 rounded font-bold uppercase">
                  Switch
                </span>
                <span className="material-symbols-outlined text-sm text-on-surface-variant">expand_more</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic KPI Strip */}
        <div className="px-6 py-2 bg-surface-container-lowest grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs divide-x divide-outline-variant/40">
          <div className="flex items-center gap-2.5 pl-2 first:pl-0">
            <span className="material-symbols-outlined text-primary text-lg">route</span>
            <div>
              <p className="font-extrabold text-on-background text-sm leading-tight">
                {routes.length} Corridors
              </p>
              <p className="text-[10px] text-on-surface-variant">Active Electric Lines</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 pl-3">
            <span className="material-symbols-outlined text-blue-600 text-lg">straighten</span>
            <div>
              <p className="font-extrabold text-on-background text-sm leading-tight">
                {totalNetworkKm > 0 ? `${totalNetworkKm} km` : 'Active'}
              </p>
              <p className="text-[10px] text-on-surface-variant">Network Coverage</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 pl-3">
            <span className="material-symbols-outlined text-amber-600 text-lg">transfer_within_a_station</span>
            <div>
              <p className="font-extrabold text-on-background text-sm leading-tight">
                {stops.length} Stations
              </p>
              <p className="text-[10px] text-on-surface-variant">Passenger Stops</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 pl-3">
            <span className="material-symbols-outlined text-emerald-600 text-lg">directions_bus</span>
            <div>
              <p className="font-extrabold text-on-background text-sm leading-tight">
                {vehicles.length} E-Buses
              </p>
              <p className="text-[10px] text-on-surface-variant">Live On Fleet</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 pl-3">
            <span className="material-symbols-outlined text-violet-600 text-lg">ev_station</span>
            <div>
              <p className="font-extrabold text-on-background text-sm leading-tight">
                {chargingStations.length} DC Hubs
              </p>
              <p className="text-[10px] text-on-surface-variant">Transit Charging Grid</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Content Split: Left Navigation & Explorer + Right Map Canvas */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Side: Navigation & Inspector Panel */}
        <div className="w-full lg:w-[420px] bg-white border-r border-outline-variant flex flex-col shrink-0 h-[48vh] lg:h-full z-10 shadow-sm overflow-hidden">
          {/* Top Search & Filter Strip */}
          <div className="p-3 bg-white border-b border-outline-variant/80 space-y-2.5">
            {/* Search Input */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">
                search
              </span>
              <input
                type="text"
                placeholder={
                  activeTab === 'corridors'
                    ? 'Search corridor name, code, destination...'
                    : activeTab === 'stops'
                    ? 'Search passenger stop or interchange...'
                    : 'Search EV charging hub...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-surface-container rounded-lg text-xs font-medium border border-outline-variant/70 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-on-background placeholder:text-on-surface-variant/70"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-background"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center p-1 bg-surface-container rounded-lg text-xs font-semibold">
              <button
                onClick={() => {
                  setActiveTab('corridors');
                  setSelectedStop(null);
                  setSelectedCharger(null);
                }}
                className={`flex-1 py-1.5 px-2 rounded-md transition-all text-center flex items-center justify-center gap-1.5 ${
                  activeTab === 'corridors'
                    ? 'bg-white text-primary shadow-2xs font-bold'
                    : 'text-on-surface-variant hover:text-on-background'
                }`}
              >
                <span className="material-symbols-outlined text-sm">alt_route</span>
                <span>Lines ({routes.length})</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('stops');
                  setSelectedCharger(null);
                }}
                className={`flex-1 py-1.5 px-2 rounded-md transition-all text-center flex items-center justify-center gap-1.5 ${
                  activeTab === 'stops'
                    ? 'bg-white text-primary shadow-2xs font-bold'
                    : 'text-on-surface-variant hover:text-on-background'
                }`}
              >
                <span className="material-symbols-outlined text-sm">pin_drop</span>
                <span>Stops ({stops.length})</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('charging');
                  setSelectedStop(null);
                }}
                className={`flex-1 py-1.5 px-2 rounded-md transition-all text-center flex items-center justify-center gap-1.5 ${
                  activeTab === 'charging'
                    ? 'bg-white text-primary shadow-2xs font-bold'
                    : 'text-on-surface-variant hover:text-on-background'
                }`}
              >
                <span className="material-symbols-outlined text-sm">ev_station</span>
                <span>EV Hubs ({chargingStations.length})</span>
              </button>
            </div>

            {/* Category Filter Chips (Only on Corridors Tab) */}
            {activeTab === 'corridors' && !activeRoute && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[11px]">
                {[
                  { id: 'all', label: 'All Corridors' },
                  { id: 'rapid', label: 'Metro & Rapid' },
                  { id: 'heritage', label: 'Heritage' },
                  { id: 'airport', label: 'Airport Express' },
                  { id: 'express', label: 'Tech & Knowledge' },
                  { id: 'industrial', label: 'Workforce Shuttle' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id as CategoryFilter)}
                    className={`whitespace-nowrap px-2.5 py-1 rounded-full font-medium transition-colors ${
                      selectedCategory === cat.id
                        ? 'bg-primary text-white font-bold'
                        : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tab Content Body (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {loading ? (
              <div className="py-12">
                <LoadingSpinner message="Loading municipal transit topology..." />
              </div>
            ) : activeTab === 'corridors' ? (
              /* Corridors View */
              activeRoute ? (
                /* Selected Corridor Inspector */
                <div className="space-y-3">
                  {/* Back button & Route Banner */}
                  <div className="flex items-center justify-between pb-2 border-b border-outline-variant">
                    <button
                      onClick={() => setActiveRouteId(null)}
                      className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                    >
                      <span className="material-symbols-outlined text-sm">arrow_back</span>
                      <span>All Corridors</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleRouteSelect(activeRoute)}
                        className="px-2 py-1 rounded bg-surface-container hover:bg-surface-container-high text-[11px] font-semibold text-on-surface flex items-center gap-1"
                        title="Fit route to map"
                      >
                        <span className="material-symbols-outlined text-xs">filter_center_focus</span>
                        Fit Line
                      </button>
                      <button
                        onClick={() => setActiveRouteId(null)}
                        className="p-1 rounded hover:bg-surface-container text-on-surface-variant"
                        title="Deselect"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                  </div>

                  {/* Route Card Header */}
                  <div
                    className="p-3.5 rounded-xl border border-outline-variant bg-gradient-to-br from-white to-surface-container-lowest shadow-xs"
                    style={{ borderLeftWidth: 5, borderLeftColor: activeRoute.color || '#006A3B' }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-sm shadow-xs shrink-0"
                        style={{ backgroundColor: activeRoute.color || '#006A3B' }}
                      >
                        {activeRoute.code?.replace('JPR-', '').replace('BKN-', '') || 'BUS'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold text-primary tracking-wider bg-primary/10 px-2 py-0.5 rounded">
                            {getRouteMeta(activeRoute.code).categoryLabel}
                          </span>
                          <span className="text-[11px] text-on-surface-variant font-semibold">
                            {activeRoute.code}
                          </span>
                        </div>
                        <h2 className="font-headline-sm text-sm font-bold text-on-background mt-1 leading-snug">
                          {activeRoute.name}
                        </h2>
                        {activeRoute.description && (
                          <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                            {activeRoute.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Operational Specs Grid */}
                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-outline-variant/60 text-xs">
                      <div className="bg-surface-container/60 p-2 rounded-lg">
                        <p className="text-[10px] text-on-surface-variant font-semibold">Peak Frequency</p>
                        <p className="font-bold text-on-background text-xs">
                          {getRouteMeta(activeRoute.code).frequency}
                        </p>
                      </div>
                      <div className="bg-surface-container/60 p-2 rounded-lg">
                        <p className="text-[10px] text-on-surface-variant font-semibold">Operating Hours</p>
                        <p className="font-bold text-on-background text-xs">
                          {getRouteMeta(activeRoute.code).operatingHours}
                        </p>
                      </div>
                      <div className="bg-surface-container/60 p-2 rounded-lg">
                        <p className="text-[10px] text-on-surface-variant font-semibold">Fare Structure</p>
                        <p className="font-bold text-on-background text-xs">
                          {getRouteMeta(activeRoute.code).fareRange}
                        </p>
                      </div>
                      <div className="bg-surface-container/60 p-2 rounded-lg">
                        <p className="text-[10px] text-on-surface-variant font-semibold">Active Fleet</p>
                        <p className="font-bold text-emerald-700 text-xs flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          {activeBusesOnSelectedRoute.length} Live Buses
                        </p>
                      </div>
                    </div>

                    {/* Action button */}
                    <div className="mt-3 flex items-center gap-2">
                      <Link
                        to={`/where-is-my-bus?search=${activeRoute.code || ''}`}
                        className="flex-1 py-2 px-3 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                      >
                        <span className="material-symbols-outlined text-sm">directions_bus</span>
                        <span>Track Corridor in Live Bus Tracker</span>
                      </Link>
                    </div>
                  </div>

                  {/* Connected Stops Stepper Timeline */}
                  <div className="bg-white border border-outline-variant rounded-xl p-3.5 shadow-2xs">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-outline-variant/60">
                      <h3 className="text-xs font-bold text-on-background uppercase tracking-wider flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-primary text-base">pin_drop</span>
                        Corridor Stops ({activeRouteStops.length})
                      </h3>
                      <span className="text-[10px] text-on-surface-variant font-medium">Click stop to inspect</span>
                    </div>

                    {activeRouteStops.length === 0 ? (
                      <p className="text-xs text-on-surface-variant py-3 text-center">
                        Detailed intermediate stop coordinates are syncing with municipal GIS.
                      </p>
                    ) : (
                      <div className="space-y-0.5 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-outline-variant">
                        {activeRouteStops.map((stop, idx) => {
                          const isFirst = idx === 0;
                          const isLast = idx === activeRouteStops.length - 1;
                          const isSelected = selectedStop?.name === stop.name;
                          const transfers = (stopTransferMap[stop.name] || []).filter((r) => r.id !== activeRoute.id);

                          return (
                            <div
                              key={stop.id || `${stop.name}-${idx}`}
                              onClick={() => handleStopSelect(stop)}
                              className={`relative pl-8 py-2 rounded-lg transition-all cursor-pointer group ${
                                isSelected
                                  ? 'bg-primary/10 ring-1 ring-primary'
                                  : 'hover:bg-surface-container/60'
                              }`}
                            >
                              {/* Sequence circle */}
                              <div
                                className={`absolute left-1.5 top-2.5 w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-extrabold border-2 transition-all ${
                                  isFirst || isLast
                                    ? 'bg-primary text-white border-white ring-2 ring-primary shadow-xs'
                                    : isSelected
                                    ? 'bg-primary text-white border-white'
                                    : 'bg-white text-on-surface border-primary group-hover:bg-primary group-hover:text-white'
                                }`}
                              >
                                {idx + 1}
                              </div>

                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h4
                                    className={`text-xs font-bold ${
                                      isSelected ? 'text-primary' : 'text-on-background'
                                    }`}
                                  >
                                    {stop.name}
                                    {isFirst && (
                                      <span className="ml-1.5 text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                                        Origin
                                      </span>
                                    )}
                                    {isLast && (
                                      <span className="ml-1.5 text-[9px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded">
                                        Terminus
                                      </span>
                                    )}
                                  </h4>
                                  {stop.address && (
                                    <p className="text-[10px] text-on-surface-variant line-clamp-1 mt-0.5">
                                      {stop.address}
                                    </p>
                                  )}
                                </div>

                                {/* Interchange Badges */}
                                {transfers.length > 0 && (
                                  <div className="flex items-center gap-1 shrink-0">
                                    <span className="text-[9px] text-on-surface-variant font-bold">⇄</span>
                                    {transfers.slice(0, 2).map((tr) => (
                                      <span
                                        key={tr.id}
                                        className="text-[9px] font-black px-1.5 py-0.2 rounded text-white shadow-2xs"
                                        style={{ backgroundColor: tr.color || '#006A3B' }}
                                        title={`Transfer to ${tr.name}`}
                                      >
                                        {tr.code?.replace('JPR-', '').replace('BKN-', '')}
                                      </span>
                                    ))}
                                    {transfers.length > 2 && (
                                      <span className="text-[9px] font-bold bg-gray-200 text-gray-700 px-1 rounded">
                                        +{transfers.length - 2}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Active Electric Buses on this Corridor */}
                  {activeBusesOnSelectedRoute.length > 0 && (
                    <div className="bg-white border border-outline-variant rounded-xl p-3.5 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between pb-1.5 border-b border-outline-variant/60">
                        <h3 className="text-xs font-bold text-on-background uppercase tracking-wider flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-emerald-600 text-base">directions_bus</span>
                          Live Buses on Route ({activeBusesOnSelectedRoute.length})
                        </h3>
                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Active Telemetry
                        </span>
                      </div>

                      <div className="space-y-2 pt-1">
                        {activeBusesOnSelectedRoute.map((bus) => (
                          <div
                            key={bus.id}
                            onClick={() => {
                              if (map && bus.longitude && bus.latitude) {
                                map.flyTo({ center: [bus.longitude, bus.latitude], zoom: 15, essential: true });
                              }
                            }}
                            className="p-2.5 rounded-lg border border-outline-variant/60 bg-surface-container-lowest hover:border-primary/50 transition-all cursor-pointer flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                                EV
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-on-background">
                                  {bus.vehicle_code}
                                </h4>
                                <p className="text-[11px] text-on-surface-variant">
                                  Next: <span className="font-semibold">{bus.next_stop_name || 'Approaching'}</span>
                                  {bus.eta_next_stop_mins !== null && (
                                    <span className="text-primary font-bold ml-1">
                                      ({bus.eta_next_stop_mins}m)
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="text-xs font-bold text-on-background">
                                {bus.speed_kph || 0} km/h
                              </span>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-[10px] text-on-surface-variant font-semibold">SOC</span>
                                <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-500 rounded-full"
                                    style={{ width: `${bus.soc_pct || 80}%` }}
                                  ></div>
                                </div>
                                <span className="text-[10px] font-bold text-on-background">
                                  {bus.soc_pct}%
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Corridor Cards List */
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between pb-1 text-xs text-on-surface-variant font-semibold">
                    <span>Available Transit Corridors ({filteredRoutes.length})</span>
                    <span className="text-[11px] text-primary">Click to isolate & trace</span>
                  </div>

                  {filteredRoutes.length === 0 ? (
                    <EmptyState
                      icon="alt_route"
                      title="No corridors match criteria"
                      description="Try searching with a different keyword or switch to All Corridors."
                      actionLabel="Reset Filters"
                      onAction={() => {
                        setSearchQuery('');
                        setSelectedCategory('all');
                      }}
                    />
                  ) : (
                    filteredRoutes.map((route) => {
                      const meta = getRouteMeta(route.code);
                      const isHovered = hoveredRouteId === route.id;
                      const busesOnRoute = vehicles.filter(
                        (v) =>
                          v.route_id === route.id ||
                          (v.route_code && route.code && v.route_code === route.code)
                      );

                      return (
                        <div
                          key={route.id}
                          onClick={() => handleRouteSelect(route)}
                          onMouseEnter={() => setHoveredRouteId(route.id)}
                          onMouseLeave={() => setHoveredRouteId(null)}
                          className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer relative ${
                            isHovered
                              ? 'border-primary shadow-md bg-primary-container/5'
                              : 'border-outline-variant/80 bg-white hover:border-primary/50'
                          }`}
                          style={{
                            borderLeftWidth: 4,
                            borderLeftColor: route.color || '#006A3B',
                          }}
                        >
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-white text-xs shadow-xs shrink-0"
                                style={{ backgroundColor: route.color || '#006A3B' }}
                              >
                                {route.code?.replace('JPR-', '').replace('BKN-', '') || 'BUS'}
                              </div>

                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] font-bold uppercase text-primary bg-primary/10 px-2 py-0.2 rounded">
                                    {meta.categoryLabel}
                                  </span>
                                  <span className="text-[10px] text-on-surface-variant font-semibold">
                                    {meta.frequency}
                                  </span>
                                </div>
                                <h3 className="font-headline-sm text-sm font-bold text-on-background mt-0.5">
                                  {route.name}
                                </h3>
                              </div>
                            </div>

                            <Link
                              to={`/routes/${route.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 rounded-full hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors shrink-0"
                              title="Full route timetable & stop schedules"
                            >
                              <span className="material-symbols-outlined text-base">open_in_new</span>
                            </Link>
                          </div>

                          {route.description && (
                            <p className="text-[11px] text-on-surface-variant mt-2 line-clamp-2 leading-relaxed">
                              {route.description}
                            </p>
                          )}

                          {/* Footer specs row */}
                          <div className="mt-2.5 pt-2 border-t border-outline-variant/50 flex items-center justify-between text-[11px] text-on-surface-variant font-medium">
                            <div className="flex items-center gap-3">
                              <span>📍 {route.stops?.length || meta.lengthKm} Stops</span>
                              <span>📏 {meta.lengthKm} km</span>
                            </div>

                            <div className="flex items-center gap-1 text-emerald-700 font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              <span>{busesOnRoute.length > 0 ? `${busesOnRoute.length} Buses active` : 'Active Line'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )
            ) : activeTab === 'stops' ? (
              /* Stops & Interchanges View */
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-1 text-xs text-on-surface-variant font-semibold">
                  <span>Passenger Interchanges ({filteredStops.length})</span>
                  <span className="text-[11px] text-primary">Click to locate on map</span>
                </div>

                {filteredStops.length === 0 ? (
                  <EmptyState
                    icon="pin_drop"
                    title="No passenger stops found"
                    description="Try searching with a different station or area name."
                    actionLabel="Clear Search"
                    onAction={() => setSearchQuery('')}
                  />
                ) : (
                  filteredStops.map((stop, idx) => {
                    const serving = stopTransferMap[stop.name] || [];
                    const isInterchange = serving.length > 1;
                    const isSelected = selectedStop?.name === stop.name;

                    return (
                      <div
                        key={stop.id || `${stop.name}-${idx}`}
                        onClick={() => handleStopSelect(stop)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-primary bg-primary/10 ring-1 ring-primary shadow-xs'
                            : 'border-outline-variant/70 bg-white hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-on-background">
                                {stop.name}
                              </span>
                              {isInterchange && (
                                <span className="bg-amber-100 text-amber-800 text-[9px] font-extrabold px-1.5 py-0.2 rounded border border-amber-300">
                                  Interchange
                                </span>
                              )}
                            </div>
                            {stop.address && (
                              <p className="text-[10px] text-on-surface-variant line-clamp-1 mt-0.5">
                                {stop.address}
                              </p>
                            )}
                          </div>

                          <span className="material-symbols-outlined text-primary text-base shrink-0">
                            navigation
                          </span>
                        </div>

                        {/* Serving lines */}
                        {serving.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-outline-variant/40 flex items-center gap-1 flex-wrap">
                            <span className="text-[10px] text-on-surface-variant font-semibold">
                              Connected Lines:
                            </span>
                            {serving.map((r) => (
                              <span
                                key={r.id}
                                className="text-[10px] font-black px-1.5 py-0.2 rounded text-white shadow-2xs"
                                style={{ backgroundColor: r.color || '#006A3B' }}
                              >
                                {r.code?.replace('JPR-', '').replace('BKN-', '')}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              /* EV Charging Hubs View */
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-1 text-xs text-on-surface-variant font-semibold">
                  <span>Transit-Connected Fast Chargers ({filteredChargers.length})</span>
                  <span className="text-[11px] text-primary">Grid Integration</span>
                </div>

                {filteredChargers.length === 0 ? (
                  <EmptyState
                    icon="ev_station"
                    title="No charging hubs found"
                    description="Try searching with a different hub or area name."
                    actionLabel="Clear Search"
                    onAction={() => setSearchQuery('')}
                  />
                ) : (
                  filteredChargers.map((station) => {
                    const isSelected = selectedCharger?.id === station.id;
                    const isFast = (station.power_kw || 0) >= 50;

                    return (
                      <div
                        key={station.id}
                        onClick={() => handleChargerSelect(station)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-primary bg-primary/10 ring-1 ring-primary shadow-xs'
                            : 'border-outline-variant/70 bg-white hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 ${
                                isFast ? 'bg-secondary' : 'bg-primary'
                              }`}
                            >
                              <span className="material-symbols-outlined text-base">ev_station</span>
                            </div>
                            <div>
                              <h4 className="font-bold text-xs text-on-background">
                                {station.name}
                              </h4>
                              <p className="text-[10px] text-on-surface-variant line-clamp-1 mt-0.5">
                                {station.address}
                              </p>
                            </div>
                          </div>

                          <span className="bg-surface-container font-extrabold text-[10px] text-primary px-2 py-0.5 rounded-md border border-outline-variant shrink-0">
                            {station.power_kw ? `${station.power_kw} kW` : 'Fast DC'}
                          </span>
                        </div>

                        <div className="mt-2 pt-2 border-t border-outline-variant/40 flex items-center justify-between text-[10px] text-on-surface-variant">
                          <span>{station.operating_hours || '24/7 Available'}</span>
                          <span className="text-emerald-700 font-bold">● Operational</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Map Canvas */}
        <div className="flex-1 h-full relative">
          <MapContainer
            center={cityCenter}
            zoom={12}
            tileStyle={tileStyle}
            onMapLoaded={(m) => {
              setMap(m);
              m.on('zoomend', () => {
                setMapZoom(m.getZoom());
              });
            }}
            className="w-full h-full"
          >
            {/* 1. Render Polylines */}
            {showCorridors &&
              routes.map((r) => {
                const isSelected = activeRouteId === r.id;
                const isHovered = hoveredRouteId === r.id;
                // If a route is selected, isolate it with prominent stroke, dim others slightly
                const width = isSelected ? 7 : isHovered ? 6 : 4;
                const opacity = activeRouteId ? (isSelected ? 1.0 : 0.25) : 0.85;

                return (
                  <RoutePolyline
                    key={r.id}
                    map={map}
                    route={r}
                    color={r.color || '#006A3B'}
                    width={width}
                  />
                );
              })}

            {/* 2. Render Stops */}
            {showStops &&
              stops.map((s, idx) => (
                <StopMarker
                  key={s.id || `stop-${idx}`}
                  map={map}
                  stop={s}
                  sequence={idx + 1}
                  isSelected={selectedStop?.name === s.name}
                  mapZoom={mapZoom}
                  onClick={(clickedStop) => {
                    handleStopSelect(clickedStop);
                    setActiveTab('stops');
                  }}
                />
              ))}

            {/* 3. Render Charging Hubs */}
            {showChargers &&
              chargingStations.map((station) => (
                <ChargingMarker
                  key={station.id}
                  map={map}
                  station={station}
                  isSelected={selectedCharger?.id === station.id}
                  onClick={(clickedStation) => {
                    handleChargerSelect(clickedStation);
                    setActiveTab('charging');
                  }}
                />
              ))}

            {/* 4. Render Live Electric Buses */}
            {showBuses &&
              vehicles.map((v) => (
                <VehicleMarker
                  key={v.id}
                  map={map}
                  vehicle={v}
                  mapZoom={mapZoom}
                  isSelected={false}
                  onClick={(vObj) => {
                    if (vObj.route_code) {
                      const matched = routes.find((r) => r.code === vObj.route_code);
                      if (matched) handleRouteSelect(matched);
                    }
                  }}
                />
              ))}
          </MapContainer>

          {/* Floating Map Controls Bar (Top Right) */}
          <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
            {/* Map Style Switcher Pill */}
            <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-outline-variant p-1 flex items-center gap-1">
              {[
                { id: 'osm', label: 'Transit' },
                { id: 'carto_voyager', label: 'Voyager' },
                { id: 'carto_dark', label: 'Dark' },
                { id: 'satellite', label: 'Satellite' },
              ].map((style) => (
                <button
                  key={style.id}
                  onClick={() => setTileStyle(style.id as TileStyle)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                    tileStyle === style.id
                      ? 'bg-primary text-white shadow-2xs'
                      : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>

            {/* Layer Toggles Pill */}
            <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-outline-variant p-2 space-y-1.5 text-[11px] font-semibold text-on-surface">
              <p className="text-[10px] uppercase font-bold text-on-surface-variant pb-1 border-b border-outline-variant/50">
                Map Overlays
              </p>

              <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  Corridors
                </span>
                <input
                  type="checkbox"
                  checked={showCorridors}
                  onChange={(e) => setShowCorridors(e.target.checked)}
                  className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                />
              </label>

              <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  Stops ({stops.length})
                </span>
                <input
                  type="checkbox"
                  checked={showStops}
                  onChange={(e) => setShowStops(e.target.checked)}
                  className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                />
              </label>

              <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-violet-600"></span>
                  EV Hubs ({chargingStations.length})
                </span>
                <input
                  type="checkbox"
                  checked={showChargers}
                  onChange={(e) => setShowChargers(e.target.checked)}
                  className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                />
              </label>

              <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Live Buses ({vehicles.length})
                </span>
                <input
                  type="checkbox"
                  checked={showBuses}
                  onChange={(e) => setShowBuses(e.target.checked)}
                  className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                />
              </label>
            </div>
          </div>

          {/* Floating Stop Details Modal / Popup (When Stop Selected) */}
          {selectedStop && (
            <div className="absolute bottom-6 left-6 z-30 max-w-sm w-full bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-outline-variant p-4 animate-in fade-in slide-in-from-bottom-3 duration-200">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                    <span className="material-symbols-outlined text-lg">pin_drop</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-on-background">
                      {selectedStop.name}
                    </h3>
                    <p className="text-[10px] text-on-surface-variant font-semibold">
                      Station Code: {selectedStop.code || 'MUNICIPAL-STOP'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedStop(null)}
                  className="p-1 rounded-full hover:bg-surface-container text-on-surface-variant"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              {selectedStop.address && (
                <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">
                  {selectedStop.address}
                </p>
              )}

              {/* Connected Lines at this stop */}
              {stopTransferMap[selectedStop.name] && stopTransferMap[selectedStop.name].length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-outline-variant/60">
                  <p className="text-[10px] text-on-surface-variant font-bold uppercase mb-1.5">
                    Connecting Lines & Feeder:
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {stopTransferMap[selectedStop.name].map((line) => (
                      <button
                        key={line.id}
                        onClick={() => handleRouteSelect(line)}
                        className="text-[10px] font-extrabold px-2 py-1 rounded text-white shadow-2xs hover:opacity-90 flex items-center gap-1 transition-transform hover:scale-105"
                        style={{ backgroundColor: line.color || '#006A3B' }}
                      >
                        <span>{line.code?.replace('JPR-', '').replace('BKN-', '')}</span>
                        <span className="font-normal opacity-90 truncate max-w-[120px]">{line.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => {
                    const serving = stopTransferMap[selectedStop.name];
                    if (serving && serving.length > 0) {
                      handleRouteSelect(serving[0]);
                    }
                  }}
                  className="flex-1 py-1.5 bg-primary text-white text-xs font-bold rounded-lg text-center hover:bg-primary/90 transition-colors"
                >
                  Inspect Serving Route
                </button>
                <Link
                  to={`/where-is-my-bus?search=${selectedStop.name}`}
                  className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold rounded-lg transition-colors"
                >
                  Live Departures
                </Link>
              </div>
            </div>
          )}

          {/* Floating Charger Details Card (When Charger Selected) */}
          {selectedCharger && (
            <div className="absolute bottom-6 left-6 z-30 max-w-sm w-full bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-outline-variant p-4 animate-in fade-in slide-in-from-bottom-3 duration-200">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <span className="material-symbols-outlined text-lg">ev_station</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-on-background">
                      {selectedCharger.name}
                    </h3>
                    <p className="text-[10px] text-primary font-bold">
                      {selectedCharger.power_kw ? `${selectedCharger.power_kw} kW Ultra Fast DC` : 'High Speed EV'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedCharger(null)}
                  className="p-1 rounded-full hover:bg-surface-container text-on-surface-variant"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              {selectedCharger.address && (
                <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">
                  {selectedCharger.address}
                </p>
              )}

              <div className="mt-3 pt-2.5 border-t border-outline-variant/60 flex items-center justify-between text-xs">
                <span className="text-on-surface-variant">Hours: {selectedCharger.operating_hours || '24/7'}</span>
                <span className="text-emerald-700 font-bold">● Available for Commuters</span>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <Link
                  to={`/charging/${selectedCharger.id}`}
                  className="flex-1 py-1.5 bg-primary text-white text-xs font-bold rounded-lg text-center hover:bg-primary/90 transition-colors"
                >
                  Book / Navigate to Station
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
