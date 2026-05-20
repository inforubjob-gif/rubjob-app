"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";

const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "";

interface MapPickerProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}

// ── Places Autocomplete Input ────────────────────────────────────────────────
function PlacesSearch({ onSelect }: { onSelect: (lat: number, lng: number, name: string) => void }) {
  const placesLib = useMapsLibrary("places");
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!placesLib || !inputRef.current) return;

    autocompleteRef.current = new placesLib.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "th" },
      fields: ["geometry", "name", "formatted_address"],
      language: "th",
    } as google.maps.places.AutocompleteOptions);

    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current?.getPlace();
      if (place?.geometry?.location) {
        onSelect(
          place.geometry.location.lat(),
          place.geometry.location.lng(),
          place.name || place.formatted_address || ""
        );
        if (inputRef.current) {
          inputRef.current.value = place.name || place.formatted_address || "";
        }
      }
    });

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [placesLib, onSelect]);

  return (
    <div className="absolute top-3 left-3 right-3 z-[1000]">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder="🔍 ค้นหาสถานที่..."
          className="w-full bg-white/95 backdrop-blur-md border border-slate-200 shadow-lg rounded-xl px-4 py-3 pr-10 text-sm font-bold text-slate-700 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-400 placeholder:font-medium"
        />
      </div>
    </div>
  );
}

// ── Map Click + Marker handler ───────────────────────────────────────────────
function MapContent({ lat, lng, onChange }: MapPickerProps) {
  const map = useMap();
  const hasAutoLocated = useRef(false);

  // Auto-locate once if lat/lng is 0
  useEffect(() => {
    if (lat !== 0 || lng !== 0) return;
    if (hasAutoLocated.current) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    hasAutoLocated.current = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange(pos.coords.latitude, pos.coords.longitude);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, [lat, lng, onChange]);

  // Fly to new location when coords change
  useEffect(() => {
    if (!map || lat === 0 || lng === 0) return;
    map.panTo({ lat, lng });
    if (map.getZoom()! < 14) map.setZoom(15);
  }, [map, lat, lng]);

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        onChange(parseFloat(e.latLng.lat().toFixed(6)), parseFloat(e.latLng.lng().toFixed(6)));
      }
    },
    [onChange]
  );

  return (
    <>
      <Map
        style={{ width: "100%", height: "100%" }}
        defaultCenter={lat !== 0 && lng !== 0 ? { lat, lng } : { lat: 16.4419, lng: 102.8359 }}
        defaultZoom={13}
        gestureHandling="greedy"
        disableDefaultUI={false}
        mapId="rubjob-map"
        onClick={handleMapClick}
      >
        {lat !== 0 && lng !== 0 && (
          <AdvancedMarker
            position={{ lat, lng }}
            draggable
            onDragEnd={(e) => {
              if (e.latLng) {
                onChange(
                  parseFloat(e.latLng.lat().toFixed(6)),
                  parseFloat(e.latLng.lng().toFixed(6))
                );
              }
            }}
          />
        )}
      </Map>
    </>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function GoogleMapPicker({ lat, lng, onChange }: MapPickerProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => setIsMounted(true), []);

  const handlePlaceSelect = useCallback(
    (placeLat: number, placeLng: number) => {
      onChange(placeLat, placeLng);
    },
    [onChange]
  );

  if (!isMounted) {
    return (
      <div className="h-full w-full bg-slate-100 animate-pulse rounded-xl flex items-center justify-center font-bold text-slate-400">
        Loading Map...
      </div>
    );
  }

  if (!GOOGLE_KEY) {
    return (
      <div className="h-full w-full bg-red-50 rounded-xl flex items-center justify-center text-red-500 text-sm font-bold">
        Missing NEXT_PUBLIC_GOOGLE_MAPS_KEY
      </div>
    );
  }

  return (
    <APIProvider apiKey={GOOGLE_KEY} language="th" region="TH">
      <div
        className="w-full rounded-xl overflow-hidden border-2 border-slate-100 z-0 relative"
        style={{ minHeight: "400px", height: "400px" }}
      >
        {/* Places Search */}
        <PlacesSearch onSelect={handlePlaceSelect} />

        {/* Map */}
        <MapContent lat={lat} lng={lng} onChange={onChange} />

        {/* Hint */}
        <div className="absolute bottom-3 left-3 right-3 z-[999] pointer-events-none">
          <p className="text-[10px] font-bold text-slate-500 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow text-center">
            แตะแผนที่หรือลากหมุดเพื่อปรับตำแหน่ง
          </p>
        </div>
      </div>
    </APIProvider>
  );
}
