
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import {
  FiActivity,
  FiBell,
  FiChevronLeft,
  FiDatabase,
  FiGrid,
  FiLogOut,
  FiMenu,
  FiSettings,
  FiShield,
  FiUsers,
  FiX,
} from "react-icons/fi";

import { usePlatformAuth } from "../context/PlatformAuthContext";
import notification from "../utils/notification";

const navigation = [
  {
    label: "OVERVIEW",
    items: [
      {
        title: "Dashboard",
        path: "/platform/dashboard",
        icon: <FiGrid />,
      },
    ],
  },
  {
    label: "PLATFORM MANAGEMENT",
    items: [
      {
        title: "Institutes",
        path: "/platform/institutes",
        icon: <FiUsers />,
      },
      {
        title: "Database Management",
        path: "/platform/databases",
        icon: <FiDatabase />,
        upcoming: true,
      },
      {
        title: "Domains",
        path: "/platform/domains",
        icon: <FiActivity />,
        upcoming: true,
      },
      {
        title: "Subscriptions",
        path: "/platform/subscriptions",
        icon: <FiBell />,
        upcoming: true,
      },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      {
        title: "Platform Settings",
        path: "/platform/settings",
        icon: <FiSettings />,
        upcoming: true,
      },
    ],
  },
];

const PlatformLayout = () => {
  const navigate = useNavigate();

  const { user, logout } = usePlatformAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    const confirmed = await notification.confirm({
      title: "Logout from EMS Platform?",
      text: "Your Platform Super Admin session will be ended.",
      confirmText: "Yes, logout",
      icon: "warning",
    });

    if (!confirmed) return;

    try {
      setLoggingOut(true);
      await logout();
      notification.success("Platform logout successful.");
      navigate("/platform/login", { replace: true });
    } catch {
      notification.error("Unable to complete platform logout.");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div
      className={`platform-layout ${
        collapsed ? "platform-layout-collapsed" : ""
      }`}
    >
      {mobileOpen && (
        <button
          className="platform-sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`platform-sidebar ${
          mobileOpen ? "platform-sidebar-open" : ""
        }`}
      >
        <div className="platform-sidebar-brand">
          <div className="platform-logo">
            <FiShield />
          </div>

          <div className="platform-brand-text">
            <strong>EMS PLATFORM</strong>
            <span>CONTROL CENTER</span>
          </div>

          <button
            type="button"
            className="platform-mobile-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Close sidebar"
          >
            <FiX />
          </button>
        </div>

        <div className="platform-sidebar-caption">
          SUPER ADMIN
        </div>

        <nav className="platform-navigation">
          {navigation.map((group) => (
            <div className="platform-nav-group" key={group.label}>
              <span className="platform-nav-label">
                {group.label}
              </span>

              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.upcoming ? "/platform/dashboard" : item.path}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `platform-nav-link ${
                      isActive && !item.upcoming ? "active" : ""
                    } ${item.upcoming ? "upcoming" : ""}`
                  }
                  title={item.upcoming ? `${item.title} — Coming soon` : item.title}
                >
                  {item.icon}
                  <span>{item.title}</span>

                  {item.upcoming && (
                    <small>SOON</small>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="platform-sidebar-bottom">
          <div className="platform-sidebar-user">
            <div className="platform-user-avatar">
              {(user?.name || "S").charAt(0).toUpperCase()}
            </div>

            <div className="platform-user-info">
              <strong>{user?.name || "Super Admin"}</strong>
              <span>Platform Super Admin</span>
            </div>
          </div>

          <button
            className="platform-logout-button"
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            <FiLogOut />
            <span>{loggingOut ? "Logging out..." : "Logout"}</span>
          </button>
        </div>

        <button
          type="button"
          className="platform-collapse-button"
          onClick={() => setCollapsed((value) => !value)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <FiChevronLeft />
        </button>
      </aside>

      <div className="platform-main">
        <header className="platform-topbar">
          <div className="platform-topbar-left">
            <button
              type="button"
              className="platform-mobile-menu"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <FiMenu />
            </button>

            <div>
              <span>EMS PLATFORM</span>
              <strong>Administration</strong>
            </div>
          </div>

          <div className="platform-topbar-right">
            <div className="platform-topbar-status">
              <span />
              Platform Active
            </div>

            <div className="platform-topbar-avatar">
              {(user?.name || "S").charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="platform-content">
          <Outlet />
        </main>

        <footer className="platform-footer">
          © {new Date().getFullYear()} EMS Platform. All rights reserved.
        </footer>
      </div>
    </div>
  );
};

export default PlatformLayout;
