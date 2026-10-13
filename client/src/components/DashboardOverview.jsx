import React from 'react';
import { Droplet, Users, ClipboardList, CheckCircle, AlertCircle } from 'lucide-react';

const DashboardOverview = ({ bloodGroups, donors, hospitalRequests }) => {
  const totalUnits = bloodGroups.reduce((acc, curr) => acc + curr.units, 0);
  const emergencyRequests = hospitalRequests.filter(req => req.priority === 'emergency' && !['completed', 'rejected', 'cancelled'].includes(req.status?.toLowerCase())).length;
  const activeRequests = hospitalRequests.filter(req => !['completed', 'rejected', 'cancelled'].includes(req.status?.toLowerCase())).length;
  const completedRequests = hospitalRequests.filter(req => req.status?.toLowerCase() === 'completed').length;

  return (
    <div className="dashboard-overview animate-fade-in">
      <section className="welcome-banner">
        <div className="welcome-content">
          <h2>Welcome back to BloodConnect</h2>
          <p>Here is what's happening with your blood bank today. Manage operations efficiently.</p>
        </div>
      </section>

      <section className="stats-grid">
        <div className="stat-card glass-panel">
          <div className="stat-icon-wrapper blood-theme"><Droplet size={24} /></div>
          <div className="stat-details">
            <p className="stat-label">Total Blood Units</p>
            <h3 className="stat-value">{totalUnits}</h3>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon-wrapper donor-theme"><Users size={24} /></div>
          <div className="stat-details">
            <p className="stat-label">Registered Donors</p>
            <h3 className="stat-value">{donors.length}</h3>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon-wrapper request-theme"><ClipboardList size={24} /></div>
          <div className="stat-details">
            <p className="stat-label">Active Requests</p>
            <h3 className="stat-value">{activeRequests}</h3>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon-wrapper" style={{ backgroundColor: "#e2e8f0", color: "#475569" }}><CheckCircle size={24} /></div>
          <div className="stat-details">
            <p className="stat-label">Completed Requests</p>
            <h3 className="stat-value">{completedRequests}</h3>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon-wrapper emergency-theme"><AlertCircle size={24} /></div>
          <div className="stat-details">
            <p className="stat-label">Emergency Requests</p>
            <h3 className="stat-value">{emergencyRequests}</h3>
          </div>
        </div>
      </section>

      <div className="dashboard-row">
        <div className="dashboard-card glass-panel w-100">
          <div className="card-header">
            <h3>Quick Inventory Status</h3>
            <button className="btn-text">View All</button>
          </div>
          <div className="mini-inventory-grid">
            {bloodGroups.map((bg) => (
              <div key={bg.group} className="mini-blood-pill">
                <span className="blood-type">{bg.group}</span>
                <span className="blood-count">{bg.units}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="dashboard-row mt-4">
        <div className="dashboard-card glass-panel w-100">
          <div className="card-header">
            <h3>Recent Hospital Requests</h3>
          </div>
          <div className="table-responsive">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Hospital Name</th>
                  <th>Blood Group</th>
                  <th>Quantity</th>
                  <th>Priority</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {hospitalRequests.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="empty-state">No recent requests</td>
                  </tr>
                ) : (
                  hospitalRequests.slice(0, 5).map(req => (
                    <tr key={req._id}>
                      <td className="fw-medium">{req.hospitalId?.name || "Unknown Hospital"}</td>
                      <td><span className="blood-pill-small">{req.bloodGroup}</span></td>
                      <td>{req.quantity} Units</td>
                      <td>
                        <span className={`priority-badge ${req.priority === "emergency" ? "emergency" : "normal"}`}>
                          {req.priority}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${req.status?.toLowerCase() || 'pending'}`}>
                          {req.status || 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
