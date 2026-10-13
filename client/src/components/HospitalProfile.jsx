import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

const HospitalProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    licenseNumber: '',
    location: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/hospitals/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();

      if (response.ok && data.hospital) {
        setProfile(data.hospital);
        setFormData({
          name: data.hospital.name || '',
          contactPerson: data.hospital.contactPerson || '',
          phone: data.hospital.phone || '',
          email: data.hospital.email || '',
          address: data.hospital.address || '',
          licenseNumber: data.hospital.licenseNumber || '',
          location: data.hospital.location || ''
        });
      } else {
        setError("Please ask the Admin to set up your hospital profile.");
      }
    } catch (err) {
      setError("Network error while fetching profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/hospitals/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data.hospital);
        setSuccess("Profile updated successfully!");
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        setError(data.message || "Failed to update profile");
      }
    } catch (err) {
      setError("Network error while updating profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="section-container animate-fade-in glass-panel" style={{ padding: '32px', textAlign: 'center' }}>
        <p style={{ color: '#64748b' }}>Loading profile...</p>
      </div>
    );
  }

  if (!profile && error) {
    return (
      <div className="section-container animate-fade-in glass-panel" style={{ padding: '32px' }}>
        <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '16px', borderRadius: '8px' }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="section-container animate-fade-in glass-panel">
      <div className="section-header-row" style={{ padding: '24px', borderBottom: '1px solid #e2e8f0' }}>
        <div>
          <h2 className="section-title">Hospital Profile</h2>
          <p className="section-desc">Manage your hospital's public and contact information.</p>
        </div>
        <div>
          <span className={`status-badge status-${profile.status || 'active'}`} style={{ textTransform: 'capitalize' }}>
            {profile.status || 'Active'} Account
          </span>
        </div>
      </div>

      <div style={{ padding: '24px' }}>
        {error && (
          <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '24px', fontSize: '14px' }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ padding: '12px', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '6px', marginBottom: '24px', fontSize: '14px' }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '600px' }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
            <label style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Hospital Name *</label>
            <input
              type="text"
              required
              style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Contact Person *</label>
              <input
                type="text"
                required
                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                value={formData.contactPerson}
                onChange={e => setFormData({...formData, contactPerson: e.target.value})}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Phone Number *</label>
              <input
                type="text"
                required
                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
            <label style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Email Address *</label>
            <input
              type="email"
              required
              style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
            <label style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Physical Address *</label>
            <textarea
              required
              rows="3"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }}
              value={formData.address}
              onChange={e => setFormData({...formData, address: e.target.value})}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Location (City/Region)</label>
              <input
                type="text"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                value={formData.location}
                onChange={e => setFormData({...formData, location: e.target.value})}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>License Number (Read-only)</label>
              <input
                type="text"
                disabled
                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#94a3b8' }}
                value={formData.licenseNumber}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '12px' }}>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default HospitalProfile;
