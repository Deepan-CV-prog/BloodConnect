import React, { useState } from 'react';
import { API_BASE_URL } from '../config';
import { createPortal } from 'react-dom';

const Donors = ({ donors, loading, onRefresh, userRole }) => {
  const isStaff = userRole === 'staff';
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', phone: '', bloodGroup: '', dateOfBirth: '', gender: '', address: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [actionLoading, setActionLoading] = useState(null);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/donors/register-by-staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Donor registered successfully');
        setTimeout(() => {
          setShowModal(false);
          setSuccess('');
          setFormData({ name: '', email: '', password: '', phone: '', bloodGroup: '', dateOfBirth: '', gender: '', address: '' });
          if (onRefresh) onRefresh();
        }, 1500);
      } else {
        setError(data.message || 'Failed to register donor');
      }
    } catch (err) {
      setError('Network error during registration');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEligibilityChange = async (donorId, status) => {
    setActionLoading(donorId);
    setActionError('');
    setActionSuccess('');
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/donors/${donorId}/eligibility`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ eligibilityStatus: status })
      });
      const data = await res.json();
      if (res.ok) {
        setActionSuccess(`Donor marked as ${status}.`);
        setTimeout(() => setActionSuccess(''), 3000);
        if (onRefresh) onRefresh();
      } else {
        setActionError(data.message || 'Failed to update eligibility');
        setTimeout(() => setActionError(''), 3000);
      }
    } catch (err) {
      setActionError('Network error updating eligibility');
      setTimeout(() => setActionError(''), 3000);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div className="loading-state">Loading donors...</div>;

  return (
    <div className="section-container animate-fade-in glass-panel">
      <div className="section-header-row">
        <div>
          <h2 className="section-title">Registered Donors</h2>
          <p className="section-desc">Directory of all registered blood donors.</p>
        </div>
        {isStaff ? (
          <button className="btn-primary" onClick={() => setShowModal(true)}>Register Donor</button>
        ) : (
          <span style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: '#f1f5f9', color: '#475569', fontSize: '12px', fontWeight: '500' }}>
            Admin Oversight Mode (Read-Only)
          </span>
        )}
      </div>

      {actionError && <div style={{ padding: '12px', margin: '0 20px 16px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px' }}>{actionError}</div>}
      {actionSuccess && <div style={{ padding: '12px', margin: '0 20px 16px', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '6px' }}>{actionSuccess}</div>}

      <div className="table-responsive">
        <table className="modern-table">
          <thead>
            <tr>
              <th>Donor Name</th>
              <th>Contact Info</th>
              <th>Blood Group</th>
              <th>Eligibility</th>
              <th>Total Donations</th>
            </tr>
          </thead>
          <tbody>
            {donors.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-state">No donors registered yet.</td>
              </tr>
            ) : (
              donors.map((donor) => (
                <tr key={donor._id} className="table-row">
                  <td>
                    <div className="user-cell">
                      <div className="avatar-small">{donor.userId?.name?.charAt(0) || "U"}</div>
                      <span className="fw-medium">{donor.userId?.name || "Unknown"}</span>
                    </div>
                  </td>
                  <td>
                    <div className="contact-info">
                      <span>{donor.userId?.email || "No email"}</span>
                      <small className="text-muted">{donor.phone || donor.userId?.phone || "No phone"}</small>
                    </div>
                  </td>
                  <td>
                    <span className="blood-pill-small">{donor.bloodGroup}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                      <span className={`status-badge status-${donor.eligibilityStatus || "pending"}`}>
                          {donor.eligibilityStatus || "Pending"}
                        </span>
                        {donor.nextEligibleDate && (
                          <span style={{ fontSize: "11px", color: "#64748b" }}>
                            Next: {new Date(donor.nextEligibleDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                          </span>
                        )}
                      {isStaff && (
                        <select
                          className="form-input"
                          style={{ padding: '2px 6px', fontSize: '11px', borderRadius: '4px', width: 'auto', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', cursor: actionLoading === donor._id ? 'not-allowed' : 'pointer' }}
                          value={donor.eligibilityStatus || 'pending'}
                          onChange={(e) => handleEligibilityChange(donor._id, e.target.value)}
                          disabled={actionLoading === donor._id}
                        >
                          <option value="pending">Pending</option>
                          <option value="eligible">Eligible</option>
                          <option value="ineligible">Ineligible</option>
                        </select>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="donation-count">
                      <strong>{donor.totalDonations || 0}</strong>
                      <small>Last: {donor.lastDonationDate ? new Date(donor.lastDonationDate).toLocaleDateString('en-GB', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' }) : 'Never'}</small>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '12px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px', color: '#0f172a' }}>Register New Donor</h3>

            {error && <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '16px' }}>{error}</div>}
            {success && <div style={{ padding: '12px', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '6px', marginBottom: '16px' }}>{success}</div>}

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>Full Name *</label>
                  <input type="text" name="name" required className="form-input" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} value={formData.name} onChange={handleChange} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>Email Address *</label>
                  <input type="email" name="email" required className="form-input" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} value={formData.email} onChange={handleChange} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>Password *</label>
                  <input type="password" name="password" required className="form-input" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} value={formData.password} onChange={handleChange} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>Phone Number *</label>
                  <input type="tel" name="phone" required className="form-input" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} value={formData.phone} onChange={handleChange} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>Blood Group *</label>
                  <select name="bloodGroup" required className="form-input" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} value={formData.bloodGroup} onChange={handleChange}>
                    <option value="">Select</option>
                    <option value="A+">A+</option><option value="A-">A-</option>
                    <option value="B+">B+</option><option value="B-">B-</option>
                    <option value="AB+">AB+</option><option value="AB-">AB-</option>
                    <option value="O+">O+</option><option value="O-">O-</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>Date of Birth *</label>
                  <input type="date" name="dateOfBirth" required className="form-input" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} value={formData.dateOfBirth} onChange={handleChange} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>Gender *</label>
                  <select name="gender" required className="form-input" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} value={formData.gender} onChange={handleChange}>
                    <option value="">Select</option>
                    <option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>Address *</label>
                <textarea name="address" required className="form-input" rows="2" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }} value={formData.address} onChange={handleChange}></textarea>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#64748b', cursor: 'pointer', fontWeight: '500' }}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting} style={{ padding: '10px 20px' }}>
                  {submitting ? 'Registering...' : 'Register Donor'}
                </button>
              </div>
            </form>
          </div>
        </div>, document.body
      )}
    </div>
  );
};

export default Donors;
