import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { Stop } from '../../types';

export interface WalkingFootprintPolylineProps {
  map: maplibregl.Map | null;
  userLocation: [number, number] | null;
  targetStop: Stop | null;
  distanceMeters: number;
  walkingMinutes: number;
  mapZoom?: number;
  onNavigateToStop?: () => void;
}

export const WalkingFootprintPolyline: React.FC<WalkingFootprintPolylineProps> = ({
  map,
  userLocation,
  targetStop,
  distanceMeters,
  walkingMinutes,
  mapZoom = 13.5,
}) => {
  const markerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!map || !userLocation || !targetStop || targetStop.longitude == null || targetStop.latitude == null) {
      return;
    }

    const sourceId = 'walking-footprint-source';
    const casingLayerId = 'walking-footprint-casing';
    const dotLayerId = 'walking-footprint-dots';

    const start: [number, number] = userLocation;
    const end: [number, number] = [targetStop.longitude, targetStop.latitude];

    // Compute midpoint for footprint label badge
    const midPoint: [number, number] = [
      (start[0] + end[0]) / 2,
      (start[1] + end[1]) / 2,
    ];

    // Coordinates for the walking path
    const coordinates = [start, end];

    const geojsonData: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates,
          },
        },
      ],
    };

    const addLayers = () => {
      if (!map) return;
      if (map.getSource(sourceId)) {
        (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojsonData);
        return;
      }

      map.addSource(sourceId, {
        type: 'geojson',
        data: geojsonData,
      });

      // Background casing (white halo for high contrast on satellite & light maps)
      map.addLayer({
        id: casingLayerId,
        type: 'line',
        source: sourceId,
        minzoom: 0,
        maxzoom: 24,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#FFFFFF',
          'line-width': 7,
          'line-opacity': 0.95,
        },
      });

      // Google Maps Walking Dots: round dots with blue fill (#1A73E8)
      map.addLayer({
        id: dotLayerId,
        type: 'line',
        source: sourceId,
        minzoom: 0,
        maxzoom: 24,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#1A73E8',
          'line-width': 4.5,
          'line-dasharray': [0.05, 1.8],
          'line-opacity': 0.95,
        },
      });
    };

    if (map.isStyleLoaded()) {
      addLayers();
    }
    map.on('style.load', addLayers);

    // Only render the midpoint badge if there is sufficient distance and zoom
    // to avoid overlapping with user beacon and stop marker
    const shouldShowMidpointBadge = distanceMeters >= 250 && mapZoom >= 13.5;

    if (shouldShowMidpointBadge) {
      if (!markerRef.current) {
        const el = document.createElement('div');
        el.className = 'pointer-events-none transform -translate-x-1/2 -translate-y-1/2 z-30';
        el.innerHTML = `
          <div class="flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 text-white text-[10px] font-bold rounded-full shadow-lg border border-white/90 animate-walking-pulse whitespace-nowrap">
            <svg class="w-3 h-3 fill-current" viewBox="0 0 24 24">
              <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7"/>
            </svg>
            <span>${walkingMinutes} min walk (${distanceMeters < 1000 ? `${distanceMeters}m` : `${(distanceMeters / 1000).toFixed(1)}km`})</span>
          </div>
        `;

        markerRef.current = new maplibregl.Marker({ element: el })
          .setLngLat(midPoint)
          .addTo(map);
      } else {
        markerRef.current.setLngLat(midPoint);
        const span = markerRef.current.getElement().querySelector('span');
        if (span) {
          span.textContent = `${walkingMinutes} min walk (${distanceMeters < 1000 ? `${distanceMeters}m` : `${(distanceMeters / 1000).toFixed(1)}km`})`;
        }
      }
    } else if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    return () => {
      map.off('style.load', addLayers);
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      if (map.getLayer(dotLayerId)) map.removeLayer(dotLayerId);
      if (map.getLayer(casingLayerId)) map.removeLayer(casingLayerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [map, userLocation, targetStop, distanceMeters, walkingMinutes, mapZoom]);

  return null;
};
