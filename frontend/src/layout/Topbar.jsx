import {
  useEffect,
  useState,
} from "react";

import {
  FiBell,
  FiChevronDown,
  FiMaximize,
  FiMenu,
  FiSearch,
  FiUser,
  FiSettings,
  FiLock,
  FiLogOut,
} from "react-icons/fi";

import {
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";

import "./AdminLayout.css";

const Topbar = ({
  onOpenMobileSidebar,
}) => {
  const navigate = useNavigate();

  const {
    user,
    logout,
  } = useAuth();

  const [profileOpen, setProfileOpen] =
    useState(false);

  const [searchOpen, setSearchOpen] =
    useState(false);

  const [searchValue, setSearchValue] =
    useState("");

  const [fullscreen, setFullscreen] =
    useState(false);

  useEffect(() => {
    const handleDocumentClick = () => {
      setProfileOpen(false);
    };

    document.addEventListener(
      "click",
      handleDocumentClick
    );

    return () => {
      document.removeEventListener(
        "click",
        handleDocumentClick
      );
    };
  }, []);

  const handleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setFullscreen(true);
      } else {
        await document.exitFullscreen();
        setFullscreen(false);
      }
    } catch {
      setFullscreen(false);
    }
  };

  const handleLogout = async () => {
    await logout();

    navigate("/login", {
      replace: true,
    });
  };

  const handleProfileClick = (
    event
  ) => {
    event.stopPropagation();

    setProfileOpen(
      (previous) => !previous
    );
  };

  return (
    <header className="admin-topbar">
      <div className="topbar-left">
        <button
          className="topbar-icon-button mobile-menu-button"
          onClick={onOpenMobileSidebar}
          aria-label="Open sidebar"
        >
          <FiMenu />
        </button>

        <div
          className={`topbar-search ${
            searchOpen
              ? "topbar-search-open"
              : ""
          }`}
        >
          <FiSearch />

          <input
            type="search"
            value={searchValue}
            onFocus={() =>
              setSearchOpen(true)
            }
            onChange={(event) =>
              setSearchValue(
                event.target.value
              )
            }
            placeholder="Search..."
          />
        </div>
      </div>

      <div className="topbar-actions">
        <button
          className="topbar-icon-button"
          onClick={handleFullscreen}
          title={
            fullscreen
              ? "Exit fullscreen"
              : "Fullscreen"
          }
        >
          <FiMaximize />
        </button>

        <button
          className="topbar-icon-button notification-button"
          title="Notifications"
        >
          <FiBell />

          <span className="notification-count">
            0
          </span>
        </button>

        <div className="topbar-profile-wrapper">
          <button
            className="topbar-profile"
            onClick={
              handleProfileClick
            }
          >
            <div className="profile-avatar">
              {user?.name
                ?.charAt(0)
                ?.toUpperCase() || "A"}
            </div>

            <div className="profile-info">
              <strong>
                {user?.name ||
                  "Administrator"}
              </strong>

              <span>
                {user?.role === "admin"
                  ? "Administrator"
                  : user?.role}
              </span>
            </div>

            <FiChevronDown
              className={`profile-chevron ${
                profileOpen
                  ? "profile-chevron-open"
                  : ""
              }`}
            />
          </button>

          {profileOpen && (
            <div
              className="profile-dropdown"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <div className="profile-dropdown-header">
                <div className="profile-avatar profile-avatar-large">
                  {user?.name
                    ?.charAt(0)
                    ?.toUpperCase() ||
                    "A"}
                </div>

                <div>
                  <strong>
                    {user?.name}
                  </strong>

                  <span>
                    {user?.email}
                  </span>
                </div>
              </div>

              <div className="profile-dropdown-divider" />

              <button
                onClick={() => {
                  setProfileOpen(false);
                  navigate("/admin/profile");
                }}
              >
                <FiUser />
                Profile
              </button>

              <button
                onClick={() => {
                  setProfileOpen(false);
                  navigate(
                    "/admin/system-settings"
                  );
                }}
              >
                <FiSettings />
                Settings
              </button>

              <button
                onClick={() => {
                  setProfileOpen(false);
                  navigate(
                    "/admin/change-password"
                  );
                }}
              >
                <FiLock />
                Change Password
              </button>

              <div className="profile-dropdown-divider" />

              <button
                className="profile-logout-button"
                onClick={handleLogout}
              >
                <FiLogOut />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;