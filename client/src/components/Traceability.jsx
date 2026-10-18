import React, { useState } from 'react';
import { Search, MapPin, User, Clock, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../config';

const Traceability = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [traceability, setTraceability] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setLoading(true);
    setError(null);
    setTraceability(null);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/traceability/blood-unit/${searchTerm.trim()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setTraceability(data);
      } else {
        if (response.status === 404) {
          setError("Blood unit not found. Please verify the Unit ID.");
        } else {
          setError(data.message || 'Traceability request failed');
        }
      }
    } catch (err) {
      setError('Failed to fetch traceability: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Derive collection date if available
  const getCollectionDate = () => {
    if (!traceability || !traceability.history || traceability.history.length === 0) return null;
    const collectedEvent = traceability.history.find(h => h.action.toLowerCase().includes('collected') || h.action.toLowerCase().includes('collection'));
    return collectedEvent ? formatDateTime(collectedEvent.performedAt) : formatDateTime(traceability.history[0].performedAt);
  };

  return (
    <div className="section-container animate-fade-in">
      <div className="section-header-row" style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '16px' }}>
        <div>
          <h2 className="section-title">Blood Unit Traceability</h2>
          <p className="section-desc">Track the complete lifecycle of every blood unit</p>
        </div>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '500px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Search Blood Unit (e.g. BU-2026-0004)"
              style={{ width: '100%', padding: '10px 12px 10px 38px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '15px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading} style={{ padding: '0 24px' }}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      {loading && (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
          Loading traceability history...
        </div>
      )}

      {error && (
        <div className="glass-panel animate-fade-in" style={{ padding: '32px', textAlign: 'center', backgroundColor: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c' }}>
          <AlertCircle size={32} style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Error</h3>
          <p>{error}</p>
        </div>
      )}

      {traceability && !loading && !error && (
        <div className="traceability-content animate-fade-in">

          <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
              <div>
                <p style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Blood Unit</p>
                <p className="font-mono" style={{ fontSize: '18px', fontWeight: '600', color: '#0f172a' }}>{traceability.bloodUnit?.unitId || "N/A"}</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Blood Group</p>
                <p style={{ display: 'inline-block', backgroundColor: '#fee2e2', color: '#b91c1c', padding: '2px 12px', borderRadius: '12px', fontWeight: '600', fontSize: '15px' }}>
                  {traceability.bloodUnit?.bloodGroup || "N/A"}
                </p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Current Status</p>
                <p style={{ fontSize: '16px', fontWeight: '500', color: '#334155', textTransform: 'capitalize' }}>
                  {traceability.bloodUnit?.inventoryStatus || "Unknown"}
                </p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Timeline Start Date</p>
                <p style={{ fontSize: '15px', color: '#334155' }}>{getCollectionDate() || "N/A"}</p>
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0f172a', marginBottom: '32px' }}>Lifecycle History</h3>

            {(!traceability.history || traceability.history.length === 0) ? (
              <div style={{ textAlign: 'center', color: '#64748b', padding: '20px 0' }}>
                No traceability history available for this blood unit.
              </div>
            ) : (
              <div style={{ position: 'relative', paddingLeft: '16px' }}>
                <div style={{ position: 'absolute', left: '16px', top: '0', bottom: '0', width: '2px', backgroundColor: '#e2e8f0', zIndex: 0 }}></div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                  {traceability.history.map((item, index) => {
                    const isLatest = index === traceability.history.length - 1;
                    const actionName = item.action.replace(/_/g, ' ');
                    const isRejected = actionName.toLowerCase().includes('reject') || actionName.toLowerCase().includes('discard');

                    return (
                      <div key={item._id || index} style={{ position: 'relative', zIndex: 1, paddingLeft: '32px' }}>
                        <div style={{
                          position: 'absolute', left: '-5px', top: '4px', width: '12px', height: '12px',
                          borderRadius: '50%', backgroundColor: isRejected ? '#ef4444' : (isLatest ? '#3b82f6' : '#94a3b8'),
                          border: '2px solid white', boxShadow: '0 0 0 2px ' + (isRejected ? '#fecaca' : (isLatest ? '#bfdbfe' : '#e2e8f0'))
                        }}></div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: isRejected ? '#b91c1c' : '#0f172a', textTransform: 'capitalize' }}>
                            {actionName}
                          </h4>

                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '13px', color: '#64748b' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Clock size={14} />
                              {formatDateTime(item.performedAt)}
                            </div>

                            {item.performedBy && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <User size={14} />
                                Staff: {item.performedBy.name || item.performedBy}
                              </div>
                            )}

                            {item.location && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <MapPin size={14} />
                                {item.location}
                              </div>
                            )}
                          </div>

                          {item.remarks && (
                            <div style={{ marginTop: '8px', padding: '12px', backgroundColor: isRejected ? '#fef2f2' : '#f8fafc', borderRadius: '6px', fontSize: '13px', color: isRejected ? '#991b1b' : '#475569', borderLeft: `3px solid ${isRejected ? '#ef4444' : '#cbd5e1'}` }}>
                              <strong>Remarks:</strong> {item.remarks}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!traceability && !loading && !error && (
        <div className="glass-panel empty-state large" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#f1f5f9', color: '#94a3b8', marginBottom: '20px' }}>
            <Search size={32} />
          </div>
          <h3 style={{ fontSize: '18px', color: '#334155', marginBottom: '8px' }}>Search Traceability</h3>
          <p style={{ color: '#64748b' }}>Enter a Blood Unit ID above to view its complete lifecycle history.</p>
        </div>
      )}
    </div>
  );
};

export default Traceability;
