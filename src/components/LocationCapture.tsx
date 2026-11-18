import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { AlertTriangle, CheckCircle2, Crosshair, MapPin, Navigation } from 'lucide-react';
import type { GeoCoordinate } from '../types/census';

interface LocationCaptureProps {
  value?: GeoCoordinate;
  onChange: (coord: GeoCoordinate) => void;
}

// Koordinat pusat Desa Cibiru Wetan, Kec. Cileunyi, Kab. Bandung
const DEFAULT_CENTER: [number, number] = [-6.9245, 107.7345];

function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

export const LocationCapture: React.FC<LocationCaptureProps> = ({ value, onChange }) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const [mode, setMode] = useState<'gps' | 'manual'>(value?.method ?? 'gps');
  const [isLocating, setIsLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [liveReading, setLiveReading] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
  } | null>(null);
  const [manualReason, setManualReason] = useState(value?.manual_reason ?? '');

  // Initialize Leaflet map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialCenter: [number, number] = value
      ? [value.lat, value.lng]
      : DEFAULT_CENTER;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: value ? 18 : 15,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 20,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update map click handler when mode changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (mode !== 'manual') return;
      const lat = round6(e.latlng.lat);
      const lng = round6(e.latlng.lng);
      onChange({
        lat,
        lng,
        accuracy: 0,
        timestamp: new Date().toISOString(),
        method: 'manual',
        manual_reason: manualReason,
      });
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [mode, manualReason, onChange]);

  // Sync marker position on map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const target = value
      ? [value.lat, value.lng]
      : liveReading
      ? [liveReading.lat, liveReading.lng]
      : null;

    if (!target) return;

    if (!markerRef.current) {
      markerRef.current = L.circleMarker([target[0], target[1]], {
        radius: 10,
        color: '#ffffff',
        weight: 3,
        fillColor: '#047857',
        fillOpacity: 1,
      }).addTo(map);
    } else {
      markerRef.current.setLatLng([target[0], target[1]]);
    }

    map.setView([target[0], target[1]], Math.max(map.getZoom(), 17), {
      animate: true,
    });
  }, [value, liveReading]);

  const stopGpsWatch = () => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsLocating(false);
  };

  const startGpsCapture = () => {
    setMode('gps');
    setGpsError(null);

    if (!navigator.geolocation) {
      setGpsError('Perangkat atau peramban tidak mendukung GPS. Gunakan titik manual di peta.');
      return;
    }

    stopGpsWatch();
    setIsLocating(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = round6(pos.coords.latitude);
        const lng = round6(pos.coords.longitude);
        const accuracy = Math.round(pos.coords.accuracy * 10) / 10;

        setLiveReading({ lat, lng, accuracy });

        // Otomatis simpan jika akurasi <= 10m atau jika belum ada nilai dan <= 20m
        if (accuracy <= 10) {
          onChange({
            lat,
            lng,
            accuracy,
            timestamp: new Date().toISOString(),
            method: 'gps',
          });
          stopGpsWatch();
        }
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError('Izin lokasi ditolak. Aktifkan izin lokasi atau taruh titik manual di peta.');
        } else if (err.code === err.TIMEOUT) {
          setGpsError('Waktu pencarian GPS habis. Coba lagi di ruang terbuka atau gunakan titik manual.');
        } else {
          setGpsError('Sinyal GPS tidak tersedia. Gunakan titik manual di peta dengan mengisi alasan.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      }
    );
  };

  const acceptCurrentReading = () => {
    if (!liveReading) return;
    onChange({
      lat: liveReading.lat,
      lng: liveReading.lng,
      accuracy: liveReading.accuracy,
      timestamp: new Date().toISOString(),
      method: 'gps',
    });
    stopGpsWatch();
  };

  const handleManualReasonChange = (reason: string) => {
    setManualReason(reason);
    if (value?.method === 'manual') {
      onChange({
        ...value,
        manual_reason: reason,
      });
    }
  };

  const activeAccuracy = liveReading?.accuracy ?? value?.accuracy;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-300 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-base font-bold text-slate-900">
            Titik Lokasi Rumah (WGS84) <span className="text-rose-700">*</span>
          </p>
          <p className="text-sm text-slate-600">
            Ambil di depan pintu rumah. Tunggu sampai akurasi di bawah 10 meter.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={startGpsCapture}
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              mode === 'gps'
                ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                : 'border border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-100'
            }`}
          >
            <Crosshair className="h-4 w-4" />
            <span>{isLocating ? 'Mencari GPS…' : 'Ambil GPS'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              stopGpsWatch();
              setMode('manual');
            }}
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              mode === 'manual'
                ? 'bg-slate-900 text-white'
                : 'border border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-100'
            }`}
          >
            <MapPin className="h-4 w-4" />
            <span>Titik Manual</span>
          </button>
        </div>
      </div>

      {/* Live GPS status */}
      {mode === 'gps' && (isLocating || liveReading) && (
        <div
          className={`rounded-xl border p-3.5 ${
            activeAccuracy !== undefined && activeAccuracy <= 10
              ? 'border-emerald-400 bg-emerald-50 text-emerald-950'
              : activeAccuracy !== undefined && activeAccuracy <= 20
              ? 'border-amber-400 bg-amber-50 text-amber-950'
              : 'border-slate-300 bg-slate-50 text-slate-900'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Navigation className="h-4 w-4" />
                <span>
                  Akurasi saat ini:{' '}
                  <span className="font-mono tabular-nums">
                    {activeAccuracy !== undefined ? `${activeAccuracy} m` : 'Mengukur…'}
                  </span>
                </span>
              </div>
              {activeAccuracy !== undefined && activeAccuracy <= 10 && (
                <p className="text-xs font-medium">
                  Akurasi optimal (≤ 10 m) tercapai dan titik otomatis dikunci.
                </p>
              )}
              {activeAccuracy !== undefined && activeAccuracy > 10 && activeAccuracy <= 20 && (
                <p className="text-xs font-medium">
                  Akurasi 11–20 m. Anda dapat menunggu lebih akurat atau langsung gunakan titik ini dengan peringatan.
                </p>
              )}
              {activeAccuracy !== undefined && activeAccuracy > 20 && (
                <p className="text-xs font-medium">
                  Akurasi masih &gt; 20 m. Tunggu sebentar di ruang terbuka atau pilih Titik Manual.
                </p>
              )}
            </div>

            {liveReading && liveReading.accuracy > 10 && liveReading.accuracy <= 20 && (
              <button
                type="button"
                onClick={acceptCurrentReading}
                className="min-h-[44px] rounded-xl bg-amber-700 px-4 py-2 text-xs font-bold text-white hover:bg-amber-800"
              >
                Gunakan Titik Ini ({liveReading.accuracy} m)
              </button>
            )}
          </div>
        </div>
      )}

      {gpsError && (
        <div className="flex items-start gap-2.5 rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{gpsError}</span>
        </div>
      )}

      {/* Map canvas */}
      <div className="relative overflow-hidden rounded-xl border border-slate-300">
        {mode === 'manual' && (
          <div className="bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
            Mode Manual Aktif: Ketuk lokasi rumah pada peta di bawah untuk menaruh titik.
          </div>
        )}
        <div ref={mapContainerRef} className="h-64 w-full bg-slate-200" />
      </div>

      {/* Saved Coordinate Readout */}
      {value && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-300 bg-emerald-50/70 px-3.5 py-2.5 text-sm">
          <div className="flex items-center gap-2 font-semibold text-emerald-950">
            <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
            <span className="font-mono tabular-nums">
              {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
            </span>
          </div>
          <span className="text-xs font-medium text-slate-700 tabular-nums">
            Metode: {value.method === 'gps' ? `GPS (${value.accuracy} m)` : 'Manual di Peta'}
          </span>
        </div>
      )}

      {/* Manual reason */}
      {mode === 'manual' && (
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-900">
            Alasan penempatan titik manual <span className="text-rose-700">*</span>
          </label>
          <input
            type="text"
            value={manualReason}
            onChange={(e) => handleManualReasonChange(e.target.value)}
            placeholder="Contoh: Sinyal GPS lemah di gang sempit / mendung"
            className="w-full min-h-[48px] rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
          />
        </div>
      )}
    </div>
  );
};
