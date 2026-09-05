import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import { useCity } from '../context/CityContext';
import { publicApi } from '../api/publicApi';
import { VehiclePublic, Route, Stop } from '../types';
import { MapContainer, TileStyle } from '../components/map/MapContainer';
import { VehicleMarker } from '../components/map/VehicleMarker';
import { StopMarker } from '../components/map/StopMarker';
import { RoutePolyline } from '../components/map/RoutePolyline';
import { VehicleTrailPolyline } from '../components/map/VehicleTrailPolyline';
import { WalkingFootprintPolyline } from '../components/map/WalkingFootprintPolyline';
import { MapControls } from '../components/map/MapControls';
import { MapStyleSwitcher } from '../components/map/MapStyleSwitcher';
import { BusCard } from '../components/cards/BusCard';
import { SearchBar } from '../components/common/SearchBar';
import { Badge } from '../components/common/Badge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { haversineDistanceKm } from '../utils/polylineUtils';
import { formatRelativeTime } from '../utils/formatters';

// Realistic fallback stops if API returns empty for Bikaner/Rajasthan
const FALLBACK_BIKANER_STOPS: Stop[] = [
  { id: 'bch-01', name: 'Beechwal RIICO Hub', code: 'BCH-01', latitude: 28.0812, longitude: 73.3754, city: 'Bikaner', state: 'Rajasthan', is_active: true },
  { id: 'ecb-02', name: 'Engineering College Gate', code: 'ECB-02', latitude: 28.0720, longitude: 73.3610, city: 'Bikaner', state: 'Rajasthan', is_active: true },
  { id: 'lgs-03', name: 'Lalgarh Palace & Station', code: 'LGS-03', latitude: 28.0415, longitude: 73.3295, city: 'Bikaner', state: 'Rajasthan', is_active: true },
  { id: 'amb-04', name: 'Ambedkar Circle', code: 'AMB-04', latitude: 28.0260, longitude: 73.3220, city: 'Bikaner', state: 'Rajasthan', is_active: true },
  { id: 'jng-05', name: 'Junagarh Fort Main Gate', code: 'JNG-05', latitude: 28.0229, longitude: 73.3180, city: 'Bikaner', state: 'Rajasthan', is_active: true },
  { id: 'bkn-rly', name: 'Bikaner Junction Railway Station', code: 'BKN-RLY', latitude: 28.0190, longitude: 73.3150, city: 'Bikaner', state: 'Rajasthan', is_active: true },
  { id: 'ktg-06', name: 'KEM Road & Kotgate', code: 'KTG-06', latitude: 28.0160, longitude: 73.3130, city: 'Bikaner', state: 'Rajasthan', is_active: true },
  { id: 'pbm-07', name: 'PBM Hospital Main Gate', code: 'PBM-07', latitude: 28.0125, longitude: 73.3250, city: 'Bikaner', state: 'Rajasthan', is_active: true },
  { id: 'rnb-08', name: 'Rani Bazar Overbridge', code: 'RNB-08', latitude: 28.0090, longitude: 73.3190, city: 'Bikaner', state: 'Rajasthan', is_active: true },
  { id: 'tls-09', name: 'Tulsi Circle', code: 'TLS-09', latitude: 28.0150, longitude: 73.3320, city: 'Bikaner', state: 'Rajasthan', is_active: true },
  { id: 'kkc-10', name: 'Kanta Khaturia Colony', code: 'KKC-10', latitude: 28.0080, longitude: 73.3380, city: 'Bikaner', state: 'Rajasthan', is_active: true },
  { id: 'jnv-11', name: 'JNV Colony Sector 3', code: 'JNV-11', latitude: 28.0020, longitude: 73.3450, city: 'Bikaner', state: 'Rajasthan', is_active: true },
  { id: 'krn-12', name: 'Karni Nagar Stadium', code: 'KRN-12', latitude: 28.0280, longitude: 73.3550, city: 'Bikaner', state: 'Rajasthan', is_active: true },
  { id: 'gsh-13', name: 'Ganga Shahar Bus Stand', code: 'GSH-13', latitude: 27.9860, longitude: 73.3010, city: 'Bikaner', state: 'Rajasthan', is_active: true },
  { id: 'bhn-14', name: 'Bhinasar Circle', code: 'BHN-14', latitude: 27.9750, longitude: 73.2950, city: 'Bikaner', state: 'Rajasthan', is_active: true },
];

export const WhereIsMyBusPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const { selectedCity, activeCityObj } = useCity();

  const [vehicles, setVehicles] = useState<VehiclePublic[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch);
  const [sidebarSearch, setSidebarSearch] = useState<string>('');
  const [filterTab, setFilterTab] = useState<'all' | 'live' | 'nearest' | 'battery'>('all');
  
  const [selectedVehicle, setSelectedVehicle] = useState<VehiclePublic | null>(null);
  const [selectedVehicleRoute, setSelectedVehicleRoute] = useState<Route | null>(null);
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [mapZoom, setMapZoom] = useState<number>(13.5);

  // Live Simulation Controller State (Starts in Paused State as Requested)
  const [simRunning, setSimRunning] = useState<boolean>(false);
  const [simLoading, setSimLoading] = useState<boolean>(false);

  useEffect(() => {
    publicApi
      .getSimulationStatus()
      .then((d) => {
        if (d && typeof d.is_running === 'boolean') {
          setSimRunning(d.is_running);
        }
      })
      .catch(() => {});
  }, []);

  const toggleSimulation = async () => {
    try {
      setSimLoading(true);
      const data = await publicApi.toggleSimulation();
      setSimRunning(data.is_running);
      // Immediately refresh vehicles so they snap to their timetable position
      const vData = await publicApi.getVehicles({ city: selectedCity });
      if (Array.isArray(vData) && vData.length > 0) {
        setVehicles(vData);
      }
    } catch (err) {
      console.error('Failed to toggle simulation:', err);
    } finally {
      setSimLoading(false);
    }
  };

  // Map Tile Style
  const [tileStyle, setTileStyle] = useState<TileStyle>('osm');

  // Layout View Mode (Split vs Fullscreen)
  const [viewLayout, setViewLayout] = useState<'split' | 'fullscreen'>('split');

  // User Geolocation for "Near Me" & Walking Footprints
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isTrackingUser, setIsTrackingUser] = useState<boolean>(false);
  const [userLocationNote, setUserLocationNote] = useState<string | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Selected Bus Live Camera Follow Tracking
  const [isTrackingBus, setIsTrackingBus] = useState<boolean>(false);
  const isTrackingBusRef = useRef<boolean>(false);

  // WebSocket Connection States
  const [wsStatus, setWsStatus] = useState<'live' | 'reconnecting' | 'polling'>('polling');
  const [reconnectCount, setReconnectCount] = useState<number>(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const reconnectDelayRef = useRef<number>(1000);
  const maxReconnectDelay = 30000;

  // Initial Data Fetch (Vehicles, Routes, and Stops)
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [vData, rData, sData] = await Promise.all([
          publicApi.getVehicles({ city: selectedCity }),
          publicApi.getRoutes(selectedCity),
          publicApi.getStops(selectedCity).catch(() => []),
        ]);
        if (isMounted) {
          setVehicles(vData);
          setRoutes(rData);
          if (Array.isArray(sData) && sData.length > 0) {
            setStops(sData);
          } else {
            // Use fallback stops matched to Bikaner center
            setStops(FALLBACK_BIKANER_STOPS);
          }
        }
      } catch (err) {
        console.error('Failed to load buses/routes/stops:', err);
        if (isMounted) {
          setStops(FALLBACK_BIKANER_STOPS);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, [selectedCity]);

  // Fetch route geometry for selected vehicle
  useEffect(() => {
    if (!selectedVehicle?.route_id) {
      setSelectedVehicleRoute(null);
      return;
    }

    const matchedRoute = routes.find((r) => r.id === selectedVehicle.route_id);
    if (matchedRoute?.geometry) {
      setSelectedVehicleRoute(matchedRoute);
    } else {
      publicApi
        .getRouteById(selectedVehicle.route_id)
        .then((r) => setSelectedVehicleRoute(r))
        .catch(() => setSelectedVehicleRoute(matchedRoute || null));
    }
  }, [selectedVehicle, routes]);

  // WebSocket Connection with Exponential Backoff
  useEffect(() => {
    let isCancelled = false;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const isLocalhost =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
       window.location.hostname === '127.0.0.1' ||
       window.location.hostname === '0.0.0.0');

    const defaultWsBase = isLocalhost
      ? `${protocol}//${host}`
      : 'wss://urja-backend-1.onrender.com';

    const wsBase = import.meta.env.VITE_WS_URL || defaultWsBase;
    const wsParams = new URLSearchParams();
    if (selectedCity) wsParams.set('city', selectedCity);
    if (selectedRouteId !== 'all') wsParams.set('route_id', selectedRouteId);
    const wsQuery = wsParams.toString() ? `?${wsParams.toString()}` : '';
    const wsUrl = `${wsBase}/ws/public/vehicles${wsQuery}`;

    function connect() {
      if (isCancelled) return;
      try {
        const socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          if (isCancelled) {
            socket.close();
            return;
          }
          setWsStatus('live');
          setReconnectCount(0);
          reconnectDelayRef.current = 1000;
        };

        socket.onmessage = (event) => {
          try {
            const liveList: VehiclePublic[] = JSON.parse(event.data);
            if (Array.isArray(liveList)) {
              setVehicles(liveList);
              setSelectedVehicle((prev) => {
                if (!prev) return null;
                const updated = liveList.find((v) => v.id === prev.id);
                if (!updated) return prev;
                if (isTrackingBusRef.current && map && updated.longitude && updated.latitude) {
                  map.easeTo({
                    center: [updated.longitude, updated.latitude],
                    duration: 1200,
                    essential: true,
                  });
                }
                return updated;
              });
            }
          } catch (e) {
            console.error('WS Parse Error:', e);
          }
        };

        socket.onerror = () => {
          socket.close();
        };

        socket.onclose = () => {
          if (isCancelled) return;
          setWsStatus('reconnecting');
          setReconnectCount((prev) => prev + 1);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectDelayRef.current);

          reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, maxReconnectDelay);
        };
      } catch (e) {
        setWsStatus('polling');
      }
    }

    connect();

    // Fallback polling interval
    const pollingInterval = setInterval(async () => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        try {
          const vData = await publicApi.getVehicles({
            city: selectedCity,
            route_id: selectedRouteId !== 'all' ? selectedRouteId : undefined,
          });
          setVehicles(vData);
          setSelectedVehicle((prev) => {
            if (!prev) return null;
            const updated = vData.find((v) => v.id === prev.id);
            if (!updated) return prev;
            if (isTrackingBusRef.current && map && updated.longitude && updated.latitude) {
              map.easeTo({
                center: [updated.longitude, updated.latitude],
                duration: 1200,
                essential: true,
              });
            }
            return updated;
          });
        } catch (e) {
          // ignore
        }
      }
    }, 2500);

    return () => {
      isCancelled = true;
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      clearInterval(pollingInterval);
    };
  }, [selectedCity, selectedRouteId]);

  // Cleanup user GPS watch
  const stopUserLocationTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation?.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTrackingUser(false);
  };

  useEffect(() => {
    return () => {
      stopUserLocationTracking();
    };
  }, []);

  // Handle User Geolocation / Near Me (Google Maps Commuter Mode)
  const handleNearMe = () => {
    // If already active, toggle off
    if (userLocation || isTrackingUser) {
      stopUserLocationTracking();
      setUserLocation(null);
      setUserLocationNote(null);
      return;
    }

    setIsLocating(true);
    // Bikaner Junction Railway Station (Central Transit Interchange)
    const BIKANER_HUB_COORDS: [number, number] = [73.3150, 28.0190];

    if (!navigator.geolocation) {
      setIsLocating(false);
      setUserLocation(BIKANER_HUB_COORDS);
      setUserLocationNote('Browser geolocation not supported. Located at central Bikaner Junction Station.');
      if (map) map.flyTo({ center: BIKANER_HUB_COORDS, zoom: 15, duration: 1500 });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const uLat = pos.coords.latitude;
        const uLng = pos.coords.longitude;
        const distFromCity = haversineDistanceKm(cityCenter[1], cityCenter[0], uLat, uLng);

        if (distFromCity > 50) {
          // User is outside Bikaner (e.g. remote testing or IP geolocation)
          setUserLocation(BIKANER_HUB_COORDS);
          setUserLocationNote(
            `You are ~${Math.round(distFromCity)} km from Bikaner. Location placed at Bikaner Junction Railway Station so you can see live bus arrivals & walking routes.`
          );
          if (map) {
            map.flyTo({ center: BIKANER_HUB_COORDS, zoom: 15, duration: 1500 });
          }
        } else {
          // User is genuinely in Bikaner! Start continuous live tracking
          const coords: [number, number] = [uLng, uLat];
          setUserLocation(coords);
          setUserLocationNote('Live GPS tracking active in Bikaner.');
          setIsTrackingUser(true);
          if (map) {
            map.flyTo({ center: coords, zoom: 15.5, duration: 1500 });
          }

          watchIdRef.current = navigator.geolocation.watchPosition(
            (livePos) => {
              const liveCoords: [number, number] = [livePos.coords.longitude, livePos.coords.latitude];
              setUserLocation(liveCoords);
            },
            () => {},
            { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
          );
        }
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation fallback to Bikaner central hub:', err.message);
        setUserLocation(BIKANER_HUB_COORDS);
        setUserLocationNote('Location permission unavailable. Centered at Bikaner Junction Railway Station.');
        if (map) {
          map.flyTo({ center: BIKANER_HUB_COORDS, zoom: 15, duration: 1500 });
        }
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Google Maps Style Pulsing Commuter Location Marker
  useEffect(() => {
    if (!map || !userLocation) {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      return;
    }

    if (!userMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'relative flex items-center justify-center pointer-events-auto cursor-pointer';
      el.title = 'Your Location (Commuter)';
      el.innerHTML = `
        <!-- Pulsing radar wave -->
        <div class="absolute -inset-4 rounded-full bg-blue-500/25 commuter-radar-ring pointer-events-none"></div>
        <!-- Google Maps Blue Accuracy Disc -->
        <div class="w-8 h-8 rounded-full bg-blue-600 border-[3px] border-white shadow-xl flex items-center justify-center text-white">
          <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>
        <!-- Tooltip -->
        <div class="absolute -bottom-6 bg-blue-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow border border-white/80 whitespace-nowrap">
          You are here
        </div>
      `;
      userMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat(userLocation)
        .addTo(map);
    } else {
      userMarkerRef.current.setLngLat(userLocation);
    }

    return () => {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
    };
  }, [map, userLocation]);

  // Determine Nearest Bus Stop & Walking Route Info
  const nearestStopInfo = useMemo(() => {
    if (!userLocation || stops.length === 0) return null;
    const [uLng, uLat] = userLocation;
    let closest: Stop | null = null;
    let minDistanceKm = Infinity;

    // Use stops from selected route if chosen, otherwise all city stops
    const candidateStops = selectedVehicleRoute?.stops?.length
      ? selectedVehicleRoute.stops
      : stops;

    for (const stop of candidateStops) {
      if (stop.latitude != null && stop.longitude != null) {
        const dist = haversineDistanceKm(uLat, uLng, stop.latitude, stop.longitude);
        if (dist < minDistanceKm) {
          minDistanceKm = dist;
          closest = stop;
        }
      }
    }

    if (!closest) return null;
    const distanceMeters = Math.round(minDistanceKm * 1000);
    // Typical walking speed: 80 meters per minute (~4.8 km/h)
    const walkingMinutes = Math.max(1, Math.ceil(distanceMeters / 80));

    // Find the nearest active bus approaching this stop
    let nearestBus: VehiclePublic | null = null;
    let nearestBusDist = Infinity;
    for (const v of vehicles) {
      if (v.status === 'online' && v.latitude != null && v.longitude != null) {
        const d = haversineDistanceKm(closest.latitude, closest.longitude, v.latitude, v.longitude);
        if (d < nearestBusDist) {
          nearestBusDist = d;
          nearestBus = v;
        }
      }
    }

    return {
      stop: closest,
      distanceMeters,
      walkingMinutes,
      nearestBus,
      busDistanceKm: nearestBusDist !== Infinity ? nearestBusDist : null,
    };
  }, [userLocation, stops, selectedVehicleRoute, vehicles]);

  // Determine commuter's active transit route when "Near Me" is engaged
  const commuterActiveRoute = useMemo(() => {
    if (!userLocation || !nearestStopInfo?.stop) return null;
    if (nearestStopInfo.nearestBus?.route_id) {
      const r = routes.find((rt) => rt.id === nearestStopInfo.nearestBus!.route_id);
      if (r) return r;
    }
    const r = routes.find((rt) =>
      rt.stops?.some((s) => s.id === nearestStopInfo.stop.id || s.name === nearestStopInfo.stop.name)
    );
    return r || null;
  }, [userLocation, nearestStopInfo, routes]);

  const cityCenter: [number, number] =
    activeCityObj?.longitude && activeCityObj?.latitude
      ? [activeCityObj.longitude, activeCityObj.latitude]
      : [73.3119, 28.0229];

  // Filter and sort vehicles with instant sidebar search and tab filters
  const filteredVehicles = useMemo(() => {
    let list = vehicles.filter((v) => {
      const matchesRoute =
        selectedRouteId === 'all' || v.route_id === selectedRouteId;
      
      const query = (sidebarSearch || searchQuery).trim().toLowerCase();
      const matchesSearch = query
        ? (v.vehicle_code || '').toLowerCase().includes(query) ||
          (v.route_name || '').toLowerCase().includes(query) ||
          (v.route_code || '').toLowerCase().includes(query) ||
          (v.department_name || '').toLowerCase().includes(query)
        : true;

      // Keep buses within reasonable transit boundary of the active city (~120 km)
      // unless user explicitly filtered to a specific route
      let isInCityArea = true;
      if (selectedRouteId === 'all' && v.latitude != null && v.longitude != null) {
        const distFromCity = haversineDistanceKm(cityCenter[1], cityCenter[0], v.latitude, v.longitude);
        isInCityArea = distFromCity <= 120;
      }

      return matchesRoute && matchesSearch && isInCityArea;
    });

    // Apply quick tab filter
    if (filterTab === 'live') {
      list = list.filter((v) => v.status === 'online');
    } else if (filterTab === 'battery') {
      list = list.filter((v) => (v.soc_pct ?? 0) >= 50);
    }

    type VehicleWithDistance = VehiclePublic & { _distanceKm?: number };
    let listWithDist: VehicleWithDistance[] = list;

    // Distance computation if user location is available
    if (userLocation) {
      const [uLng, uLat] = userLocation;
      listWithDist = list.map((v) => {
        let dist = Infinity;
        if (v.latitude != null && v.longitude != null) {
          dist = haversineDistanceKm(uLat, uLng, v.latitude, v.longitude);
        }
        return { ...v, _distanceKm: dist };
      });

      if (filterTab === 'nearest') {
        listWithDist.sort((a, b) => (a._distanceKm || 0) - (b._distanceKm || 0));
      }
    }

    return listWithDist;
  }, [vehicles, selectedRouteId, searchQuery, sidebarSearch, filterTab, userLocation, cityCenter]);

  const onlineCount = vehicles.filter((v) => v.status === 'online').length;
  const offlineCount = vehicles.length - onlineCount;

  const toggleTrackBus = () => {
    const next = !isTrackingBus;
    setIsTrackingBus(next);
    isTrackingBusRef.current = next;
    if (next && map && selectedVehicle?.longitude && selectedVehicle?.latitude) {
      map.flyTo({
        center: [selectedVehicle.longitude, selectedVehicle.latitude],
        zoom: 16,
        duration: 1200,
        essential: true,
      });
    }
  };

  const handleSelectVehicle = (vehicle: VehiclePublic) => {
    if (selectedVehicle?.id === vehicle.id) {
      setSelectedVehicle(null);
      setIsTrackingBus(false);
      isTrackingBusRef.current = false;
    } else {
      setSelectedVehicle(vehicle);
      setIsTrackingBus(true);
      isTrackingBusRef.current = true;
      setSelectedStop(null);
      if (map && vehicle.longitude && vehicle.latitude) {
        map.flyTo({
          center: [vehicle.longitude, vehicle.latitude],
          zoom: 16,
          duration: 1200,
          essential: true,
        });
      }
    }
  };

  const handleSelectStop = (stop: Stop) => {
    setSelectedStop(stop);
    setSelectedVehicle(null);
    if (map && stop.longitude && stop.latitude) {
      map.flyTo({
        center: [stop.longitude, stop.latitude],
        zoom: 15.5,
        essential: true,
      });
    }
  };

  const selectedRouteObj = routes.find((r) => r.id === selectedRouteId);

  // Display stops: if a route is selected, show its stops; otherwise show all city stops
  const displayStops = useMemo(() => {
    if (selectedVehicleRoute?.stops && selectedVehicleRoute.stops.length > 0) {
      return selectedVehicleRoute.stops;
    }
    return stops;
  }, [selectedVehicleRoute, stops]);

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-background">
      {/* Top Filter Bar */}
      <div className="bg-white border-b border-outline-variant px-4 py-2.5 shrink-0 flex flex-wrap items-center justify-between gap-3 z-20">
        <div className="flex items-center gap-3 flex-1 min-w-[220px] max-w-sm">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={`Search ${selectedCity} electric buses...`}
            className="w-full"
          />
        </div>

        {/* Route Selector & Fleet Counts */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Online/Offline Fleet Badge */}
          <div className="inline-flex items-center gap-2 bg-surface-container-low border border-outline-variant px-3 py-1.5 rounded-lg text-xs font-label-bold">
            <span className="text-primary flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              {onlineCount} Online
            </span>
            <span className="text-outline">·</span>
            <span className="text-outline flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-outline inline-block" />
              {offlineCount} Idle
            </span>
          </div>

          {/* Near Me Action with Google Maps Walking Directions Trigger */}
          <button
            onClick={handleNearMe}
            disabled={isLocating}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-label-bold border transition-all shadow-xs ${
              userLocation
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-400/40'
                : 'bg-surface-container-low border-outline-variant text-on-surface hover:bg-surface-container'
            }`}
            title={userLocation ? 'Click to disable location tracking' : 'Locate me & track nearest bus stop in real time'}
          >
            <span className={`material-symbols-outlined text-sm ${userLocation ? 'animate-pulse' : ''}`}>
              {isLocating ? 'hourglass_top' : userLocation ? 'my_location' : 'near_me'}
            </span>
            <span>
              {isLocating
                ? 'Locating...'
                : userLocation
                ? isTrackingUser
                  ? 'Tracking GPS (Live)'
                  : 'Near Me (Active)'
                : 'Near Me'}
            </span>
          </button>

          {/* Route Selector Dropdown */}
          <select
            value={selectedRouteId}
            onChange={(e) => setSelectedRouteId(e.target.value)}
            className="bg-surface-container-low border border-outline-variant rounded-lg text-xs font-semibold px-3 py-1.5 text-on-surface focus:outline-none focus:border-primary"
          >
            <option value="all">All Routes ({routes.length})</option>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.code} - {r.name}
              </option>
            ))}
          </select>

          {/* Fullscreen View Toggle */}
          <button
            onClick={() => setViewLayout((prev) => (prev === 'split' ? 'fullscreen' : 'split'))}
            className={`p-1.5 rounded-lg border border-outline-variant transition-colors flex items-center justify-center ${
              viewLayout === 'fullscreen'
                ? 'bg-primary text-white border-primary'
                : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
            }`}
            title={viewLayout === 'fullscreen' ? 'Show Buses Sidebar' : 'Full-Screen Map View'}
          >
            <span className="material-symbols-outlined text-base">
              {viewLayout === 'fullscreen' ? 'view_sidebar' : 'fullscreen'}
            </span>
          </button>

          {/* Live Status Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 bg-surface-container-low px-2.5 py-1.5 rounded-lg border border-outline-variant/60">
            {wsStatus === 'live' ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
                  Live
                </span>
              </>
            ) : wsStatus === 'reconnecting' ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                  Reconnecting
                </span>
              </>
            ) : (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-error" />
                <span className="text-[11px] font-bold text-error uppercase tracking-wider">
                  HTTP Stream
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Subheader Banner: Transit Lines & Simulation Controller */}
      <div className="bg-white border-b border-outline-variant/60 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0 z-10 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full">
          <span className="text-[11px] font-bold text-outline uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
            <span className="material-symbols-outlined text-sm text-primary">alt_route</span>
            Lines:
          </span>
          <button
            onClick={() => setSelectedRouteId('all')}
            className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all shrink-0 ${
              selectedRouteId === 'all'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-container-low border border-outline-variant text-on-surface hover:bg-surface-container'
            }`}
          >
            All Corridors ({routes.length})
          </button>
          {routes.map((r) => {
            const isSel = selectedRouteId === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setSelectedRouteId(r.id)}
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 border ${
                  isSel
                    ? 'text-white shadow-sm'
                    : 'bg-surface-container-low text-on-surface border-outline-variant hover:bg-surface-container'
                }`}
                style={isSel ? { backgroundColor: r.color || '#006A3B', borderColor: r.color || '#006A3B' } : {}}
              >
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ backgroundColor: isSel ? '#ffffff' : (r.color || '#006A3B') }}
                />
                <span>{r.code}</span>
              </button>
            );
          })}
        </div>

        {/* Live Simulation Stream Status & Toggle */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-full text-[11px] font-semibold text-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Simulated Fleet ({vehicles.filter(v => v.status === 'online').length} Buses Moving Live)</span>
          </div>

          <button
            onClick={toggleSimulation}
            disabled={simLoading}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors flex items-center gap-1 shadow-2xs ${
              simRunning
                ? 'bg-white border-amber-300 text-amber-800 hover:bg-amber-50'
                : 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700'
            }`}
            title="Toggle Live Bus Simulation Engine"
          >
            <span className="material-symbols-outlined text-xs">
              {simRunning ? 'pause' : 'play_arrow'}
            </span>
            <span>{simRunning ? 'Pause Sim' : 'Resume Sim'}</span>
          </button>
        </div>
      </div>

      {/* Main Container: Buses List Panel + Interactive Map Canvas */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Side Panel: Buses List with Integrated Search & Dedicated Scrollbar */}
        {viewLayout === 'split' && (
          <div className="w-full lg:w-[380px] xl:w-[410px] bg-white border-r border-outline-variant flex flex-col shrink-0 h-72 lg:h-full min-h-0 z-10 shadow-sm overflow-hidden animate-in slide-in-from-left duration-200">
            {/* Panel Header & Dedicated Search Bar */}
            <div className="p-3 border-b border-outline-variant/60 bg-surface-container-low flex flex-col gap-2.5 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">directions_bus</span>
                  <h2 className="font-headline-sm text-sm font-bold text-on-background">
                    Active E-Buses
                  </h2>
                  <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                    {filteredVehicles.length} of {vehicles.length}
                  </span>
                </div>
                <span className="text-[11px] text-outline font-medium">
                  {selectedCity} Transit
                </span>
              </div>

              {/* Dedicated Search Input Inside Bus Panel */}
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-2.5 text-outline text-lg pointer-events-none">
                  search
                </span>
                <input
                  type="text"
                  value={sidebarSearch}
                  onChange={(e) => setSidebarSearch(e.target.value)}
                  placeholder="Filter bus code, route, stop..."
                  className="w-full bg-white border border-outline-variant rounded-lg pl-8 pr-7 py-1.5 text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-xs"
                />
                {sidebarSearch && (
                  <button
                    type="button"
                    onClick={() => setSidebarSearch('')}
                    className="absolute right-2 text-outline hover:text-on-surface p-0.5"
                    title="Clear filter"
                  >
                    <span className="material-symbols-outlined text-sm block">close</span>
                  </button>
                )}
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-[11px]">
                <button
                  onClick={() => setFilterTab('all')}
                  className={`px-2.5 py-1 rounded-full font-bold transition-colors whitespace-nowrap ${
                    filterTab === 'all'
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-white text-on-surface-variant border border-outline-variant/70 hover:bg-surface-container'
                  }`}
                >
                  All ({vehicles.length})
                </button>
                <button
                  onClick={() => setFilterTab('live')}
                  className={`px-2.5 py-1 rounded-full font-bold transition-colors whitespace-nowrap flex items-center gap-1 ${
                    filterTab === 'live'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-white text-on-surface-variant border border-outline-variant/70 hover:bg-surface-container'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                  Live ({onlineCount})
                </button>
                {userLocation && (
                  <button
                    onClick={() => setFilterTab('nearest')}
                    className={`px-2.5 py-1 rounded-full font-bold transition-colors whitespace-nowrap flex items-center gap-1 ${
                      filterTab === 'nearest'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-blue-700 border border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xs">near_me</span>
                    Nearest
                  </button>
                )}
                <button
                  onClick={() => setFilterTab('battery')}
                  className={`px-2.5 py-1 rounded-full font-bold transition-colors whitespace-nowrap flex items-center gap-1 ${
                    filterTab === 'battery'
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-white text-on-surface-variant border border-outline-variant/70 hover:bg-surface-container'
                  }`}
                >
                  <span className="material-symbols-outlined text-xs">bolt</span>
                  SOC &gt; 50%
                </button>
              </div>
            </div>

            {/* Scrollable Buses List with Smooth Custom Scrollbar */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5 bus-sidebar-scroll">
              {loading ? (
                <LoadingSpinner message="Locating electric buses on the city grid..." />
              ) : filteredVehicles.length === 0 ? (
                <EmptyState
                  icon="directions_bus_filled"
                  title="No Buses Found"
                  description={
                    sidebarSearch || searchQuery
                      ? `No buses match your filter. Clear search to see all active fleet.`
                      : 'No active buses on this route currently.'
                  }
                  actionLabel="Clear Filters"
                  onAction={() => {
                    setSidebarSearch('');
                    setSearchQuery('');
                    setFilterTab('all');
                    setSelectedRouteId('all');
                  }}
                />
              ) : (
                filteredVehicles.map((vehicle: any) => (
                  <div key={vehicle.id} className="relative">
                    <BusCard
                      vehicle={vehicle}
                      isSelected={selectedVehicle?.id === vehicle.id}
                      walkingDistanceKm={vehicle._distanceKm}
                      onSelect={() => handleSelectVehicle(vehicle)}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Right Interactive Map Canvas */}
        <div className="flex-1 min-h-0 h-full relative">
          <MapContainer
            center={cityCenter}
            zoom={13.5}
            tileStyle={tileStyle}
            onMapLoaded={(m) => {
              setMap(m);
              setMapZoom(m.getZoom());
              m.on('zoom', () => setMapZoom(m.getZoom()));
            }}
            className="w-full h-full"
          >
            {/* Render Route Polyline with Google Maps style casing */}
            {selectedRouteId === 'all' && !selectedVehicle && !commuterActiveRoute && (
              routes.map((r) => (
                <RoutePolyline
                  key={r.id}
                  map={map}
                  route={r}
                  color={r.color || '#006A3B'}
                  width={5}
                />
              ))
            )}
            {selectedRouteObj && !selectedVehicle && !commuterActiveRoute && (
              <RoutePolyline
                map={map}
                route={selectedRouteObj}
                color={selectedRouteObj.color || '#006A3B'}
                width={6}
              />
            )}

            {/* Google Maps Blue Route Line on the road for the commuter's transit corridor (Never disappears on zoom) */}
            {userLocation && commuterActiveRoute && !selectedVehicle && (
              <RoutePolyline
                key={`commuter-route-${commuterActiveRoute.id}`}
                map={map}
                route={commuterActiveRoute}
                color="#1A73E8"
                width={7}
              />
            )}

            {/* Render Selected Vehicle Trail Polyline */}
            {selectedVehicle && (
              <VehicleTrailPolyline
                map={map}
                vehicle={selectedVehicle}
                route={selectedVehicleRoute}
              />
            )}

            {/* Google Maps Walking Footprint Trail from User to Nearest Bus Stop */}
            {userLocation && nearestStopInfo?.stop && (
              <WalkingFootprintPolyline
                map={map}
                userLocation={userLocation}
                targetStop={nearestStopInfo.stop}
                distanceMeters={nearestStopInfo.distanceMeters}
                walkingMinutes={nearestStopInfo.walkingMinutes}
                mapZoom={mapZoom}
              />
            )}

            {/* Render All Transit Stops as Custom Google Maps Bus Stop SVGs */}
            {displayStops.map((stop, idx) => (
              <StopMarker
                key={stop.id}
                map={map}
                stop={stop}
                sequence={selectedVehicleRoute?.stops ? idx + 1 : undefined}
                isSelected={selectedStop?.id === stop.id}
                isNearestPickup={nearestStopInfo?.stop?.id === stop.id}
                walkingMinutes={nearestStopInfo?.stop?.id === stop.id ? nearestStopInfo.walkingMinutes : undefined}
                distanceMeters={nearestStopInfo?.stop?.id === stop.id ? nearestStopInfo.distanceMeters : undefined}
                mapZoom={mapZoom}
                onClick={handleSelectStop}
              />
            ))}

            {/* Render Vehicle Markers with Custom Electric Bus SVGs and Direction Arrows */}
            {filteredVehicles.map((vehicle) => (
              <VehicleMarker
                key={vehicle.id}
                map={map}
                vehicle={vehicle}
                isSelected={selectedVehicle?.id === vehicle.id}
                mapZoom={mapZoom}
                onClick={handleSelectVehicle}
              />
            ))}
          </MapContainer>

          {/* Map Tile Style Switcher */}
          <MapStyleSwitcher activeStyle={tileStyle} onStyleChange={setTileStyle} />

          {/* Map Controls (Locate & Reset) */}
          <MapControls
            map={map}
            onLocateMe={handleNearMe}
            onResetView={() => {
              if (map) {
                map.flyTo({ center: cityCenter, zoom: 13.5, essential: true });
              }
            }}
          />

          {/* Google Maps Transit Pickup Guidance HUD - Docked Top-Left (leaves top-right zoom controls free) */}
          {userLocation && nearestStopInfo && (
            <div className="absolute top-4 left-4 z-20 sm:w-88 max-w-[calc(100%-2rem)] bg-white/95 backdrop-blur-md border border-blue-200 rounded-2xl shadow-xl p-3.5 animate-in slide-in-from-top duration-300">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 shadow-inner">
                    <span className="material-symbols-outlined text-lg font-bold">directions_walk</span>
                  </div>
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700">
                      Nearest Pickup Stop
                    </div>
                    <div className="font-bold text-sm text-gray-900 leading-tight">
                      {nearestStopInfo.stop.name}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setUserLocation(null)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                  title="Dismiss walking guidance"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>

              <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="font-bold text-blue-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                  {nearestStopInfo.walkingMinutes} min walk ({nearestStopInfo.distanceMeters} m)
                </span>
                {nearestStopInfo.nearestBus && (
                  <span className="text-[11px] text-gray-600 font-medium">
                    Catch <span className="font-bold text-primary">{nearestStopInfo.nearestBus.vehicle_code}</span>
                  </span>
                )}
              </div>

              {commuterActiveRoute && (
                <div className="mt-2 flex items-center justify-between gap-1.5 bg-blue-50/90 border border-blue-200/80 px-2.5 py-1 rounded-lg text-xs text-blue-900 font-semibold">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="material-symbols-outlined text-sm text-blue-700 shrink-0">alt_route</span>
                    <span className="truncate">Bus Route: <strong>{commuterActiveRoute.name}</strong></span>
                  </div>
                  <span className="shrink-0 text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.5 rounded shadow-2xs">
                    Blue Line on Road
                  </span>
                </div>
              )}

              {userLocationNote && (
                <div className="mt-2 text-[10px] leading-tight text-blue-800 bg-blue-50/90 border border-blue-200/60 p-2 rounded-lg flex items-start gap-1.5">
                  <span className="material-symbols-outlined text-xs text-blue-600 mt-0.5 shrink-0">info</span>
                  <span>{userLocationNote}</span>
                </div>
              )}

              <div className="mt-2.5 flex items-center gap-2">
                <button
                  onClick={() => {
                    if (map && nearestStopInfo.stop.longitude && nearestStopInfo.stop.latitude) {
                      map.flyTo({
                        center: [nearestStopInfo.stop.longitude, nearestStopInfo.stop.latitude],
                        zoom: 15.5,
                        duration: 1000,
                      });
                    }
                  }}
                  className="flex-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 shadow-xs"
                >
                  <span className="material-symbols-outlined text-sm">place</span>
                  Center on Stop
                </button>
              </div>
            </div>
          )}

          {/* Floating Stop Details HUD when a Stop is selected - Stacks cleanly under pickup HUD if active */}
          {selectedStop && (
            <div className={`absolute left-4 z-20 sm:w-80 max-w-[calc(100%-2rem)] bg-white/95 backdrop-blur-md border border-outline-variant rounded-2xl shadow-xl p-4 animate-in slide-in-from-top duration-300 ${
              userLocation && nearestStopInfo ? 'top-44' : 'top-4'
            }`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-lg">hail</span>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-outline">
                      Transit Bus Stop
                    </div>
                    <div className="font-bold text-sm text-on-background">
                      {selectedStop.name}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedStop(null)}
                  className="text-outline hover:text-on-background p-1 rounded-full hover:bg-surface-container transition-colors"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>

              <div className="mt-2 text-xs text-on-surface-variant flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-outline">pin_drop</span>
                <span>{selectedStop.code || 'Transit Stop'} • {selectedStop.city}</span>
              </div>

              {selectedStop.address && (
                <p className="mt-1 text-[11px] text-outline leading-tight">
                  {selectedStop.address}
                </p>
              )}
            </div>
          )}

          {/* Floating Vehicle HUD for Selected Vehicle - Placed at bottom-left/center so bottom-right MapControls are unobstructed */}
          {selectedVehicle && (
            <div
              className={`absolute left-4 sm:left-auto sm:right-20 z-20 transition-all duration-300 animate-in slide-in-from-bottom ${
                viewLayout === 'fullscreen'
                  ? 'bottom-6 sm:w-96 bg-white/95 backdrop-blur-md border border-outline-variant rounded-2xl shadow-2xl p-5'
                  : 'bottom-6 sm:w-80 bg-white rounded-xl shadow-2xl border border-outline-variant p-4'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-headline-sm text-lg font-bold text-on-background">
                      {selectedVehicle.vehicle_code || 'Electric Bus'}
                    </span>
                    <Badge
                      variant={selectedVehicle.status === 'online' ? 'success' : 'neutral'}
                      size="sm"
                      dot
                    >
                      {selectedVehicle.status === 'online' ? 'LIVE' : 'IDLE'}
                    </Badge>
                  </div>
                  <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                    {selectedVehicle.route_name
                      ? `${selectedVehicle.route_code || ''} • ${selectedVehicle.route_name}`
                      : selectedVehicle.department_name}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={toggleTrackBus}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all flex items-center gap-1 shadow-2xs ${
                      isTrackingBus
                        ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-400/40'
                        : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest border border-outline-variant/60'
                    }`}
                    title={isTrackingBus ? 'Camera locked to bus (click to unlock)' : 'Lock camera to follow bus movement'}
                  >
                    <span className={`material-symbols-outlined text-xs ${isTrackingBus ? 'animate-pulse' : ''}`}>
                      {isTrackingBus ? 'gps_fixed' : 'my_location'}
                    </span>
                    <span>{isTrackingBus ? 'Live Tracking' : 'Track Bus'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedVehicle(null);
                      setIsTrackingBus(false);
                      isTrackingBusRef.current = false;
                    }}
                    className="p-1 text-outline hover:text-on-background rounded-full hover:bg-surface-container transition-colors"
                    title="Close HUD"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </div>
              </div>

              {/* Route Corridor Details */}
              {selectedVehicle.origin_stop && selectedVehicle.destination_stop && (
                <div className="mt-2 text-[11px] font-semibold text-primary flex items-center gap-1.5 bg-primary/5 px-2.5 py-1 rounded-md">
                  <span className="material-symbols-outlined text-xs">linear_scale</span>
                  <span className="truncate">{selectedVehicle.origin_stop} ⇄ {selectedVehicle.destination_stop}</span>
                </div>
              )}

              {/* Next Stop Live Timing Banner */}
              {selectedVehicle.next_stop_name && (
                <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200/80 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <span className="material-symbols-outlined text-emerald-700 text-lg">departure_board</span>
                    <div className="truncate">
                      <div className="text-[9px] uppercase font-extrabold tracking-wider text-emerald-800">Next Stop</div>
                      <div className="text-xs font-bold text-gray-900 truncate">{selectedVehicle.next_stop_name}</div>
                    </div>
                  </div>
                  <span className="font-extrabold text-xs text-emerald-800 bg-emerald-100/90 px-2 py-1 rounded-lg shrink-0 shadow-xs">
                    {selectedVehicle.eta_next_stop_mins === 0 ? 'At Stop' : `${selectedVehicle.eta_next_stop_mins} min ETA`}
                  </span>
                </div>
              )}

              {/* Gauge & Metrics Grid */}
              <div className="grid grid-cols-3 gap-2 my-2.5 pt-2.5 border-t border-outline-variant/40 text-center">
                {/* Speed Gauge */}
                <div className="p-2 rounded-xl bg-surface-container-low border border-outline-variant/40">
                  <div className="text-[10px] uppercase font-bold text-outline">Speed</div>
                  <div className="text-sm font-bold text-primary mt-0.5 flex items-center justify-center gap-0.5">
                    <span className="material-symbols-outlined text-sm">speed</span>
                    {selectedVehicle.speed_kph || 0}
                    <span className="text-[9px] font-normal text-outline">km/h</span>
                  </div>
                </div>

                {/* Battery SOC */}
                <div className="p-2 rounded-xl bg-surface-container-low border border-outline-variant/40">
                  <div className="text-[10px] uppercase font-bold text-outline">Battery</div>
                  <div
                    className={`text-sm font-bold mt-0.5 flex items-center justify-center gap-0.5 ${
                      (selectedVehicle.soc_pct ?? 100) > 50
                        ? 'text-primary'
                        : (selectedVehicle.soc_pct ?? 100) > 20
                        ? 'text-amber-600'
                        : 'text-error'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">battery_charging_full</span>
                    {selectedVehicle.soc_pct ?? 0}%
                  </div>
                </div>

                {/* Heading / Direction */}
                <div className="p-2 rounded-xl bg-surface-container-low border border-outline-variant/40">
                  <div className="text-[10px] uppercase font-bold text-outline">Direction</div>
                  <div className="text-xs font-bold text-on-surface mt-1 truncate">
                    {selectedVehicle.direction || 'Inbound'}
                  </div>
                </div>
              </div>

              {/* Color-coded Battery Progress Bar */}
              <div className="mb-3">
                <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      (selectedVehicle.soc_pct ?? 100) > 50
                        ? 'bg-primary'
                        : (selectedVehicle.soc_pct ?? 100) > 20
                        ? 'bg-amber-500'
                        : 'bg-error'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, selectedVehicle.soc_pct ?? 0))}%` }}
                  />
                </div>
              </div>

              {/* Footer with GPS & Last Updated */}
              <div className="flex items-center justify-between text-[11px] text-outline pt-2 border-t border-outline-variant/30">
                <span className="flex items-center gap-1 font-mono text-[10px] text-on-surface-variant font-semibold">
                  <span className="material-symbols-outlined text-xs text-primary">place</span>
                  {selectedVehicle.latitude?.toFixed(4)}°N, {selectedVehicle.longitude?.toFixed(4)}°E
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">schedule</span>
                  {formatRelativeTime(selectedVehicle.last_updated_at)}
                </span>
                {viewLayout === 'fullscreen' && (
                  <button
                    onClick={() => setViewLayout('split')}
                    className="text-primary font-bold hover:underline text-[11px]"
                  >
                    Show Sidebar
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhereIsMyBusPage;
