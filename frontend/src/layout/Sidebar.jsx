import {
  FiActivity,
  FiBarChart2,
  FiBookOpen,
  FiCalendar,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiClipboard,
  FiDollarSign,
  FiFileText,
  FiGrid,
  FiLayers,
  FiMessageSquare,
  FiMonitor,
  FiSettings,
  FiUsers,
  FiUserCheck,
  FiAward,
  FiGlobe,
  FiHelpCircle,
  FiX,
} from "react-icons/fi";
import { HiOutlineBars3 } from "react-icons/hi2";

import { useAuth } from "../context/AuthContext";

import {
  NavLink,
  useLocation,
} from "react-router-dom";

import "./AdminLayout.css";
import logo from "../assets/logo.png";

import { useEffect, useState } from "react";
// import { useAuth } from "../context/AuthContext";
import instituteSettingsService from "../services/instituteSettingsService";
import { getAssetUrl } from "../utils/assetUrl";
import defaultLogo from "../assets/logo.png";



const menuItems = [
  {
    label: "Dashboard",
    path: "/admin/dashboard",
    icon: FiGrid,
  },

  


  {
    label: "Admissions",
    icon: FiClipboard,
    children: [
      {
        label: "Manage Admissions",
        path: "/admin/admissions",
      },
       {
        label: "Add New Admission",
        path: "/admin/admissions/add",
      },
    ],
  },

  {
    label: "Students",
    icon: FiUsers,
    children: [
      {
        label: "Manage Students",
        path: "/admin/students",
      },
      {
        label: "Add New Student",
        path: "/admin/students/add",
      },
    ],
  },

  {
    label: "Course Enquiries",
    path: "/admin/enquiries",
    icon: FiMessageSquare,
  },
  
  {
    label: "Courses",
    icon: FiBookOpen,
    children: [
      {
        label: "Course Categories",
        // path: "/admin/course-categories",
        path: "/admin/categories",
      },
      {
        label: "Subjects",
        path: "/admin/subjects",
      },
      {
        label: "Courses",
        path: "/admin/courses",
      },
    ],
  },

  {
    label: "Batches",
    path: "/admin/batches",
    icon: FiLayers,
  },

  {
    label: "Attendance",
    path: "/admin/attendance",
    icon: FiUserCheck,
  },

  {
    label: "Fees Management",
    icon: FiDollarSign,
    children: [
      {
        label: "Expenses",
        path: "/admin/expenses",
      },
     
      
     
      {
        label: "Add Fee Payment",
        // path: "/admin/payment-settings",
        path: "/admin/payments",
      },
      {
        label: "Fees Payment Reports",
        // path: "/admin/reports",
        path: "/admin/reports/payments",
      },
    ],
  },

  {
    label: "Exams",
    icon: FiFileText,
    children: [
      {
        label: "Exam Schedule",
        path: "/admin/exams/schedule",
      },
      {
        label: "Exam Access Requests",
        path: "/admin/exams/access-requests",
      },
      {
        label: "Hall Ticket Management",
        path: "/admin/hall-tickets",
      },
      // {
      //   label: "Exam Results",
      //   path: "/admin/exams/results",
      // },
      {
        label: "Update Marks",
        path: "/admin/exams/update-marks",
      },
      {
        label: "Result Reports",
        path: "/admin/result-reports",
      },
    ],
  },

  {
    label: "Certificates",
    path: "/admin/certificates",
    icon: FiAward,
  },

  {
    label: "Roles & Staff",
    // path: "/admin/staff",
    icon: FiUsers,
    children: [
      {
        label: "Roles",
        path: "/admin/roles",
      },
      {
        label: "Faculty & Staff",
        path: "/admin/staff",
      },
    ],
  },

  {
    label: "Communication",
    path: "/admin/communication",
    icon: FiMessageSquare,
  },

  {
    label: "Website Manager",
    icon: FiGlobe,
    children: [
      {
        label: "Website Editor",
        path: "/admin/website-editor",
      },
      {
        label: "Pages",
        path: "/admin/pages",
      },
      {
        label: "Media",
        path: "/admin/media",
      },
      {
        label: "SEO",
        path: "/admin/seo",
      },
    ],
  },

  {
    label: "Reports",
    path: "/admin/reports",
    icon: FiBarChart2,
  },

  {
    label: "Settings",
    icon: FiSettings,
    children: [
      {
        label: "Profile",
        path: "/admin/profile",
      },
      {
        label: "Users",
        path: "/admin/users",
      },
      {
        label: "Roles",
        path: "/admin/roles",
      },
      {
        label: "System Settings",
        path: "/admin/system-settings",
      },
    ],
  },
];

const PATH_PERMISSION_MAP = {
  "/admin/dashboard": "dashboard.view",

  "/admin/admissions": "admissions.view",
  "/admin/admissions/add": "admissions.create",

  "/admin/students": "students.view",
  "/admin/students/add": "students.create",

  "/admin/students/:id/edit": "students.update",

  "/admin/enquiries": "courses.view",
  "/admin/categories": "courses.view",
  "/admin/subjects": "courses.view",
  "/admin/courses": "courses.view",

  "/admin/batches": "batches.view",
  "/admin/attendance": "attendance.view",

  "/admin/expenses": "expenses.view",
  "/admin/payments": "payments.view",
  "/admin/reports/payments": "reports.view",

  "/admin/exams/schedule": "exams.view",
  "/admin/hall-tickets": "exams.view",
  "/admin/exams/results": "results.view",
  "/admin/exams/update-marks": "results.view",  // update this for admin control marks 
  "/admin/result-reports": "results.view",

  "/admin/certificates": "certificates.view",
  "/admin/staff": "users.view",
  "/admin/communication": "settings.manage",
  "/admin/communication": "settings.manage",

  "/admin/website-editor": "website.view",
  "/admin/pages": "website.view",
  "/admin/media": "website.view",
  "/admin/seo": "website.view",

  "/admin/reports": "reports.view",
  "/admin/profile": "dashboard.view",
  "/admin/users": "users.view",
  "/admin/roles": "roles.view",
  "/admin/system-settings": "settings.manage",
};

// const canAccessPath = (path, permissions) => {
//   const requiredPermission = PATH_PERMISSION_MAP[path];

//   return (
//     Boolean(requiredPermission) &&
//     (
//       permissions.includes("*") ||
//       permissions.includes(requiredPermission)
//     )
//   );
// };


const canAccessPath = (path, permissions) => {
  // Every staff member should be able to manage their own profile.
  if (path === "/admin/profile") {
    return true;
  }

  const requiredPermission = PATH_PERMISSION_MAP[path];

  return (
    Boolean(requiredPermission) &&
    (
      permissions.includes("*") ||
      permissions.includes(requiredPermission)
    )
  );
};

// const filterMenuItemsByPermission = (
//   items,
//   permissions,
//   dashboardPath
// ) => {
//   return items
//     .map((item) => {
//       if (item.label === "Dashboard") {
//         return {
//           ...item,
//           path: dashboardPath,
//         };
//       }

//       if (Array.isArray(item.children)) {
//         const children = item.children.filter((child) =>
//           canAccessPath(child.path, permissions)
//         );

//         return children.length
//           ? { ...item, children }
//           : null;
//       }

//       return canAccessPath(item.path, permissions)
//         ? item
//         : null;
//     })
//     .filter(Boolean);
// };

const filterMenuItemsByPermission = (
  items,
  permissions,
  dashboardPath
) => {
  const toStaffPath = (path) =>
    path?.replace(/^\/admin(?=\/|$)/, "/staff");

  return items
    .map((item) => {
      if (item.label === "Dashboard") {
        return {
          ...item,
          path: dashboardPath,
        };
      }

      if (Array.isArray(item.children)) {
        const children = item.children
          .filter((child) =>
            canAccessPath(child.path, permissions)
          )
          .map((child) => ({
            ...child,
            path: toStaffPath(child.path),
          }));

        return children.length
          ? { ...item, children }
          : null;
      }

      if (!canAccessPath(item.path, permissions)) {
        return null;
      }

      return {
        ...item,
        path: toStaffPath(item.path),
      };
    })
    .filter(Boolean);
};


const hasActiveChild = (
  item,
  pathname
) => {
  if (!item.children) {
    return false;
  }

  return item.children.some(
    (child) =>
      pathname === child.path ||
      pathname.startsWith(`${child.path}/`)
  );
};

const Sidebar = ({
  collapsed,
  mobileOpen,
  onToggle,
  onCloseMobile,
  openMenus,
  onToggleMenu,
  dashboardPath = "/admin/dashboard",
}) => {
  const location = useLocation();

  const [instituteLogo, setInstituteLogo] = useState("");
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadInstituteLogo = async () => {
      try {
        const settings = await instituteSettingsService.getSettings();

        if (mounted) {
          setInstituteLogo(settings?.logoUrl || "");
          setLogoLoadFailed(false);
        }
      } catch (error) {
        console.error("Unable to load institute logo:", error);
      }
    };

    const handleLogoUpdated = (event) => {
      setInstituteLogo(event.detail?.logoUrl || "");
      setLogoLoadFailed(false);
    };

    loadInstituteLogo();

    window.addEventListener(
      "ems:institute-logo-updated",
      handleLogoUpdated
    );

    return () => {
      mounted = false;
      window.removeEventListener(
        "ems:institute-logo-updated",
        handleLogoUpdated
      );
    };
  }, []);

  const displayedLogo =
    instituteLogo && !logoLoadFailed
      ? getAssetUrl(instituteLogo)
      : defaultLogo;


  // 1. Add auth and visible menu calculation here
const { user } = useAuth();

const staffPermissions = Array.isArray(
  user?.assignedRole?.permissions
)
  ? user.assignedRole.permissions
  : [];

const visibleMenuItems =
  user?.role === "admin"
    ? menuItems
    : user?.role === "staff"
      ? filterMenuItemsByPermission(
          menuItems,
          staffPermissions,
          dashboardPath
        )
      : [
          {
            label: "Dashboard",
            path: dashboardPath,
            icon: FiGrid,
          },
        ];

  return (
    <>
      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`admin-sidebar ${
          collapsed
            ? "admin-sidebar-collapsed"
            : ""
        } ${
          mobileOpen
            ? "admin-sidebar-mobile-open"
            : ""
        }`}
      >
        <div className="sidebar-header">
          <NavLink
            // to="/admin/dashboard"
            to={dashboardPath}
            className="sidebar-brand"
            onClick={onCloseMobile}
          >
            {/* <img src={logo}  alt="Logo" className="sidebar-logo"/> */}
            <img
              src={displayedLogo}
              alt="Institute Logo"
              className="sidebar-logo"
              onError={() => setLogoLoadFailed(true)}
            />
          </NavLink>

          <button
            className="sidebar-mobile-close"
            onClick={onCloseMobile}
            aria-label="Close menu"
          >
            <FiX />
          </button>

          <button
            className="sidebar-collapse-button"
            onClick={onToggle}
            aria-label={
              collapsed
                ? "Expand sidebar"
                : "Collapse sidebar"
            }
          >
          <HiOutlineBars3 />
          </button>
        </div>

        <div className="sidebar-scroll">
          
          <nav className="sidebar-navigation">
            
            {/* {menuItems.map((item) => { */}
            {visibleMenuItems.map((item) => {
              const Icon = item.icon;

              const active =
                item.path ===
                location.pathname;

              const childActive =
                hasActiveChild(
                  item,
                  location.pathname
                );

              const menuOpen =
                openMenus[item.label] ||
                childActive;

              if (!item.children) {
                return (
                  <NavLink
                    key={item.label}
                    to={item.path}
                    title={
                      collapsed
                        ? item.label
                        : undefined
                    }
                    className={`sidebar-link ${
                      active
                        ? "sidebar-link-active"
                        : ""
                    }`}
                    onClick={onCloseMobile}
                  >
                    <Icon />

                    {!collapsed && (
                      <span>
                        {item.label}
                      </span>
                    )}
                  </NavLink>
                );
              }

              return (
                <div
                  className={`sidebar-group ${
                    childActive
                      ? "sidebar-group-active"
                      : ""
                  }`}
                  key={item.label}
                >
                  <button
                    type="button"
                    title={
                      collapsed
                        ? item.label
                        : undefined
                    }
                    className={`sidebar-link sidebar-parent-link ${
                      childActive
                        ? "sidebar-link-active-parent"
                        : ""
                    }`}
                    onClick={() =>
                      onToggleMenu(
                        item.label
                      )
                    }
                  >
                    <Icon />

                    {!collapsed && (
                      <>
                        <span>
                          {item.label}
                        </span>

                        <FiChevronDown
                          className={`sidebar-chevron ${
                            menuOpen
                              ? "sidebar-chevron-open"
                              : ""
                          }`}
                        />
                      </>
                    )}
                  </button>

                  {!collapsed && menuOpen && (
                    <div className="sidebar-submenu">
                      {item.children.map(
                        (child) => (
                          <NavLink
                            key={child.path}
                            to={child.path}
                            className={({ isActive }) =>
                              `sidebar-submenu-link ${
                                isActive
                                  ? "sidebar-submenu-link-active"
                                  : ""
                              }`
                            }
                            onClick={
                              onCloseMobile
                            }
                          >
                            <span className="submenu-dot" />

                            <span>
                              {child.label}
                            </span>
                          </NavLink>
                        )
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

      
      </aside>
    </>
  );
};

export default Sidebar;