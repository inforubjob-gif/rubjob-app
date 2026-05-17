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
const rubberIcon = createCustomIcon("#3B82F6", '<div className="w-full h-full animate-pulse flex items-center justify-center"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg></div>');

interface RubberMapProps {
  storeLat: number;
  storeLng: number;
  userLat: number;
  userLng: number;
  rubberLat?: number | null;
  rubberLng?: number | null;
  activeDestLat?: number;
  activeDestLng?: number;
}

// OSRM route fetcher with cache
const routeCache = new Map<string, [number, number][]>();

async function fetchOSRMRoute(
  from: [number, number],
  to: [number, number]
): Promise<[number, number][]> {
  const cacheKey = `${from[0].toFixed(4)},${from[1].toFixed(4)}-${to[0].toFixed(4)},${to[1].toFixed(4)}`;
  if (routeCache.has(cacheKey)) return routeCache.get(cacheKey)!;

  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`,
      { signal: AbortSignal.timeout(5000) }
    );
    const data = await res.json();
    if (data.code === 'Ok' && data.routes?.[0]?.geometry?.coordinates) {
      // GeoJSON uses [lng, lat] — Leaflet needs [lat, lng]
      const coords: [number, number][] = data.routes[0].geometry.coordinates.map(
        (c: [number, number]) => [c[1], c[0]] as [number, number]
      );
      routeCache.set(cacheKey, coords);
      return coords;
    }
  } catch (err) {
    console.warn('OSRM route fetch failed, using straight line:', err);
  }
  // Fallback: straight line
  return [from, to];
}

function MapBoundsSetter({ points }: { points: [number, number][] }) {
  const map = useMap();
  
  useEffect(() => {
    const validPoints = points.filter(p => p[0] !== 0 && p[1] !== 0);
    if (validPoints.length >= 2) {
      const bounds = L.latLngBounds(validPoints);
      map.fitBounds(bounds, { padding: [50, 50], animate: true });
    } else if (validPoints.length === 1) {
      map.setView(validPoints[0], 15, { animate: true });
    }
  }, [points, map]);
  
  return null;
}

export default function RubberMap({ 
  storeLat, 
  storeLng, 
  userLat, 
  userLng,
  rubberLat,
  rubberLng,
  activeDestLat,
  activeDestLng
}: RubberMapProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [routeCoords, setRouteCoords] = useState<[number, number][] | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMin: number } | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const storePos: [number, number] = [storeLat || 13.7563, storeLng || 100.5018];
  const userPos: [number, number] = [userLat || 13.7563, userLng || 100.5018];
  const rubberPos: [number, number] | null = (rubberLat && rubberLng) ? [rubberLat, rubberLng] : null;

  // Determine start and end points for routing
  const fromPos = rubberPos || storePos;
  const toPos = (activeDestLat && activeDestLng) 
    ? [activeDestLat, activeDestLng] as [number, number]
    : (rubberPos ? userPos : userPos);

  // Fetch OSRM route
  useEffect(() => {
    if (!isMounted) return;
    let cancelled = false;

    // Also fetch distance/duration info
    async function loadRoute() {
      const coords = await fetchOSRMRoute(fromPos, toPos);
      if (!cancelled) {
        setRouteCoords(coords);
      }

      // Get distance info
      try {
        const res = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${fromPos[1]},${fromPos[0]};${toPos[1]},${toPos[0]}?overview=false`,
          { signal: AbortSignal.timeout(5000) }
        );
        const data = await res.json();
        if (!cancelled && data.code === 'Ok' && data.routes?.[0]) {
          setRouteInfo({
            distanceKm: Math.round(data.routes[0].distance / 100) / 10,
            durationMin: Math.ceil(data.routes[0].duration / 60),
          });
        }
      } catch {}
    }

    loadRoute();
    return () => { cancelled = true; };
  }, [isMounted, fromPos[0], fromPos[1], toPos[0], toPos[1]]);

  // Also fetch store-to-user route if no rubber position
  const [bgRouteCoords, setBgRouteCoords] = useState<[number, number][] | null>(null);
  useEffect(() => {
    if (!isMounted || !rubberPos) return;
    let cancelled = false;
    fetchOSRMRoute(storePos, userPos).then(coords => {
      if (!cancelled) setBgRouteCoords(coords);
    });
    return () => { cancelled = true; };
  }, [isMounted, rubberPos, storePos[0], storePos[1], userPos[0], userPos[1]]);

  if (!isMounted) return (
    <div className="h-full w-full bg-slate-100 animate-pulse flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] font-black text-slate-300 uppercase">Waking Up Maps...</p>
    </div>
  );

  const boundsPoints: [number, number][] = rubberPos 
    ? [rubberPos, toPos]
    : [storePos, userPos];

  return (
    <div className="h-full w-full z-0 relative">
      <MapContainer 
        center={rubberPos || storePos} 
        zoom={rubberPos ? 16 : 13} 
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
        {rubberPos && <Marker position={rubberPos} icon={rubberIcon} />}
        
        {/* Background route: store ↔ customer (dashed, light) */}
        {rubberPos && bgRouteCoords && (
          <Polyline 
            positions={bgRouteCoords} 
            color="#FF9F1C" 
            weight={3} 
            opacity={0.3} 
            dashArray="8, 8"
          />
        )}

        {/* Main route: rubber → destination (solid, bold) */}
        <Polyline 
          positions={routeCoords || [fromPos, toPos]} 
          color={rubberPos ? "#3B82F6" : "#FF9F1C"} 
          weight={rubberPos ? 6 : 4} 
          opacity={0.85} 
          dashArray={rubberPos ? "" : "10, 10"}
        />
        
        <MapBoundsSetter points={boundsPoints} />
      </MapContainer>

      {/* Route info overlay */}
      {routeInfo && (
        <div className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur-md rounded-xl px-3.5 py-2 shadow-lg border border-slate-200/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-xs font-black text-slate-800">{routeInfo.distanceKm} กม.</span>
            </div>
            <div className="w-px h-4 bg-slate-200" />
            <span className="text-xs font-bold text-slate-500">~{routeInfo.durationMin} นาที</span>
          </div>
        </div>
      )}

      {/* Subtle Overlay to match UI style */}
      <div className="absolute inset-0 pointer-events-none ring-inset ring-1 ring-slate-900/5 shadow-inner" />
    </div>
  );
}
