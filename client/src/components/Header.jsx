import React, { useState, useEffect, useRef } from 'react';
import { Bell, AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const Header = ({ title, subtitle, hospitalRequests = [], bloodGroups = [], setActiveTab }) => {
  const [role, setRole] = useState("admin");
  const [user, setUser] = useState({ name: "User", email: "" });
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  useEffect(() => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role) {
          setRole(payload.role);
        }
      }

      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Derive notifications from props based on role
  let emergencyRequests = [];
  let lowStockGroups = [];
  let hospitalNotifs = [];

  if (role === 'staff' || role === 'admin') {
    emergencyRequests = hospitalRequests.filter(req => req.priority === 'emergency' && !['completed', 'rejected', 'cancelled'].includes(req.status?.toLowerCase()));
    lowStockGroups = bloodGroups.filter(bg => bg.units < 5);
  } else if (role === 'hospital') {
    // Generate role-aware notifications for hospital's own requests
    hospitalRequests.forEach(req => {
      if (['approved', 'partially_allocated', 'allocated', 'issued', 'rejected'].includes(req.status)) {
        hospitalNotifs.push({
          id: req._id,
          reqId: req.requestId || req._id.substring(0, 8),
          status: req.status
        });
      }
    });
  }

  let totalNotifications = 0;
  if (role === 'staff' || role === 'admin') {
    totalNotifications = emergencyRequests.length + lowStockGroups.length;
  } else if (role === 'hospital') {
    totalNotifications = hospitalNotifs.length;
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getDisplayRole = (r) => {
    if (r === "hospital") return "Hospital";
    if (r === "staff") return "Staff";
    if (r === "donor") return "Donor";
    if (r === "admin") return "Administrator";
    return r ? r.charAt(0).toUpperCase() + r.slice(1) : "Administrator";
  };

  const handleNotificationClick = (type) => {
    setShowNotifications(false);
    if (type === 'requests' && setActiveTab) {
      setActiveTab(role === 'hospital' ? 'my-requests' : 'requests');
    } else if (type === 'inventory' && setActiveTab) {
      setActiveTab('inventory');
    }
  };

  const avatarInitial = user.name ? user.name.charAt(0).toUpperCase() : "U";

  const renderStaffNotifications = () => (
    <>
      {emergencyRequests.length > 0 && (
        <div
          onClick={() => handleNotificationClick('requests')}
          style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', gap: '12px', alignItems: 'flex-start' }}
          className="notification-item"
        >
          <span style={{ fontSize: '20px' }}><AlertCircle size={20} color="#ef4444" /></span>
          <div>
            <strong style={{ display: 'block', fontSize: '14px', color: '#0f172a' }}>{emergencyRequests.length} Emergency {emergencyRequests.length === 1 ? 'Request' : 'Requests'}</strong>
            <span style={{ fontSize: '13px', color: '#64748b' }}>Immediate action required.</span>
          </div>
        </div>
      )}

      {lowStockGroups.map(bg => (
        <div
          key={bg.group}
          onClick={() => handleNotificationClick('inventory')}
          style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', gap: '12px', alignItems: 'flex-start' }}
          className="notification-item"
        >
          <span style={{ fontSize: '20px' }}><AlertTriangle size={20} color="#eab308" /></span>
          <div>
            <strong style={{ display: 'block', fontSize: '14px', color: '#0f172a' }}>Low Stock: {bg.group}</strong>
            <span style={{ fontSize: '13px', color: '#64748b' }}>Only {bg.units} units remaining.</span>
          </div>
        </div>
      ))}
    </>
  );

  const renderHospitalNotifications = () => (
    <>
      {hospitalNotifs.map(notif => (
        <div
          key={notif.id}
          onClick={() => handleNotificationClick('requests')}
          style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', gap: '12px', alignItems: 'flex-start' }}
          className="notification-item"
        >
          <span style={{ fontSize: '20px' }}>{notif.status === 'rejected' ? <AlertCircle size={20} color="#ef4444" /> : <Bell size={20} />}</span>
          <div>
            <strong style={{ display: 'block', fontSize: '14px', color: '#0f172a' }}>Request Update</strong>
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              Your request #{notif.reqId} is now <strong>{notif.status.replace('_', ' ')}</strong>.
            </span>
          </div>
        </div>
      ))}
    </>
  );

  return (
    <header className="header">
      <div className="header-title-container">
        <h1 className="header-title">{title}</h1>
        <p className="header-subtitle">{subtitle}</p>
      </div>
      <div className="header-profile">
        <div className="notification-wrapper" ref={notificationRef} style={{ position: 'relative' }}>
          <div
            className="notification-bell"
            onClick={() => setShowNotifications(!showNotifications)}
            style={{ cursor: 'pointer', padding: '8px' }}
          >
            <Bell size={20} /> {totalNotifications > 0 && <span className="badge">{totalNotifications}</span>}
          </div>

          {showNotifications && (
            <div className="notification-dropdown" style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '12px',
              width: '320px',
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
              border: '1px solid #e2e8f0',
              zIndex: 1000,
              overflow: 'hidden'
            }}>
              <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontWeight: '600', fontSize: '15px' }}>
                Notifications
              </div>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {totalNotifications === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
                    No new notifications
                  </div>
                ) : (
                  <>
                    {(role === 'staff' || role === 'admin') && renderStaffNotifications()}
                    {role === 'hospital' && renderHospitalNotifications()}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="profile-info">
          <div className="avatar">{avatarInitial}</div>
          <div className="profile-text">
            <strong>{user.name}</strong>
            <small>{getDisplayRole(role)}</small>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
