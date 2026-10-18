import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { createPortal } from 'react-dom';

const BloodInventory = ({ bloodGroups, loading, userRole }) => {
  const isStaff = userRole === 'staff';
  const [allUnits, setAllUnits] = useState([]);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [donationsList, setDonationsList] = useState([]);
  const [formData, setFormData] = useState({ donationId: '', expiryDate: '', currentLocation: '', remarks: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Status Update State
  const [actionLoading, setActionLoading] = useState(null);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' });
  };

  const fetchUnits = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/blood-units/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAllUnits(data.bloodUnits || []);
      }
    } catch (error) {
      console.error("Failed to fetch all units", error);
    } finally {
      setUnitsLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, [bloodGroups, refreshTrigger]);

  useEffect(() => {
    if (showModal) {
      const fetchDonations = async () => {
        try {
          const token = localStorage.getItem("token");
          const res = await fetch(`${API_BASE_URL}/api/donations`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            // Filter collected donations that don't already have a blood unit
            const usedDonationIds = new Set(allUnits.map(u => u.donationId));
            const available = (data.donations || []).filter(d => d.status === 'collected' && !usedDonationIds.has(d._id));
            setDonationsList(available);
          }
        } catch (err) {
          console.error("Failed to fetch donations for unit creation", err);
        }
      };
      fetchDonations();
    }
  }, [showModal, allUnits]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleCreateUnit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/blood-units`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(`Blood unit created successfully: ${data.bloodUnit.unitId}`);
        setTimeout(() => {
          setShowModal(false);
          setSuccess('');
          setFormData({ donationId: '', expiryDate: '', currentLocation: '', remarks: '' });
          setRefreshTrigger(prev => prev + 1);
        }, 1500);
      } else {
        setError(data.message || 'Failed to create blood unit');
      }
    } catch (err) {
      setError('Network error creating blood unit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTestingStatusChange = async (unitId, status) => {
    setActionLoading(unitId);
    setActionError('');
    setActionSuccess('');
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/blood-units/${unitId}/testing`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ testingStatus: status })
      });
      const data = await res.json();
      if (res.ok) {
        setActionSuccess(`Testing status updated to ${status}.`);
        setTimeout(() => setActionSuccess(''), 3000);
        setRefreshTrigger(prev => prev + 1);
      } else {
        setActionError(data.message || 'Failed to update status');
        setTimeout(() => setActionError(''), 3000);
      }
    } catch (err) {
      setActionError('Network error updating status');
      setTimeout(() => setActionError(''), 3000);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading || unitsLoading) return <div className="loading-state">Loading inventory data...</div>;

  return (
    <div className="section-container animate-fade-in">
      <div className="section-header-row">
        <div>
          <h2 className="section-title">Blood Inventory</h2>
          <p className="section-desc">Real-time overview of available blood units.</p>
        </div>
        {isStaff ? (
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <span>+</span> Create Blood Unit
          </button>
        ) : (
          <span style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: '#f1f5f9', color: '#475569', fontSize: '12px', fontWeight: '500' }}>
            Admin Oversight Mode (Read-Only)
          </span>
        )}
      </div>

      {actionError && <div style={{ padding: '12px', margin: '0 0 16px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px' }}>{actionError}</div>}
      {actionSuccess && <div style={{ padding: '12px', margin: '0 0 16px', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '6px' }}>{actionSuccess}</div>}

      <div className="inventory-grid" style={{ marginBottom: '32px' }}>
        {bloodGroups.map((blood) => {
          const isLow = blood.units < 5;
          return (
            <div className={`inventory-card glass-panel ${isLow ? 'low-stock-alert' : ''}`} key={blood.group}>
              <div className="card-top">
                <div className="blood-type-badge">
                  {blood.group}
                </div>
                {isLow && <span className="status-badge critical">Low Stock</span>}
              </div>
              <div className="card-body">
                <h3 className="inventory-value">{blood.units}</h3>
                <p className="inventory-label">Units Available</p>
              </div>
              <div className="card-progress">
                <div className="progress-bar" style={{ width: `${Math.min(blood.units * 10, 100)}%`, backgroundColor: isLow ? '#ef4444' : '#10b981' }}></div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="dashboard-card glass-panel w-100">
        <div className="card-header">
          <h3>Inventory Records</h3>
        </div>
        <div className="table-responsive">
          <table className="modern-table">
            <thead>
              <tr>
                <th>Unit ID</th>
                <th>Blood Group</th>
                <th>Dates</th>
                <th>Testing Status</th>
                <th>Inventory Status</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {allUnits.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-state">No blood units in inventory.</td>
                </tr>
              ) : (
                allUnits.map(unit => (
                  <tr key={unit._id}>
                    <td className="fw-medium font-mono">{unit.unitId}</td>
                    <td><span className="blood-pill-small">{unit.bloodGroup}</span></td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', fontSize: '12px' }}>
                        <span style={{ color: '#64748b' }}>Collected: {formatDate(unit.collectionDate)}</span>
                        <span style={{ color: '#0f172a', fontWeight: '500' }}>Exp: {formatDate(unit.expiryDate)}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                        <span className={`status-badge ${unit.testingStatus === 'approved' ? 'passed' : unit.testingStatus === 'rejected' ? 'critical' : 'pending'}`}>
                          {unit.testingStatus || 'Pending'}
                        </span>
                        {isStaff && unit.testingStatus === 'pending' && (
                          <select
                            className="form-input"
                            style={{ padding: '2px 6px', fontSize: '11px', borderRadius: '4px', width: 'auto', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', cursor: actionLoading === unit._id ? 'not-allowed' : 'pointer' }}
                            value={unit.testingStatus}
                            onChange={(e) => handleTestingStatusChange(unit._id, e.target.value)}
                            disabled={actionLoading === unit._id}
                          >
                            <option value="pending">Pending</option>
                            <option value="approved">Approve</option>
                            <option value="rejected">Reject</option>
                          </select>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${unit.inventoryStatus === 'available' ? 'approved' : unit.inventoryStatus === 'allocated' ? 'processing' : 'normal'}`}>
                        {unit.inventoryStatus || 'Stored'}
                      </span>
                    </td>
                    <td className="text-muted">{unit.currentLocation || 'Blood Bank'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '12px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px', color: '#0f172a' }}>Create Blood Unit</h3>

            {error && <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '16px' }}>{error}</div>}
            {success && <div style={{ padding: '12px', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '6px', marginBottom: '16px' }}>{success}</div>}

            <form onSubmit={handleCreateUnit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>Collected Donation *</label>
                <select name="donationId" required className="form-input" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} value={formData.donationId} onChange={handleChange}>
                  <option value="">Select an unprocessed donation</option>
                  {donationsList.map(d => (
                    <option key={d._id} value={d._id}>
                      Donation from {d.donorId?.userId?.name || 'Unknown'} - {d.bloodGroup} ({formatDate(d.donationDate)})
                    </option>
                  ))}
                </select>
                {donationsList.length === 0 && <small style={{ color: '#ef4444', display: 'block', marginTop: '4px' }}>No unprocessed collected donations available.</small>}
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>Expiry Date *</label>
                <input type="date" name="expiryDate" required className="form-input" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} value={formData.expiryDate} onChange={handleChange} min={new Date().toISOString().split('T')[0]} />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>Current Location</label>
                <input type="text" name="currentLocation" className="form-input" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} value={formData.currentLocation} onChange={handleChange} placeholder="e.g. Blood Bank Fridge A" />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>Remarks</label>
                <textarea name="remarks" className="form-input" rows="2" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }} value={formData.remarks} onChange={handleChange} placeholder="Any additional notes..."></textarea>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#64748b', cursor: 'pointer', fontWeight: '500' }}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting || donationsList.length === 0} style={{ padding: '10px 20px' }}>
                  {submitting ? 'Creating...' : 'Create Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>, document.body
      )}
    </div>
  );
};

export default BloodInventory;
