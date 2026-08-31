'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapViewProps {
  lat: number;
  lng: number;
  accuracy?: number | null;
}

export default function MapView({ lat, lng, accuracy }: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Fix for default Leaflet icon paths in webpack/Next.js
    const customIcon = L.divIcon({
      className: 'custom-map-pin',
      html: `
        <div style="
          position: relative;
          width: 24px;
          height: 24px;
          transform: translate(-50%, -50%);
        ">
          <div style="
            position: absolute;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: rgba(139, 92, 246, 0.4);
            animation: pulse-glow 2s infinite;
          "></div>
          <div style="
            position: absolute;
            top: 4px;
            left: 4px;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #8b5cf6;
            border: 2px solid #ffffff;
            box-shadow: 0 0 10px rgba(139, 92, 246, 0.8);
          "></div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const map = L.map(mapContainerRef.current, {
      center: [lat, lng],
      zoom: 14,
      zoomControl: true,
      attributionControl: false,
    });

    // Dark-themed tiles from CartoDB
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    // Marker
    L.marker([lat, lng], { icon: customIcon })
      .addTo(map)
      .bindPopup(
        `<div style="color: #0f172a; font-family: sans-serif; font-size: 12px; padding: 4px;">
          <strong>Target Coordinates</strong><br/>
          Lat: ${lat.toFixed(5)}<br/>
          Lng: ${lng.toFixed(5)}<br/>
          ${accuracy ? `Accuracy: ±${accuracy.toFixed(1)}m` : ''}
        </div>`
      );

    // Accuracy Circle
    if (accuracy && accuracy > 0) {
      L.circle([lat, lng], {
        radius: accuracy,
        color: '#8b5cf6',
        fillColor: '#8b5cf6',
        fillOpacity: 0.15,
        weight: 1,
      }).addTo(map);
    }

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [lat, lng, accuracy]);

  return (
    <div
      ref={mapContainerRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '300px',
        borderRadius: 'var(--radius-md)',
        zIndex: 1,
      }}
    />
  );
}
