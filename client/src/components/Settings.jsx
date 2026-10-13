import React, { useState, useEffect } from 'react';

const Settings = ({ onLogout }) => {
  const [user, setUser] = useState({ name: "User", email: "", role: "staff", status: "Active" });

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);

  const [pwdData, setPwdData] = useState({ current: '', new: '', confirm: '' });
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }

      const token = localStorage.getItem("token");
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role) {
          setUser(prev => ({ ...prev, role: payload.role }));
        }
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const getDisplayRole = (r) => {
    if (r === "hospital") return "Hospital Representative";
    if (r === "staff") return "Blood Bank Staff";
    if (r === "admin") return "System Administrator";
    return r;
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');

    if (pwdData.new !== pwdData.confirm) {
      setPwdError('New password and confirmation must match.');
      return;
    }

    if (pwdData.new.length < 6) {
      setPwdError('New password must be at least 6 characters long.');
      return;
    }

    setPwdLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: pwdData.current,
          newPassword: pwdData.new
        })
      });

      const data = await res.json();
      if (res.ok) {
        setPwdSuccess('Password changed successfully.');
        setPwdData({ current: '', new: '', confirm: '' });
        setTimeout(() => {
          setIsPasswordModalOpen(false);
          setPwdSuccess('');
        }, 2000);
      } else {
        setPwdError(data.message || 'Failed to change password.');
      }
    } catch (error) {
      setPwdError('Network error. Please try again.');
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="section-container animate-fade-in">
      <div className="section-header-row">
        <div>
          <h2 className="section-title">Account Settings</h2>
          <p className="section-desc">Manage your profile and security preferences.</p>
        </div>
      </div>

      <div className="dashboard-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div className="dashboard-card glass-panel">
          <div className="card-header" style={{ marginBottom: '24px' }}>
            <h3>Account Information</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingBottom: '20px', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', color: '#64748b' }}>
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <h4 style={{ fontSize: '18px', color: '#0f172a', margin: '0 0 4px 0' }}>{user.name}</h4>
                <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>{getDisplayRole(user.role)}</p>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Address</label>
              <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', color: '#334155' }}>
                {user.email || 'Not provided'}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Account Status</label>
              <div style={{ display: 'inline-block', padding: '6px 12px', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '50px', fontSize: '14px', fontWeight: '500' }}>
                Active
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-card glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header" style={{ marginBottom: '24px' }}>
            <h3>Security & Authentication</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
            <div style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '15px', color: '#0f172a', marginBottom: '4px' }}>Password</strong>
                <span style={{ fontSize: '13px', color: '#64748b' }}>Last changed: Unknown</span>
              </div>
              <button className="btn-text" style={{ fontSize: '14px', fontWeight: '600' }} onClick={() => setIsPasswordModalOpen(true)}>Change</button>
            </div>

            <div style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '15px', color: '#0f172a', marginBottom: '4px' }}>Two-Factor Authentication</strong>
                <span style={{ fontSize: '13px', color: '#64748b' }}>Not enabled</span>
              </div>
              <button className="btn-text" style={{ fontSize: '14px', fontWeight: '600' }} onClick={() => setIs2FAModalOpen(true)}>Enable</button>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
              <button
                onClick={onLogout}
                style={{ width: '100%', padding: '12px', backgroundColor: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'background-color 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fecaca'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
              >
                <span>🚪</span> Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {isPasswordModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Change Password</h2>
              <button className="close-btn" onClick={() => { setIsPasswordModalOpen(false); setPwdError(''); setPwdSuccess(''); }}>&times;</button>
            </div>
            <form onSubmit={handlePasswordChange}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {pwdError && <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '6px', fontSize: '14px' }}>{pwdError}</div>}
                {pwdSuccess && <div style={{ padding: '12px', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '6px', fontSize: '14px' }}>{pwdSuccess}</div>}

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Current Password</label>
                  <input type="password" required className="form-input" style={{ width: '100%' }} value={pwdData.current} onChange={e => setPwdData({...pwdData, current: e.target.value})} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>New Password</label>
                  <input type="password" required className="form-input" style={{ width: '100%' }} value={pwdData.new} onChange={e => setPwdData({...pwdData, new: e.target.value})} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Confirm New Password</label>
                  <input type="password" required className="form-input" style={{ width: '100%' }} value={pwdData.confirm} onChange={e => setPwdData({...pwdData, confirm: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer" style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => { setIsPasswordModalOpen(false); setPwdError(''); setPwdSuccess(''); }}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={pwdLoading}>
                  {pwdLoading ? 'Saving...' : 'Save Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {is2FAModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Two-Factor Authentication</h2>
              <button className="close-btn" onClick={() => setIs2FAModalOpen(false)}>&times;</button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛡️</div>
              <h3 style={{ fontSize: '18px', color: '#0f172a', marginBottom: '12px' }}>2FA Not Configured</h3>
              <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.6' }}>
                For this academic implementation of BloodConnect, real Two-Factor Authentication (OTP/SMS/Authenticator App) infrastructure has not been configured.
                <br /><br />
                In a production environment, this would integrate with an SMS gateway or TOTP generator.
              </p>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'center' }}>
              <button type="button" className="btn-primary" onClick={() => setIs2FAModalOpen(false)}>Acknowledge & Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
