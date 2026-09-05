import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { VehiclePublic, Route } from '../../types';

export interface VehicleTrailPolylineProps {
  map: maplibregl.Map | null;
  vehicle: VehiclePublic;
  route: Route | null;
}

export const VehicleTrailPolyline: React.FC<VehicleTrailPolylineProps> = ({ map, vehicle, route }) => {
  const animationRef = useRef<number | null>(null);
  const originMarkerRef = useRef<maplibregl.Marker | null>(null);
  const destMarkerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!map || !route) return;

    let coordinates: [number, number][] | null = null;
    if (route.geometry) {
      if ((route.geometry as any).coordinates) {
        coordinates = (route.geometry as any).coordinates;
      } else if (Array.isArray(route.geometry)) {
        coordinates = route.geometry as any;
      }
    }

    // Fallback to stops if geometry is not provided
    if ((!coordinates || coordinates.length < 2) && route.stops && route.stops.length >= 2) {
      coordinates = route.stops
        .filter((s) => s.longitude != null && s.latitude != null)
        .map((s) => [s.longitude, s.latitude]);
    }

    if (!coordinates || coordinates.length < 2) return;

    const sourceId = `vehicle-trail-source-${vehicle.id}`;
    const layerId = `vehicle-trail-layer-${vehicle.id}`;
    const casingLayerId = `vehicle-trail-casing-${vehicle.id}`;

    const addLayers = () => {
      if (!map) return;
      if (map.getSource(sourceId)) {
        (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: coordinates!,
          },
        });
        return;
      }

      map.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: coordinates!,
          },
        },
      });

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
          'line-width': [
            'interpolate',
            ['exponential', 1.4],
            ['zoom'],
            10, 6,
            13, 9,
            16, 13,
            19, 18,
          ],
          'line-opacity': 0.85,
        },
      });

      map.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        minzoom: 0,
        maxzoom: 24,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': route.color || '#006a3b',
          'line-width': [
            'interpolate',
            ['exponential', 1.4],
            ['zoom'],
            10, 4,
            13, 6,
            16, 9.5,
            19, 14,
          ],
          'line-opacity': 0.95,
          'line-dasharray': [0, 2, 2],
        },
      });
    };

    if (map.isStyleLoaded()) {
      addLayers();
    }
    map.on('style.load', addLayers);

    let step = 0;
    const animateDashArray = () => {
      const newStep = (step + 1) % 4;
      step = newStep;
      
      if (map.getLayer(layerId)) {
        map.setPaintProperty(layerId, 'line-dasharray', [0, 2, 2]); // Will update correctly next step
        // We can create a flowing effect by changing the dasharray
        const dashArray = [2, 2];
        // However, mapbox/maplibre doesn't have dash-offset, so we fake it by changing array pattern
        const pattern = step === 0 ? [0, 2, 2] : step === 1 ? [0, 1, 3] : step === 2 ? [1, 2, 1] : [2, 2, 0];
        map.setPaintProperty(layerId, 'line-dasharray', pattern);
      }
      animationRef.current = requestAnimationFrame(() => {
        setTimeout(animateDashArray, 100);
      });
    };
    
    animateDashArray();

    // Add origin and destination markers
    const originCoords = coordinates[0];
    const destCoords = coordinates[coordinates.length - 1];

    const originEl = document.createElement('div');
    originEl.className = 'w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white border-2 border-white shadow-md';
    originEl.innerHTML = '<span class="material-symbols-outlined text-[12px]">trip_origin</span>';
    originMarkerRef.current = new maplibregl.Marker({ element: originEl })
      .setLngLat(originCoords)
      .addTo(map);

    const destEl = document.createElement('div');
    destEl.className = 'w-6 h-6 rounded-full bg-error flex items-center justify-center text-white border-2 border-white shadow-md';
    destEl.innerHTML = '<span class="material-symbols-outlined text-[12px]">flag</span>';
    destMarkerRef.current = new maplibregl.Marker({ element: destEl })
      .setLngLat(destCoords)
      .addTo(map);

    return () => {
      map.off('style.load', addLayers);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (originMarkerRef.current) originMarkerRef.current.remove();
      if (destMarkerRef.current) destMarkerRef.current.remove();
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getLayer(casingLayerId)) map.removeLayer(casingLayerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [map, vehicle.id, route]);

  return null;
};
