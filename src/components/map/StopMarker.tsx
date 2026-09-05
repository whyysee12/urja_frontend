import React, { useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import { Stop } from '../../types';

export interface StopMarkerProps {
  map: maplibregl.Map | null;
  stop: Stop;
  sequence?: number;
  isSelected?: boolean;
  isNearestPickup?: boolean;
  walkingMinutes?: number;
  distanceMeters?: number;
  mapZoom?: number;
  onClick?: (stop: Stop) => void;
}

export const StopMarker: React.FC<StopMarkerProps> = ({
  map,
  stop,
  sequence,
  isSelected,
  isNearestPickup,
  walkingMinutes,
  distanceMeters,
  mapZoom = 13.5,
  onClick,
}) => {
  useEffect(() => {
    if (!map || stop.latitude === undefined || stop.longitude === undefined || stop.latitude === null || stop.longitude === null) {
      return;
    }

    const isCompact = mapZoom < 11.5 && !isSelected && !isNearestPickup;
    const el = document.createElement('div');
    const zClass = isSelected ? 'z-50' : isNearestPickup ? 'z-40' : 'z-20 hover:z-30';

    el.className = `group relative flex flex-col items-center cursor-pointer transition-transform duration-200 ${zClass} ${
      isSelected ? 'scale-125' : isNearestPickup ? 'scale-110' : 'hover:scale-115'
    }`;

    if (isCompact) {
      // Zoomed-out compact transit station badge
      el.innerHTML = `
        <div class="relative flex items-center justify-center">
          <div class="w-3.5 h-3.5 rounded-full bg-white border-[2.5px] border-emerald-700 shadow-sm flex items-center justify-center">
            <div class="w-1.5 h-1.5 rounded-full bg-emerald-700"></div>
          </div>
          <!-- Tooltip on hover only -->
          <div class="absolute bottom-full mb-1.5 opacity-0 group-hover:opacity-100 pointer-events-none bg-gray-900/95 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-md whitespace-nowrap z-50 transition-opacity">
            ${stop.name}
          </div>
        </div>
      `;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (onClick) onClick(stop);
      });

      const marker = new maplibregl.Marker({
        element: el,
        anchor: 'center',
      })
        .setLngLat([stop.longitude, stop.latitude])
        .addTo(map);

      return () => {
        marker.remove();
      };
    }

    // Full Google Maps Transit Bus Stop Pin (Zoom >= 13 or Selected or Nearest Pickup)
    const borderColor = isNearestPickup ? '#1A73E8' : isSelected ? '#006A3B' : '#2D5A46';
    const bgColor = isNearestPickup ? '#E8F0FE' : isSelected ? '#E6F4EA' : '#FFFFFF';
    const iconPlateColor = isNearestPickup ? '#1A73E8' : '#006A3B';

    el.innerHTML = `
      <div class="relative flex flex-col items-center select-none pointer-events-auto">
        <!-- Floating Pickup Badge or Tooltip Label positioned ABOVE the pin -->
        ${
          isNearestPickup
            ? `
            <div class="absolute bottom-full mb-1 whitespace-nowrap bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md flex items-center gap-1 border border-white animate-bounce pointer-events-none">
              <span>🚏</span>
              <span>Pickup Here ${walkingMinutes ? `(${walkingMinutes}m)` : ''}</span>
            </div>
            <div class="absolute -inset-1 rounded-full bg-blue-500/25 animate-ping pointer-events-none"></div>
            `
            : `
            <div class="absolute bottom-full mb-1 px-2 py-0.5 bg-gray-900/95 text-white text-[10px] font-bold rounded-md shadow-md border border-white/20 max-w-[140px] truncate text-center transition-all pointer-events-none ${
              isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }">
              ${stop.name}
            </div>
            `
        }

        <!-- Google Maps Transit Bus Stop Pin SVG -->
        <div class="relative flex items-center justify-center filter drop-shadow-md">
          <svg width="30" height="34" viewBox="0 0 30 34" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Pin Body pointing directly at bottom center (15, 33) -->
            <path d="M15 33C15 33 26 21.5 26 13C26 6.37 21.07 1 15 1C8.93 1 4 6.37 4 13C4 21.5 15 33 15 33Z" 
                  fill="${bgColor}" 
                  stroke="${borderColor}" 
                  stroke-width="2" 
                  stroke-linejoin="round"/>
            
            <!-- Inner Circular Emblem -->
            <circle cx="15" cy="13" r="8.5" fill="${iconPlateColor}" />

            <!-- Bus Symbol Inside Pin -->
            <g transform="translate(9.5, 7.5) scale(0.45)" fill="#FFFFFF">
              <path d="M4 2C2.9 2 2 2.9 2 4V16C2 17.1 2.9 18 4 18H5V21C5 21.6 5.4 22 6 22H7C7.6 22 8 21.6 8 21V18H16V21C16 21.6 16.4 22 17 22H18C18.6 22 19 21.6 19 21V18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2H4ZM6.5 16C5.7 16 5 15.3 5 14.5C5 13.7 5.7 13 6.5 13C7.3 13 8 13.7 8 14.5C8 15.3 7.3 16 6.5 16ZM17.5 16C16.7 16 16 15.3 16 14.5C16 13.7 16.7 13 17.5 13C18.3 13 19 13.7 19 14.5C19 15.3 18.3 16 17.5 16ZM19 10H5V5H19V10Z"/>
            </g>
          </svg>

          ${
            sequence !== undefined
              ? `
              <div class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-white text-[9px] font-extrabold flex items-center justify-center border border-white shadow-xs">
                ${sequence}
              </div>
              `
              : ''
          }
        </div>
      </div>
    `;

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (onClick) onClick(stop);
    });

    const marker = new maplibregl.Marker({
      element: el,
      anchor: 'bottom',
    })
      .setLngLat([stop.longitude, stop.latitude])
      .addTo(map);

    return () => {
      marker.remove();
    };
  }, [map, stop.id, stop.latitude, stop.longitude, sequence, isSelected, isNearestPickup, walkingMinutes, distanceMeters, mapZoom, onClick]);

  return null;
};
