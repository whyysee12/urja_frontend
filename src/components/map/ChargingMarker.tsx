import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { ChargingCenter } from '../../types';

export interface ChargingMarkerProps {
  map: maplibregl.Map | null;
  station: ChargingCenter;
  isSelected?: boolean;
  onClick?: (station: ChargingCenter) => void;
}

export const ChargingMarker: React.FC<ChargingMarkerProps> = ({
  map,
  station,
  isSelected = false,
  onClick,
}) => {
  const markerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!map || station.latitude === undefined || station.longitude === undefined) return;

    const isOffline = (station.status || '').toLowerCase() === 'offline';
    const isLimited = (station.status || '').toLowerCase() === 'limited';
    const power = station.power_kw || 0;
    const isUltraFast = power >= 120;

    // Institutional Colors from DESIGN.md
    const pinColor = isOffline ? '#DC2626' : isLimited ? '#D97706' : isUltraFast ? '#00522D' : '#006A3B';
    const pinBorder = '#FFFFFF';

    const el = document.createElement('div');
    el.className = `group relative cursor-pointer select-none pointer-events-auto transition-transform duration-200 ${
      isSelected ? 'z-50 scale-125' : 'z-20 hover:z-40 hover:scale-115'
    }`;

    el.innerHTML = `
      <div class="relative flex flex-col items-center">
        <!-- Floating Label on Hover / Selected -->
        <div class="absolute bottom-full mb-1 px-2.5 py-1 bg-gray-900/95 text-white text-[11px] font-bold rounded-lg shadow-lg border border-white/20 whitespace-nowrap max-w-[200px] truncate text-center transition-all pointer-events-none ${
          isSelected ? 'opacity-100 ring-2 ring-primary' : 'opacity-0 group-hover:opacity-100'
        }">
          <div class="truncate">${station.name}</div>
          <div class="text-[9px] text-gray-300 font-normal mt-0.5">
            ${power ? `${power} kW` : 'EV'} • ${station.status.toUpperCase()}
          </div>
        </div>

        <!-- Teardrop EV Pin SVG -->
        <div class="relative flex items-center justify-center filter drop-shadow-md">
          <svg width="34" height="40" viewBox="0 0 32 38" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Outer Pin Body -->
            <path d="M16 37C16 37 29 23.5 29 14.5C29 7.32 23.18 1.5 16 1.5C8.82 1.5 3 7.32 3 14.5C3 23.5 16 37 16 37Z" 
                  fill="${pinColor}" 
                  stroke="${pinBorder}" 
                  stroke-width="2.5" 
                  stroke-linejoin="round"/>
            
            <!-- Inner White Emblem Circle -->
            <circle cx="16" cy="14" r="9.5" fill="#FFFFFF" />

            <!-- Lightning Bolt SVG Icon -->
            <path d="M16.5 6.5L11 15H15.5L14.5 21.5L21 13H16.5L16.5 6.5Z" 
                  fill="${pinColor}" />
          </svg>

          <!-- Selected Pulse Ring -->
          ${
            isSelected
              ? '<div class="absolute -inset-1.5 rounded-full border-2 border-emerald-400 animate-ping pointer-events-none"></div>'
              : ''
          }
        </div>

        <!-- Compact Power Tag Beneath Pin -->
        <div class="mt-0.5 px-1.5 py-0.2 rounded bg-white text-on-surface text-[9px] font-extrabold shadow-xs border border-outline-variant/80 max-w-[80px] truncate">
          ${power ? `${power}kW` : 'EV'}
        </div>
      </div>
    `;

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (onClick) onClick(station);
    });

    const marker = new maplibregl.Marker({
      element: el,
      anchor: 'bottom',
    })
      .setLngLat([station.longitude, station.latitude])
      .addTo(map);

    markerRef.current = marker;

    return () => {
      marker.remove();
      markerRef.current = null;
    };
  }, [map, station.id, station.latitude, station.longitude, station.power_kw, station.status, isSelected]);

  return null;
};
