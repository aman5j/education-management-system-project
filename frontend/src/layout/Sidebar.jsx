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


import {
  NavLink,
  useLocation,
} from "react-router-dom";

import "./AdminLayout.css";
import logo from "../assets/logo.png";

const menuItems = [
  {
    label: "Dashboard",
    path: "/admin/dashboard",
    icon: FiGrid,
  },

  {
    label: "Course Enquiries",
    path: "/admin/enquiries",
    icon: FiMessageSquare,
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
        label: "Hall Ticket Management",
        path: "/admin/hall-tickets",
      },
      {
        label: "Exam Results",
        path: "/admin/exams/results",
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
    label: "Faculty & Staff",
    path: "/admin/faculty-staff",
    icon: FiUsers,
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
}) => {
  const location = useLocation();

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
            to="/admin/dashboard"
            className="sidebar-brand"
            onClick={onCloseMobile}
          >
            <img src={logo}  alt="Logo" className="sidebar-logo"/>
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
            {menuItems.map((item) => {
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