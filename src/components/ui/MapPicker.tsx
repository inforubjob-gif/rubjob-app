"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Ensure Leaflet CSS is loaded (CDN fallback for edge runtime)
if (typeof document !== "undefined" && !document.querySelector('link[href*="leaflet"]')) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  document.head.appendChild(link);
}

// Fix for default marker icons in Leaflet with Next.js
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface MapPickerProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

function LocationMarker({ lat, lng, onChange }: MapPickerProps) {
  const map = useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  return lat !== 0 && lng !== 0 ? (
    <Marker position={[lat, lng]} />
  ) : null;
}

function MapUpdater({ lat, lng }: { lat: number, lng: number }) {
  const map = useMap();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (lat !== 0 && lng !== 0) {
      // Debounce to avoid rapid panning while typing coordinates
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        map.flyTo([lat, lng], Math.max(map.getZoom(), 13), { duration: 0.5 });
      }, 400);
    }
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [lat, lng, map]);
  return null;
}

export default function MapPicker({ lat, lng, onChange }: MapPickerProps) {
  const [isMounted, setIsMounted] = useState(false);
  const hasAutoLocated = useRef(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || hasAutoLocated.current) return;
    if (lat !== 0 && lng !== 0) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    hasAutoLocated.current = true;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange(position.coords.latitude, position.coords.longitude);
      },
      () => {
        // Keep Bangkok as fallback if location permission denied.
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, [isMounted, lat, lng, onChange]);

  // Close results when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (query.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&accept-language=th,en&countrycodes=th`,
          { headers: { 'User-Agent': 'RubJob/1.0' } }
        );
        const data = await res.json();
        setSearchResults(data || []);
        setShowResults(true);
      } catch (err) {
        console.error("Search error:", err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  }, []);

  const handleSelectResult = (result: SearchResult) => {
    const newLat = parseFloat(result.lat);
    const newLng = parseFloat(result.lon);
    onChange(newLat, newLng);
    setSearchQuery(result.display_name.split(',').slice(0, 2).join(','));
    setShowResults(false);
    setSearchResults([]);
  };

  if (!isMounted) return <div className="h-full w-full bg-slate-100 animate-pulse rounded-xl flex items-center justify-center font-bold text-slate-400">Loading Map...</div>;

  const center: [number, number] = lat !== 0 && lng !== 0 ? [lat, lng] : [13.7563, 100.5018]; // Default to Bangkok

  return (
    <div className="w-full rounded-xl overflow-hidden border-2 border-slate-100 z-0 relative" style={{ minHeight: "400px", height: "400px" }}>
      {/* Search Bar */}
      <div ref={searchContainerRef} className="absolute top-3 left-3 right-3 z-[1000]">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            placeholder="🔍 ค้นหาสถานที่..."
            className="w-full bg-white/95 backdrop-blur-md border border-slate-200 shadow-lg rounded-xl px-4 py-3 pr-10 text-sm font-bold text-slate-700 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-400 placeholder:font-medium"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showResults && searchResults.length > 0 && (
          <div className="mt-1.5 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-2xl overflow-hidden max-h-[200px] overflow-y-auto">
            {searchResults.map((result) => (
              <button
                key={result.place_id}
                onClick={() => handleSelectResult(result)}
                className="w-full px-4 py-3 text-left hover:bg-primary/5 transition-colors border-b border-slate-50 last:border-b-0 flex items-start gap-2.5"
              >
                <span className="text-primary mt-0.5 shrink-0">📍</span>
                <span className="text-xs font-bold text-slate-700 leading-relaxed line-clamp-2">{result.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <MapContainer center={center} zoom={13} style={{ height: "400px", width: "100%", minHeight: "400px" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker lat={lat} lng={lng} onChange={onChange} />
        <MapUpdater lat={lat} lng={lng} />
      </MapContainer>
    </div>
  );
}
