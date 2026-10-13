import React from 'react';
import {
  LayoutDashboard,
  User,
  HeartHandshake,
  Calendar,
  ShieldCheck,
  Settings,
  LogOut,
  Users,
  Droplet,
  Hospital,
  Search,
  Activity
} from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, onLogout, role }) => {
  let tabs = [];
  if (role === "donor") {
    tabs = [
      { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
      { id: "profile", label: "My Profile", icon: <User size={20} /> },
      { id: "my-donations", label: "My Donations", icon: <HeartHandshake size={20} /> },
      { id: "schedule", label: "Donation Schedule", icon: <Calendar size={20} /> },
      { id: "eligibility", label: "Eligibility", icon: <ShieldCheck size={20} /> },
    ];
  } else if (role === "hospital") {
    tabs = [
      { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
      { id: "profile", label: "My Profile", icon: <User size={20} /> },
      { id: "my-requests", label: "My Requests", icon: <Hospital size={20} /> },
      { id: "request-history", label: "Request History", icon: <Calendar size={20} /> },
    ];
  } else if (role === "admin") {
    tabs = [
      { id: "dashboard", label: "Admin Overview", icon: <LayoutDashboard size={20} /> },
      { id: "users", label: "User Management", icon: <Users size={20} /> },
      { id: "inventory", label: "Blood Inventory", icon: <Droplet size={20} /> },
      { id: "requests", label: "Hospital Requests", icon: <Hospital size={20} /> },
      { id: "donors", label: "Donors", icon: <Users size={20} /> },
      { id: "donations", label: "Donations", icon: <HeartHandshake size={20} /> },
      { id: "appointments", label: "Appointments", icon: <Calendar size={20} /> },
      { id: "traceability", label: "Traceability", icon: <Search size={20} /> },
    ];
  } else {
    tabs = [
      { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
      { id: "appointments", label: "Appointments", icon: <Calendar size={20} /> },
      { id: "donors", label: "Donors", icon: <Users size={20} /> },
      { id: "donations", label: "Donations", icon: <HeartHandshake size={20} /> },
      { id: "inventory", label: "Blood Inventory", icon: <Droplet size={20} /> },
      { id: "requests", label: "Hospital Requests", icon: <Hospital size={20} /> },
      { id: "traceability", label: "Traceability", icon: <Search size={20} /> },
    ];
  }

  return (
    <aside className="sidebar">
      <div className="logo-container">
        <div className="logo-icon">
          <Activity size={24} strokeWidth={2.5} color="#dc2626" />
        </div>
        <h2>BloodConnect</h2>
      </div>
      <nav className="nav-menu">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {tab.icon}
            </span>
            <span className="nav-label">{tab.label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <button
          className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Settings size={20} />
          </span>
          <span className="nav-label">Settings</span>
        </button>
        <button className="nav-item logout" onClick={onLogout}>
          <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LogOut size={20} />
          </span>
          <span className="nav-label">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
