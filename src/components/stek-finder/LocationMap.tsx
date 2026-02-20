import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LocationMapProps {
  lat: number;
  lng: number;
  name: string;
  confidence: number;
}

const LAYERS = {
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
  },
  streets: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
};

const LocationMap = ({ lat, lng, name, confidence }: LocationMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [view, setView] = useState<'satellite' | 'streets'>('satellite');

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView([lat, lng], 15);
    mapInstanceRef.current = map;

    const layer = L.tileLayer(LAYERS.satellite.url, {
      attribution: LAYERS.satellite.attribution,
      maxZoom: 19,
    }).addTo(map);
    tileLayerRef.current = layer;

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
      tileLayerRef.current = null;
    };
  }, [lat, lng, name, confidence]);

  const toggleView = () => {
    const next = view === 'satellite' ? 'streets' : 'satellite';
    setView(next);
    if (mapInstanceRef.current && tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
      const newLayer = L.tileLayer(LAYERS[next].url, {
        attribution: LAYERS[next].attribution,
        maxZoom: 19,
      }).addTo(mapInstanceRef.current);
      tileLayerRef.current = newLayer;
    }
  };

  return (
    <div className="rounded-lg overflow-hidden border border-white/10">
      <div className="relative">
        <div ref={mapRef} style={{ height: '350px', width: '100%' }} />
        <button
          onClick={toggleView}
          className="absolute top-3 right-3 z-[1000] bg-gray-900/80 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-lg border border-white/20 hover:bg-gray-800 transition-colors"
        >
          {view === 'satellite' ? 'Stratenkaart' : 'Satelliet'}
        </button>
      </div>
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-center py-2 bg-gray-800/80 text-sky-400 text-sm hover:bg-gray-700/80 transition-colors"
      >
        Bekijk op Google Maps (satelliet) &rarr;
      </a>
    </div>
  );
};

export default LocationMap;
