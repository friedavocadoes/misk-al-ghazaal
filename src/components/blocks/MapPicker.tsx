"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

export interface PinnedPoint {
  lat: number;
  lng: number;
}

const GCC_CENTER: [number, number] = [24.3, 44.8];

// Tiles: CARTO when a (free) key is configured, Esri light-gray otherwise.
// CARTO has required ?key= since Sep 2026 — keyless requests render their
// "API key required" watermark instead of tiles. Esri needs no key.
// Key: https://carto.com/basemaps/apikey → .env NEXT_PUBLIC_CARTO_KEY.
const CARTO_KEY = process.env.NEXT_PUBLIC_CARTO_KEY;
const TILES = CARTO_KEY
  ? {
      url: `https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attribution/">CARTO</a>',
    }
  : {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      attribution:
        "Esri, HERE, Garmin, OpenStreetMap contributors",
    };

function goldPin(): L.DivIcon {
  return L.divIcon({
    className: "gazaal-pin",
    html: `<span style="display:flex;width:34px;height:34px;align-items:center;justify-content:center;border-radius:9999px;background:#1c1917;border:2px solid #b3924a;box-shadow:0 10px 20px -8px rgba(28,25,23,.6)"><span style="width:10px;height:10px;border-radius:9999px;background:#b3924a"></span></span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

function ClickToPin({ onPin }: { onPin: (p: PinnedPoint) => void }) {
  useMapEvents({
    click(e) {
      onPin({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function FlyTo({ point }: { point: PinnedPoint | null }) {
  const map = useMap();
  useEffect(() => {
    if (point) map.flyTo([point.lat, point.lng], Math.max(map.getZoom(), 12), { duration: 0.8 });
  }, [map, point]);
  return null;
}

/** Free-stack map (OpenStreetMap data, CARTO light tiles — no keys, no
    billing). Tap/drag the gold pin; geolocation optional. */
export function MapPicker({
  point,
  onPin,
}: {
  point: PinnedPoint | null;
  onPin: (p: PinnedPoint) => void;
}) {
  const icon = useMemo(() => goldPin(), []);
  return (
    <MapContainer
      center={GCC_CENTER}
      zoom={5}
      scrollWheelZoom={false}
      className="z-0 h-64 w-full border border-ink/15 md:h-72"
    >
      <TileLayer attribution={TILES.attribution} url={TILES.url} />
      <ClickToPin onPin={onPin} />
      <FlyTo point={point} />
      {point && (
        <Marker
          position={[point.lat, point.lng]}
          icon={icon}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const m = e.target as L.Marker;
              const ll = m.getLatLng();
              onPin({ lat: ll.lat, lng: ll.lng });
            },
          }}
        />
      )}
    </MapContainer>
  );
}
