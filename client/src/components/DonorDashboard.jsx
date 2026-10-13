import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { Heart, ShieldCheck, ShieldAlert, Calendar, CalendarClock } from "lucide-react";

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

  const [scheduleForm, setScheduleForm] = useState({ preferredDate: '', preferredTime: '', remarks: '' });
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState('');
  const [scheduleError, setScheduleError] = useState('');

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

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
  }, []);

  if (loading) {
    return <div className="animate-pulse" style={{ padding: '20px' }}>Loading donor dashboard...</div>;
  }

  if (error) {
    return <div style={{ padding: '20px', color: '#b91c1c' }}>{error}</div>;
  }

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

  const renderDashboard = () => (
    <div className="dashboard-overview animate-fade-in">
      <section className="welcome-banner">
        <div className="welcome-content">
          <h2>Welcome back, {userName} 👋</h2>
          <p>Manage your blood donation journey and track your life-saving impact.</p>
        </div>
        <div className="welcome-graphic">🩸</div>
      </section>

      {donorProfile ? (
        <>
          <section className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
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

            <div className="stat-card glass-panel">
              <div className="stat-icon-wrapper request-theme"><CalendarClock size={24} /></div>
                <div className="stat-details">
                  <p className="stat-label">Upcoming Donation</p>
                  {(() => {
                    const upcomingAppt = donorAppointments
                      .filter(a => ["pending", "approved"].includes(a.status?.toLowerCase()))
                      .sort((a, b) => new Date(a.preferredDate) - new Date(b.preferredDate))[0];
                    return upcomingAppt ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <h3 className="stat-value" style={{ fontSize: "1rem" }}>
                          {new Date(upcomingAppt.preferredDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}<br/>
                          <span style={{ fontSize: "0.85rem", color: "#64748b" }}>{upcomingAppt.preferredTime}</span>
                        </h3>
                        <span className={`status-badge status-${upcomingAppt.status.toLowerCase()}`} style={{ fontSize: "10px", padding: "2px 6px", alignSelf: "flex-start" }}>
                          {upcomingAppt.status}
                        </span>
                      </div>
                    ) : (
                      <h3 className="stat-value" style={{ fontSize: "1rem", color: "#64748b" }}>No upcoming donation</h3>
                    );
                  })()}
                </div>
            </div>
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
              min={new Date().toISOString().split('T')[0]}
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
              {donorAppointments.map(appt => (
                <tr key={appt._id}>
                  <td style={{ fontWeight: '600', color: '#0f172a' }}>{appt.appointmentId}</td>
                  <td>{new Date(appt.preferredDate).toLocaleDateString('en-GB', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td>{appt.preferredTime}</td>
                  <td>
                    <span className={`status-badge status-${appt.status}`}>
                      {appt.status}
                    </span>
                  </td>
                  <td style={{ color: '#64748b', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {appt.remarks || '-'}
                  </td>
                </tr>
              ))}
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
    case 'profile': return renderProfile();
    case 'donations': return renderDonations();
    case 'schedule': return renderSchedule();
    case 'eligibility': return renderEligibility();
    default: return renderDashboard();
  }
};

export default DonorDashboard;
