"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import MarkerClusterLayer from "./MarkerClusterGroup";

const ACTIVITY_COLORS: Record<string, string> = {
  "Zdravotníctvo": "#ef4444",
  "Školstvo a vzdelávanie": "#3b82f6",
  "Služby": "#22c55e",
  "Sociálne služby": "#f59e0b",
  "Šport": "#8b5cf6",
  "Kultúra": "#ec4899",
  "Životné prostredie": "#10b981",
  "Cestovný ruch a gastro": "#f97316",
};

function getMarkerColor(activity: string | null): string {
  if (!activity) return "#6b7280";
  return ACTIVITY_COLORS[activity] || "#6b7280";
}

function createColoredIcon(color: string, hasNeeds: boolean) {
  const size = hasNeeds ? 14 : 10;
  const border = hasNeeds ? `3px solid ${color}` : `2px solid ${color}`;
  const bg = hasNeeds ? color : `${color}33`;

  return L.divIcon({
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: ${bg};
      border: ${border};
      ${hasNeeds ? "box-shadow: 0 0 6px " + color + ";" : ""}
    "></div>`,
    className: "custom-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

interface OrgMarker {
  id: string;
  ico: string;
  name: string;
  activity: string | null;
  city: string | null;
  legalFormName: string | null;
  latitude: number | null;
  longitude: number | null;
  _count: { helpRequests: number };
}

interface MapProps {
  filters: {
    activity: string;
    search: string;
    city: string;
  };
  onSelectOrg: (id: string) => void;
}

export default function MapComponent({ filters, onSelectOrg }: MapProps) {
  const [orgs, setOrgs] = useState<OrgMarker[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ mapView: "true" });
    if (filters.activity) params.set("activity", filters.activity);
    if (filters.search) params.set("search", filters.search);
    if (filters.city) params.set("city", filters.city);

    try {
      const res = await fetch(`/api/organizations?${params}`);
      const data = await res.json();
      setOrgs(data);
    } catch (err) {
      console.error("Failed to fetch organizations:", err);
    }
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);

  const markerData = useMemo(() => {
    return orgs
      .filter((o) => o.latitude && o.longitude)
      .map((org) => ({
        id: org.id,
        lat: org.latitude!,
        lng: org.longitude!,
        icon: createColoredIcon(
          getMarkerColor(org.activity),
          org._count.helpRequests > 0
        ),
        popupContent: `
          <div style="min-width: 200px">
            <h3 style="font-weight: bold; font-size: 14px; margin-bottom: 4px">${org.name}</h3>
            ${org.activity ? `<p style="font-size: 12px; color: #666; margin-bottom: 2px">${org.activity}</p>` : ""}
            ${org.city ? `<p style="font-size: 12px; color: #999">${org.city}</p>` : ""}
            ${org.legalFormName ? `<p style="font-size: 11px; color: #aaa">${org.legalFormName}</p>` : ""}
            ${org._count.helpRequests > 0 ? `<p style="font-size: 12px; color: #dc2626; font-weight: 600; margin-top: 4px">${org._count.helpRequests} aktívna/e požiadavka/y</p>` : ""}
          </div>
        `,
        onClick: () => onSelectOrg(org.id),
      }));
  }, [orgs, onSelectOrg]);

  return (
    <div className="relative w-full h-full">
      {loading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white px-4 py-2 rounded-lg shadow-lg text-sm text-gray-600">
          Načítavam organizácie...
        </div>
      )}
      <MapContainer
        center={[48.7, 19.5]}
        zoom={8}
        className="w-full h-full"
        minZoom={7}
        maxZoom={18}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MarkerClusterLayer markers={markerData} />
      </MapContainer>
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 rounded-lg shadow-lg p-3 text-xs max-w-[200px]">
        <p className="font-semibold mb-2">Legenda</p>
        <div className="space-y-1">
          {Object.entries(ACTIVITY_COLORS).map(([name, color]) => (
            <div key={name} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full border-2 flex-shrink-0"
                style={{ borderColor: color, backgroundColor: `${color}33` }}
              />
              <span className="truncate">{name}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 mt-2 pt-2 border-t">
            <span className="w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-red-500 flex-shrink-0" />
            <span className="font-semibold">Hľadá pomoc</span>
          </div>
        </div>
      </div>
      <div className="absolute top-4 right-4 z-[1000] bg-white/95 rounded-lg shadow-lg px-3 py-2 text-xs text-gray-600">
        {markerData.length.toLocaleString()} organizácií na mape
      </div>
    </div>
  );
}
