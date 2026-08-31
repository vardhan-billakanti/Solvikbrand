'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getDvideoUrl } from '@/lib/url';

interface Investigation {
  id: string;
  publicToken: string;
  publicUrl?: string;
  name: string;
  description?: string | null;
  destinationUrl?: string | null;
  enabled: boolean;
  createdAt: string;
  visitCount: number;
  latestVisit?: string | null;
}

interface Stats {
  totalInvestigations: number;
  activeInvestigations: number;
  totalVisits: number;
  visitsToday: number;
}

export default function DashboardPage() {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/investigations?${params}`);
      const data = await res.json();
      if (data.success) {
        setInvestigations(data.data.investigations);
        setStats(data.data.stats);
      }
    } catch {
      showToast('Failed to load investigations', 'error');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggle = async (inv: Investigation) => {
    try {
      const res = await fetch(`/api/investigations/${inv.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !inv.enabled }),
      });
      const data = await res.json();
      if (data.success) {
        setInvestigations((prev) =>
          prev.map((i) => (i.id === inv.id ? { ...i, enabled: !inv.enabled } : i))
        );
        showToast(`Investigation ${!inv.enabled ? 'activated' : 'disabled'}`);
      }
    } catch {
      showToast('Failed to update status', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/investigations/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setInvestigations((prev) => prev.filter((i) => i.id !== id));
        setDeleteConfirmId(null);
        showToast('Investigation deleted permanently');
        fetchData(); // refresh stats
      }
    } catch {
      showToast('Failed to delete', 'error');
    }
  };

  const handleCopy = (inv: Investigation) => {
    const url = inv.publicUrl || getDvideoUrl(inv.publicToken);
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(inv.id);
      showToast('Dvideo link copied to clipboard!');
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const getTrackingUrl = (token: string, publicUrl?: string) => publicUrl || getDvideoUrl(token);

  const filteredInvestigations = investigations.filter((inv) =>
    inv.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* Header */}
      <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="heading-lg" style={{ margin: '0 0 6px' }}>
            Investigation Hub
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
            Manage your investigation links, wrapped destinations, and analyze collected intelligence
          </p>
        </div>
        <button
          id="create-investigation-btn"
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
          style={{ flexShrink: 0 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Investigation
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{
          display: 'grid', gap: '16px', marginBottom: '32px',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))'
        }}>
          {[
            { label: 'Total Links', value: stats.totalInvestigations, color: '#c4b5fd', icon: '🔗' },
            { label: 'Active Links', value: stats.activeInvestigations, color: '#34d399', icon: '✅' },
            { label: 'Total Visits', value: stats.totalVisits, color: '#60a5fa', icon: '👁' },
            { label: 'Visits Today', value: stats.visitsToday, color: '#fbbf24', icon: '📍' },
          ].map((stat) => (
            <div key={stat.label} className="stat-card glass-card">
              <div style={{ fontSize: '20px', marginBottom: '8px' }}>{stat.icon}</div>
              <div className="stat-value" style={{ color: stat.color }}>{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="input"
            style={{ paddingLeft: '40px' }}
            placeholder="Search investigations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="search-input"
          />
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: '13px', whiteSpace: 'nowrap' }}>
          {filteredInvestigations.length} result{filteredInvestigations.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Investigation Cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div className="spinner spinner-lg" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading investigations...</p>
        </div>
      ) : filteredInvestigations.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '80px 20px',
          background: 'var(--bg-card)', border: '1px solid var(--border-dim)',
          borderRadius: 'var(--radius-xl)',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
          <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 600 }}>
            {search ? 'No results found' : 'No investigations yet'}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 24px' }}>
            {search ? `No investigations match "${search}"` : 'Create your first investigation link to start collecting intelligence'}
          </p>
          {!search && (
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              Create First Investigation
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
          {filteredInvestigations.map((inv) => (
            <InvestigationCard
              key={inv.id}
              inv={inv}
              onToggle={handleToggle}
              onDelete={() => setDeleteConfirmId(inv.id)}
              onCopy={handleCopy}
              copied={copiedId === inv.id}
              getUrl={getTrackingUrl}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(inv) => {
            setInvestigations((prev) => [inv, ...prev]);
            setShowCreateModal(false);
            showToast('Investigation created!');
            fetchData();
          }}
          showToast={showToast}
          getUrl={getTrackingUrl}
        />
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirmId && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: '18px' }}>Delete Investigation?</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
                This will permanently delete the investigation and all associated visit records. This action cannot be undone.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setDeleteConfirmId(null)}>
                Cancel
              </button>
              <button
                id="confirm-delete-btn"
                className="btn btn-danger"
                style={{ flex: 1 }}
                onClick={() => handleDelete(deleteConfirmId)}
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.message}
        </div>
      )}
    </>
  );
}

// ─── Investigation Card ──────────────────────────────────────────
function InvestigationCard({
  inv, onToggle, onDelete, onCopy, copied, getUrl
}: {
  inv: Investigation;
  onToggle: (inv: Investigation) => void;
  onDelete: () => void;
  onCopy: (inv: Investigation) => void;
  copied: boolean;
  getUrl: (token: string, publicUrl?: string) => string;
}) {
  return (
    <div className="glass-card" style={{ padding: '20px', transition: 'all 0.25s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', gap: '12px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {inv.name}
            </h3>
            <span className={`badge ${inv.enabled ? 'badge-active' : 'badge-inactive'}`}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
              {inv.enabled ? 'Active' : 'Disabled'}
            </span>
          </div>
          {inv.description && (
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {inv.description}
            </p>
          )}
        </div>
      </div>

      {/* Destination URL Display */}
      {inv.destinationUrl && (
        <div style={{
          marginBottom: '12px',
          padding: '8px 10px',
          background: 'rgba(59, 130, 246, 0.06)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '11px',
        }}>
          <span style={{ color: '#60a5fa', fontWeight: 600, flexShrink: 0 }}>🎯 Target:</span>
          <a
            href={inv.destinationUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#93c5fd',
              textDecoration: 'none',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontFamily: 'var(--font-mono)',
              flex: 1,
            }}
            title={inv.destinationUrl}
          >
            {inv.destinationUrl}
          </a>
        </div>
      )}

      {/* Generated Dvideo Link Token */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '4px' }}>
          Generated Dvideo Link
        </div>
        <div className="token-display" style={{ fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {getUrl(inv.publicToken, inv.publicUrl)}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
          </svg>
          <strong style={{ color: 'var(--text-primary)' }}>{inv.visitCount}</strong> visits
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Created {new Date(inv.createdAt).toLocaleDateString()}
        </div>
        {inv.latestVisit && (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
            Last: {new Date(inv.latestVisit).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <Link
          href={`/dashboard/investigation/${inv.id}`}
          className="btn btn-secondary btn-sm"
          style={{ flex: 1, minWidth: '70px' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
          </svg>
          Results
        </Link>

        {/* Copy Dvideo Link button */}
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => onCopy(inv)}
          title="Copy Dvideo Link"
          style={{
            color: copied ? 'var(--accent-green)' : 'var(--text-secondary)',
            fontSize: '12px',
            padding: '6px 10px',
          }}
        >
          {copied ? (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span>Copied</span>
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              <span>Copy Dvideo Link</span>
            </>
          )}
        </button>

        {/* Open Destination button */}
        {inv.destinationUrl && (
          <a
            href={inv.destinationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-sm"
            style={{ color: '#60a5fa', fontSize: '12px', padding: '6px 10px' }}
            title="Open Destination URL"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            <span>Open Destination</span>
          </a>
        )}

        <button
          className={`btn btn-sm btn-icon ${inv.enabled ? 'btn-ghost' : 'btn-success'}`}
          onClick={() => onToggle(inv)}
          title={inv.enabled ? 'Disable' : 'Enable'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {inv.enabled ? (
              <><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></>
            ) : (
              <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></>
            )}
          </svg>
        </button>

        <button
          className="btn btn-danger btn-sm btn-icon"
          onClick={onDelete}
          title="Delete"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Create Modal ───────────────────────────────────────────────
function CreateModal({
  onClose, onCreated, showToast, getUrl
}: {
  onClose: () => void;
  onCreated: (inv: Investigation) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  getUrl: (token: string, publicUrl?: string) => string;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdInv, setCreatedInv] = useState<Investigation | null>(null);
  const [copied, setCopied] = useState(false);

  const validateUrl = (url: string): boolean => {
    if (!url.trim()) return true;
    try {
      const parsed = new URL(url.trim());
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUrlError('');

    if (destinationUrl.trim() && !validateUrl(destinationUrl)) {
      setUrlError('Please enter a valid HTTP or HTTPS URL (e.g. https://www.youtube.com/watch?v=...)');
      return;
    }

    if (loading) return;
    setLoading(true);

    try {
      const res = await fetch('/api/investigations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          destinationUrl: destinationUrl.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCreatedInv({ ...data.data, visitCount: 0 });
        onCreated({ ...data.data, visitCount: 0 });
      } else {
        showToast(data.error || 'Failed to create investigation', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!createdInv) return;
    navigator.clipboard.writeText(getUrl(createdInv.publicToken, createdInv.publicUrl)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {!createdInv ? (
          <>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: 700 }}>
                New Investigation
              </h2>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px' }}>
                Generate a secure Dvideo link with an optional destination URL wrapper
              </p>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div className="form-group">
                <label className="input-label" htmlFor="inv-name">Investigation Name *</label>
                <input
                  id="inv-name"
                  className="input"
                  placeholder="e.g., Phishing Campaign Analysis"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={100}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="input-label" htmlFor="inv-dest">Destination URL (Optional)</label>
                <input
                  id="inv-dest"
                  className="input"
                  type="url"
                  placeholder="e.g., https://www.youtube.com/watch?v=EXAMPLE"
                  value={destinationUrl}
                  onChange={(e) => {
                    setDestinationUrl(e.target.value);
                    if (urlError) setUrlError('');
                  }}
                  maxLength={2048}
                />
                {urlError ? (
                  <p style={{ color: '#f87171', fontSize: '12px', margin: '4px 0 0' }}>{urlError}</p>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '11px', margin: '4px 0 0' }}>
                    Visitors will be redirected to this website/video after telemetry collection
                  </p>
                )}
              </div>

              <div className="form-group">
                <label className="input-label" htmlFor="inv-desc">Description (optional)</label>
                <textarea
                  id="inv-desc"
                  className="input"
                  placeholder="Investigation notes or context..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                  rows={2}
                  style={{ resize: 'vertical', minHeight: '60px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
                  Cancel
                </button>
                <button
                  id="generate-link-btn"
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={loading || !name.trim()}
                >
                  {loading ? <><div className="spinner" style={{ width: '14px', height: '14px' }} /> Generating...</> : '⚡ Generate Link'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h3 style={{ margin: '0 0 4px', fontSize: '18px' }}>Investigation Created!</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px' }}>{createdInv.name}</p>
            </div>

            {createdInv.destinationUrl && (
              <div style={{
                marginBottom: '14px',
                padding: '10px 12px',
                background: 'rgba(59, 130, 246, 0.06)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
              }}>
                <div style={{ color: '#60a5fa', fontWeight: 600, marginBottom: '2px' }}>Target Destination:</div>
                <div style={{ color: '#93c5fd', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                  {createdInv.destinationUrl}
                </div>
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label className="input-label" style={{ marginBottom: '8px', display: 'block' }}>
                Your Generated Dvideo Link
              </label>
              <div className="token-display" style={{ wordBreak: 'break-all', fontSize: '12px', marginBottom: '10px' }}>
                {getUrl(createdInv.publicToken, createdInv.publicUrl)}
              </div>
              <button
                id="copy-generated-link-btn"
                className={`btn w-full ${copied ? 'btn-success' : 'btn-secondary'}`}
                style={{ width: '100%' }}
                onClick={handleCopy}
              >
                {copied ? '✅ Dvideo Link Copied!' : '📋 Copy Dvideo Link'}
              </button>
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={onClose}>
              Done
            </button>
          </>
        )}
      </div>
    </div>
  );
}
