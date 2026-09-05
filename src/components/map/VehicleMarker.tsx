import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { VehiclePublic } from '../../types';
import { interpolateLatLng, haversineDistanceKm, calculateBearingDeg } from '../../utils/polylineUtils';

export interface VehicleMarkerProps {
  map: maplibregl.Map | null;
  vehicle: VehiclePublic;
  isSelected?: boolean;
  mapZoom?: number;
  onClick?: (vehicle: VehiclePublic) => void;
}

const getVehicleIcon = (type: string) => {
  switch (type) {
    case 'electric_bus': return 'directions_bus';
    case 'fire_ev': return 'local_fire_department';
    case 'ambulance_ev': return 'emergency';
    case 'utility_ev': return 'electric_bolt';
    default: return 'navigation';
  }
};

export const VehicleMarker: React.FC<VehicleMarkerProps> = ({
  map,
  vehicle,
  isSelected,
  mapZoom = 13.5,
  onClick,
}) => {
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const elRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const posRef = useRef<[number, number] | null>(null);

  useEffect(() => {
    if (!map || vehicle.latitude === undefined || vehicle.longitude === undefined || vehicle.latitude === null || vehicle.longitude === null) return;

    if (!elRef.current) {
      elRef.current = document.createElement('div');
      markerRef.current = new maplibregl.Marker({ element: elRef.current, anchor: 'center' })
        .setLngLat([vehicle.longitude, vehicle.latitude])
        .addTo(map);
      posRef.current = [vehicle.longitude, vehicle.latitude];
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (markerRef.current) markerRef.current.remove();
      markerRef.current = null;
      elRef.current = null;
    };
  }, [map]); // Init and destroy with map

  useEffect(() => {
    if (!elRef.current) return;
    
    elRef.current.onclick = (e) => {
      e.stopPropagation();
      if (onClick) onClick(vehicle);
    };

    const isLive = vehicle.status === 'online';
    const heading = vehicle.heading_deg ?? 0;
    const isLowBattery = (vehicle.soc_pct ?? 100) < 20;
    const speed = vehicle.speed_kph || 0;

    // Zoom-dependent Level of Detail
    const isVeryZoomedOut = mapZoom < 11.5 && !isSelected;
    const isMediumZoom = mapZoom >= 11.5 && mapZoom < 13.5 && !isSelected;

    // Transit styling inspired by Google Maps
    const busPrimaryColor = isLowBattery ? '#D93025' : isLive ? '#006A3B' : '#5F6368';
    const busAccentColor = isLowBattery ? '#F9DEDC' : isLive ? '#268451' : '#80868B';
    const pulseRingColor = isLowBattery ? 'bg-red-500/30' : 'bg-emerald-500/30';
    const pulseAnim = isLowBattery ? 'pulse-error-marker' : 'pulse-marker';
    const zClass = isSelected ? 'z-50 scale-125' : 'z-30 hover:z-40 hover:scale-110';

    elRef.current.className = `group w-0 h-0 flex items-center justify-center cursor-pointer transition-transform duration-200 select-none ${zClass}`;

    if (isVeryZoomedOut) {
      // Very zoomed-out: 18px circle with integrated arrow pointing along road
      elRef.current.innerHTML = `
        <div class="relative flex items-center justify-center select-none">
          <div class="vehicle-rotator transition-transform duration-300" style="transform: rotate(${heading}deg); transform-origin: center center;">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polygon points="10,1 13,5.5 7,5.5" fill="${isLive ? '#006A3B' : '#5F6368'}" />
              <circle cx="10" cy="11" r="6" fill="${isLive ? '#006A3B' : '#5F6368'}" stroke="#FFFFFF" stroke-width="1.5" />
              <circle cx="10" cy="11" r="2" fill="#FFFFFF" />
            </svg>
          </div>
          <!-- Hover Tooltip only -->
          <div class="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 pointer-events-none bg-gray-900/95 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap z-50">
            ${vehicle.vehicle_code || 'Bus'}
          </div>
        </div>
      `;
      return;
    }

    if (isMediumZoom) {
      // Medium zoom: 28px bus disc with integrated directional indicator
      elRef.current.innerHTML = `
        <div class="relative flex flex-col items-center select-none">
          <div class="vehicle-rotator filter drop-shadow transition-transform duration-300" style="transform: rotate(${heading}deg); transform-origin: center center;">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <!-- Direction Heading Indicator Arrow Integrated in SVG -->
              <polygon points="16,1 20,7 12,7" fill="${busPrimaryColor}" stroke="#FFFFFF" stroke-width="1.2" stroke-linejoin="round"/>
              <circle cx="16" cy="16" r="11.5" fill="${busPrimaryColor}" stroke="#FFFFFF" stroke-width="2"/>
              <g transform="translate(9, 9) scale(0.6)" fill="#FFFFFF">
                <path d="M4 2C2.9 2 2 2.9 2 4V16C2 17.1 2.9 18 4 18H5V21C5 21.6 5.4 22 6 22H7C7.6 22 8 21.6 8 21V18H16V21C16 21.6 16.4 22 17 22H18C18.6 22 19 21.6 19 21V18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2H4ZM6.5 16C5.7 16 5 15.3 5 14.5C5 13.7 5.7 13 6.5 13C7.3 13 8 13.7 8 14.5C8 15.3 7.3 16 6.5 16ZM17.5 16C16.7 16 16 15.3 16 14.5C16 13.7 16.7 13 17.5 13C18.3 13 19 13.7 19 14.5C19 15.3 18.3 16 17.5 16ZM19 10H5V5H19V10Z"/>
              </g>
            </svg>
          </div>
          <div class="absolute top-full mt-0.5 bg-gray-900/90 text-white text-[9px] font-bold px-1.5 py-0.2 rounded shadow whitespace-nowrap">
            ${vehicle.vehicle_code || 'Bus'}
          </div>
        </div>
      `;
      return;
    }

    // Full Detail (Street level): Custom top-down bus SVG with forward arrow integrated directly on the front bumper
    elRef.current.innerHTML = `
      <div class="relative flex flex-col items-center select-none">
        <!-- Live Ripple Aura -->
        ${
          isLive
            ? `<div class="absolute inset-0 m-auto w-12 h-12 rounded-full ${pulseRingColor} ${pulseAnim} pointer-events-none"></div>`
            : ''
        }

        <!-- Rotating Bus SVG with Integrated Direction Arrow (Zero Eccentric Wobble) -->
        <div class="vehicle-rotator relative flex items-center justify-center filter drop-shadow-md transition-transform duration-300" style="transform: rotate(${heading}deg); transform-origin: center center;">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Direction Heading Indicator Arrow Integrated Directly in SVG at Center (20, 1) -->
            <polygon points="20,1 25,8.5 15,8.5" fill="${busPrimaryColor}" stroke="#FFFFFF" stroke-width="1.5" stroke-linejoin="round"/>

            <!-- Outer Protective Shield -->
            <circle cx="20" cy="20" r="14.5" fill="${busPrimaryColor}" stroke="${isSelected ? '#FBBF24' : '#FFFFFF'}" stroke-width="${isSelected ? '2.5' : '2'}"/>
            
            <!-- Top-down Bus Chassis -->
            <rect x="13.5" y="9" width="13" height="21" rx="3.5" fill="#FFFFFF"/>
            
            <!-- Front Windshield -->
            <path d="M14.5 11.5C14.5 10.2 15.5 9.2 16.8 9.2H23.2C24.5 9.2 25.5 10.2 25.5 11.5V13.5H14.5V11.5Z" fill="${busAccentColor}"/>
            
            <!-- Side Passenger Windows -->
            <rect x="14.5" y="15" width="1.8" height="5.5" rx="0.5" fill="${busAccentColor}"/>
            <rect x="23.7" y="15" width="1.8" height="5.5" rx="0.5" fill="${busAccentColor}"/>
            
            <!-- Electric Battery Pack on Roof with Bolt -->
            <rect x="17.5" y="15" width="5" height="5.5" rx="1" fill="#E6F4EA"/>
            <path d="M20.2 15.8L18.5 18H20.5L19.8 20L21.5 17.5H19.5L20.2 15.8Z" fill="${busPrimaryColor}"/>

            <!-- Rear Window -->
            <rect x="15" y="27" width="10" height="1.8" rx="0.8" fill="${busAccentColor}"/>

            <!-- Headlight Beams -->
            <circle cx="14.5" cy="9.5" r="1" fill="#FDE047"/>
            <circle cx="25.5" cy="9.5" r="1" fill="#FDE047"/>
          </svg>
        </div>

        <!-- Bus Code Badge Pill -->
        <div class="absolute top-full mt-1 flex items-center gap-1 bg-gray-900/95 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md border border-white/40 whitespace-nowrap">
          <span class="w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-400' : 'bg-gray-400'}"></span>
          <span>${vehicle.vehicle_code || 'BUS'}</span>
        </div>

        <!-- Live Speed Badge -->
        ${
          isLive && speed > 0
            ? `
          <div class="absolute top-full mt-6 bg-primary/95 text-white text-[8px] font-extrabold px-1.5 py-0.2 rounded shadow-sm whitespace-nowrap">
            ${speed} km/h
          </div>
          `
            : ''
        }
      </div>
    `;
  }, [vehicle, isSelected, mapZoom, onClick]);

  useEffect(() => {
    if (!markerRef.current || vehicle.latitude === undefined || vehicle.longitude === undefined || vehicle.latitude === null || vehicle.longitude === null) return;
    
    const targetPos: [number, number] = [vehicle.longitude, vehicle.latitude];
    
    if (!posRef.current) {
      posRef.current = targetPos;
      markerRef.current.setLngLat(targetPos);
      return;
    }

    const startPos = [...posRef.current] as [number, number];
    if (startPos[0] === targetPos[0] && startPos[1] === targetPos[1]) return;

    // Determine travel bearing along road
    const distKm = haversineDistanceKm(startPos[1], startPos[0], targetPos[1], targetPos[0]);
    if (distKm > 0.003) { // > 3 meters movement
      const calculatedHeading = calculateBearingDeg(startPos[1], startPos[0], targetPos[1], targetPos[0]);
      const rotEl = elRef.current?.querySelector('.vehicle-rotator') as HTMLElement | null;
      if (rotEl) {
        rotEl.style.transform = `rotate(${Math.round(calculatedHeading)}deg)`;
      }
    }

    const duration = 2500;
    const startTime = performance.now();

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const t = Math.min(elapsed / duration, 1);
      
      const currentPos = interpolateLatLng(startPos, targetPos, t);
      if (markerRef.current) {
        markerRef.current.setLngLat(currentPos);
      }
      posRef.current = currentPos;

      if (t < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        animationRef.current = null;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [vehicle.latitude, vehicle.longitude]);

  return null;
};
