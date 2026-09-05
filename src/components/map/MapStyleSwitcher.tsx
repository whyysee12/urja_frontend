import React from 'react';
import { Map as MapIcon, Sun, Moon, Globe } from 'lucide-react';
import { TileStyle } from './MapContainer';

interface MapStyleSwitcherProps {
  activeStyle: TileStyle;
  onStyleChange: (style: TileStyle) => void;
}

const STYLE_OPTIONS: { id: TileStyle; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'osm', label: 'Street', Icon: MapIcon },
  { id: 'carto_voyager', label: 'Light', Icon: Sun },
  { id: 'carto_dark', label: 'Dark', Icon: Moon },
  { id: 'satellite', label: 'Satellite', Icon: Globe },
];

export const MapStyleSwitcher: React.FC<MapStyleSwitcherProps> = ({ activeStyle, onStyleChange }) => {
  return (
    <div className="absolute bottom-6 left-6 bg-white/95 backdrop-blur-md border border-outline-variant rounded-xl shadow-lg p-1.5 flex flex-row gap-1 z-10">
      {STYLE_OPTIONS.map((opt) => {
        const isActive = activeStyle === opt.id;
        const Icon = opt.Icon;
        return (
          <button
            key={opt.id}
            onClick={() => onStyleChange(opt.id)}
            className={`flex flex-col items-center justify-center w-14 h-14 rounded-lg transition-all ${
              isActive
                ? 'bg-primary/10 border-primary ring-2 ring-primary text-primary font-bold'
                : 'bg-surface hover:bg-surface-variant text-on-surface-variant'
            }`}
            title={opt.label}
          >
            <Icon className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-label-bold">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};
