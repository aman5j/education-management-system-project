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

import {
  NavLink,
  useLocation,
} from "react-router-dom";

import "./AdminLayout.css";

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
        label: "Enquiries",
        path: "/admin/enquiries",
      },
      {
        label: "Admission Forms",
        path: "/admin/admission-forms",
      },
      {
        label: "Follow-ups",
        path: "/admin/follow-ups",
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
        label: "Add Student",
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
        path: "/admin/course-categories",
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
    label: "Fees & Finance",
    icon: FiDollarSign,
    children: [
      {
        label: "Fee Records",
        path: "/admin/fees",
      },
      {
        label: "Add Fee",
        path: "/admin/fees/add",
      },
      {
        label: "Fee Structure",
        path: "/admin/fee-structure",
      },
      {
        label: "Payment Settings",
        path: "/admin/payment-settings",
      },
      {
        label: "Reports",
        path: "/admin/fee-reports",
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
        label: "Exam Review",
        path: "/admin/exams/review",
      },
      {
        label: "Question Bank",
        path: "/admin/question-bank",
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
            <span className="sidebar-brand-logo">
              EMS
            </span>

            {!collapsed && (
              <span className="sidebar-brand-name">
                Education MS
              </span>
            )}
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
            {collapsed ? (
              <FiChevronRight />
            ) : (
              <FiChevronLeft />
            )}
          </button>
        </div>

        <div className="sidebar-scroll">
          <div className="sidebar-section-title">
            {!collapsed && "MAIN MENU"}
          </div>

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

        {!collapsed && (
          <div className="sidebar-help-card">
            <div className="sidebar-help-icon">
              <FiHelpCircle />
            </div>

            <div>
              <strong>
                Need help?
              </strong>

              <span>
                Contact support
              </span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

export default Sidebar;