import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { createPortal } from 'react-dom';
import HospitalProfile from './HospitalProfile';
import { RefreshCcw, Activity, Clock, CheckCircle, Package } from 'lucide-react';

const HospitalDashboard = ({ requests, onRefresh, initialTab = 'dashboard' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    bloodGroup: 'A+',
    quantity: 1,
    priority: 'normal',
    requiredDate: '',
    remarks: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Details Modal State
  const [viewRequest, setViewRequest] = useState(null);
  const [allocations, setAllocations] = useState([]);
  const [loadingAllocations, setLoadingAllocations] = useState(false);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    setFormSuccess('');

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/blood-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setFormSuccess('Request created successfully');
        setTimeout(() => {
          setShowCreateModal(false);
          setFormSuccess('');
          setFormData({ bloodGroup: 'A+', quantity: 1, priority: 'normal', requiredDate: '', remarks: '' });
          if (onRefresh) onRefresh();
          setActiveTab('requests'); // Switch to requests tab to show the newly created request
        }, 1500);
      } else {
        const data = await response.json();
        setFormError(data.message || 'Failed to create request');
      }
    } catch (error) {
      setFormError('Network error while creating request');
    } finally {
      setFormLoading(false);
    }
  };

  const handleViewDetails = async (request) => {
    setViewRequest(request);
    if (['allocated', 'partially_allocated', 'completed', 'processing'].includes(request.status)) {
      setLoadingAllocations(true);
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE_URL}/api/allocations/request/${request._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setAllocations(data.allocations || []);
        }
      } catch (err) {
        console.error("Failed to fetch allocations", err);
      } finally {
        setLoadingAllocations(false);
      }
    } else {
      setAllocations([]);
    }
  };

  // Derive stats
  const activeRequests = requests.filter(r => ['pending', 'processing', 'partially_allocated', 'allocated'].includes(r.status));
  const pendingRequests = requests.filter(r => r.status === 'pending');
  const completedRequests = requests.filter(r => r.status === 'completed');
  const approvedRequests = requests.filter(r => r.status === 'approved' || r.status === 'processing');

  const renderDashboard = () => (
    <div className="section-container animate-fade-in">
      <div className="section-header-row" style={{ marginBottom: '24px' }}>
        <div>
          <h2 className="section-title">Hospital Overview</h2>
          <p className="section-desc">Manage your blood requests and inventory needs.</p>
        </div>

      </div>

      <div className="stats-grid">
        <div className="stat-card glass-panel">
          <div className="stat-icon-wrapper" style={{ backgroundColor: '#eff6ff', color: '#3b82f6' }}>
            <Activity size={24} />
          </div>
          <div className="stat-details">
            <p className="stat-label">Active Requests</p>
            <h3 className="stat-value">{activeRequests.length}</h3>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon-wrapper" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
            <Clock size={24} />
          </div>
          <div className="stat-details">
            <p className="stat-label">Pending Review</p>
            <h3 className="stat-value">{pendingRequests.length}</h3>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon-wrapper" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>
            <CheckCircle size={24} />
          </div>
          <div className="stat-details">
            <p className="stat-label">Approved & Processing</p>
            <h3 className="stat-value">{approvedRequests.length}</h3>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon-wrapper" style={{ backgroundColor: '#f3f4f6', color: '#4b5563' }}>
            <Package size={24} />
          </div>
          <div className="stat-details">
            <p className="stat-label">Completed</p>
            <h3 className="stat-value">{completedRequests.length}</h3>
          </div>
        </div>
      </div>

      <div className="dashboard-card glass-panel w-100" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <h3>Recent Requests</h3>
        </div>
        <div className="table-responsive">
          <table className="modern-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Blood Group</th>
                <th>Quantity</th>
                <th>Priority</th>
                <th>Required Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.slice(0, 5).map(req => (
                <tr key={req._id}>
                  <td className="font-mono text-muted" style={{ whiteSpace: "nowrap", minWidth: "140px" }}>#{req.requestId || req._id.substring(0, 8)}</td>
                  <td><span className="blood-pill-small">{req.bloodGroup}</span></td>
                  <td className="fw-medium">{req.quantity} Units</td>
                  <td>
                    <span style={{ color: req.priority === 'emergency' ? '#ef4444' : '#64748b', fontWeight: '500', textTransform: 'capitalize' }}>
                      {req.priority}
                    </span>
                  </td>
                  <td>{formatDate(req.requiredDate)}</td>
                  <td>
                    <span className={`status-badge status-${req.status}`}>
                      {req.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr><td colSpan="6" className="empty-state">No recent requests found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderRequests = (isHistory = false) => {
  const displayRequests = isHistory ? requests.filter(r => ['completed', 'rejected', 'cancelled'].includes(r.status)) : requests.filter(r => !['completed', 'rejected', 'cancelled'].includes(r.status));
  return (
    <div className="section-container animate-fade-in glass-panel">
      <div className="section-header-row">
        <div>
          <h2 className="section-title">{isHistory ? 'Request History' : 'My Requests'}</h2>
          <p className="section-desc">{isHistory ? 'View your past and completed blood requests.' : 'Track and monitor your active blood requests.'}</p>
        </div>
        {!isHistory && (
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            <span>+</span> Create Request
          </button>
        )}

      </div>

      <div className="table-responsive">
        <table className="modern-table">
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Blood Group</th>
              <th>Quantity</th>
              <th>Priority</th>
              <th>Request Date</th>
              <th>Required Date</th>
              <th>Status</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {displayRequests.map((request) => (
              <tr key={request._id} className={request.priority === 'emergency' ? 'emergency-row' : ''} style={request.priority === 'emergency' ? { backgroundColor: 'rgba(239, 68, 68, 0.02)', borderLeft: '3px solid #ef4444' } : {}}>
                <td className="font-mono fw-medium" style={{ whiteSpace: "nowrap", minWidth: "140px" }}>#{request.requestId || request._id.substring(0, 8)}</td>
                <td><span className="blood-pill-small">{request.bloodGroup}</span></td>
                <td>{request.quantity} units</td>
                <td style={{ textTransform: 'capitalize', color: request.priority === 'emergency' ? '#ef4444' : '#64748b', fontWeight: '500' }}>{request.priority}</td>
                <td className="text-muted">{formatDate(request.requestDate || request.createdAt)}</td>
                <td>{formatDate(request.requiredDate)}</td>
                <td>
                  <span className={`status-badge status-${request.status}`}>
                    {request.status.replace('_', ' ')}
                  </span>
                </td>
                <td>
                  <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => handleViewDetails(request)}>
                    View
                  </button>
                </td>
              </tr>
            ))}
            {displayRequests.length === 0 && (
              <tr>
                <td colSpan="8" className="empty-state">No requests submitted yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
  };

  const renderProfile = () => <HospitalProfile />;
  let content;
  switch (activeTab) {
    case 'dashboard': content = renderDashboard(); break;
    case 'requests': content = renderRequests(false); break;
    case 'history': content = renderRequests(true); break;
    case 'profile': content = renderProfile(); break;
    default: content = renderDashboard(); break;
  }

  return (
    <>
      {content}

      {showCreateModal && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="modal-content glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '450px', padding: '32px', backgroundColor: 'white', borderRadius: '12px', position: 'relative' }}>
            <button onClick={() => setShowCreateModal(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>&#x2715;</button>
            <h3 style={{ marginBottom: '24px', fontSize: '20px', color: '#0f172a', fontWeight: '600' }}>Create Blood Request</h3>

            {formError && (
              <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' }}>
                {formError}
              </div>
            )}
            {formSuccess && (
              <div style={{ padding: '12px', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' }}>
                {formSuccess}
              </div>
            )}

            <form onSubmit={handleCreateRequest} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#64748b' }}>Blood Group *</label>
                  <select style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} value={formData.bloodGroup} onChange={e => setFormData({...formData, bloodGroup: e.target.value})}>
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#64748b' }}>Quantity (Units) *</label>
                  <input type="number" min="1" required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#64748b' }}>Priority *</label>
                  <select style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}>
                    <option value="normal">Normal</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#64748b' }}>Required Date *</label>
                  <input type="date" required min={new Date().toISOString().split('T')[0]} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} value={formData.requiredDate} onChange={e => setFormData({...formData, requiredDate: e.target.value})} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#64748b' }}>Remarks</label>
                <textarea rows="2" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }} value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} style={{ padding: '10px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#64748b', cursor: 'pointer', fontWeight: '500' }}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={formLoading} style={{ padding: '10px 20px' }}>
                  {formLoading ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {viewRequest && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="modal-content glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '600px', padding: '32px', backgroundColor: 'white', borderRadius: '12px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <button onClick={() => setViewRequest(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>&#x2715;</button>
            <h3 style={{ marginBottom: '24px', fontSize: '20px', color: '#0f172a', fontWeight: '600' }}>Request Details</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div>
                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Request ID</p>
                <p className="font-mono" style={{ fontWeight: '500', color: '#0f172a' }}>{viewRequest.requestId || viewRequest._id}</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Status</p>
                <span className={`status-badge status-${viewRequest.status}`}>{viewRequest.status.replace('_', ' ')}</span>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Blood Group & Quantity</p>
                <p style={{ fontWeight: '500', color: '#0f172a' }}>{viewRequest.quantity} x <span className="blood-pill-small">{viewRequest.bloodGroup}</span></p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Priority</p>
                <p style={{ fontWeight: '500', textTransform: 'capitalize', color: viewRequest.priority === 'emergency' ? '#ef4444' : '#0f172a' }}>{viewRequest.priority}</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Request Date</p>
                <p style={{ fontWeight: '500', color: '#0f172a' }}>{formatDate(viewRequest.requestDate || viewRequest.createdAt)}</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Required Date</p>
                <p style={{ fontWeight: '500', color: '#0f172a' }}>{formatDate(viewRequest.requiredDate)}</p>
              </div>
            </div>

            {loadingAllocations ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>Loading unit information...</div>
            ) : allocations.length > 0 ? (
              <div>
                <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', marginBottom: '12px' }}>Allocated Units</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {allocations.map(alloc => (
                    <div key={alloc._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                      <div>
                        <p className="font-mono" style={{ fontWeight: '500', color: '#0f172a', marginBottom: '4px' }}>{alloc.unitId?.unitId}</p>
                        <p style={{ fontSize: '12px', color: '#64748b' }}>Expiry: {formatDate(alloc.unitId?.expiryDate)}</p>
                      </div>
                      <span className={`status-badge ${alloc.status === 'issued' ? 'passed' : 'pending'}`}>
                        {alloc.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

          </div>
        </div>, document.body
      )}
    </>
  );
};

export default HospitalDashboard;
