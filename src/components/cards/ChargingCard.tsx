import React from 'react';
import { Link } from 'react-router-dom';
import { ChargingCenter } from '../../types';
import { Badge } from '../common/Badge';
import { formatStationStatus } from '../../utils/formatters';

export interface ChargingCardProps {
  station: ChargingCenter;
  isSelected?: boolean;
  onSelect?: () => void;
  showMapAction?: boolean;
}

export const ChargingCard: React.FC<ChargingCardProps> = ({
  station,
  isSelected = false,
  onSelect,
  showMapAction = true,
}) => {
  const statusInfo = formatStationStatus(station.status);
  const connectors = station.connectors || {};
  const isFastDc = Boolean(connectors.fast_dc || (station.power_kw && station.power_kw >= 50));
  const isUltraFast = (station.power_kw || 0) >= 120;
  
  const connectorEntries = Object.entries(connectors).filter(
    ([key, count]) => key !== 'fast_dc' && typeof count !== 'boolean' && !isNaN(Number(count))
  );

  const amenities = (station.amenities || {}) as Record<string, any>;
  const pricing = amenities.pricing_inr_kwh != null ? Number(amenities.pricing_inr_kwh) : null;

  // Detect network brand
  const nameLower = (station.name || '').toLowerCase();
  let brand = 'Verified Hub';
  if (nameLower.includes('tata power')) brand = 'Tata Power';
  else if (nameLower.includes('jio-bp') || nameLower.includes('jio bp')) brand = 'Jio-bp pulse';
  else if (nameLower.includes('statiq')) brand = 'Statiq';
  else if (nameLower.includes('chargezone')) brand = 'ChargeZone';
  else if (nameLower.includes('zeon')) brand = 'Zeon';
  else if (nameLower.includes('ather')) brand = 'Ather Grid';
  else if (nameLower.includes('shell')) brand = 'Shell';
  else if (nameLower.includes('reil')) brand = 'REIL';

  return (
    <div
      onClick={onSelect}
      className={`group p-3.5 rounded-xl border transition-all duration-150 cursor-pointer ${
        isSelected
          ? 'border-primary bg-primary/[0.04] ring-1 ring-primary shadow-sm border-l-4 border-l-primary'
          : 'border-outline-variant/80 bg-white hover:border-primary/60 hover:bg-surface-container-lowest hover:shadow-xs'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Left Side: Station Power Avatar */}
        <div
          className={`w-11 h-11 rounded-lg flex flex-col items-center justify-center shrink-0 border ${
            isUltraFast
              ? 'bg-primary text-white border-primary shadow-xs'
              : isFastDc
              ? 'bg-primary/10 text-primary border-primary/20'
              : 'bg-surface-container text-on-surface border-outline-variant/60'
          }`}
        >
          <span className="material-symbols-outlined text-[18px] leading-none">
            {isUltraFast ? 'offline_bolt' : 'bolt'}
          </span>
          <span className="text-[10px] font-black leading-tight mt-0.5">
            {station.power_kw ? `${station.power_kw}k` : 'EV'}
          </span>
        </div>

        {/* Right Content */}
        <div className="flex-1 min-w-0">
          {/* Header Row: Title & Status */}
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-headline-sm text-sm font-bold text-on-background group-hover:text-primary transition-colors truncate">
              {station.name}
            </h4>
            <Badge
              variant={
                station.status === 'operational'
                  ? 'success'
                  : station.status === 'limited'
                  ? 'warning'
                  : 'error'
              }
              size="sm"
              dot
            >
              {statusInfo.label}
            </Badge>
          </div>

          {/* Location & Brand */}
          <p className="text-xs text-on-surface-variant font-medium truncate mt-0.5 flex items-center gap-1">
            <span className="text-primary font-bold">{brand}</span>
            <span className="text-outline">•</span>
            <span className="truncate">
              {station.address || `${station.city || 'Jaipur'}, ${station.state || 'Rajasthan'}`}
            </span>
          </p>

          {/* Connectors & Tariff Tagline */}
          <div className="flex items-center gap-2 flex-wrap text-[11px] text-on-surface mt-2">
            {connectorEntries.length > 0 && (
              <span className="bg-surface-container-low border border-outline-variant/60 text-on-surface px-2 py-0.5 rounded font-bold uppercase tracking-tight">
                {connectorEntries.map(([t, c]) => `${t}:${c}`).join('  ')}
              </span>
            )}

            {pricing != null && (
              <span className="font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                ₹{pricing.toFixed(1)}/kWh
              </span>
            )}

            {station.operating_hours && (
              <span className="text-outline flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[12px]">schedule</span>
                <span className="truncate max-w-[110px]">{station.operating_hours}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="mt-3 pt-2.5 border-t border-outline-variant/40 flex items-center justify-between gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onSelect) onSelect();
          }}
          className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-sm leading-none">my_location</span>
          <span>Focus on Map</span>
        </button>

        <div className="flex items-center gap-1.5">
          <Link
            to={`/charging/${station.id}`}
            onClick={(e) => e.stopPropagation()}
            className="px-2.5 py-1 text-xs font-bold text-on-surface bg-surface-container hover:bg-surface-container-high rounded transition-colors"
          >
            Details
          </Link>

          {showMapAction && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1 text-primary hover:text-white hover:bg-primary rounded transition-colors"
              title="Get Directions in Google Maps"
            >
              <span className="material-symbols-outlined text-base leading-none">directions</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
