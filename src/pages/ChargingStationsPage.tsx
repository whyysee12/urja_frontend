import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import { useCity } from '../context/CityContext';
import { publicApi } from '../api/publicApi';
import { ChargingCenter } from '../types';
import { MapContainer, TileStyle } from '../components/map/MapContainer';
import { MapControls } from '../components/map/MapControls';
import { MapStyleSwitcher } from '../components/map/MapStyleSwitcher';
import { ChargingCard } from '../components/cards/ChargingCard';
import { ChargingMarker } from '../components/map/ChargingMarker';
import { Badge } from '../components/common/Badge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { formatStationStatus } from '../utils/formatters';

const CONNECTOR_TYPES = [
  'All',
  'CCS2',
  'Type 2',
  'CHAdeMO',
  'GB/T',
  'Bharat DC',
  'Bharat AC',
];

export const ChargingStationsPage: React.FC = () => {
  const { selectedCity, activeCityObj, openCityModal } = useCity();

  const [stations, setStations] = useState<ChargingCenter[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedConnector, setSelectedConnector] = useState<string>('All');
  const [fastOnly, setFastOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'power' | 'name' | 'status'>('power');
  const [selectedStation, setSelectedStation] = useState<ChargingCenter | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [tileStyle, setTileStyle] = useState<TileStyle>('osm');
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');

  // Load charging centers whenever selected city changes
  useEffect(() => {
    let isCancelled = false;
    const fetchStations = async () => {
      try {
        setLoading(true);
        const data = await publicApi.getChargingCenters({ city: selectedCity, limit: 100 });
        if (!isCancelled) {
          setStations(data);
          setSelectedStation(null);
        }
      } catch (err) {
        console.error('Failed to load charging centers:', err);
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };
    fetchStations();

    return () => {
      isCancelled = true;
    };
  }, [selectedCity]);

  // Compute city center coordinates
  const cityCenter: [number, number] = useMemo(() => {
    if (activeCityObj?.longitude && activeCityObj?.latitude) {
      return [activeCityObj.longitude, activeCityObj.latitude];
    }
    const cityMap: Record<string, [number, number]> = {
      jaipur: [75.7873, 26.9124],
      bikaner: [73.3119, 28.0229],
      jodhpur: [73.0243, 26.2389],
      udaipur: [73.7125, 24.5854],
      delhi: [77.1025, 28.7041],
    };
    return cityMap[selectedCity.toLowerCase()] || [75.7873, 26.9124];
  }, [selectedCity, activeCityObj]);

  // Re-center map when city changes
  useEffect(() => {
    if (map && cityCenter) {
      map.flyTo({
        center: cityCenter,
        zoom: 12,
        essential: true,
      });
    }
  }, [map, cityCenter]);

  // Filter and sort stations
  const filteredStations = useMemo(() => {
    const list = stations.filter((st) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = q
        ? st.name.toLowerCase().includes(q) ||
          (st.address || '').toLowerCase().includes(q) ||
          (st.description || '').toLowerCase().includes(q)
        : true;

      const matchesStatus =
        statusFilter === 'all'
          ? true
          : (st.status || '').toLowerCase() === statusFilter.toLowerCase();

      const matchesFast = !fastOnly || (st.power_kw || 0) >= 50;

      const matchesConnector =
        selectedConnector === 'All'
          ? true
          : st.connectors
          ? Object.entries(st.connectors).some(
              ([k, v]) =>
                k !== 'fast_dc' &&
                typeof v !== 'boolean' &&
                (k.toLowerCase().includes(selectedConnector.toLowerCase()) ||
                  selectedConnector.toLowerCase().includes(k.toLowerCase()))
            )
          : true;

      return matchesSearch && matchesStatus && matchesFast && matchesConnector;
    });

    // Sorting
    return list.sort((a, b) => {
      if (sortBy === 'power') {
        return (b.power_kw || 0) - (a.power_kw || 0);
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'status') {
        return (a.status || '').localeCompare(b.status || '');
      }
      return 0;
    });
  }, [stations, searchQuery, statusFilter, fastOnly, selectedConnector, sortBy]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (statusFilter !== 'all') count++;
    if (selectedConnector !== 'All') count++;
    if (fastOnly) count++;
    return count;
  }, [searchQuery, statusFilter, selectedConnector, fastOnly]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSelectedConnector('All');
    setFastOnly(false);
    setSortBy('power');
  };

  const handleSelectStation = (station: ChargingCenter) => {
    setSelectedStation(station);
    if (map && station.longitude && station.latitude) {
      map.flyTo({
        center: [station.longitude, station.latitude],
        zoom: 15,
        essential: true,
      });
    }
  };

  // Fit all stations in map view
  const handleFitAllStations = () => {
    if (!map || filteredStations.length === 0) return;

    const bounds = new maplibregl.LngLatBounds();
    filteredStations.forEach((s) => {
      if (s.longitude && s.latitude) {
        bounds.extend([s.longitude, s.latitude]);
      }
    });

    map.fitBounds(bounds, {
      padding: { top: 60, bottom: 80, left: 40, right: 40 },
      maxZoom: 15,
      duration: 1000,
    });
  };

  const toggleMobileView = () => {
    setMobileView((prev) => {
      const next = prev === 'list' ? 'map' : 'list';
      if (next === 'map') {
        setTimeout(() => {
          map?.resize();
        }, 150);
      }
      return next;
    });
  };

  const selectedAmenities = (selectedStation?.amenities || {}) as Record<string, any>;
  const selectedImageUrl = typeof selectedAmenities.image_url === 'string' ? selectedAmenities.image_url : null;
  const selectedPricing = selectedAmenities.pricing_inr_kwh != null ? Number(selectedAmenities.pricing_inr_kwh) : null;
  const selectedStatusInfo = selectedStation ? formatStationStatus(selectedStation.status) : null;

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-background">
      {/* ================= TOP FILTER BAR ================= */}
      <div className="bg-white border-b border-outline-variant px-4 py-2.5 shrink-0 flex flex-wrap items-center justify-between gap-2.5 z-20 shadow-xs">
        {/* Left: Clean Search Input */}
        <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-sm">
          <div className="relative w-full flex items-center">
            <span className="material-symbols-outlined absolute left-3 text-outline text-lg pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search stations in ${selectedCity}...`}
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg pl-9 pr-8 py-1.5 text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 p-1 text-outline hover:text-on-surface rounded-full transition-colors"
                title="Clear search"
              >
                <span className="material-symbols-outlined text-sm leading-none">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Right: City, Status, Fast DC, and Connectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-surface-container-low border border-outline-variant rounded-lg text-xs font-semibold px-2.5 py-1.5 text-on-surface focus:outline-none focus:border-primary"
          >
            <option value="all">All Statuses</option>
            <option value="operational">🟢 Operational</option>
            <option value="limited">🟡 Limited</option>
            <option value="offline">🔴 Offline</option>
          </select>

          {/* Fast DC Toggle */}
          <button
            onClick={() => setFastOnly((prev) => !prev)}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors shadow-xs ${
              fastOnly
                ? 'bg-primary text-white border-primary shadow-xs'
                : 'bg-surface-container-low border-outline-variant text-on-surface hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-sm leading-none">bolt</span>
            <span>Fast DC (&gt;50kW)</span>
          </button>

          {/* City Button */}
          <button
            onClick={openCityModal}
            className="flex items-center gap-1 bg-surface-container-low hover:bg-surface-container border border-outline-variant px-3 py-1.5 rounded-lg text-xs font-bold text-primary transition-colors shadow-xs"
            title="Switch City"
          >
            <span className="material-symbols-outlined text-sm leading-none text-primary">location_on</span>
            <span>{selectedCity}</span>
            <span className="material-symbols-outlined text-xs leading-none text-outline">expand_more</span>
          </button>

          {/* Reset Filters (when active) */}
          {activeFiltersCount > 0 && (
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-xs font-bold text-error bg-error/10 hover:bg-error/20 px-2.5 py-1.5 rounded-lg transition-colors"
              title="Reset all filters"
            >
              <span className="material-symbols-outlined text-sm leading-none">close</span>
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Connector Pills Sub-Bar */}
      <div className="bg-surface-container-lowest border-b border-outline-variant/60 px-4 py-1.5 flex items-center justify-between gap-2 shrink-0 z-10">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-[10px] font-bold text-outline uppercase tracking-wider shrink-0 mr-1">
            Connectors:
          </span>
          {CONNECTOR_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedConnector(type)}
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold transition-colors shrink-0 ${
                selectedConnector === type
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-surface-container-low border border-outline-variant/70 text-on-surface hover:bg-surface-container'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-1 text-xs text-outline shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-transparent text-xs font-bold text-on-surface border-none focus:outline-none cursor-pointer"
          >
            <option value="power">⚡ High Power</option>
            <option value="name">🔤 Name (A-Z)</option>
            <option value="status">🟢 Status</option>
          </select>
        </div>
      </div>

      {/* ================= MAIN SPLIT: CARDS LIST + MAP ================= */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Side: Station Cards List */}
        <div
          className={`w-full lg:w-[380px] xl:w-[410px] bg-white border-r border-outline-variant flex flex-col shrink-0 h-72 lg:h-full min-h-0 z-10 shadow-sm overflow-hidden ${
            mobileView === 'list' ? 'flex flex-col flex-1' : 'hidden lg:flex lg:flex-col'
          }`}
        >
          {/* Header */}
          <div className="px-4 py-2.5 border-b border-outline-variant/60 bg-surface-container-low flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="font-headline-sm text-xs sm:text-sm font-bold text-on-background">
                Verified Stations ({filteredStations.length})
              </h2>
            </div>
            <button
              onClick={handleFitAllStations}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5"
            >
              <span className="material-symbols-outlined text-sm">zoom_out_map</span>
              <span>Fit Map</span>
            </button>
          </div>

          {/* Cards Scroll Container */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0 pb-20 lg:pb-4">
            {loading ? (
              <div className="py-16">
                <LoadingSpinner message={`Locating charging stations in ${selectedCity}...`} />
              </div>
            ) : filteredStations.length === 0 ? (
              <EmptyState
                icon="ev_station"
                title="No Stations Found"
                description={`No public charging stations match your filters in ${selectedCity}.`}
                actionLabel="Clear Filters"
                onAction={handleResetFilters}
              />
            ) : (
              filteredStations.map((station) => (
                <ChargingCard
                  key={station.id}
                  station={station}
                  isSelected={selectedStation?.id === station.id}
                  onSelect={() => handleSelectStation(station)}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Side: Map Canvas */}
        <div
          className={`flex-1 h-full min-h-0 relative ${
            mobileView === 'map' ? 'flex w-full h-full' : 'hidden lg:flex'
          }`}
        >
          <MapContainer
            center={cityCenter}
            zoom={12}
            tileStyle={tileStyle}
            onMapLoaded={(m) => setMap(m)}
            className="w-full h-full"
          >
            {/* Custom SVG Teardrop Pins */}
            {map &&
              filteredStations.map((st) => (
                <ChargingMarker
                  key={st.id}
                  map={map}
                  station={st}
                  isSelected={selectedStation?.id === st.id}
                  onClick={() => handleSelectStation(st)}
                />
              ))}
          </MapContainer>

          {/* Map Controls */}
          <MapStyleSwitcher activeStyle={tileStyle} onStyleChange={setTileStyle} />
          <MapControls
            map={map}
            onResetView={() => {
              if (map) {
                map.flyTo({ center: cityCenter, zoom: 12, essential: true });
              }
            }}
          />

          {/* Selected Station Floating Bottom Card */}
          {selectedStation && (
            <div className="absolute bottom-6 left-4 right-4 sm:right-auto sm:w-[380px] bg-white rounded-xl shadow-xl border border-outline-variant p-4 z-30 animate-in slide-in-from-bottom duration-200">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant={
                        selectedStation.status === 'operational'
                          ? 'success'
                          : selectedStation.status === 'limited'
                          ? 'warning'
                          : 'error'
                      }
                      size="sm"
                      dot
                    >
                      {selectedStatusInfo?.label || selectedStation.status.toUpperCase()}
                    </Badge>
                    {selectedStation.power_kw && (
                      <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                        {selectedStation.power_kw} kW Fast DC
                      </span>
                    )}
                  </div>
                  <h4 className="font-headline-sm text-sm font-bold text-on-background line-clamp-1">
                    {selectedStation.name}
                  </h4>
                  <p className="text-xs text-on-surface-variant line-clamp-1 mt-0.5">
                    {selectedStation.address || `${selectedStation.city}, ${selectedStation.state}`}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedStation(null)}
                  className="p-1 text-outline hover:text-on-background rounded-full hover:bg-surface-container transition-colors shrink-0"
                  title="Close Preview"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>

              {/* Tariff & Hours */}
              <div className="flex items-center justify-between text-xs text-on-surface-variant my-2.5 pt-2 border-t border-outline-variant/40">
                <span>{selectedStation.operating_hours || '24/7 Open'}</span>
                {selectedPricing != null && (
                  <span className="font-bold text-primary">₹{selectedPricing.toFixed(1)}/kWh</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-outline-variant/40">
                <Link
                  to={`/charging/${selectedStation.id}`}
                  className="flex-1 text-center py-1.5 bg-surface-container hover:bg-surface-container-high rounded text-xs font-bold text-on-surface transition-colors"
                >
                  Station Details
                </Link>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selectedStation.latitude},${selectedStation.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center py-1.5 bg-primary hover:bg-on-primary-fixed-variant rounded text-xs font-bold text-white transition-colors flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">directions</span>
                  <span>Directions</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Mobile Toggle Button */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 lg:hidden">
        <button
          onClick={toggleMobileView}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-white font-bold text-xs shadow-xl border-2 border-white/40"
        >
          <span className="material-symbols-outlined text-base">
            {mobileView === 'list' ? 'map' : 'format_list_bulleted'}
          </span>
          <span>{mobileView === 'list' ? 'View Map' : 'View List'}</span>
          <span className="bg-white/20 px-1.5 py-0.2 rounded-full font-bold">
            {filteredStations.length}
          </span>
        </button>
      </div>
    </div>
  );
};

export default ChargingStationsPage;
