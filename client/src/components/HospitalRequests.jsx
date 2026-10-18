import React, { useState, useEffect } from 'react';
import { API_BASE_URL, SOCKET_URL } from '../config';
import { io } from 'socket.io-client';
import {
  Bell,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  ShieldAlert,
  ShieldCheck,
  X,
  AlertCircle,
  Check,
  PackageCheck,
  ArrowRight
} from 'lucide-react';

const HospitalRequests = ({ requests, loading, onRefresh, userRole }) => {
  const isStaff = userRole === 'staff';
  const [updatingId, setUpdatingId] = useState(null);
  const [allocationCounts, setAllocationCounts] = useState({});
  const [inventoryStock, setInventoryStock] = useState({});
  const [statusFeedback, setStatusFeedback] = useState(null);

  // Allocation Modal State
  const [allocatingRequest, setAllocatingRequest] = useState(null);
  const [availableUnits, setAvailableUnits] = useState([]);
  const [allocUnitId, setAllocUnitId] = useState('');
  const [allocRemarks, setAllocRemarks] = useState('');
  const [allocLoading, setAllocLoading] = useState(false);
  const [allocError, setAllocError] = useState('');

  // Issuance Modal State
  const [issuingRequest, setIssuingRequest] = useState(null);
  const [requestAllocations, setRequestAllocations] = useState([]);
  const [issuanceData, setIssuanceData] = useState({});
  const [issueError, setIssueError] = useState('');
  const [issueSuccess, setIssueSuccess] = useState('');
  const [issuingUnitId, setIssuingUnitId] = useState(null);

  // Emergency Donor Alert Modal State
  const [alertModalRequest, setAlertModalRequest] = useState(null);
  const [alertMatchData, setAlertMatchData] = useState(null);
  const [alertModalLoading, setAlertModalLoading] = useState(false);
  const [alertModalError, setAlertModalError] = useState('');
  const [alertSuccessMessage, setAlertSuccessMessage] = useState('');
  const [selectedDonorIds, setSelectedDonorIds] = useState([]);
  const [alertSending, setAlertSending] = useState(false);
  const [alertActiveTab, setAlertActiveTab] = useState('eligible'); // 'eligible' | 'excluded'

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' +
      date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const fetchInventoryStock = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/api/blood-units/inventory`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.inventory) {
          setInventoryStock(data.inventory);
        }
      }
    } catch (e) {
      console.error("Failed to fetch inventory stock", e);
    }
  };

  useEffect(() => {
    fetchInventoryStock();
  }, []);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const relevantRequests = requests.filter(r =>
          ['approved', 'partially_allocated', 'allocated', 'processing', 'completed'].includes(r.status)
        );
        if (relevantRequests.length === 0) return;

        const counts = {};
        await Promise.all(relevantRequests.map(async (req) => {
          try {
            const res = await fetch(`${API_BASE_URL}/api/allocations/request/${req._id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
              const data = await res.json();
              const allocs = data.allocations || [];
              const pendingCount = allocs.filter(a => a.status === 'allocated').length;
              const releasedCount = allocs.filter(a => a.status === 'released').length;
              counts[req._id] = {
                allocated: pendingCount,
                released: releasedCount,
                totalAssigned: pendingCount + releasedCount
              };
            }
          } catch (e) {
            console.error(`Failed to fetch allocations for ${req._id}`, e);
          }
        }));

        setAllocationCounts(prev => ({ ...prev, ...counts }));
      } catch (err) {
        console.error("Failed to fetch allocation counts", err);
      }
    };

    fetchCounts();
  }, [requests]);

  // Real-time listener for donor responses, inventory, and request updates
  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on("donorAlertResponded", (data) => {
      if (alertModalRequest && data.requestId === alertModalRequest._id) {
        fetchAlertMatchData(alertModalRequest._id);
      }
    });

    socket.on("inventoryUpdated", () => {
      fetchInventoryStock();
    });

    socket.on("bloodRequestStatusUpdated", () => {
      if (onRefresh) onRefresh();
    });

    return () => socket.disconnect();
  }, [alertModalRequest, onRefresh]);

  const handleStatusChange = async (requestId, newStatus) => {
    const targetRequest = requests.find(r => r._id === requestId);
    setUpdatingId(requestId);
    setStatusFeedback(null);
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

      const data = await response.json();

      if (response.ok) {
        const updatedReq = { ...(targetRequest || {}), status: newStatus };
        setStatusFeedback({
          id: requestId,
          type: 'success',
          message: data.message || `Request ${targetRequest?.requestId || ''} updated to ${newStatus}.`,
          request: updatedReq,
          showAllocateAction: newStatus === 'approved'
        });
        if (onRefresh) onRefresh();
      } else {
        setStatusFeedback({
          id: requestId,
          type: 'error',
          message: data.message || 'Failed to update request status'
        });
      }
    } catch (error) {
      setStatusFeedback({
        id: requestId,
        type: 'error',
        message: 'Error updating request status: ' + error.message
      });
    } finally {
      setUpdatingId(null);
    }
  };

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
        const data = await response.json();
        setAllocatingRequest(null);
        setStatusFeedback({
          id: allocatingRequest._id,
          type: 'success',
          message: data.message || `Blood unit successfully allocated to request ${allocatingRequest.requestId || ''}.`,
          request: { ...allocatingRequest, status: data.requestStatus || 'partially_allocated' }
        });
        fetchInventoryStock();
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

  const handleIssueAllocation = async (allocationId) => {
    if (issuingUnitId) return;

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
          handleOpenIssue(issuingRequest);
          if (onRefresh) onRefresh();
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

  // Emergency Donor Alert Handlers
  const fetchAlertMatchData = async (requestId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/donor-alerts/match/${requestId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setAlertMatchData(data);
        // Pre-select all eligible donors who have not yet received an alert
        const unalerted = (data.matchingEligibleDonors || [])
          .filter(d => !d.alreadyAlerted)
          .map(d => d.id);
        setSelectedDonorIds(unalerted);
      } else {
        const err = await res.json();
        setAlertModalError(err.message || 'Failed to match eligible donors');
      }
    } catch (e) {
      setAlertModalError('Network error fetching donor match data');
    }
  };

  const handleOpenAlertModal = async (request) => {
    setAlertModalRequest(request);
    setAlertMatchData(null);
    setAlertModalError('');
    setAlertSuccessMessage('');
    setAlertModalLoading(true);
    setAlertActiveTab('eligible');
    await fetchAlertMatchData(request._id);
    setAlertModalLoading(false);
  };

  const handleToggleSelectDonor = (donorId) => {
    setSelectedDonorIds(prev =>
      prev.includes(donorId) ? prev.filter(id => id !== donorId) : [...prev, donorId]
    );
  };

  const handleSelectAllUnalerted = () => {
    if (!alertMatchData?.matchingEligibleDonors) return;
    const unalerted = alertMatchData.matchingEligibleDonors
      .filter(d => !d.alreadyAlerted)
      .map(d => d.id);
    setSelectedDonorIds(unalerted);
  };

  const handleDeselectAll = () => {
    setSelectedDonorIds([]);
  };

  const handleSendEmergencyAlerts = async () => {
    if (!alertModalRequest || selectedDonorIds.length === 0) return;
    setAlertSending(true);
    setAlertModalError('');
    setAlertSuccessMessage('');

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/donor-alerts/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          requestId: alertModalRequest._id,
          donorIds: selectedDonorIds
        })
      });

      const data = await res.json();
      if (res.ok) {
        setAlertSuccessMessage(data.message || 'Emergency alerts dispatched successfully');
        await fetchAlertMatchData(alertModalRequest._id);
      } else {
        setAlertModalError(data.message || 'Failed to send alerts');
      }
    } catch (e) {
      setAlertModalError('Network error dispatching emergency alerts');
    } finally {
      setAlertSending(false);
    }
  };

  if (loading) return <div className="loading-state">Loading hospital requests...</div>;

  return (
    <div className="section-container animate-fade-in glass-panel">
      <div className="section-header-row">
        <div>
          <h2 className="section-title">Hospital Requests</h2>
          <p className="section-desc">Manage inbound blood requests, evaluate shortages, and broadcast emergency donor alerts.</p>
        </div>
        {!isStaff && (
          <span style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: '#f1f5f9', color: '#475569', fontSize: '12px', fontWeight: '500' }}>
            Admin Oversight Mode (Read-Only)
          </span>
        )}
      </div>

      {statusFeedback && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: statusFeedback.type === 'success' ? '#eff6ff' : '#fef2f2',
            border: `1px solid ${statusFeedback.type === 'success' ? '#bfdbfe' : '#fecaca'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {statusFeedback.type === 'success' ? (
              <CheckCircle size={18} color="#2563eb" style={{ flexShrink: 0 }} />
            ) : (
              <AlertCircle size={18} color="#dc2626" style={{ flexShrink: 0 }} />
            )}
            <div>
              <span style={{
                fontSize: '13.5px',
                fontWeight: '500',
                color: statusFeedback.type === 'success' ? '#1e40af' : '#991b1b'
              }}>
                {statusFeedback.message}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {statusFeedback.showAllocateAction && statusFeedback.request && isStaff && (
              <button
                onClick={() => {
                  handleOpenAllocate(statusFeedback.request);
                  setStatusFeedback(null);
                }}
                style={{
                  padding: '5px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <PackageCheck size={14} />
                <span>Allocate Units Now</span>
              </button>
            )}
            <button
              onClick={() => setStatusFeedback(null)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                padding: '2px'
              }}
              title="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

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
              {isStaff && <th>Action</th>}
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td colSpan={isStaff ? 7 : 6} className="empty-state">No hospital requests currently.</td>
              </tr>
            ) : (
              requests.map((request) => {
                const isEmergency = request.priority === "emergency";
                const reqCounts = allocationCounts[request._id] || { allocated: 0, released: 0, totalAssigned: 0 };
                const availableStock = inventoryStock[request.bloodGroup] ?? 0;

                return (
                  <tr
                    key={request._id}
                    className={`table-row ${isEmergency ? 'emergency-row' : ''}`}
                    style={isEmergency ? { backgroundColor: 'rgba(239, 68, 68, 0.05)', borderLeft: '4px solid #ef4444' } : {}}
                  >
                    <td className="fw-medium">
                      {isEmergency && <span style={{ marginRight: '8px' }}>🚨</span>}
                      {request.hospitalId?.name || "Unknown Hospital"}
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        #{request.requestId || request._id.substring(0, 8)}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="blood-pill-small">{request.bloodGroup}</span>
                        <span style={{
                          fontSize: '11px',
                          color: availableStock >= request.quantity ? '#15803d' : (availableStock > 0 ? '#b45309' : '#dc2626'),
                          fontWeight: '600'
                        }}>
                          ({availableStock} in stock)
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: '500' }}>{request.quantity} Units</div>
                      {['approved', 'partially_allocated', 'allocated', 'completed'].includes(request.status) && (
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          Allocated: <strong>{reqCounts.totalAssigned || 0} / {request.quantity}</strong>
                        </div>
                      )}
                    </td>
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
                        {request.status?.replace('_', ' ') || 'Pending'}
                      </span>
                    </td>
                    {isStaff && (
                      <td style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
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

                        {['pending', 'approved', 'partially_allocated'].includes(request.status) && (
                          <button
                            onClick={() => handleOpenAlertModal(request)}
                            style={{
                              padding: '4px 8px',
                              fontSize: '12px',
                              backgroundColor: isEmergency ? '#dc2626' : '#d97706',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Check inventory shortages and alert eligible donors"
                          >
                            <Bell size={13} />
                            <span>Find Donors</span>
                          </button>
                        )}

                        {(request.status === 'approved' || request.status === 'partially_allocated') && (
                          <button
                            onClick={() => handleOpenAllocate(request)}
                            style={{
                              padding: '4px 10px',
                              fontSize: '12px',
                              fontWeight: '600',
                              backgroundColor: '#2563eb',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              boxShadow: '0 1px 2px 0 rgba(37, 99, 235, 0.2)'
                            }}
                            title="Allocate blood units from inventory"
                          >
                            <PackageCheck size={14} />
                            <span>Allocate</span>
                          </button>
                        )}

                        {(
                          request.status === 'allocated' ||
                          (['partially_allocated', 'processing'].includes(request.status) && reqCounts.allocated > 0)
                        ) && (
                          <button
                            onClick={() => handleOpenIssue(request)}
                            style={{
                              padding: '4px 10px',
                              fontSize: '12px',
                              fontWeight: '600',
                              backgroundColor: '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Issue allocated units"
                          >
                            <ArrowRight size={14} />
                            <span>Issue Units ({reqCounts.allocated})</span>
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Emergency Donor Alert & Recruitment Modal */}
      {alertModalRequest && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
          <div className="modal-content glass-panel" style={{ width: '680px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', padding: '24px', backgroundColor: 'white', position: 'relative', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <button
              onClick={() => setAlertModalRequest(null)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ padding: '8px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bell size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '19px', fontWeight: '600', color: '#0f172a' }}>Emergency Donor Recruitment</h3>
                <p style={{ fontSize: '13px', color: '#64748b' }}>
                  Request: <strong>{alertModalRequest.requestId || alertModalRequest._id}</strong> • {alertModalRequest.hospitalId?.name || "Hospital"}
                </p>
              </div>
            </div>

            {alertModalError && (
              <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} />
                <span>{alertModalError}</span>
              </div>
            )}

            {alertSuccessMessage && (
              <div style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={16} />
                <span>{alertSuccessMessage}</span>
              </div>
            )}

            {alertModalLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                Evaluating inventory shortages and matching eligible donors...
              </div>
            ) : alertMatchData && (
              <>
                {/* Inventory & Shortage Assessment Card */}
                <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <p style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: '600' }}>Blood Group</p>
                      <p style={{ fontSize: '18px', fontWeight: '700', color: '#dc2626' }}>{alertMatchData.request.bloodGroup}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: '600' }}>Requested</p>
                      <p style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a' }}>{alertMatchData.request.quantity} Units</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: '600' }}>Available Stock</p>
                      <p style={{ fontSize: '16px', fontWeight: '600', color: alertMatchData.inventory.availableUnits > 0 ? '#15803d' : '#dc2626' }}>
                        {alertMatchData.inventory.availableUnits} Units
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: '600' }}>Required Date</p>
                      <p style={{ fontSize: '14px', color: '#0f172a' }}>{formatDate(alertMatchData.request.requiredDate)}</p>
                    </div>
                  </div>

                  {alertMatchData.inventory.isInsufficient ? (
                    <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px', color: '#991b1b', fontSize: '13px' }}>
                      <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                      <div>
                        <strong>Inventory Shortage Detected:</strong> Current blood bank inventory has only {alertMatchData.inventory.availableUnits} suitable unit(s) of {alertMatchData.request.bloodGroup} (shortage of {alertMatchData.inventory.shortage} units). Direct donor recruitment broadcast is recommended.
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '10px 14px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontSize: '13px' }}>
                      <CheckCircle size={18} style={{ flexShrink: 0 }} />
                      <div>
                        <strong>Inventory Sufficient:</strong> Blood bank has {alertMatchData.inventory.availableUnits} available unit(s) of {alertMatchData.request.bloodGroup}. You may still broadcast to eligible donors if anticipating high emergency demand.
                      </div>
                    </div>
                  )}
                </div>

                {/* Tabs: Eligible Donors vs Excluded Donors */}
                <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', marginBottom: '16px' }}>
                  <button
                    onClick={() => setAlertActiveTab('eligible')}
                    style={{
                      padding: '8px 16px',
                      background: 'none',
                      border: 'none',
                      borderBottom: alertActiveTab === 'eligible' ? '2px solid #dc2626' : '2px solid transparent',
                      color: alertActiveTab === 'eligible' ? '#dc2626' : '#64748b',
                      fontWeight: alertActiveTab === 'eligible' ? '600' : '400',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Eligible Donors ({alertMatchData.metrics.eligibleCount})
                  </button>
                  <button
                    onClick={() => setAlertActiveTab('excluded')}
                    style={{
                      padding: '8px 16px',
                      background: 'none',
                      border: 'none',
                      borderBottom: alertActiveTab === 'excluded' ? '2px solid #dc2626' : '2px solid transparent',
                      color: alertActiveTab === 'excluded' ? '#dc2626' : '#64748b',
                      fontWeight: alertActiveTab === 'excluded' ? '600' : '400',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Excluded / Deferred Donors ({alertMatchData.metrics.excludedCount})
                  </button>
                </div>

                {alertActiveTab === 'eligible' && (
                  <div>
                    {alertMatchData.matchingEligibleDonors.length === 0 ? (
                      <div style={{ padding: '32px 16px', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                        <Users size={32} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
                        <p style={{ fontWeight: '500' }}>No eligible donors found matching blood group {alertMatchData.request.bloodGroup}.</p>
                        <p style={{ fontSize: '13px', marginTop: '4px' }}>All registered donors with this blood group are currently in their 3-month deferral window or not approved.</p>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', fontSize: '13px', color: '#64748b' }}>
                          <span>
                            Selected: <strong>{selectedDonorIds.length}</strong> of {alertMatchData.metrics.unalertedCount} unalerted donor(s)
                          </span>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={handleSelectAllUnalerted}
                              style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline' }}
                            >
                              Select All Unalerted
                            </button>
                            <span>•</span>
                            <button
                              onClick={handleDeselectAll}
                              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline' }}
                            >
                              Deselect All
                            </button>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto', marginBottom: '20px' }}>
                          {alertMatchData.matchingEligibleDonors.map((donor) => {
                            const isSelected = selectedDonorIds.includes(donor.id);
                            return (
                              <div
                                key={donor.id}
                                style={{
                                  padding: '12px 14px',
                                  borderRadius: '6px',
                                  border: isSelected ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                                  backgroundColor: isSelected ? '#eff6ff' : 'white',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '12px'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggleSelectDonor(donor.id)}
                                    disabled={donor.alreadyAlerted}
                                    style={{ width: '16px', height: '16px', cursor: donor.alreadyAlerted ? 'not-allowed' : 'pointer' }}
                                  />
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <strong style={{ fontSize: '14px', color: '#0f172a' }}>{donor.name}</strong>
                                      <span className="blood-pill-small" style={{ fontSize: '11px', padding: '1px 6px' }}>{donor.bloodGroup}</span>
                                    </div>
                                    <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                      Phone: {donor.phone || 'N/A'} • Total Donations: {donor.totalDonations} • Last Donation: {donor.lastDonationDate ? formatDate(donor.lastDonationDate) : 'None'}
                                    </p>
                                  </div>
                                </div>

                                <div>
                                  {donor.alreadyAlerted ? (
                                    donor.alertStatus === 'available' ? (
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', backgroundColor: '#dcfce7', color: '#15803d' }}>
                                        <Check size={12} /> Available
                                      </span>
                                    ) : donor.alertStatus === 'unavailable' ? (
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', backgroundColor: '#f1f5f9', color: '#64748b' }}>
                                        <X size={12} /> Unavailable
                                      </span>
                                    ) : (
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', backgroundColor: '#fef3c7', color: '#b45309' }}>
                                        <Clock size={12} /> Alert Sent
                                      </span>
                                    )
                                  ) : (
                                    <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '500', backgroundColor: '#e0f2fe', color: '#0369a1' }}>
                                      Ready to Alert
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', color: '#64748b' }}>
                            {alertMatchData.metrics.alreadyAlertedCount > 0 && (
                              <span>{alertMatchData.metrics.alreadyAlertedCount} donor(s) previously notified. Duplicates are blocked.</span>
                            )}
                          </span>

                          <button
                            onClick={handleSendEmergencyAlerts}
                            disabled={alertSending || selectedDonorIds.length === 0}
                            className="btn-primary"
                            style={{
                              backgroundColor: '#dc2626',
                              borderColor: '#dc2626',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '8px 18px',
                              fontSize: '13px'
                            }}
                          >
                            <Bell size={15} />
                            <span>
                              {alertSending ? 'Broadcasting...' : `Send Alert to (${selectedDonorIds.length}) Donor(s)`}
                            </span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {alertActiveTab === 'excluded' && (
                  <div>
                    {alertMatchData.excludedDonors.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                        No donors were excluded. All registered donors with this blood group are currently eligible.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                        {alertMatchData.excludedDonors.map((donor) => (
                          <div
                            key={donor.id}
                            style={{
                              padding: '12px 14px',
                              borderRadius: '6px',
                              border: '1px solid #e2e8f0',
                              backgroundColor: '#f8fafc',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <div>
                              <strong style={{ fontSize: '14px', color: '#334155' }}>{donor.name}</strong>
                              <span className="blood-pill-small" style={{ marginLeft: '8px', fontSize: '11px', padding: '1px 6px' }}>{donor.bloodGroup}</span>
                              <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                Last Donation: {donor.lastDonationDate ? formatDate(donor.lastDonationDate) : 'None'}
                              </p>
                            </div>
                            <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '4px', backgroundColor: '#fee2e2', color: '#991b1b', fontWeight: '500' }}>
                              {donor.exclusionReason}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Existing Allocate Modal */}
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

            <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '16px', fontSize: '13px', lineHeight: '1.6', color: '#475569' }}>
              <div>Request: <strong>{allocatingRequest.requestId || allocatingRequest._id}</strong> ({allocatingRequest.hospitalId?.name || "Hospital"})</div>
              <div>Blood Group: <strong style={{ color: '#dc2626' }}>{allocatingRequest.bloodGroup}</strong> • Requested: <strong>{allocatingRequest.quantity} units</strong></div>
              <div>Allocated So Far: <strong>{allocationCounts[allocatingRequest._id]?.totalAssigned || 0} / {allocatingRequest.quantity} units</strong></div>
            </div>

            <form onSubmit={submitAllocation} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500', color: '#334155' }}>
                  Select Tested & Approved Unit (FIFO - Oldest Expiry First)
                </label>
                <select
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  value={allocUnitId}
                  onChange={e => setAllocUnitId(e.target.value)}
                  required
                >
                  {availableUnits.length === 0 && <option value="">No tested/available {allocatingRequest.bloodGroup} units in inventory</option>}
                  {availableUnits.map(unit => (
                    <option key={unit._id} value={unit._id}>
                      {unit.unitId} • Exp: {formatDate(unit.expiryDate)} • {unit.currentLocation || 'Blood Bank'}
                    </option>
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

              <button
                type="submit"
                className="btn-primary"
                disabled={allocLoading || availableUnits.length === 0}
                style={{ width: '100%', justifyContent: 'center', marginTop: '8px', backgroundColor: '#2563eb' }}
              >
                {allocLoading ? 'Allocating Blood Unit...' : 'Confirm Allocation (Reserve Unit)'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Existing Issue Modal */}
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
                          onChange={(e) => setIssuanceData({ ...issuanceData, [alloc._id]: { ...issuanceData[alloc._id], receivedBy: e.target.value } })}
                        />
                        <input
                          type="text"
                          placeholder="Remarks (optional)"
                          style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                          value={issuanceData[alloc._id]?.remarks || ''}
                          onChange={(e) => setIssuanceData({ ...issuanceData, [alloc._id]: { ...issuanceData[alloc._id], remarks: e.target.value } })}
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
