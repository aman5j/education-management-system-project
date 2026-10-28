
import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import defaultLogo from "../assets/logo.png";
import instituteSettingsService from "../services/instituteSettingsService";
import { getAssetUrl } from "../utils/assetUrl";

import StudentSidebar from "./StudentSidebar";
import StudentTopbar from "./StudentTopbar";
import "./StudentLayout.css";

export default function StudentLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [logoUrl, setLogoUrl] = useState("");
  const [logoFailed, setLogoFailed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;

    instituteSettingsService
      .getPublicBranding()
      .then((branding) => {
        if (!active) return;

        setLogoUrl(branding?.logoUrl || "");
        setLogoFailed(false);
      })
      .catch((error) => {
        console.error("Unable to load institute branding:", error);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setNotice("");
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const displayedLogo =
    logoUrl && !logoFailed ? getAssetUrl(logoUrl) : defaultLogo;

  const handleLogoError = () => {
    if (logoUrl && !logoFailed) {
      console.error("Institute logo failed to load:", displayedLogo);
      setLogoFailed(true);
    }
  };

  const handleMenuToggle = () => {
    if (window.innerWidth <= 760) {
      setMobileOpen((previous) => !previous);
    } else {
      setCollapsed((previous) => !previous);
    }
  };

  const handlePlannedItem = (item) => {
    setNotice(`${item.label} will be available in Phase ${item.phase}.`);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div
      className={[
        "student-layout",
        collapsed ? "student-layout--collapsed" : "",
      ].filter(Boolean).join(" ")}
    >
      <StudentSidebar
        logo={displayedLogo}
        onLogoError={handleLogoError}
        mobileOpen={mobileOpen}
        collapsed={collapsed}
        onCloseMobile={() => setMobileOpen(false)}
        onPlannedItem={handlePlannedItem}
        onLogout={handleLogout}
      />

      <div className="student-layout__main">
        <StudentTopbar
          user={user}
          onMenuToggle={handleMenuToggle}
          onPlannedItem={handlePlannedItem}
          onLogout={handleLogout}
        />

        {notice && (
          <div className="student-layout__notice" role="status">
            <span>{notice}</span>
            <button
              type="button"
              aria-label="Dismiss message"
              onClick={() => setNotice("")}
            >
              ×
            </button>
          </div>
        )}

        <main className="student-layout__page">
          <Outlet />
        </main>

        <footer className="student-layout__footer">
          © {new Date().getFullYear()} India Tech Samadhaan. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
