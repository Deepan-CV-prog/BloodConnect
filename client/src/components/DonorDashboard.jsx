import React, { useState, useEffect } from 'react';
import { API_BASE_URL, SOCKET_URL } from '../config';
import { io } from 'socket.io-client';
import {
  Heart,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  CalendarClock,
  Bell,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Hospital,
  ArrowRight,
  Check,
  X
} from "lucide-react";

const DonorDashboard = ({ userName, initialTab = 'dashboard' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [donorProfile, setDonorProfile] = useState(null);
  const [nextEligibleDate, setNextEligibleDate] = useState(null);
  const [donorDonations, setDonorDonations] = useState([]);
  const [donorAppointments, setDonorAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [donationsLoading, setDonationsLoading] = useState(true);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [error, setError] = useState('');

  // Emergency Donor Alerts State
  const [emergencyAlerts, setEmergencyAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [respondingAlertId, setRespondingAlertId] = useState(null);
  const [alertFeedback, setAlertFeedback] = useState({});

  const [scheduleForm, setScheduleForm] = useState({ preferredDate: '', preferredTime: '', remarks: '' });
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState('');
  const [scheduleError, setScheduleError] = useState('');

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const fetchMyAlerts = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/api/donor-alerts/my-alerts`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setEmergencyAlerts(data.alerts || []);
        if (data.donorEligibility?.nextEligibleDate) {
          setNextEligibleDate(data.donorEligibility.nextEligibleDate);
        }
      }
    } catch (e) {
      console.error("Failed to fetch donor emergency alerts:", e);
    } finally {
      setAlertsLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { "Authorization": `Bearer ${token}` };

        // Fetch profile
        const profileRes = await fetch(`${API_BASE_URL}/api/donors/profile`, { headers });
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setDonorProfile(profileData.donor);
          setNextEligibleDate(profileData.nextEligibleDate);
        } else {
          setDonorProfile(null);
        }

        // Fetch donations
        const donationsRes = await fetch(`${API_BASE_URL}/api/donations/my-donations`, { headers });
        if (donationsRes.ok) {
          const donationsData = await donationsRes.json();
          setDonorDonations(donationsData.donations || []);
        } else {
          setDonorDonations([]);
        }

        // Fetch appointments
        const apptsRes = await fetch(`${API_BASE_URL}/api/donation-appointments/my-appointments`, { headers });
        if (apptsRes.ok) {
          const apptsData = await apptsRes.json();
          setDonorAppointments(apptsData.appointments || []);
        } else {
          setDonorAppointments([]);
        }

        // Fetch emergency alerts
        await fetchMyAlerts();

      } catch (err) {
        console.error("Failed to fetch donor data:", err);
        setError("Could not load donor data. Please try again later.");
      } finally {
        setLoading(false);
        setDonationsLoading(false);
        setAppointmentsLoading(false);
      }
    };

    fetchData();

    // Socket.IO real-time alert updates
    const socket = io(SOCKET_URL);
    socket.on("emergencyAlertCreated", () => {
      fetchMyAlerts();
    });

    return () => socket.disconnect();
  }, []);

  if (loading) {
    return <div className="animate-pulse" style={{ padding: '20px' }}>Loading donor dashboard...</div>;
  }

  if (error) {
    return <div style={{ padding: '20px', color: '#b91c1c' }}>{error}</div>;
  }

  const handleRespondAlert = async (alertId, responseStatus) => {
    setRespondingAlertId(alertId);
    setAlertFeedback(prev => ({ ...prev, [alertId]: { error: '', success: '' } }));

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/donor-alerts/${alertId}/respond`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ response: responseStatus })
      });

      const data = await res.json();
      if (res.ok) {
        setAlertFeedback(prev => ({
          ...prev,
          [alertId]: { success: `Response recorded: Marked as ${responseStatus}.`, error: '' }
        }));
        setEmergencyAlerts(prev =>
          prev.map(a => a._id === alertId ? { ...a, status: responseStatus, respondedAt: new Date().toISOString() } : a)
        );
      } else {
        setAlertFeedback(prev => ({
          ...prev,
          [alertId]: { error: data.message || 'Failed to submit response', success: '' }
        }));
      }
    } catch (e) {
      setAlertFeedback(prev => ({
        ...prev,
        [alertId]: { error: 'Network error submitting response', success: '' }
      }));
    } finally {
      setRespondingAlertId(null);
    }
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    setScheduleSubmitting(true);
    setScheduleError('');
    setScheduleSuccess('');

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/donation-appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(scheduleForm)
      });

      const data = await res.json();

      if (res.ok) {
        setScheduleSuccess('Appointment request submitted successfully!');
        setScheduleForm({ preferredDate: '', preferredTime: '', remarks: '' });

        // Refresh appointments
        const apptsRes = await fetch(`${API_BASE_URL}/api/donation-appointments/my-appointments`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (apptsRes.ok) {
          const apptsData = await apptsRes.json();
          setDonorAppointments(apptsData.appointments || []);
        }

        setTimeout(() => setScheduleSuccess(''), 5000);
      } else {
        setScheduleError(data.message || 'Failed to submit appointment request.');
      }
    } catch (err) {
      setScheduleError('Network error. Please try again.');
    } finally {
      setScheduleSubmitting(false);
    }
  };

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

  // Render the Emergency Blood Requests & Alerts section
  const renderEmergencyAlertsSection = () => {
    const isDonorIneligible = donorProfile?.eligibilityStatus === 'ineligible' ||
      (nextEligibleDate && new Date() < new Date(nextEligibleDate));
    const formattedNextDate = nextEligibleDate
      ? new Date(nextEligibleDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : null;

    const pendingCount = emergencyAlerts.filter(a => a.status === 'sent').length;

    return (
      <div className="dashboard-card glass-panel animate-fade-in mt-4" style={{ borderLeft: pendingCount > 0 ? '4px solid #dc2626' : '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', backgroundColor: pendingCount > 0 ? '#fee2e2' : '#f1f5f9', color: pendingCount > 0 ? '#dc2626' : '#64748b', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bell size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0f172a' }}>Emergency Blood Requests</h3>
              <p style={{ fontSize: '13px', color: '#64748b' }}>Urgent recruitment alerts matching your blood group ({donorProfile?.bloodGroup || 'registered'}).</p>
            </div>
          </div>

          {pendingCount > 0 && (
            <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', backgroundColor: '#fee2e2', color: '#b91c1c' }}>
              {pendingCount} Urgent Action Required
            </span>
          )}
        </div>

        {alertsLoading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
            Checking for emergency recruitment broadcasts...
          </div>
        ) : emergencyAlerts.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
            <ShieldCheck size={36} style={{ margin: '0 auto 8px auto', color: '#16a34a' }} />
            <h4 style={{ color: '#0f172a', marginBottom: '4px' }}>No Active Emergency Alerts</h4>
            <p style={{ color: '#64748b', fontSize: '13px', maxWidth: '520px', margin: '0 auto' }}>
              There are currently no urgent blood bank requests requiring your blood group. When hospitals face critical shortages, official broadcast notifications will appear here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {emergencyAlerts.map((alert) => {
              const req = alert.requestId || {};
              const hospital = req.hospitalId || {};
              const isPending = alert.status === 'sent';
              const isAvailable = alert.status === 'available';
              const isUnavailable = alert.status === 'unavailable';
              const feedback = alertFeedback[alert._id];

              return (
                <div
                  key={alert._id}
                  style={{
                    padding: '16px 18px',
                    borderRadius: '8px',
                    border: isPending ? '1px solid #fecaca' : '1px solid #e2e8f0',
                    backgroundColor: isPending ? '#fff5f5' : '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        backgroundColor: alert.urgency === 'emergency' ? '#dc2626' : '#d97706',
                        color: 'white'
                      }}>
                        {alert.urgency === 'emergency' ? '🚨 EMERGENCY' : 'URGENT'}
                      </span>
                      <span className="blood-pill-small" style={{ fontSize: '13px', fontWeight: '700' }}>
                        {alert.bloodGroup} Needed
                      </span>
                      <span style={{ fontSize: '13px', color: '#64748b' }}>
                        • {req.quantity || 1} Unit(s)
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      Alert Received: {formatDateTime(alert.sentAt)}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '13px', color: '#334155' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Hospital size={15} color="#dc2626" />
                      <span><strong>Hospital:</strong> {hospital.name || "Regional Hospital"}</span>
                    </div>
                    {hospital.address && (
                      <div style={{ color: '#64748b' }}>
                        <span><strong>Location:</strong> {hospital.address}</span>
                      </div>
                    )}
                    <div>
                      <span><strong>Required By:</strong> {formatDate(req.requiredDate)}</span>
                    </div>
                    <div>
                      <span><strong>Request Status:</strong> <span style={{ textTransform: 'capitalize' }}>{req.status || 'Active'}</span></span>
                    </div>
                  </div>

                  {feedback?.error && (
                    <div style={{ padding: '8px 12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '4px', fontSize: '12px' }}>
                      {feedback.error}
                    </div>
                  )}

                  {feedback?.success && (
                    <div style={{ padding: '8px 12px', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '4px', fontSize: '12px' }}>
                      {feedback.success}
                    </div>
                  )}

                  {/* Donor Response Controls */}
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    {isPending ? (
                      isDonorIneligible ? (
                        <div style={{
                          padding: '10px 14px',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          fontSize: '13px',
                          color: '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          width: '100%'
                        }}>
                          <AlertTriangle size={16} color="#94a3b8" style={{ flexShrink: 0 }} />
                          <span>
                            Alert no longer actionable: You are currently deferred until <strong>{formattedNextDate}</strong>.
                          </span>
                        </div>
                      ) : (
                        <>
                          <div style={{ fontSize: '13px', color: '#0f172a', fontWeight: '500' }}>
                            Are you available to donate blood for this critical need?
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => handleRespondAlert(alert._id, 'available')}
                              disabled={respondingAlertId === alert._id}
                              style={{
                                padding: '6px 14px',
                                borderRadius: '6px',
                                backgroundColor: '#16a34a',
                                color: 'white',
                                border: 'none',
                                fontSize: '13px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <Check size={14} />
                              <span>{respondingAlertId === alert._id ? 'Saving...' : 'I Am Available'}</span>
                            </button>
                            <button
                              onClick={() => handleRespondAlert(alert._id, 'unavailable')}
                              disabled={respondingAlertId === alert._id}
                              style={{
                                padding: '6px 14px',
                                borderRadius: '6px',
                                backgroundColor: '#f1f5f9',
                                color: '#64748b',
                                border: '1px solid #cbd5e1',
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <X size={14} />
                              <span>Unavailable</span>
                            </button>
                          </div>
                        </>
                      )
                    ) : isAvailable ? (
                      isDonorIneligible ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#15803d', fontSize: '13px', fontWeight: '500' }}>
                            <CheckCircle size={16} />
                            <span>You confirmed: <strong>Available to Donate</strong> on {formatDateTime(alert.respondedAt)}.</span>
                          </div>
                          <div style={{
                            padding: '10px 14px',
                            backgroundColor: '#fffbeb',
                            border: '1px solid #fef3c7',
                            borderRadius: '6px',
                            fontSize: '13px',
                            color: '#92400e',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <AlertTriangle size={16} color="#d97706" style={{ flexShrink: 0 }} />
                            <span>
                              Donation scheduling is currently unavailable because you are in a 3-month deferral period. You will be eligible on <strong>{formattedNextDate}</strong>.
                            </span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#15803d', fontSize: '13px', fontWeight: '500' }}>
                            <CheckCircle size={16} />
                            <span>You confirmed: <strong>Available to Donate</strong> on {formatDateTime(alert.respondedAt)}.</span>
                          </div>
                          <button
                            onClick={() => setActiveTab('schedule')}
                            className="btn-primary"
                            style={{
                              padding: '6px 14px',
                              fontSize: '12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <Calendar size={13} />
                            <span>Schedule Donation Appointment</span>
                            <ArrowRight size={13} />
                          </button>
                        </>
                      )
                    ) : isUnavailable ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '13px' }}>
                        <XCircle size={16} color="#94a3b8" />
                        <span>You responded as unavailable on {formatDateTime(alert.respondedAt)}.</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderDashboard = () => (
    <div className="dashboard-overview animate-fade-in">
      <section className="welcome-banner">
        <div className="welcome-content">
          <h2>Welcome back, {userName} 👋</h2>
          <p>Manage your blood donation journey and track your life-saving impact.</p>
        </div>
        <div className="welcome-graphic">🩸</div>
      </section>

      {/* Emergency Alerts Section */}
      {renderEmergencyAlertsSection()}

      {donorProfile ? (
        <>
          <section className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginTop: '24px' }}>
            <div className="stat-card glass-panel">
              <div className="stat-icon-wrapper blood-theme">
                <span className="stat-icon">❤️</span>
              </div>
              <div className="stat-details">
                <p className="stat-label">Total Donations</p>
                <h3 className="stat-value">{donorProfile.totalDonations || 0}</h3>
              </div>
            </div>

            <div className="stat-card glass-panel">
              <div className="stat-icon-wrapper" style={{ backgroundColor: donorProfile.eligibilityStatus === 'eligible' ? '#dcfce7' : '#fee2e2', color: donorProfile.eligibilityStatus === 'eligible' ? '#166534' : '#991b1b' }}>
                <span className="stat-icon">{donorProfile.eligibilityStatus === "eligible" ? <ShieldCheck size={48} /> : <ShieldAlert size={48} />}</span>
              </div>
              <div className="stat-details">
                <p className="stat-label">Eligibility Status</p>
                <h3 className="stat-value" style={{ textTransform: "capitalize", fontSize: "1.2rem" }}>{donorProfile.eligibilityStatus || "Pending"}</h3>
                {donorProfile.eligibilityStatus === "ineligible" && nextEligibleDate && (
                  <p style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "4px" }}>
                    Next eligible date: {new Date(nextEligibleDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                )}
              </div>
            </div>

            <div className="stat-card glass-panel">
              <div className="stat-icon-wrapper donor-theme">
                <span className="stat-icon">📅</span>
              </div>
              <div className="stat-details">
                <p className="stat-label">Last Donation</p>
                <h3 className="stat-value" style={{ fontSize: '1.1rem' }}>
                  {donorProfile.lastDonationDate
                    ? new Date(donorProfile.lastDonationDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    : 'No donation yet'}
                </h3>
              </div>
            </div>

            {(() => {
              const upcomingAppt = donorAppointments
                .filter(a => ["pending", "approved"].includes(a.status?.toLowerCase()))
                .sort((a, b) => new Date(a.preferredDate) - new Date(b.preferredDate))[0];

              const isConflicting = upcomingAppt && (
                upcomingAppt.isConflicting ||
                (nextEligibleDate && new Date(upcomingAppt.preferredDate) < new Date(nextEligibleDate))
              );

              const nextEligibleStr = nextEligibleDate
                ? new Date(nextEligibleDate).toLocaleDateString("en-GB", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" })
                : "";

              return (
                <div className="stat-card glass-panel" style={{ borderLeft: isConflicting ? '3px solid #f59e0b' : undefined }}>
                  <div
                    className="stat-icon-wrapper"
                    style={{
                      backgroundColor: isConflicting ? '#fef3c7' : undefined,
                      color: isConflicting ? '#d97706' : undefined
                    }}
                  >
                    {isConflicting ? <AlertTriangle size={24} /> : <CalendarClock size={24} />}
                  </div>
                  <div className="stat-details">
                    <p className="stat-label">Upcoming Donation</p>
                    {isConflicting ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <span style={{
                            fontSize: "11px",
                            fontWeight: "700",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            backgroundColor: "#fef3c7",
                            color: "#b45309",
                            border: "1px solid #fcd34d",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}>
                            <AlertTriangle size={12} /> Appointment requires staff review
                          </span>
                        </div>
                        <h3 className="stat-value" style={{ fontSize: "0.95rem", marginTop: "2px" }}>
                          {new Date(upcomingAppt.preferredDate).toLocaleDateString("en-GB", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" })}<br/>
                          <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: "normal" }}>
                            {upcomingAppt.preferredTime} • Status: {upcomingAppt.status}
                          </span>
                        </h3>
                        <p style={{ fontSize: "11px", color: "#b45309", lineHeight: "1.3" }}>
                          This appointment falls within your deferral period{nextEligibleStr ? ` (eligible after ${nextEligibleStr})` : ""}. Please contact the blood bank.
                        </p>
                      </div>
                    ) : upcomingAppt ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <h3 className="stat-value" style={{ fontSize: "1rem" }}>
                          {new Date(upcomingAppt.preferredDate).toLocaleDateString("en-GB", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" })}<br/>
                          <span style={{ fontSize: "0.85rem", color: "#64748b" }}>{upcomingAppt.preferredTime}</span>
                        </h3>
                        <span className={`status-badge status-${upcomingAppt.status.toLowerCase()}`} style={{ fontSize: "10px", padding: "2px 6px", alignSelf: "flex-start" }}>
                          {upcomingAppt.status}
                        </span>
                      </div>
                    ) : (
                      <h3 className="stat-value" style={{ fontSize: "1rem", color: "#64748b" }}>No upcoming donation</h3>
                    )}
                  </div>
                </div>
              );
            })()}
          </section>
        </>
      ) : (
        <div className="dashboard-card glass-panel mt-4" style={{ textAlign: 'center', padding: '40px' }}>
          <h3>Complete Your Profile</h3>
          <p style={{ color: '#64748b', marginTop: '10px' }}>Please provide your medical and contact details to start your donation journey.</p>
          <button className="btn-primary" style={{ marginTop: '20px' }} onClick={() => setActiveTab('profile')}>Go to My Profile</button>
        </div>
      )}
    </div>
  );

  const renderProfile = () => (
    <div className="dashboard-card glass-panel animate-fade-in mt-4">
      <div className="card-header" style={{ marginBottom: '24px' }}>
        <h3>My Donor Profile</h3>
      </div>
      {donorProfile ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>Blood Group</label>
            <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontWeight: 'bold', color: '#dc2626' }}>
              {donorProfile.bloodGroup}
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>Date of Birth</label>
            <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              {new Date(donorProfile.dateOfBirth).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>Gender</label>
            <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', textTransform: 'capitalize' }}>
              {donorProfile.gender}
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>Phone Number</label>
            <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              {donorProfile.phone}
            </div>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>Address</label>
            <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              {donorProfile.address}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ color: '#64748b' }}>No donor profile found. Please contact administration to setup your profile.</div>
      )}
    </div>
  );

  const renderDonations = () => (
    <div className="dashboard-card glass-panel animate-fade-in mt-4">
      <div className="card-header" style={{ marginBottom: '24px' }}>
        <h3>My Donation History</h3>
      </div>

      {donationsLoading ? (
        <div className="animate-pulse" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
          Loading your donations...
        </div>
      ) : donorDonations.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>❤️</div>
          <h4 style={{ color: '#0f172a', marginBottom: '8px' }}>No donation history yet</h4>
          <p style={{ color: '#64748b', maxWidth: '500px', margin: '0 auto' }}>
            When you complete a blood donation, it will appear here along with its status and details.
          </p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Blood Group</th>
                <th>Volume (ml)</th>
                <th>Status</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {donorDonations.map(donation => (
                <tr key={donation._id}>
                  <td>{new Date(donation.donationDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td><span className="blood-badge">{donation.bloodGroup}</span></td>
                  <td>{donation.volumeMl} ml</td>
                  <td>
                    <span className={`status-badge status-${donation.status}`}>
                      {donation.status}
                    </span>
                  </td>
                  <td style={{ color: '#64748b' }}>{donation.remarks || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderSchedule = () => (
    <div className="dashboard-card glass-panel animate-fade-in mt-4">
      <div className="card-header" style={{ marginBottom: '24px' }}>
        <h3>Schedule a Donation</h3>
      </div>

      {nextEligibleDate && new Date() < new Date(nextEligibleDate) && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#fffbeb',
          border: '1px solid #fef3c7',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#92400e',
          fontSize: '13px'
        }}>
          <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0 }} />
          <div>
            <strong>Notice:</strong> You are currently in a 3-month deferral period. You will be eligible to donate on or after <strong>{new Date(nextEligibleDate).toLocaleDateString('en-GB', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' })}</strong>.
          </div>
        </div>
      )}

      <form onSubmit={handleScheduleSubmit} style={{ maxWidth: '600px', marginBottom: '40px' }}>
        {scheduleError && <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '16px' }}>{scheduleError}</div>}
        {scheduleSuccess && <div style={{ padding: '12px', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '6px', marginBottom: '16px' }}>{scheduleSuccess}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>Preferred Date *</label>
            <input
              type="date"
              className="form-input"
              required
              min={
                nextEligibleDate && new Date() < new Date(nextEligibleDate)
                  ? new Date(nextEligibleDate).toISOString().split('T')[0]
                  : new Date().toISOString().split('T')[0]
              }
              value={scheduleForm.preferredDate}
              onChange={e => setScheduleForm({...scheduleForm, preferredDate: e.target.value})}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>Preferred Time *</label>
            <select
              className="form-input"
              required
              value={scheduleForm.preferredTime}
              onChange={e => setScheduleForm({...scheduleForm, preferredTime: e.target.value})}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            >
              <option value="">Select a time</option>
              <option value="09:00 AM">09:00 AM</option>
              <option value="10:00 AM">10:00 AM</option>
              <option value="11:00 AM">11:00 AM</option>
              <option value="12:00 PM">12:00 PM</option>
              <option value="01:00 PM">01:00 PM</option>
              <option value="02:00 PM">02:00 PM</option>
              <option value="03:00 PM">03:00 PM</option>
              <option value="04:00 PM">04:00 PM</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>Remarks (Optional)</label>
          <textarea
            className="form-input"
            rows="3"
            value={scheduleForm.remarks}
            onChange={e => setScheduleForm({...scheduleForm, remarks: e.target.value})}
            placeholder="Any medical conditions or preferences..."
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }}
          ></textarea>
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={scheduleSubmitting}
          style={{ width: '100%', padding: '12px' }}
        >
          {scheduleSubmitting ? 'Submitting...' : 'Request Donation Appointment'}
        </button>
      </form>

      <div className="card-header" style={{ marginBottom: '24px' }}>
        <h3>My Appointment Requests</h3>
      </div>

      {appointmentsLoading ? (
        <div className="animate-pulse" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
          Loading your appointments...
        </div>
      ) : donorAppointments.length === 0 ? (
        <div style={{ padding: '30px 20px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
          <h4 style={{ color: '#64748b' }}>No appointment requests yet</h4>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Appointment ID</th>
                <th>Preferred Date</th>
                <th>Preferred Time</th>
                <th>Status</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {donorAppointments.map(appt => {
                const isConflicting = appt.isConflicting ||
                  (nextEligibleDate && ["pending", "approved"].includes(appt.status?.toLowerCase()) && new Date(appt.preferredDate) < new Date(nextEligibleDate));

                return (
                  <tr key={appt._id}>
                    <td style={{ fontWeight: '600', color: '#0f172a' }}>{appt.appointmentId}</td>
                    <td>{new Date(appt.preferredDate).toLocaleDateString('en-GB', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td>{appt.preferredTime}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                        <span className={`status-badge status-${appt.status}`}>
                          {appt.status}
                        </span>
                        {isConflicting && (
                          <span style={{
                            fontSize: '10px',
                            fontWeight: '600',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: '#fef3c7',
                            color: '#b45309',
                            border: '1px solid #fcd34d'
                          }}>
                            ⚠️ Requires Staff Review
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ color: '#64748b', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {appt.remarks || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderEligibility = () => (
    <div className="dashboard-card glass-panel animate-fade-in mt-4">
      <div className="card-header" style={{ marginBottom: '24px' }}>
        <h3>Donation Eligibility</h3>
      </div>
      {donorProfile ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px', textAlign: 'center' }}>
          <div style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            backgroundColor: donorProfile.eligibilityStatus === 'eligible' ? '#dcfce7' : '#fee2e2',
            color: donorProfile.eligibilityStatus === 'eligible' ? '#166534' : '#991b1b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '48px',
            marginBottom: '20px'
          }}>
            {donorProfile.eligibilityStatus === "eligible" ? <ShieldCheck size={48} /> : <ShieldAlert size={48} />}
          </div>
          <h2 style={{ textTransform: 'capitalize', color: '#0f172a', marginBottom: '12px' }}>
            Status: {donorProfile.eligibilityStatus || 'Pending'}
          </h2>
          <p style={{ color: '#64748b', maxWidth: '600px', lineHeight: '1.6' }}>
            Eligibility is determined by authorized blood-bank staff based on applicable screening requirements, medical history, and recent donation intervals. We do not automatically calculate your eligibility here.
          </p>
        </div>
      ) : (
        <div style={{ color: '#64748b' }}>No donor profile found.</div>
      )}
    </div>
  );

  switch (activeTab) {
    case 'dashboard': return renderDashboard();
    case 'alerts': return (
      <div className="dashboard-overview animate-fade-in">
        {renderEmergencyAlertsSection()}
      </div>
    );
    case 'profile': return renderProfile();
    case 'donations': return renderDonations();
    case 'schedule': return renderSchedule();
    case 'eligibility': return renderEligibility();
    default: return renderDashboard();
  }
};

export default DonorDashboard;
