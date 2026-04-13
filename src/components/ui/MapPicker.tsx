"use client";

import { useEffect, useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

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
  useEffect(() => {
    if (lat !== 0 && lng !== 0) {
      map.setView([lat, lng], 15);
    }
  }, [lat, lng, map]);
  return null;
}

export default function MapPicker({ lat, lng, onChange }: MapPickerProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return <div className="h-[300px] w-full bg-slate-100 animate-pulse rounded-2xl flex items-center justify-center font-bold text-slate-400">Loading Map...</div>;

  const center: [number, number] = lat !== 0 && lng !== 0 ? [lat, lng] : [13.7563, 100.5018]; // Default to Bangkok

  return (
    <div className="h-[300px] w-full rounded-2xl overflow-hidden border-2 border-slate-100 z-0">
      <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
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
