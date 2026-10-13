import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import {
  Users,
  Search,
  Filter,
  CheckCircle,
  RefreshCw,
  AlertCircle,
  UserCheck,
  UserX
} from 'lucide-react';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.id) setCurrentUserId(payload.id);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (roleFilter !== 'all') params.append('role', roleFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const res = await fetch(`${API_BASE_URL}/api/admin/users?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (res.ok) {
        setUsers(data.users || []);
      } else {
        setError(data.message || 'Failed to fetch registered users.');
      }
    } catch (err) {
      console.error('Fetch users error:', err);
      setError('Network error while retrieving users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm, roleFilter, statusFilter]);

  const handleToggleStatus = async (user) => {
    if (user._id === currentUserId && user.status === 'active') {
      setActionError('Administrators cannot deactivate their own active session.');
      setTimeout(() => setActionError(''), 4000);
      return;
    }

    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    setActionLoadingId(user._id);
    setActionError('');
    setActionSuccess('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${user._id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await res.json();

      if (res.ok) {
        setActionSuccess(`User ${user.name} marked as ${newStatus}.`);
        setTimeout(() => setActionSuccess(''), 3500);
        setUsers(prev => prev.map(u => u._id === user._id ? { ...u, status: newStatus } : u));
      } else {
        setActionError(data.message || 'Failed to update user status.');
        setTimeout(() => setActionError(''), 4000);
      }
    } catch (err) {
      console.error('Update status error:', err);
      setActionError('Network error while updating user status.');
      setTimeout(() => setActionError(''), 4000);
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'admin':
        return { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' };
      case 'staff':
        return { backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' };
      case 'hospital':
        return { backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' };
      case 'donor':
      default:
        return { backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' };
    }
  };

  return (
    <div className="section-container animate-fade-in glass-panel">
      {/* Header Row with title and refresh */}
      <div className="section-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 className="section-title">User Management</h2>
          <p className="section-desc">Search, filter, and govern accounts across donors, staff, hospitals, and administrators.</p>
        </div>
        <button
          className="btn-secondary"
          onClick={fetchUsers}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Notifications / Alerts */}
      {actionSuccess && (
        <div style={{ padding: '12px 20px', margin: '0 24px 16px', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '6px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={16} />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div style={{ padding: '12px 20px', margin: '0 24px 16px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} />
          <span>{actionError}</span>
        </div>
      )}
      {error && (
        <div style={{ padding: '12px 20px', margin: '0 24px 16px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* Filters Toolbar */}
      <div style={{ padding: '0 24px 20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search Input */}
        <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', paddingLeft: '36px', height: '38px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '13px' }}
          />
        </div>

        {/* Role Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Filter size={15} style={{ color: 'var(--text-muted)' }} />
          <select
            className="form-input"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ height: '38px', padding: '0 12px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '13px', backgroundColor: 'white' }}
          >
            <option value="all">All Roles</option>
            <option value="donor">Donor</option>
            <option value="staff">Staff</option>
            <option value="hospital">Hospital</option>
            <option value="admin">Administrator</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            className="form-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ height: '38px', padding: '0 12px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '13px', backgroundColor: 'white' }}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Records Count Badge */}
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginLeft: 'auto', alignSelf: 'center' }}>
          Showing <strong>{users.length}</strong> {users.length === 1 ? 'user' : 'users'}
        </div>
      </div>

      {/* Users Table */}
      <div className="table-responsive">
        <table className="modern-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Contact Info</th>
              <th>Role</th>
              <th>Account Status</th>
              <th>Registration Date</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="empty-state" style={{ padding: '40px', textAlign: 'center' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                    <RefreshCw className="animate-spin" size={18} />
                    <span>Loading users from database...</span>
                  </div>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-state" style={{ padding: '40px', textAlign: 'center' }}>
                  No users found matching the selected search or filter criteria.
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const isSelf = u._id === currentUserId;
                const isActionLoading = actionLoadingId === u._id;
                return (
                  <tr key={u._id}>
                    <td>
                      <div className="user-cell" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="avatar-small">
                          {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div className="fw-medium" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{u.name}</span>
                            {isSelf && (
                              <span style={{ fontSize: '10px', backgroundColor: '#e2e8f0', color: '#475569', padding: '1px 5px', borderRadius: '4px', textTransform: 'uppercase' }}>
                                You
                              </span>
                            )}
                          </div>
                          <small style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                            ID: {u._id.substring(0, 10)}...
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="contact-info">
                        <span style={{ fontSize: '13px', color: 'var(--text-main)' }}>{u.email}</span>
                        <small style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{u.phone || 'No phone recorded'}</small>
                      </div>
                    </td>
                    <td>
                      <span
                        className="status-badge"
                        style={{ ...getRoleBadgeStyle(u.role), textTransform: 'capitalize', fontWeight: '500' }}
                      >
                        {u.role === 'admin' ? 'Administrator' : u.role}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`status-badge ${u.status === 'active' ? 'status-approved' : 'status-pending'}`}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: u.status === 'active' ? '#16a34a' : '#dc2626' }}></span>
                        {u.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      {formatDate(u.createdAt)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn-secondary"
                        onClick={() => handleToggleStatus(u)}
                        disabled={isActionLoading || (isSelf && u.status === 'active')}
                        title={isSelf && u.status === 'active' ? 'Administrators cannot deactivate their own account' : ''}
                        style={{
                          fontSize: '12px',
                          padding: '4px 10px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          opacity: (isSelf && u.status === 'active') ? 0.5 : 1,
                          cursor: (isSelf && u.status === 'active') ? 'not-allowed' : 'pointer',
                          color: u.status === 'active' ? '#b91c1c' : '#15803d',
                          borderColor: u.status === 'active' ? '#fecaca' : '#bbf7d0',
                          backgroundColor: u.status === 'active' ? '#fef2f2' : '#f0fdf4'
                        }}
                      >
                        {isActionLoading ? (
                          <RefreshCw size={12} className="animate-spin" />
                        ) : u.status === 'active' ? (
                          <>
                            <UserX size={13} />
                            <span>Deactivate</span>
                          </>
                        ) : (
                          <>
                            <UserCheck size={13} />
                            <span>Activate</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement;
