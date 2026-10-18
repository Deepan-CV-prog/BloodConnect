import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { createPortal } from 'react-dom';

const Donations = ({ donations, loading, onRefresh, userRole }) => {
  const isStaff = userRole === 'staff';
  const [showModal, setShowModal] = useState(false);
  const [donorsList, setDonorsList] = useState([]);
  const [formData, setFormData] = useState({
    donorId: '', donationDate: '', bloodGroup: '', volumeMl: '', remarks: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (showModal) {
      const fetchDonors = async () => {
        try {
          const token = localStorage.getItem("token");
          const res = await fetch(`${API_BASE_URL}/api/donors`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok) setDonorsList(data.donors || []);
        } catch (err) {
          console.error("Failed to load donors", err);
        }
      };
      fetchDonors();
    }
  }, [showModal]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "donorId") {
      const selectedDonor = donorsList.find(d => d._id === value);
      setFormData({
        ...formData,
        donorId: value,
        bloodGroup: selectedDonor ? selectedDonor.bloodGroup : ''
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/donations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ ...formData, status: 'collected' })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Donation recorded successfully');
        setTimeout(() => {
          setShowModal(false);
          setSuccess('');
          setFormData({ donorId: '', donationDate: '', bloodGroup: '', volumeMl: '', remarks: '' });
          if (onRefresh) onRefresh();
        }, 1500);
      } else {
        setError(data.message || 'Failed to record donation');
      }
    } catch (err) {
      setError('Network error during recording');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading-state">Loading donations...</div>;

  return (
    <div className="section-container animate-fade-in glass-panel">
      <div className="section-header-row">
        <div>
          <h2 className="section-title">Donation Records</h2>
          <p className="section-desc">Recent blood donation activities and drives.</p>
        </div>
        {isStaff ? (
          <button className="btn-primary" onClick={() => setShowModal(true)}>Record Donation</button>
        ) : (
          <span style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: '#f1f5f9', color: '#475569', fontSize: '12px', fontWeight: '500' }}>
            Admin Oversight Mode (Read-Only)
          </span>
        )}
      </div>

      <div className="table-responsive">
        <table className="modern-table">
          <thead>
            <tr>
              <th>Donation ID</th>
              <th>Donor</th>
              <th>Blood Group</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {donations.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-state">No donation records found.</td>
              </tr>
            ) : (
              donations.map((donation) => (
                <tr key={donation._id} className="table-row">
                  <td className="font-mono text-muted">#{donation._id?.substring(0, 8)}</td>
                  <td className="fw-medium">{donation.donorId?.userId?.name || "Unknown"}</td>
                  <td>
                    <span className="blood-pill-small">{donation.bloodGroup || "-"}</span>
                  </td>
                  <td>{donation.donationDate ? new Date(donation.donationDate).toLocaleDateString('en-GB', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' }) : "-"}</td>
                  <td>
                    <span className={`status-badge status-${donation.status || 'completed'}`}>
                      {donation.status || 'Completed'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '12px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px', color: '#0f172a' }}>Record Donation</h3>

            {error && <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '16px' }}>{error}</div>}
            {success && <div style={{ padding: '12px', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '6px', marginBottom: '16px' }}>{success}</div>}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>Donor *</label>
                <select name="donorId" required className="form-input" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} value={formData.donorId} onChange={handleChange}>
                  <option value="">Select a registered donor</option>
                  {donorsList.map(d => (
                    <option key={d._id} value={d._id}>{d.userId?.name} ({d.bloodGroup})</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>Donation Date *</label>
                  <input type="date" name="donationDate" required className="form-input" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} value={formData.donationDate} onChange={handleChange} max={new Date().toISOString().split('T')[0]} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>Blood Group *</label>
                  <input type="text" name="bloodGroup" required readOnly className="form-input" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', cursor: 'not-allowed' }} value={formData.bloodGroup} />
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>Volume (ml) *</label>
                <input type="number" name="volumeMl" required min="1" max="1000" className="form-input" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} value={formData.volumeMl} onChange={handleChange} placeholder="e.g., 450" />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>Remarks (Optional)</label>
                <textarea name="remarks" className="form-input" rows="2" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }} value={formData.remarks} onChange={handleChange} placeholder="Any notes..."></textarea>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#64748b', cursor: 'pointer', fontWeight: '500' }}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting} style={{ padding: '10px 20px' }}>
                  {submitting ? 'Recording...' : 'Record Donation'}
                </button>
              </div>
            </form>
          </div>
        </div>, document.body
      )}
    </div>
  );
};

export default Donations;
