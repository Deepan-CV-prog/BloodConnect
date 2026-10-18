import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

const DonationAppointments = ({ userRole }) => {
  const isStaff = userRole === 'staff';
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [actionError, setActionError] = useState('');

  const fetchAppointments = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/donation-appointments`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.appointments || []);
      } else {
        setError('Failed to load appointments');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleUpdateStatus = async (id, status) => {
    setActionLoading(id);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/donation-appointments/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
          await fetchAppointments();
        } else {
          const data = await res.json();
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

  if (loading) {
    return <div className="animate-pulse p-4">Loading appointments...</div>;
  }

  if (error) {
    return <div className="p-4" style={{ color: '#b91c1c' }}>{error}</div>;
  }

  return (
    <div className="dashboard-card glass-panel animate-fade-in">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Donation Appointments</h3>
        {!isStaff && (
          <span style={{ padding: '4px 10px', borderRadius: '6px', backgroundColor: '#f1f5f9', color: '#475569', fontSize: '12px', fontWeight: '500' }}>
            Admin Oversight Mode (Read-Only)
          </span>
        )}
      </div>
      {actionError && <div style={{ padding: '12px', margin: '16px 20px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px' }}>{actionError}</div>}
      <div className="table-responsive mt-4">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Donor</th>
              <th>Blood Group</th>
              <th>Preferred Date & Time</th>
              <th>Status</th>
              <th>Remarks</th>
              {isStaff && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {appointments.length === 0 ? (
              <tr>
                <td colSpan={isStaff ? 7 : 6} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                  No appointment requests found.
                </td>
              </tr>
            ) : (
              appointments.map(appt => (
                <tr key={appt._id}>
                  <td style={{ fontWeight: '600', color: '#0f172a' }}>{appt.appointmentId}</td>
                  <td>
                    {appt.donorId?.userId?.name || 'Unknown'}<br />
                    <small style={{ color: '#64748b' }}>{appt.donorId?.userId?.email}</small>
                  </td>
                  <td><span className="blood-badge">{appt.donorId?.bloodGroup}</span></td>
                  <td>
                    {new Date(appt.preferredDate).toLocaleDateString('en-GB', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' })}<br />
                    <small style={{ color: '#64748b' }}>{appt.preferredTime}</small>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                      <span className={`status-badge status-${appt.status}`}>
                        {appt.status}
                      </span>
                      {appt.isConflicting && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: '600',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: '#fef3c7',
                            color: '#b45309',
                            border: '1px solid #fcd34d',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title={appt.conflictReason || "Conflicting with deferral window"}
                        >
                          ⚠️ Requires Staff Review
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ color: '#64748b', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {appt.remarks || '-'}
                  </td>
                  {isStaff && (
                    <td>
                      {appt.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="btn-primary"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            disabled={actionLoading === appt._id}
                            onClick={() => handleUpdateStatus(appt._id, 'approved')}
                          >
                            Approve
                          </button>
                          <button
                            className="btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '12px', color: '#dc2626', borderColor: '#fca5a5', backgroundColor: '#fef2f2' }}
                            disabled={actionLoading === appt._id}
                            onClick={() => handleUpdateStatus(appt._id, 'rejected')}
                          >
                            Reject
                          </button>
                        </div>
                      ) : appt.status === 'approved' ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="btn-primary"
                            style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#16a34a' }}
                            disabled={actionLoading === appt._id}
                            onClick={() => handleUpdateStatus(appt._id, 'completed')}
                          >
                            Complete
                          </button>
                          <button
                            className="btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            disabled={actionLoading === appt._id}
                            onClick={() => handleUpdateStatus(appt._id, 'cancelled')}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: '#64748b', fontSize: '13px' }}>No actions</span>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DonationAppointments;
