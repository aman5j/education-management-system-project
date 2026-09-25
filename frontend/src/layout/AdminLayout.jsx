import {
  useEffect,
  useState,
} from "react";

import {
  Outlet,
} from "react-router-dom";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

import "./AdminLayout.css";

const SIDEBAR_STORAGE_KEY =
  "ems_admin_sidebar_collapsed";

const AdminLayout = () => {
  const [
    collapsed,
    setCollapsed,
  ] = useState(() => {
    const stored =
      localStorage.getItem(
        SIDEBAR_STORAGE_KEY
      );

    return stored === "true";
  });

  const [
    mobileSidebarOpen,
    setMobileSidebarOpen,
  ] = useState(false);

  const [openMenus, setOpenMenus] =
    useState({});

  useEffect(() => {
    localStorage.setItem(
      SIDEBAR_STORAGE_KEY,
      String(collapsed)
    );
  }, [collapsed]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 992) {
        setMobileSidebarOpen(false);
      }
    };

    window.addEventListener(
      "resize",
      handleResize
    );

    return () =>
      window.removeEventListener(
        "resize",
        handleResize
      );
  }, []);

  useEffect(() => {
    document.body.style.overflow =
      mobileSidebarOpen
        ? "hidden"
        : "";

    return () => {
      document.body.style.overflow =
        "";
    };
  }, [mobileSidebarOpen]);

  const handleToggleMenu = (
    menuLabel
  ) => {
    setOpenMenus((previous) => ({
      ...previous,
      [menuLabel]:
        !previous[menuLabel],
    }));
  };

  return (
    <div
      className={`admin-layout ${
        collapsed
          ? "admin-layout-collapsed"
          : ""
      }`}
    >
      <Sidebar
        collapsed={collapsed}
        mobileOpen={
          mobileSidebarOpen
        }
        onToggle={() =>
          setCollapsed(
            (previous) =>
              !previous
          )
        }
        onCloseMobile={() =>
          setMobileSidebarOpen(false)
        }
        openMenus={openMenus}
        onToggleMenu={
          handleToggleMenu
        }
      />

      <div className="admin-main">
        <Topbar
          onOpenMobileSidebar={() =>
            setMobileSidebarOpen(true)
          }
        />

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;