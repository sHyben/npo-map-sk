"use client";

import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

interface MarkerData {
  id: string;
  lat: number;
  lng: number;
  icon: L.DivIcon;
  popupContent: string;
  onClick: () => void;
}

interface Props {
  markers: MarkerData[];
}

export default function MarkerClusterLayer({ markers }: Props) {
  const map = useMap();
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);

  const updateMarkers = useCallback(() => {
    if (!clusterRef.current) {
      clusterRef.current = L.markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        disableClusteringAtZoom: 15,
      });
      map.addLayer(clusterRef.current);
    }

    clusterRef.current.clearLayers();

    const leafletMarkers = markers.map((m) => {
      const marker = L.marker([m.lat, m.lng], { icon: m.icon });
      marker.bindPopup(m.popupContent, { autoPan: false });
      marker.on("mouseover", () => marker.openPopup());
      marker.on("mouseout", () => marker.closePopup());
      marker.on("click", m.onClick);
      return marker;
    });

    clusterRef.current.addLayers(leafletMarkers);
  }, [markers, map]);

  useEffect(() => {
    updateMarkers();

    return () => {
      if (clusterRef.current) {
        map.removeLayer(clusterRef.current);
        clusterRef.current = null;
      }
    };
  }, [updateMarkers, map]);

  return null;
}
