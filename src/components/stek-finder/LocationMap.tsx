import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LocationMapProps {
  lat: number;
  lng: number;
  name: string;
  confidence: number;
}

const LocationMap = ({ lat, lng, name, confidence }: LocationMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView([lat, lng], 14);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const icon = L.divIcon({
      html: `<div style="
        background: linear-gradient(135deg, #0ea5e9, #f97316);
        width: 32px; height: 32px; border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      "></div>`,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });

    L.marker([lat, lng], { icon })
      .addTo(map)
      .bindPopup(
        `<div style="font-family: sans-serif; text-align: center;">
          <strong>${name}</strong><br/>
          <span style="color: #0ea5e9;">${confidence}% zekerheid</span><br/>
          <small>${lat.toFixed(5)}, ${lng.toFixed(5)}</small>
        </div>`
      )
      .openPopup();

    // Confidence radius circle
    const radius = Math.max(200, (100 - confidence) * 50);
    L.circle([lat, lng], {
      radius,
      color: '#0ea5e9',
      fillColor: '#0ea5e9',
      fillOpacity: 0.1,
      weight: 2,
      dashArray: '5,5',
    }).addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [lat, lng, name, confidence]);

  return (
    <div className="rounded-lg overflow-hidden border border-white/10">
      <div ref={mapRef} style={{ height: '300px', width: '100%' }} />
      <a
        href={`https://www.google.com/maps?q=${lat},${lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-center py-2 bg-gray-800/80 text-sky-400 text-sm hover:bg-gray-700/80 transition-colors"
      >
        Bekijk op Google Maps &rarr;
      </a>
    </div>
  );
};

export default LocationMap;
