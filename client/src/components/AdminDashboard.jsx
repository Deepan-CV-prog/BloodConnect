import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import {
  Users,
  Droplet,
  ClipboardList,
  AlertCircle,
  Calendar,
  ShieldCheck,
  Activity,
  RefreshCw,
  Package,
  Eye,
  FileText,
  X
} from 'lucide-react';

const AdminDashboard = ({ onNavigate }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [activeActivityTab, setActiveActivityTab] = useState('requests');
  const [selectedTraceabilityRecord, setSelectedTraceabilityRecord] = useState(null);

  const fetchOverview = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/admin/overview`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const result = await res.json();

      if (res.ok) {
        setData(result.overview);
      } else {
        setError(result.message || 'Failed to load admin overview metrics.');
      }
    } catch (err) {
      console.error('Admin overview fetch error:', err);
      setError('Network error while connecting to the blood bank server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="section-container animate-fade-in">
        <div className="glass-panel" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: 'var(--primary)' }}>
            <Activity className="animate-spin" size={36} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
            Loading System Administration Metrics...
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Aggregating real-time records from MongoDB across inventory, donors, and hospital requests.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="section-container animate-fade-in">
        <div className="glass-panel" style={{ padding: '40px 24px', textAlign: 'center', borderLeft: '4px solid var(--danger)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: 'var(--danger)' }}>
            <AlertCircle size={36} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
            Unable to Load Admin Metrics
          </h3>
          <p style={{ color: 'var(--danger)', fontSize: '14px', marginBottom: '20px' }}>
            {error}
          </p>
          <button className="btn-primary" onClick={() => fetchOverview(true)}>
            Retry Query
          </button>
        </div>
      </div>
    );
  }

  const {
    users = { total: 0, roles: {}, status: {} },
    donors = { total: 0, eligibility: {} },
    bloodUnits = { total: 0, available: 0, testing: 0, testingBreakdown: {}, inventoryStatusBreakdown: {}, inventoryByGroup: {}, totalUnitsByGroup: {} },
    requests = { total: 0, active: 0, emergency: 0, statuses: {} },
    appointments = { total: 0, pending: 0, statuses: {} },
    donations = { total: 0, collected: 0 },
    issuances = { total: 0 },
    recentActivity = { requests: [], donations: [], issuances: [], traceability: [] }
  } = data || {};

  return (
    <div className="admin-dashboard-container animate-fade-in">
      {/* Welcome Banner & Actions */}
      <section className="welcome-banner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div className="welcome-content">
          <h2>System Administration Dashboard</h2>
          <p>Real-time database operational monitoring, supply traceability, and user registry.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            className="btn-secondary"
            onClick={() => fetchOverview(true)}
            disabled={refreshing}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Metrics'}</span>
          </button>
          {onNavigate && (
            <button
              className="btn-primary"
              onClick={() => onNavigate('users')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
            >
              <Users size={16} />
              <span>Manage Users</span>
            </button>
          )}
        </div>
      </section>

      {/* Primary KPI Summary Cards */}
      <section className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {/* Total Users */}
        <div className="stat-card glass-panel">
          <div className="stat-icon-wrapper donor-theme">
            <Users size={22} />
          </div>
          <div className="stat-details">
            <p className="stat-label">Total Users</p>
            <h3 className="stat-value">{users.total}</h3>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <span>{users.roles.donor || 0} Donors</span> •
              <span>{users.roles.staff || 0} Staff</span> •
              <span>{users.roles.hospital || 0} Hosp</span>
            </div>
          </div>
        </div>

        {/* Registered Donors */}
        <div className="stat-card glass-panel">
          <div className="stat-icon-wrapper" style={{ backgroundColor: '#f0fdf4', color: '#166534' }}>
            <ShieldCheck size={22} />
          </div>
          <div className="stat-details">
            <p className="stat-label">Registered Donors</p>
            <h3 className="stat-value">{donors.total}</h3>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              <span style={{ color: '#15803d', fontWeight: '500' }}>{donors.eligibility.eligible || 0} Eligible</span> •
              <span style={{ color: '#b91c1c', fontWeight: '500', marginLeft: '4px' }}>{donors.eligibility.ineligible || 0} Ineligible</span>
            </div>
          </div>
        </div>

        {/* Total Blood Units vs Available */}
        <div className="stat-card glass-panel">
          <div className="stat-icon-wrapper blood-theme">
            <Droplet size={22} />
          </div>
          <div className="stat-details">
            <p className="stat-label">Total Blood Units</p>
            <h3 className="stat-value">{bloodUnits.total}</h3>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              <span>Cataloged Units in DB</span>
            </div>
          </div>
        </div>

        {/* Available Units in Stock */}
        <div className="stat-card glass-panel">
          <div className="stat-icon-wrapper" style={{ backgroundColor: bloodUnits.available > 0 ? '#dcfce7' : '#fee2e2', color: bloodUnits.available > 0 ? '#166534' : '#991b1b' }}>
            <Package size={22} />
          </div>
          <div className="stat-details">
            <p className="stat-label">Available In Stock</p>
            <h3 className="stat-value" style={{ color: bloodUnits.available > 0 ? '#166534' : '#991b1b' }}>
              {bloodUnits.available}
            </h3>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              <span>Tested & Ready for Issuance</span>
            </div>
          </div>
        </div>

        {/* Testing in Progress */}
        <div className="stat-card glass-panel">
          <div className="stat-icon-wrapper" style={{ backgroundColor: '#fef3c7', color: '#b45309' }}>
            <Activity size={22} />
          </div>
          <div className="stat-details">
            <p className="stat-label">Units in Testing</p>
            <h3 className="stat-value">{bloodUnits.testing}</h3>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              <span>Screening Pending</span>
            </div>
          </div>
        </div>

        {/* Active Hospital Requests */}
        <div className="stat-card glass-panel">
          <div className="stat-icon-wrapper request-theme">
            <ClipboardList size={22} />
          </div>
          <div className="stat-details">
            <p className="stat-label">Active Requests</p>
            <h3 className="stat-value">{requests.active}</h3>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              <span>Pending / Processing</span>
            </div>
          </div>
        </div>

        {/* Emergency Requests */}
        <div className="stat-card glass-panel">
          <div className="stat-icon-wrapper emergency-theme">
            <AlertCircle size={22} />
          </div>
          <div className="stat-details">
            <p className="stat-label">Emergency Requests</p>
            <h3 className="stat-value" style={{ color: requests.emergency > 0 ? 'var(--danger)' : 'var(--text-main)' }}>
              {requests.emergency}
            </h3>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              <span>High Priority Active</span>
            </div>
          </div>
        </div>

        {/* Pending Appointments */}
        <div className="stat-card glass-panel">
          <div className="stat-icon-wrapper" style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>
            <Calendar size={22} />
          </div>
          <div className="stat-details">
            <p className="stat-label">Pending Appointments</p>
            <h3 className="stat-value">{appointments.pending}</h3>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              <span>Awaiting Staff Review</span>
            </div>
          </div>
        </div>
      </section>

      {/* Inventory & Operational Pipeline */}
      <div className="dashboard-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        {/* Blood Stock by Blood Group */}
        <div className="dashboard-card glass-panel">
          <div className="card-header" style={{ marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '600' }}>Available Inventory by Group</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Stock counts currently marked as tested, approved & available
              </p>
            </div>
            {onNavigate && (
              <button className="btn-text" onClick={() => onNavigate('inventory')} style={{ fontSize: '13px', color: 'var(--primary)', cursor: 'pointer', background: 'none', border: 'none', fontWeight: '500' }}>
                Full Inventory →
              </button>
            )}
          </div>
          <div className="mini-inventory-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {Object.keys(bloodUnits.inventoryByGroup || {}).map((group) => {
              const count = bloodUnits.inventoryByGroup[group] || 0;
              const isLow = count < 3;
              return (
                <div
                  key={group}
                  className="mini-blood-pill"
                  style={{
                    padding: '12px 8px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: isLow ? '#fef2f2' : '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span className="blood-type" style={{ fontWeight: '700', fontSize: '15px', color: 'var(--primary)' }}>{group}</span>
                  <span className="blood-count" style={{ fontSize: '18px', fontWeight: '600', color: isLow ? '#b91c1c' : 'var(--text-main)' }}>{count}</span>
                  <span style={{ fontSize: '10px', color: isLow ? '#b91c1c' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {count === 0 ? 'Out of Stock' : (isLow ? 'Low Stock' : 'In Stock')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Operational Status Breakdown */}
        <div className="dashboard-card glass-panel">
          <div className="card-header" style={{ marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '600' }}>System Status Breakdown</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Current lifecycle distribution of units, requests & appointments
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Blood Unit Lifecycle Breakdown */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>Blood Units Lifecycle</span>
                <span style={{ color: 'var(--text-muted)' }}>Total: {bloodUnits.total} Units</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span className="status-badge" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>
                  Available: {bloodUnits.inventoryStatusBreakdown.available || 0}
                </span>
                <span className="status-badge" style={{ backgroundColor: '#fef3c7', color: '#b45309' }}>
                  Allocated: {bloodUnits.inventoryStatusBreakdown.allocated || 0}
                </span>
                <span className="status-badge" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
                  Issued: {bloodUnits.inventoryStatusBreakdown.issued || 0}
                </span>
                <span className="status-badge" style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>
                  Not Released: {bloodUnits.inventoryStatusBreakdown.not_released || 0}
                </span>
                <span className="status-badge" style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}>
                  Expired/Discarded: {(bloodUnits.inventoryStatusBreakdown.expired || 0) + (bloodUnits.inventoryStatusBreakdown.discarded || 0)}
                </span>
              </div>
            </div>

            {/* Hospital Request Status Breakdown */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>Hospital Requests Status</span>
                <span style={{ color: 'var(--text-muted)' }}>Total: {requests.total} Requests</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span className="status-badge status-pending">
                  Pending: {requests.statuses.pending || 0}
                </span>
                <span className="status-badge" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
                  Approved: {requests.statuses.approved || 0}
                </span>
                <span className="status-badge" style={{ backgroundColor: '#fef3c7', color: '#b45309' }}>
                  Allocated: {(requests.statuses.allocated || 0) + (requests.statuses.partially_allocated || 0)}
                </span>
                <span className="status-badge status-approved">
                  Completed: {requests.statuses.completed || 0}
                </span>
                <span className="status-badge" style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}>
                  Rejected/Cancelled: {(requests.statuses.rejected || 0) + (requests.statuses.cancelled || 0)}
                </span>
              </div>
            </div>

            {/* Donation Appointments Breakdown */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>Appointments & Donations</span>
                <span style={{ color: 'var(--text-muted)' }}>{appointments.total} Appts • {donations.total} Donations</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span className="status-badge status-pending">
                  Appts Pending: {appointments.statuses.pending || 0}
                </span>
                <span className="status-badge status-approved">
                  Appts Completed: {appointments.statuses.completed || 0}
                </span>
                <span className="status-badge" style={{ backgroundColor: '#f0fdf4', color: '#166534' }}>
                  Donations Collected: {donations.collected || 0}
                </span>
                <span className="status-badge" style={{ backgroundColor: '#f8fafc', color: '#475569' }}>
                  Total Issuances: {issuances.total}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Operational Activity Stream */}
      <div className="dashboard-card glass-panel w-100">
        <div className="card-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600' }}>Recent Operational Records</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Live transaction logs recorded in MongoDB
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveActivityTab('requests')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '500',
                border: activeActivityTab === 'requests' ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                backgroundColor: activeActivityTab === 'requests' ? 'var(--primary-light)' : 'white',
                color: activeActivityTab === 'requests' ? 'var(--primary)' : 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              Hospital Requests ({recentActivity.requests.length})
            </button>
            <button
              onClick={() => setActiveActivityTab('donations')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '500',
                border: activeActivityTab === 'donations' ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                backgroundColor: activeActivityTab === 'donations' ? 'var(--primary-light)' : 'white',
                color: activeActivityTab === 'donations' ? 'var(--primary)' : 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              Recent Donations ({recentActivity.donations.length})
            </button>
            <button
              onClick={() => setActiveActivityTab('traceability')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '500',
                border: activeActivityTab === 'traceability' ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                backgroundColor: activeActivityTab === 'traceability' ? 'var(--primary-light)' : 'white',
                color: activeActivityTab === 'traceability' ? 'var(--primary)' : 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              Traceability & Issuances ({recentActivity.traceability.length})
            </button>
          </div>
        </div>

        {/* Tab 1: Recent Requests */}
        {activeActivityTab === 'requests' && (
          <div className="table-responsive">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Hospital</th>
                  <th>Blood Group</th>
                  <th>Quantity</th>
                  <th>Priority</th>
                  <th>Request Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.requests.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="empty-state">No hospital requests recorded.</td>
                  </tr>
                ) : (
                  recentActivity.requests.map((req) => (
                    <tr key={req._id}>
                      <td className="fw-medium" style={{ fontFamily: 'monospace' }}>
                        {req.requestId || req._id.substring(0, 8)}
                      </td>
                      <td>{req.hospitalId?.name || 'Unknown Hospital'}</td>
                      <td><span className="blood-pill-small">{req.bloodGroup}</span></td>
                      <td>{req.quantity} Units</td>
                      <td>
                        <span className={`priority-badge ${req.priority === 'emergency' ? 'emergency' : 'normal'}`}>
                          {req.priority}
                        </span>
                      </td>
                      <td>{formatDate(req.requestDate)}</td>
                      <td>
                        <span className={`status-badge ${req.status?.toLowerCase() || 'pending'}`}>
                          {req.status || 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Recent Donations */}
        {activeActivityTab === 'donations' && (
          <div className="table-responsive">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Donor</th>
                  <th>Blood Group</th>
                  <th>Volume</th>
                  <th>Staff In-Charge</th>
                  <th>Donation Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.donations.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty-state">No donation records recorded.</td>
                  </tr>
                ) : (
                  recentActivity.donations.map((d) => (
                    <tr key={d._id}>
                      <td className="fw-medium">
                        {d.donorId?.userId?.name || 'Registered Donor'}
                      </td>
                      <td><span className="blood-pill-small">{d.bloodGroup}</span></td>
                      <td>{d.volumeMl} ml</td>
                      <td>{d.staffId?.name || 'Staff Member'}</td>
                      <td>{formatDate(d.donationDate)}</td>
                      <td>
                        <span className={`status-badge ${d.status === 'collected' ? 'status-approved' : 'status-pending'}`}>
                          {d.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Recent Traceability Logs */}
        {activeActivityTab === 'traceability' && (
          <div className="table-responsive">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Blood Unit</th>
                  <th>Blood Group</th>
                  <th>Lifecycle Action</th>
                  <th>Logged By</th>
                  <th>Location</th>
                  <th>Timestamp</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.traceability.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="empty-state">No traceability logs recorded.</td>
                  </tr>
                ) : (
                  recentActivity.traceability.map((t) => (
                    <tr key={t._id}>
                      <td className="fw-medium" style={{ fontFamily: 'monospace' }}>
                        {t.bloodUnitId?.unitId || 'N/A'}
                      </td>
                      <td>
                        <span className="blood-pill-small">
                          {t.bloodUnitId?.bloodGroup || 'N/A'}
                        </span>
                      </td>
                      <td>
                        <span className="status-badge" style={{ backgroundColor: '#f1f5f9', color: '#1e293b', textTransform: 'capitalize' }}>
                          {t.action ? t.action.replace(/_/g, ' ') : 'N/A'}
                        </span>
                      </td>
                      <td>{t.performedBy?.name || 'Staff'}</td>
                      <td>{t.location || 'Blood Bank'}</td>
                      <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        {formatDateTime(t.performedAt)}
                      </td>
                      <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            title={t.remarks ? t.remarks : 'No remarks'}
                            style={{
                              maxWidth: '180px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: 'inline-block'
                            }}
                          >
                            {t.remarks || '—'}
                          </span>
                          {t.remarks && (
                            <button
                              type="button"
                              onClick={() => setSelectedTraceabilityRecord(t)}
                              style={{
                                background: 'none',
                                border: '1px solid #cbd5e1',
                                borderRadius: '4px',
                                padding: '2px 6px',
                                fontSize: '11px',
                                color: '#2563eb',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                transition: 'all 0.15s ease'
                              }}
                              title="Inspect full remarks and record details"
                            >
                              <Eye size={12} />
                              <span>View</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Full Remarks & Traceability Record Details Modal */}
      {selectedTraceabilityRecord && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '16px'
          }}
          onClick={() => setSelectedTraceabilityRecord(null)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '560px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              padding: '28px',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <FileText size={20} color="#2563eb" />
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0f172a', margin: 0 }}>
                    Operational Record & Audit Remarks
                  </h3>
                </div>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                  Full unclipped remarks and transaction metadata for this blood unit.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTraceabilityRecord(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: '4px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px', backgroundColor: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Unit ID</span>
                <p style={{ margin: '2px 0 0', fontFamily: 'monospace', fontWeight: '600', color: '#0f172a' }}>
                  {selectedTraceabilityRecord.bloodUnitId?.unitId || 'N/A'}
                </p>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Blood Group</span>
                <p style={{ margin: '2px 0 0' }}>
                  <span className="blood-pill-small">{selectedTraceabilityRecord.bloodUnitId?.bloodGroup || 'N/A'}</span>
                </p>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Action</span>
                <p style={{ margin: '2px 0 0', textTransform: 'capitalize', fontWeight: '500', color: '#1e293b' }}>
                  {selectedTraceabilityRecord.action ? selectedTraceabilityRecord.action.replace(/_/g, ' ') : 'N/A'}
                </p>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Performed By</span>
                <p style={{ margin: '2px 0 0', fontWeight: '500', color: '#1e293b' }}>
                  {selectedTraceabilityRecord.performedBy?.name || 'Staff'}
                </p>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Location</span>
                <p style={{ margin: '2px 0 0', color: '#334155' }}>
                  {selectedTraceabilityRecord.location || 'Blood Bank'}
                </p>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Date & Time</span>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#334155' }}>
                  {formatDateTime(selectedTraceabilityRecord.performedAt)}
                </p>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <span style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                Full Remarks
              </span>
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '12px 14px',
                  fontSize: '13.5px',
                  lineHeight: '1.5',
                  color: '#0f172a',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}
              >
                {selectedTraceabilityRecord.remarks || 'No remarks recorded for this transaction.'}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setSelectedTraceabilityRecord(null)}
                style={{ padding: '8px 20px', fontSize: '13px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
