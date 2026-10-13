import React, { useState } from 'react';
import { Droplet, Activity } from 'lucide-react';
import { API_BASE_URL } from '../config';

const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('staff');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        const actualRole = data.user ? data.user.role : '';
        const isValidRole = actualRole === selectedRole;

        if (isValidRole) {
          localStorage.setItem('token', data.token);
          if (data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
          }
          if (onLoginSuccess) {
            onLoginSuccess(data.token);
          } else {
            window.location.reload();
          }
        } else {
          setError('Selected login type does not match this account.');
        }
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Network error during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f8fafc' }}>
      <div className="login-card glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '32px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#fef2f2', color: '#dc2626', marginBottom: '16px' }}>
            <Activity size={32} strokeWidth={2.5} />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a' }}>BloodConnect</h2>
          <p style={{ color: '#64748b', marginTop: '8px' }}>Log in to access your dashboard</p>
        </div>

        {error && (
          <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '6px', marginBottom: '20px', fontSize: '14px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          <div>
            <p style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#334155', textAlign: 'center' }}>Choose Login Type</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {['admin', 'staff', 'donor', 'hospital'].map(role => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setSelectedRole(role)}
                  style={{
                    padding: '8px 2px',
                    borderRadius: '6px',
                    border: selectedRole === role ? '2px solid #ef4444' : '1px solid #cbd5e1',
                    backgroundColor: selectedRole === role ? '#fef2f2' : 'white',
                    color: selectedRole === role ? '#b91c1c' : '#64748b',
                    fontWeight: selectedRole === role ? '600' : '500',
                    fontSize: '13px',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    transition: 'all 0.2s ease',
                    textAlign: 'center'
                  }}
                >
                  {role === 'admin' ? 'Admin' : role}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#334155' }}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '15px' }}
              placeholder="Enter your email"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#334155' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '15px' }}
              placeholder="Enter your password"
            />
          </div>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '12px', justifyContent: 'center', marginTop: '8px', fontSize: '16px' }}
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
