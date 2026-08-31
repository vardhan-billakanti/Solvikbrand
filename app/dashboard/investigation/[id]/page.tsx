'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { getDvideoUrl } from '@/lib/url';

// Dynamically import map to avoid SSR issues with Leaflet
const MapView = dynamic(() => import('@/components/MapView'), { ssr: false, loading: () => (
  <div style={{ height: '300px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div className="spinner" />
  </div>
)});

interface Visit {
  id: string;
  visitedAt: string;
  consentGiven: boolean;
  locationPermission: string;
  batteryPermission: string;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  locationTimestamp?: string | null;
  userAgent?: string | null;
  browser?: string | null;
  browserVersion?: string | null;
  os?: string | null;
  osVersion?: string | null;
  screenWidth?: number | null;
  screenHeight?: number | null;
  pixelRatio?: number | null;
  language?: string | null;
  timezone?: string | null;
  platform?: string | null;
  deviceType?: string | null;
  batteryLevel?: number | null;
  batteryCharging?: boolean | null;
}

interface Investigation {
  id: string;
  publicToken: string;
  publicUrl?: string;
  name: string;
  description?: string | null;
  destinationUrl?: string | null;
  enabled: boolean;
  createdAt: string;
  visits: Visit[];
  _count: { visits: number };
}

function PermBadge({ status }: { status: string }) {
  const cls = `badge badge-${status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : status === 'unsupported' ? 'unsupported' : 'pending'}`;
  const icon = status === 'granted' ? '✓' : status === 'denied' ? '✗' : status === 'unsupported' ? '—' : '?';
  return <span className={cls}>{icon} {status}</span>;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--border-dim)' }}>
      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <span style={{ fontSize: '13px', color: 'var(--text-primary)', textAlign: 'right', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>{value ?? '—'}</span>
    </div>
  );
}

export default function InvestigationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/investigations/${id}`);
      if (res.status === 404 || res.status === 401) {
        router.push('/dashboard');
        return;
      }
      const data = await res.json();
      if (data.success) {
        setInvestigation(data.data);
        if (data.data.visits.length > 0) setSelectedVisit(data.data.visits[0]);
      }
    } catch {
      showToast('Failed to load investigation', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = () => {
    window.open(`/api/investigations/${id}?format=csv`, '_blank');
  };

  const handleToggle = async () => {
    if (!investigation) return;
    try {
      const res = await fetch(`/api/investigations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !investigation.enabled }),
      });
      const data = await res.json();
      if (data.success) {
        setInvestigation((prev) => prev ? { ...prev, enabled: !prev.enabled } : prev);
        showToast(`Investigation ${!investigation.enabled ? 'activated' : 'disabled'}`);
      }
    } catch {
      showToast('Failed to update', 'error');
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner spinner-lg" style={{ margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading investigation...</p>
      </div>
    </div>
  );

  if (!investigation) return null;

  const trackingUrl = investigation.publicUrl || getDvideoUrl(investigation.publicToken);

  return (
    <>
      {/* Back + Header */}
      <div style={{ marginBottom: '28px' }}>
        <Link href="/dashboard" className="btn btn-ghost btn-sm" style={{ marginBottom: '16px', padding: '6px 10px', color: 'var(--text-secondary)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
          Back to Dashboard
        </Link>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 className="heading-md" style={{ margin: 0 }}>{investigation.name}</h1>
              <span className={`badge ${investigation.enabled ? 'badge-active' : 'badge-inactive'}`}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                {investigation.enabled ? 'Active' : 'Disabled'}
              </span>
            </div>
            {investigation.description && (
              <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>{investigation.description}</p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {investigation.destinationUrl && (
              <a
                href={investigation.destinationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-sm"
                style={{ color: '#60a5fa' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
                Open Destination
              </a>
            )}
            <button className="btn btn-secondary btn-sm" onClick={handleToggle}>
              {investigation.enabled ? '⏸ Disable' : '▶ Enable'}
            </button>
            <button id="export-btn" className="btn btn-secondary btn-sm" onClick={handleExport}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export CSV
            </button>
          </div>
        </div>

        {/* Destination URL banner if set */}
        {investigation.destinationUrl && (
          <div style={{
            marginTop: '16px',
            padding: '10px 14px',
            background: 'rgba(59, 130, 246, 0.06)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '12px',
          }}>
            <span style={{ color: '#60a5fa', fontWeight: 600, flexShrink: 0 }}>🎯 Wrapped Destination:</span>
            <a
              href={investigation.destinationUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#93c5fd',
                textDecoration: 'none',
                fontFamily: 'var(--font-mono)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
              }}
              title={investigation.destinationUrl}
            >
              {investigation.destinationUrl}
            </a>
          </div>
        )}

        {/* Token URL */}
        <div style={{ marginTop: '14px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="token-display" style={{ flex: 1, minWidth: 0, fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {trackingUrl}
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { navigator.clipboard.writeText(trackingUrl); showToast('Dvideo link copied!'); }}
          >
            📋 Copy Dvideo Link
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '28px' }}>
        {[
          { label: 'Total Visits', value: investigation._count.visits, color: '#c4b5fd' },
          { label: 'Created', value: new Date(investigation.createdAt).toLocaleDateString(), color: '#60a5fa' },
          { label: 'Latest Visit', value: investigation.visits[0] ? new Date(investigation.visits[0].visitedAt).toLocaleDateString() : 'None', color: '#34d399' },
        ].map((s) => (
          <div key={s.label} className="stat-card glass-card" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '20px', fontWeight: 800, color: s.color, letterSpacing: '-0.02em' }}>{s.value}</div>
            <div className="stat-label" style={{ marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Two-column layout: visit list + detail */}
      {investigation.visits.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: 'var(--bg-card)', border: '1px solid var(--border-dim)',
          borderRadius: 'var(--radius-xl)',
        }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
          <h3 style={{ margin: '0 0 8px', fontSize: '16px' }}>No visits yet</h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px' }}>
            Share the investigation link to start collecting data
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 280px) 1fr', gap: '20px', alignItems: 'start' }}>
          {/* Visit List */}
          <div className="glass-card" style={{ padding: '16px', maxHeight: '80vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>
              Visits ({investigation._count.visits})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {investigation.visits.map((v, i) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVisit(v)}
                  style={{
                    background: selectedVisit?.id === v.id ? 'rgba(139,92,246,0.12)' : 'transparent',
                    border: `1px solid ${selectedVisit?.id === v.id ? 'rgba(139,92,246,0.3)' : 'transparent'}`,
                    borderRadius: 'var(--radius-sm)', padding: '10px 12px',
                    cursor: 'pointer', textAlign: 'left', color: 'var(--text-primary)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '3px' }}>
                    Visit #{investigation._count.visits - i}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {new Date(v.visitedAt).toLocaleString()}
                  </div>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                    <span className={`badge badge-${v.locationPermission === 'granted' ? 'granted' : 'denied'}`} style={{ fontSize: '9px', padding: '1px 6px' }}>
                      📍 {v.locationPermission}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Visit Detail */}
          {selectedVisit && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Visit Info */}
              <div className="glass-card" style={{ padding: '20px' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 600, color: 'var(--accent-violet)' }}>
                  🆔 Visit Information
                </h3>
                <InfoRow label="Visit ID" value={<code style={{ fontSize: '11px' }}>{selectedVisit.id}</code>} />
                <InfoRow label="Timestamp" value={new Date(selectedVisit.visitedAt).toLocaleString()} />
                <InfoRow label="Consent Given" value={selectedVisit.consentGiven ? '✅ Yes' : '❌ No'} />
                <div style={{ display: 'flex', gap: '16px', padding: '10px 0', borderBottom: '1px solid var(--border-dim)', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Location Perm</span>
                  <PermBadge status={selectedVisit.locationPermission} />
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Battery Perm</span>
                  <PermBadge status={selectedVisit.batteryPermission} />
                </div>
              </div>

              {/* Location */}
              <div className="glass-card" style={{ padding: '20px' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 600, color: '#60a5fa' }}>
                  📍 Location
                </h3>
                {selectedVisit.locationPermission === 'granted' && selectedVisit.latitude !== null ? (
                  <>
                    <InfoRow label="Latitude" value={selectedVisit.latitude?.toFixed(6)} />
                    <InfoRow label="Longitude" value={selectedVisit.longitude?.toFixed(6)} />
                    <InfoRow label="Accuracy" value={selectedVisit.accuracy ? `±${selectedVisit.accuracy.toFixed(1)}m` : null} />
                    <InfoRow label="Location Time" value={selectedVisit.locationTimestamp ? new Date(selectedVisit.locationTimestamp).toLocaleString() : null} />
                    <div style={{ marginTop: '16px', borderRadius: 'var(--radius-md)', overflow: 'hidden', height: '300px' }}>
                      <MapView lat={selectedVisit.latitude!} lng={selectedVisit.longitude!} accuracy={selectedVisit.accuracy} />
                    </div>
                  </>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                    {selectedVisit.locationPermission === 'denied' ? '❌ Location permission was denied by visitor' :
                      selectedVisit.locationPermission === 'pending' ? '⏳ Location was not collected' :
                      '⚠️ Location API not supported'}
                  </p>
                )}
              </div>

              {/* Device */}
              <div className="glass-card" style={{ padding: '20px' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 600, color: '#34d399' }}>
                  💻 Device & Browser
                </h3>
                <InfoRow label="Browser" value={`${selectedVisit.browser || '?'} ${selectedVisit.browserVersion || ''}`} />
                <InfoRow label="OS" value={`${selectedVisit.os || '?'} ${selectedVisit.osVersion || ''}`} />
                <InfoRow label="Device Type" value={selectedVisit.deviceType} />
                <InfoRow label="Platform" value={selectedVisit.platform} />
                <InfoRow label="Screen" value={selectedVisit.screenWidth ? `${selectedVisit.screenWidth} × ${selectedVisit.screenHeight}` : null} />
                <InfoRow label="Pixel Ratio" value={selectedVisit.pixelRatio ? `${selectedVisit.pixelRatio}x` : null} />
                <InfoRow label="Language" value={selectedVisit.language} />
                <InfoRow label="Timezone" value={selectedVisit.timezone} />
                <div style={{ marginTop: '12px' }}>
                  <label className="input-label" style={{ marginBottom: '6px', display: 'block' }}>User Agent</label>
                  <div style={{
                    background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-sm)',
                    padding: '10px 12px', fontSize: '11px', fontFamily: 'var(--font-mono)',
                    color: 'var(--text-secondary)', wordBreak: 'break-all', lineHeight: '1.5'
                  }}>
                    {selectedVisit.userAgent || 'Not available'}
                  </div>
                </div>
              </div>

              {/* Battery */}
              <div className="glass-card" style={{ padding: '20px' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 600, color: '#fbbf24' }}>
                  🔋 Battery
                </h3>
                {selectedVisit.batteryPermission === 'granted' && selectedVisit.batteryLevel !== null ? (
                  <>
                    <InfoRow label="Status" value={selectedVisit.batteryCharging ? '⚡ Charging' : '🔋 Discharging'} />
                    <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border-dim)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Battery Level</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: getBatteryColor(selectedVisit.batteryLevel!) }}>
                          {Math.round((selectedVisit.batteryLevel ?? 0) * 100)}%
                        </span>
                      </div>
                      <div style={{ height: '10px', background: 'rgba(255,255,255,0.06)', borderRadius: '5px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: '5px',
                          width: `${Math.round((selectedVisit.batteryLevel ?? 0) * 100)}%`,
                          background: `linear-gradient(90deg, ${getBatteryColor(selectedVisit.batteryLevel!)}, ${getBatteryColor(selectedVisit.batteryLevel!)}aa)`,
                          transition: 'width 0.5s ease',
                        }} />
                      </div>
                    </div>
                  </>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                    {selectedVisit.batteryPermission === 'unsupported' ? '⚠️ Battery Status API not supported in this browser' : '⏳ Battery data not collected'}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.message}
        </div>
      )}
    </>
  );
}

function getBatteryColor(level: number): string {
  if (level > 0.5) return '#34d399';
  if (level > 0.2) return '#fbbf24';
  return '#f87171';
}
