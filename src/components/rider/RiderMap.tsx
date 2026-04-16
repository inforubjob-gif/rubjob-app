"use client";

import { useEffect, useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons in Leaflet with Next.js
const createCustomIcon = (color: string, iconHtml?: string) => {
  return L.divIcon({
    className: "custom-div-icon",
    html: `<div style="background-color: ${color}; width: 32px; height: 32px; border-radius: 12px; border: 3px solid white; display: flex; items-center; justify-content: center; box-shadow: 0 10px 20px rgba(0,0,0,0.15); color: white;">
            ${iconHtml || ''}
          </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
};

const storeIcon = createCustomIcon("#000000", '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>');
const userIcon = createCustomIcon("#FF9F1C", '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>');

interface RiderMapProps {
  storeLat: number;
  storeLng: number;
  userLat: number;
  userLng: number;
}

function MapBoundsSetter({ storePos, userPos }: { storePos: [number, number], userPos: [number, number] }) {
  const map = useMap();
  
  useEffect(() => {
    if (storePos[0] !== 0 && userPos[0] !== 0) {
      const bounds = L.latLngBounds([storePos, userPos]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [storePos, userPos, map]);
  
  return null;
}

export default function RiderMap({ storeLat, storeLng, userLat, userLng }: RiderMapProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return (
    <div className="h-full w-full bg-slate-100 animate-pulse flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Waking Up Maps...</p>
    </div>
  );

  const storePos: [number, number] = [storeLat || 13.7563, storeLng || 100.5018];
  const userPos: [number, number] = [userLat || 13.7563, userLng || 100.5018];

  return (
    <div className="h-full w-full z-0 relative">
      <MapContainer 
        center={storePos} 
        zoom={13} 
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png"
        />
        
        <Marker position={storePos} icon={storeIcon} />
        <Marker position={userPos} icon={userIcon} />
        
        <Polyline 
          positions={[storePos, userPos]} 
          color="#FF9F1C" 
          weight={4} 
          opacity={0.6} 
          dashArray="10, 10"
        />
        
        <MapBoundsSetter storePos={storePos} userPos={userPos} />
      </MapContainer>

      {/* Subtle Overlay to match UI style */}
      <div className="absolute inset-0 pointer-events-none ring-inset ring-1 ring-slate-900/5 shadow-inner" />
    </div>
  );
}
