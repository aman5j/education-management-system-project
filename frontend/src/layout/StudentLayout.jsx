
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  FiActivity,
  FiBell,
  FiBookOpen,
  FiCalendar,
  FiCheckCircle,
  FiChevronDown,
  FiClipboard,
  FiCreditCard,
  FiFileText,
  FiGrid,
  FiHelpCircle,
  FiLogOut,
  FiMenu,
  FiSearch,
  FiSettings,
  FiUser,
  FiX,
} from "react-icons/fi";

import { useAuth } from "../context/AuthContext";
import defaultLogo from "../assets/logo.png";
import instituteSettingsService from "../services/instituteSettingsService";
import { getAssetUrl } from "../utils/assetUrl";

import "./StudentLayout.css";

const navigation = [
  { label: "Dashboard", icon: FiGrid, path: "/student/dashboard", active: true },
  { label: "My Courses", icon: FiBookOpen, phase: 3 },
  { label: "My Attendance", icon: FiActivity, phase: 4 },
  { label: "Fees & Payments", icon: FiCreditCard, phase: 5 },
  { label: "Exams & Results", icon: FiClipboard, phase: 6 },
  { label: "Certificates", icon: FiCheckCircle, phase: 7 },
  { label: "My Admission Details", icon: FiFileText, phase: 8 },
  { label: "My Documents", icon: FiFileText, phase: 9 },
  { label: "Notifications", icon: FiBell, phase: 10 },
  { label: "Helpdesk & Support", icon: FiHelpCircle, phase: 11 },
  { label: "Apply for Leave", icon: FiCalendar, phase: 12 },
  { label: "My Profile", icon: FiUser, phase: 13 },
];

const StudentLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [logoUrl, setLogoUrl] = useState("");
  const [logoFailed, setLogoFailed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    let active = true;

    instituteSettingsService
      .getPublicBranding()
      .then((branding) => {
        if (active) {
          setLogoUrl(branding?.logoUrl || "");
          setLogoFailed(false);
        }
      })
      .catch(() => {
        // Keep the bundled logo if public branding is unavailable.
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
    setNotice("");
  }, [location.pathname]);

  const displayName =
    user?.name ||
    user?.email?.split("@")[0] ||
    "Student";

  const avatarLetter = displayName.trim().charAt(0).toUpperCase() || "S";

  const displayedLogo =
    logoUrl && !logoFailed ? getAssetUrl(logoUrl) : defaultLogo;

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const handlePlannedItem = (item) => {
    setNotice(
      `${item.label} will be enabled in Phase ${item.phase}. Your existing dashboard remains available.`
    );
  };

  const handleMenuToggle = () => {
    if (window.innerWidth <= 760) {
        setMobileOpen((previous) => !previous);
        return;
    }

    setCollapsed((previous) => !previous);
    };

  return (
    // <div className="student-layout">
    <div className={`student-layout ${collapsed ? "student-layout--collapsed" : ""}`}>
      {mobileOpen && (
        <button
          className="student-layout__backdrop"
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`student-layout__sidebar ${
          mobileOpen ? "student-layout__sidebar--open" : ""
        }`}
      >
        <div className="student-layout__brand">
          <img
            src={displayedLogo}
            alt="Institute logo"
            onError={() => setLogoFailed(true)}
          />
          <button
            type="button"
            className="student-layout__mobile-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Close sidebar"
          >
            <FiX />
          </button>
        </div>

        <div className="student-layout__portal-label">STUDENT PORTAL</div>

        <nav className="student-layout__nav" aria-label="Student navigation">
          {navigation.map((item) => {
            const Icon = item.icon;

            if (item.active) {
              return (
                <NavLink
                  key={item.label}
                  to={item.path}
                  end
                  className={({ isActive }) =>
                    `student-layout__nav-item ${
                      isActive ? "student-layout__nav-item--active" : ""
                    }`
                  }
                >
                  <Icon />
                  <span>{item.label}</span>
                </NavLink>
              );
            }

            return (
              <button
                key={item.label}
                type="button"
                className="student-layout__nav-item student-layout__nav-item--planned"
                onClick={() => handlePlannedItem(item)}
                title={`Planned for Phase ${item.phase}`}
              >
                <Icon />
                <span>{item.label}</span>
                <span className="student-layout__phase-tag">
                  {item.phase}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="student-layout__sidebar-bottom">
          <div className="student-layout__support-note">
            <FiHelpCircle />
            <div>
              <strong>Need help?</strong>
              <span>Contact your institute administrator.</span>
            </div>
          </div>

          <button
            type="button"
            className="student-layout__signout"
            onClick={handleLogout}
          >
            <FiLogOut />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="student-layout__main">
        <header className="student-layout__topbar">
          <div className="student-layout__topbar-left">
            {/* <button
              type="button"
              className="student-layout__menu-toggle"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
            >
              <FiMenu />
            </button> */}

            <button
                type="button"
                className="student-layout__menu-toggle"
                onClick={handleMenuToggle}
                aria-label="Toggle sidebar"
                aria-expanded={!collapsed}
                >
                <FiMenu />
            </button>

            <div className="student-layout__search">
              <FiSearch />
              <input
                type="search"
                aria-label="Dashboard search"
                placeholder="Search student portal"
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.currentTarget.value = "";
                  }
                }}
              />
            </div>
          </div>

          <div className="student-layout__topbar-actions">
            <button
              type="button"
              className="student-layout__icon-button"
              aria-label="Notifications"
              onClick={() =>
                handlePlannedItem({
                  label: "Notifications",
                  phase: 10,
                })
              }
            >
              <FiBell />
              <span className="student-layout__notification-dot" />
            </button>

            <div className="student-layout__profile-wrap">
              <button
                type="button"
                className="student-layout__profile-button"
                onClick={() => setProfileOpen((value) => !value)}
                aria-expanded={profileOpen}
              >
                <span className="student-layout__avatar">{avatarLetter}</span>
                <span className="student-layout__profile-text">
                  <strong>{displayName}</strong>
                  <small>Student</small>
                </span>
                <FiChevronDown />
              </button>

              {profileOpen && (
                <div className="student-layout__profile-menu">
                  <div className="student-layout__profile-menu-heading">
                    <strong>{displayName}</strong>
                    <span>{user?.email || "Student account"}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handlePlannedItem({
                        label: "My Profile",
                        phase: 13,
                      })
                    }
                  >
                    <FiSettings />
                    Profile settings
                  </button>

                  <button type="button" onClick={handleLogout}>
                    <FiLogOut />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {notice && (
          <div className="student-layout__notice" role="status">
            <span>{notice}</span>
            <button
              type="button"
              aria-label="Dismiss message"
              onClick={() => setNotice("")}
            >
              <FiX />
            </button>
          </div>
        )}

        <div className="student-layout__page">
          <Outlet />
        </div>

        <footer className="student-layout__footer">
          © {new Date().getFullYear()} India Tech Samadhaan. All rights reserved.
        </footer>
      </div>
    </div>
  );
};

export default StudentLayout;
