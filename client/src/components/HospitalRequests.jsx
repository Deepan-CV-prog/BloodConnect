import React, { useState } from 'react';

const HospitalRequests = ({ requests, loading, onRefresh }) => {
  const [updatingId, setUpdatingId] = useState(null);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  React.useEffect(() => {
    const fetchCounts = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        // We only need to check requests that might have pending allocations
        const relevantRequests = requests.filter(r => r.status === 'partially_allocated' || r.status === 'allocated' || r.status === 'processing');
        if (relevantRequests.length === 0) return;

        const counts = {};
        await Promise.all(relevantRequests.map(async (req) => {
          try {
            const res = await fetch(`${API_BASE_URL}/api/allocations/request/${req._id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
              const data = await res.json();
              const pendingCount = (data.allocations || []).filter(a => a.status === 'allocated').length;
              counts[req._id] = pendingCount;
            }
          } catch (e) {
            console.error(`Failed to fetch allocations for ${req._id}`, e);
          }
        }));

        setAllocationCounts(prev => ({...prev, ...counts}));
      } catch (err) {
        console.error("Failed to fetch allocation counts", err);
      }
    };

    fetchCounts();
  }, [requests]);

  const handleStatusChange = async (requestId, newStatus) => {
    setUpdatingId(requestId);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/blood-requests/${requestId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        if (onRefresh) onRefresh();
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to update status');
      }
    } catch (error) {
      alert('Error updating status');
    } finally {
      setUpdatingId(null);
    }
  };


  const [allocatingRequest, setAllocatingRequest] = useState(null);
  const [availableUnits, setAvailableUnits] = useState([]);
  const [allocUnitId, setAllocUnitId] = useState('');
  const [allocRemarks, setAllocRemarks] = useState('');
  const [allocLoading, setAllocLoading] = useState(false);
  const [allocError, setAllocError] = useState('');

  const [issuingRequest, setIssuingRequest] = useState(null);
  const [requestAllocations, setRequestAllocations] = useState([]);
  const [issuanceData, setIssuanceData] = useState({});
  const [issueError, setIssueError] = useState('');
  const [issueSuccess, setIssueSuccess] = useState('');

  const handleOpenAllocate = async (request) => {
    setAllocatingRequest(request);
    setAllocUnitId('');
    setAllocRemarks('');
    setAllocError('');
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/blood-units?bloodGroup=${encodeURIComponent(request.bloodGroup)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAvailableUnits(data.bloodUnits || []);
        if (data.bloodUnits?.length > 0) {
          setAllocUnitId(data.bloodUnits[0]._id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch available units", err);
    }
  };

  const submitAllocation = async (e) => {
    e.preventDefault();
    if (!allocUnitId) return;
    setAllocLoading(true);
    setAllocError('');
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/allocations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          requestId: allocatingRequest._id,
          unitId: allocUnitId,
          remarks: allocRemarks
        }),
      });

      if (response.ok) {
        setAllocatingRequest(null);
        if (onRefresh) onRefresh();
      } else {
        const data = await response.json();
        setAllocError(data.message || 'Failed to allocate unit');
      }
    } catch (error) {
      setAllocError('Error during allocation');
    } finally {
      setAllocLoading(false);
    }
  };

  const handleOpenIssue = async (request) => {
    setIssuingRequest(request);
    setRequestAllocations([]);
    setIssuanceData({});
    setIssueError('');
    setIssueSuccess('');
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/allocations/request/${request._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const activeAllocations = (data.allocations || []).filter(a => a.status === 'allocated');
        setRequestAllocations(activeAllocations);
      }
    } catch (err) {
      console.error("Failed to fetch allocations", err);
    }
  };

  const [issuingUnitId, setIssuingUnitId] = useState(null);

  const handleIssueAllocation = async (allocationId) => {
    if (issuingUnitId) return; // Prevent double-clicks causing race conditions

    const receivedBy = issuanceData[allocationId]?.receivedBy;
    if (!receivedBy) {
      setIssueError('Please enter a receiver name');
      return;
    }
    setIssuingUnitId(allocationId);
    setIssueError('');
    setIssueSuccess('');
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/issuances`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          allocationId,
          receivedBy,
          remarks: issuanceData[allocationId]?.remarks || ''
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setIssueSuccess(data.message || 'Blood unit issued successfully');
        setTimeout(() => {
          handleOpenIssue(issuingRequest); // refresh list and remove issued unit
          if (onRefresh) onRefresh(); // refresh hospital requests
        }, 1500);
      } else {
        setIssueError(data.error || data.message || 'Failed to issue unit');
      }
    } catch (error) {
      setIssueError('Error during issuance: ' + error.message);
    } finally {
      setIssuingUnitId(null);
    }
  };

  if (loading) return <div className="loading-state">Loading hospital requests...</div>;

  return (
    <div className="section-container animate-fade-in glass-panel">
      <div className="section-header-row">
        <div>
          <h2 className="section-title">Hospital Requests</h2>
          <p className="section-desc">Manage inbound blood requests from registered hospitals.</p>
        </div>
      </div>

      <div className="table-responsive">
        <table className="modern-table">
          <thead>
            <tr>
              <th>Hospital Name</th>
              <th>Blood Group</th>
              <th>Quantity</th>
              <th>Priority</th>
              <th>Request Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty-state">No hospital requests currently.</td>
              </tr>
            ) : (
              requests.map((request) => {
                const isEmergency = request.priority === "emergency";
                return (
                  <tr
                    key={request._id}
                    className={`table-row ${isEmergency ? 'emergency-row' : ''}`}
                    style={isEmergency ? { backgroundColor: 'rgba(239, 68, 68, 0.05)', borderLeft: '4px solid #ef4444' } : {}}
                  >
                    <td className="fw-medium">
                      {isEmergency && <span style={{ marginRight: '8px' }}>🚨</span>}
                      {request.hospitalId?.name || "Unknown Hospital"}
                    </td>
                    <td>
                      <span className="blood-pill-small">{request.bloodGroup}</span>
                    </td>
                    <td>{request.quantity} Units</td>
                    <td>
                      <span className={`priority-badge ${isEmergency ? "emergency" : "normal"}`}>
                        {request.priority}
                      </span>
                    </td>
                    <td>
                      {formatDate(request.requestDate)}
                    </td>
                    <td>
                      <span className={`status-badge ${request.status?.toLowerCase() || 'pending'}`}>
                        {request.status || 'Pending'}
                      </span>
                    </td>
                    <td style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <select
                        className="status-dropdown"
                        value={request.status}
                        onChange={(e) => handleStatusChange(request._id, e.target.value)}
                        disabled={updatingId === request._id || ['allocated', 'partially_allocated', 'processing', 'completed'].includes(request.status)}
                        style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}
                      >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        {['allocated', 'partially_allocated', 'processing', 'completed'].includes(request.status) && (
                          <option value={request.status}>
                            {request.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                          </option>
                        )}
                        <option value="rejected">Rejected</option>
                        <option value="cancelled">Cancelled</option>
                      </select>

                      {(request.status === 'approved' || request.status === 'partially_allocated') && (
                        <button
                          onClick={() => handleOpenAllocate(request)}
                          style={{ padding: '4px 8px', fontSize: '12px', backgroundColor: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Allocate
                        </button>
                      )}

                      {(
                        request.status === 'allocated' ||
                        (['partially_allocated', 'processing'].includes(request.status) && allocationCounts[request._id] > 0)
                      ) && (
                        <button
                          onClick={() => handleOpenIssue(request)}
                          style={{ padding: '4px 8px', fontSize: '12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Issue Units
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>


      {allocatingRequest && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="modal-content glass-panel" style={{ width: '400px', padding: '24px', backgroundColor: 'white', position: 'relative' }}>
            <button
              onClick={() => setAllocatingRequest(null)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}
            >
              ✕
            </button>
            <h3 style={{ marginBottom: '16px', fontSize: '20px' }}>Allocate Blood Unit</h3>

            {allocError && (
              <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' }}>
                {allocError}
              </div>
            )}

            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>
              Request ID: {allocatingRequest.requestId || allocatingRequest._id}<br/>
              Group: <strong>{allocatingRequest.bloodGroup}</strong><br/>
              Requested: {allocatingRequest.quantity} units
            </p>

            <form onSubmit={submitAllocation} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: '#64748b' }}>Select Available Unit</label>
                <select
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  value={allocUnitId}
                  onChange={e => setAllocUnitId(e.target.value)}
                  required
                >
                  {availableUnits.length === 0 && <option value="">No available units for {allocatingRequest.bloodGroup}</option>}
                  {availableUnits.map(unit => (
                    <option key={unit._id} value={unit._id}>{unit.unitId} (Exp: {formatDate(unit.expiryDate)})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: '#64748b' }}>Remarks (Optional)</label>
                <textarea
                  rows="2"
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  value={allocRemarks}
                  onChange={e => setAllocRemarks(e.target.value)}
                />
              </div>

              <button type="submit" className="btn-primary" disabled={allocLoading || availableUnits.length === 0} style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}>
                {allocLoading ? 'Allocating...' : 'Confirm Allocation'}
              </button>
            </form>
          </div>
        </div>
      )}

      {issuingRequest && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="modal-content glass-panel" style={{ width: '500px', padding: '24px', backgroundColor: 'white', position: 'relative' }}>
            <button
              onClick={() => setIssuingRequest(null)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}
            >
              ✕
            </button>
            <h3 style={{ marginBottom: '16px', fontSize: '20px' }}>Issue Allocated Units</h3>

            {issueError && (
              <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' }}>
                {issueError}
              </div>
            )}

            {issueSuccess && (
              <div style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' }}>
                {issueSuccess}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '400px', overflowY: 'auto' }}>
              {requestAllocations.length === 0 ? (
                <p>No allocated units are pending issuance.</p>
              ) : (
                requestAllocations.map(alloc => (
                  <div key={alloc._id} style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <strong>Unit: {alloc.unitId?.unitId}</strong>
                      <span className={`status-badge ${alloc.status}`}>{alloc.status}</span>
                    </div>

                    {alloc.status === 'allocated' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <input
                          type="text"
                          placeholder="Receiver Name (required)"
                          style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                          value={issuanceData[alloc._id]?.receivedBy || ''}
                          onChange={(e) => setIssuanceData({...issuanceData, [alloc._id]: {...issuanceData[alloc._id], receivedBy: e.target.value}})}
                        />
                        <input
                          type="text"
                          placeholder="Remarks (optional)"
                          style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                          value={issuanceData[alloc._id]?.remarks || ''}
                          onChange={(e) => setIssuanceData({...issuanceData, [alloc._id]: {...issuanceData[alloc._id], remarks: e.target.value}})}
                        />
                        <button
                          onClick={() => handleIssueAllocation(alloc._id)}
                          disabled={issuingUnitId === alloc._id}
                          style={{ padding: '6px', backgroundColor: issuingUnitId === alloc._id ? '#94a3b8' : '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: issuingUnitId === alloc._id ? 'not-allowed' : 'pointer' }}
                        >
                          {issuingUnitId === alloc._id ? 'Issuing...' : 'Confirm Issuance'}
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HospitalRequests;
