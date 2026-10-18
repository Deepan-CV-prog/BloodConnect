import "./App.css";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { API_BASE_URL, SOCKET_URL } from "./config";

import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import DashboardOverview from "./components/DashboardOverview";
import HospitalDashboard from "./components/HospitalDashboard";
import BloodInventory from "./components/BloodInventory";
import HospitalRequests from "./components/HospitalRequests";
import Donors from "./components/Donors";
import Donations from "./components/Donations";
import Traceability from "./components/Traceability";
import DonationAppointments from "./components/DonationAppointments";
import Settings from "./components/Settings";
import DonorDashboard from "./components/DonorDashboard";
import Login from "./components/Login";
import AdminDashboard from "./components/AdminDashboard";
import UserManagement from "./components/UserManagement";

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [userRole, setUserRole] = useState("admin");
  const [userName, setUserName] = useState("User");
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem("token"));
  const loadUserFromStorage = () => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        const payload = JSON.parse(atob(token.split(`.`)[1]));
        if (payload.role) setUserRole(payload.role);
      }
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        const pUser = JSON.parse(savedUser);
        if (pUser.name) setUserName(pUser.name);
        if (pUser.role) setUserRole(pUser.role);
      }
    } catch(e) {}
  };

  useEffect(() => {
    loadUserFromStorage();
  }, []);
  const [isLoading, setIsLoading] = useState(true);

  const [bloodGroups, setBloodGroups] = useState([
    { group: "A+", units: 0 },
    { group: "A-", units: 0 },
    { group: "B+", units: 0 },
    { group: "B-", units: 0 },
    { group: "AB+", units: 0 },
    { group: "AB-", units: 0 },
    { group: "O+", units: 0 },
    { group: "O-", units: 0 },
  ]);
  const [hospitalRequests, setHospitalRequests] = useState([]);
  const [donors, setDonors] = useState([]);
  const [donations, setDonations] = useState([]);

  // Function to fetch latest inventory from backend
  const fetchInventory = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_BASE_URL}/api/blood-units/inventory`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setBloodGroups([
          { group: "A+", units: data.inventory["A+"] },
          { group: "A-", units: data.inventory["A-"] },
          { group: "B+", units: data.inventory["B+"] },
          { group: "B-", units: data.inventory["B-"] },
          { group: "AB+", units: data.inventory["AB+"] },
          { group: "AB-", units: data.inventory["AB-"] },
          { group: "O+", units: data.inventory["O+"] },
          { group: "O-", units: data.inventory["O-"] },
        ]);
      } else {
        console.error("Inventory request failed:", data);
      }
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
    }
  };

  const fetchHospitalRequests = async () => {
    try {
      const token = localStorage.getItem("token");
      let endpoint = `${API_BASE_URL}/api/blood-requests`;

      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.role === "hospital") {
            endpoint = `${API_BASE_URL}/api/blood-requests/my-requests`;
          }
        } catch (e) {
          // ignore
        }
      }

      const response = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setHospitalRequests(data.requests || data.bloodRequests || []);
      } else {
        console.error("Hospital requests failed:", data);
      }
    } catch (error) {
      console.error("Failed to fetch hospital requests:", error);
    }
  };


  const fetchDonors = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_BASE_URL}/api/donors`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setDonors(data.donors || []);
      } else {
        console.error("Donor request failed:", data);
      }
    } catch (error) {
      console.error("Failed to fetch donors:", error);
    }
  };

  const fetchDonations = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_BASE_URL}/api/donations`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setDonations(data.donations || []);
      } else {
        console.error("Donation request failed:", data);
      }
    } catch (error) {
      console.error("Failed to fetch donations:", error);
    }
  };

  // Fetch all data when dashboard loads
  useEffect(() => {
    if (isAuthenticated) {
      if (userRole === "admin" || userRole === "staff") {
        fetchInventory();
        fetchHospitalRequests();
        fetchDonors();
        fetchDonations();
      }
      setIsLoading(false);
    }
  }, [isAuthenticated, userRole]);

  // Socket.IO real-time connection
  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on("inventoryUpdated", () => {
      fetchInventory();
    });

    socket.on("requestUpdated", () => {
      fetchHospitalRequests();
    });

    return () => socket.disconnect();
  }, []);

  const renderContent = () => {
    if (userRole === "donor") {
      switch (activeTab) {
        case "dashboard": return <DonorDashboard userName={userName} />;
        case "alerts": return <DonorDashboard userName={userName} initialTab="alerts" />;
        case "profile": return <DonorDashboard userName={userName} initialTab="profile" />;
        case "my-donations": return <DonorDashboard userName={userName} initialTab="donations" />;
        case "schedule": return <DonorDashboard userName={userName} initialTab="schedule" />;
        case "eligibility": return <DonorDashboard userName={userName} initialTab="eligibility" />;
        case "settings": return <Settings onLogout={handleLogout} />;
        default: return <DonorDashboard userName={userName} />;
      }
    } else if (userRole === "hospital") {
      switch (activeTab) {
        case "dashboard": return <HospitalDashboard requests={hospitalRequests} onRefresh={fetchHospitalRequests} />;
        case "create-request": return <HospitalDashboard requests={hospitalRequests} onRefresh={fetchHospitalRequests} initialTab="dashboard" />;
        case "my-requests": return <HospitalDashboard requests={hospitalRequests} onRefresh={fetchHospitalRequests} initialTab="requests" />;
        case "request-history": return <HospitalDashboard requests={hospitalRequests} onRefresh={fetchHospitalRequests} initialTab="history" />;
        case "profile": return <HospitalDashboard requests={hospitalRequests} onRefresh={fetchHospitalRequests} initialTab="profile" />;
        case "settings": return <Settings onLogout={handleLogout} />;
        default: return <HospitalDashboard requests={hospitalRequests} onRefresh={fetchHospitalRequests} />;
      }
    } else if (userRole === "admin") {
      switch (activeTab) {
        case "dashboard": return <AdminDashboard onNavigate={(tab) => setActiveTab(tab)} />;
        case "users": return <UserManagement />;
        case "inventory": return <BloodInventory bloodGroups={bloodGroups} loading={isLoading} />;
        case "requests": return <HospitalRequests requests={hospitalRequests} loading={isLoading} onRefresh={fetchHospitalRequests} />;
        case "donors": return <Donors donors={donors} loading={isLoading} />;
        case "donations": return <Donations donations={donations} loading={isLoading} />;
        case "appointments": return <DonationAppointments />;
        case "traceability": return <Traceability />;
        case "settings": return <Settings onLogout={handleLogout} />;
        default: return <AdminDashboard onNavigate={(tab) => setActiveTab(tab)} />;
      }
    } else {
      switch (activeTab) {
        case "dashboard": return <DashboardOverview bloodGroups={bloodGroups} donors={donors} hospitalRequests={hospitalRequests} />;
        case "inventory": return <BloodInventory bloodGroups={bloodGroups} loading={isLoading} />;
        case "requests": return <HospitalRequests requests={hospitalRequests} loading={isLoading} onRefresh={fetchHospitalRequests} />;
        case "donors": return <Donors donors={donors} loading={isLoading} />;
        case "donations": return <Donations donations={donations} loading={isLoading} />;
        case "appointments": return <DonationAppointments />;
        case "traceability": return <Traceability />;
        case "settings": return <Settings onLogout={handleLogout} />;
        default: return <DashboardOverview bloodGroups={bloodGroups} donors={donors} hospitalRequests={hospitalRequests} />;
      }
    }
  };

  const getPageTitle = () => {
    if (userRole === "donor") {
      switch(activeTab) {
        case "dashboard": return { title: "Donor Dashboard", subtitle: "Manage your blood donation journey" };
        case "profile": return { title: "My Profile", subtitle: "Manage your personal information" };
        case "my-donations": return { title: "My Donations", subtitle: "View your donation history" };
        case "schedule": return { title: "Donation Schedule", subtitle: "Schedule your next donation" };
        case "eligibility": return { title: "Eligibility", subtitle: "Check your donation eligibility" };
        case "settings": return { title: "Settings", subtitle: "Manage your account and preferences" };
        default: return { title: "Donor Dashboard", subtitle: "Manage your blood donation journey" };
      }
    } else if (userRole === "hospital") {
      switch (activeTab) {
        case "dashboard": return { title: "Hospital Dashboard", subtitle: "Manage your blood requests" };
        case "my-requests": return { title: "My Requests", subtitle: "View and track your blood requests" };
        case "request-history": return { title: "Request History", subtitle: "View your past blood requests" };
        case "profile": return { title: "Hospital Profile", subtitle: "Manage your hospital details" };
        case "settings": return { title: "Settings", subtitle: "Manage your account preferences" };
        default: return { title: "Hospital Dashboard", subtitle: "Manage your blood requests" };
      }
    } else if (userRole === "admin") {
      switch(activeTab) {
        case "dashboard": return { title: "Admin Overview", subtitle: "System-wide operations, inventory metrics & real-time monitoring" };
        case "users": return { title: "User Management", subtitle: "Search, filter, and govern registered system accounts" };
        case "inventory": return { title: "Blood Inventory", subtitle: "Manage and monitor available blood stock" };
        case "requests": return { title: "Hospital Requests", subtitle: "Review and process blood unit requests" };
        case "donors": return { title: "Donors Management", subtitle: "View and manage registered blood donors" };
        case "donations": return { title: "Donation Records", subtitle: "Track recent blood donations and drives" };
        case "appointments": return { title: "Donation Appointments", subtitle: "Review and manage donor scheduling requests" };
        case "traceability": return { title: "Unit Traceability", subtitle: "Track lifecycle and location of blood units" };
        case "settings": return { title: "Settings", subtitle: "Manage your account and preferences" };
        default: return { title: "Admin Overview", subtitle: "System Overview" };
      }
    } else {
      switch(activeTab) {
        case "dashboard": return { title: "Dashboard", subtitle: "Real-Time Blood Bank Management System" };
        case "inventory": return { title: "Blood Inventory", subtitle: "Manage and monitor available blood stock" };
        case "requests": return { title: "Hospital Requests", subtitle: "Review and process blood unit requests" };
        case "donors": return { title: "Donors Management", subtitle: "View and manage registered blood donors" };
        case "donations": return { title: "Donation Records", subtitle: "Track recent blood donations and drives" };
        case "appointments": return { title: "Donation Appointments", subtitle: "Review and manage donor scheduling requests" };
        case "traceability": return { title: "Unit Traceability", subtitle: "Track lifecycle and location of blood units" };
        case "settings": return { title: "Settings", subtitle: "Manage your account and preferences" };
        default: return { title: "Dashboard", subtitle: "System Overview" };
      }
    }
  };

  useEffect(() => {
    const handleStorageChange = () => {
      setIsAuthenticated(!!localStorage.getItem("token"));
      loadUserFromStorage();
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUserRole("");
    setUserName("User");
    setActiveTab("dashboard");
    setDonors([]);
    setDonations([]);
    setHospitalRequests([]);
    setBloodGroups([
      { group: "A+", units: 0 },
      { group: "A-", units: 0 },
      { group: "B+", units: 0 },
      { group: "B-", units: 0 },
      { group: "AB+", units: 0 },
      { group: "AB-", units: 0 },
      { group: "O+", units: 0 },
      { group: "O-", units: 0 },
    ]);
    setIsAuthenticated(false);
    // Disconnect socket if any? It disconnects on unmount.
  };

  const { title, subtitle } = getPageTitle();

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => { loadUserFromStorage(); setActiveTab("dashboard"); setIsAuthenticated(true); }} />;
  }

  return (
    <div className="app-layout">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} role={userRole} />
      <main className="main-content">
        <Header
          title={title}
          subtitle={subtitle}
          hospitalRequests={hospitalRequests}
          bloodGroups={bloodGroups}
          setActiveTab={setActiveTab}
        />
        <div className="content-area">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default App;
