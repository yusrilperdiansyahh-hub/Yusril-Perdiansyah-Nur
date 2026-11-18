import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { EnumerationStatus, HouseholdRecord } from '../types/census';

const STATUS_COLORS: Record<EnumerationStatus, string> = {
  belum_dikunjungi: '#64748b',
  draf: '#d97706',
  tercacah: '#047857',
  menolak: '#dc2626',
  tidak_ditemui: '#2563eb',
  rumah_kosong: '#78716c',
};

const STATUS_LABELS: Record<EnumerationStatus, string> = {
  belum_dikunjungi: 'Belum dikunjungi',
  draf: 'Draf',
  tercacah: 'Tercacah',
  menolak: 'Menolak',
  tidak_ditemui: 'Tidak ditemui',
  rumah_kosong: 'Rumah kosong',
};

export const TerritoryMap: React.FC<{ households: HouseholdRecord[] }> = ({
  households,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [-6.9245, 107.7345],
      zoom: 15,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 20,
    }).addTo(map);
    layerGroupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();
    const mapped = households.filter((h) => h.koordinat_terakhir);
    const bounds: [number, number][] = [];

    for (const h of mapped) {
      const k = h.koordinat_terakhir!;
      bounds.push([k.lat, k.lng]);
      const marker = L.circleMarker([k.lat, k.lng], {
        radius: 8,
        color: '#ffffff',
        weight: 2,
        fillColor: STATUS_COLORS[h.status_pencacahan],
        fillOpacity: 0.92,
      });
      marker.bindPopup(
        `<div style="font-family:sans-serif;min-width:180px;">
          <div style="font-weight:700;font-family:monospace;">${h.id_rt}</div>
          <div style="font-weight:600;margin-top:2px;">${h.nama_kk}</div>
          <div style="font-size:12px;color:#475569;">Bangunan ${h.no_bangunan} · RT ${h.rt}/RW ${h.rw}</div>
          <div style="font-size:12px;margin-top:4px;font-weight:600;">Status: ${STATUS_LABELS[h.status_pencacahan]}</div>
        </div>`
      );
      marker.addTo(group);
    }

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 18 });
    }
  }, [households]);

  const mappedCount = households.filter((h) => h.koordinat_terakhir).length;

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Peta Sebaran Rumah Tangga Desa Cibiru Wetan
          </h3>
          <p className="text-xs text-slate-600 tabular-nums">
            Menampilkan {mappedCount} rumah tangga bertitik koordinat dari {households.length} total daftar induk.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-700">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-700" />
            Tercacah
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-600" />
            Draf
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
            Tidak ditemui
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
            Menolak
          </span>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-300">
        <div ref={containerRef} className="h-[380px] w-full bg-slate-100" />
      </div>
    </div>
  );
};
