import { useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import { Route } from '../../types';

export interface RoutePolylineProps {
  map: maplibregl.Map | null;
  route: Route;
  color?: string;
  width?: number;
}

export const RoutePolyline: React.FC<RoutePolylineProps> = ({
  map,
  route,
  color = '#006A3B',
  width = 5,
}) => {
  useEffect(() => {
    if (!map) return;

    // Coordinates can be LineString, raw array, or fall back to stops
    let coordinates: [number, number][] | null = null;
    if (route.geometry) {
      if ((route.geometry as any).coordinates) {
        coordinates = (route.geometry as any).coordinates;
      } else if (Array.isArray(route.geometry)) {
        coordinates = route.geometry as any;
      }
    }
    
    // Fallback: connect stops along the corridor if explicit geometry is missing
    if ((!coordinates || coordinates.length < 2) && route.stops && route.stops.length >= 2) {
      coordinates = route.stops
        .filter((s) => s.longitude != null && s.latitude != null)
        .map((s) => [s.longitude, s.latitude]);
    }

    if (!coordinates || coordinates.length < 2) return;

    const sourceId = `route-source-${route.id}`;
    const layerId = `route-layer-${route.id}`;
    const casingLayerId = `route-casing-${route.id}`;

    const geojsonData: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            id: route.id,
            name: route.name,
          },
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

      // Background casing (white halo for high contrast on satellite & street maps)
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
            10, Math.max(3, width),
            13, width + 3,
            16, width + 6,
            19, width + 10,
          ],
          'line-opacity': 0.95,
        },
      });

      // Main transit polyline with zoom-interpolated road width
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
          'line-color': route.color || color,
          'line-width': [
            'interpolate',
            ['exponential', 1.4],
            ['zoom'],
            8, Math.max(3, width - 1),
            11, Math.max(4, width),
            14, width + 3,
            17, width + 6,
            20, width + 10,
          ],
          'line-opacity': 0.95,
        },
      });
    };

    const tryAddLayers = () => {
      if (!map) return;
      try {
        addLayers();
      } catch (err) {
        setTimeout(() => {
          try {
            addLayers();
          } catch {}
        }, 200);
      }
    };

    tryAddLayers();
    map.on('style.load', tryAddLayers);
    map.on('load', tryAddLayers);

    return () => {
      map.off('style.load', tryAddLayers);
      map.off('load', tryAddLayers);
      try {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getLayer(casingLayerId)) map.removeLayer(casingLayerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch {}
    };
  }, [map, route.id, route.geometry, route.stops, route.color, color, width]);

  return null;
};
