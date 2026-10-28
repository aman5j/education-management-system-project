
import { NavLink, useNavigate } from "react-router-dom";
// import { NavLink } from "react-router-dom";
import {
  FiActivity,
  FiBell,
  FiBookOpen,
  FiCalendar,
  FiCheckCircle,
  FiClipboard,
  FiCreditCard,
  FiFileText,
  FiGrid,
  FiHelpCircle,
  FiLogOut,
  FiX,
  FiUser,
} from "react-icons/fi";

const navigation = [
  { label: "Dashboard", icon: FiGrid, path: "/student/dashboard" },
  { label: "My Courses", icon: FiBookOpen, path: "/student/courses" },
  { label: "My Attendance", icon: FiActivity, phase: 4 },
  { label: "Fees & Payments", icon: FiCreditCard, phase: 5 },
  { label: "Exams & Results", icon: FiClipboard, phase: 6 },
  { label: "Certificates & Achievements", icon: FiCheckCircle, phase: 7 },
  { label: "My Admission Details", icon: FiFileText, phase: 8 },
  { label: "My Documents", icon: FiFileText, phase: 9 },
  { label: "Notifications", icon: FiBell, phase: 10 },
  { label: "Helpdesk & Support", icon: FiHelpCircle, phase: 11 },
  { label: "Apply for Leave", icon: FiCalendar, phase: 12 },
  { label: "My Profile", icon: FiUser, phase: 13 },
];

export default function StudentSidebar({
  logo,
  onLogoError,
  mobileOpen,
  collapsed,
  onCloseMobile,
  onPlannedItem,
  onLogout,
}) {
  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="student-layout__backdrop"
          aria-label="Close sidebar"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={[
          "student-layout__sidebar",
          mobileOpen ? "student-layout__sidebar--open" : "",
          collapsed ? "student-layout__sidebar--collapsed" : "",
        ].filter(Boolean).join(" ")}
      >
        <div className="student-layout__brand">
          <img
            src={logo}
            alt="Institute logo"
            onError={onLogoError}
            className="student-layout__brand-logo"
            />
          <button
            type="button"
            className="student-layout__mobile-close"
            onClick={onCloseMobile}
            aria-label="Close sidebar"
          >
            <FiX />
          </button>
        </div>

        <div className="student-layout__portal-label">STUDENT PORTAL</div>

        <nav className="student-layout__nav" aria-label="Student navigation">
          {navigation.map((item) => {
            const Icon = item.icon;

            if (item.path) {
              return (
                <NavLink
                  key={item.label}
                  to={item.path}
                  end
                  title={collapsed ? item.label : undefined}
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
                onClick={() => onPlannedItem(item)}
                title={`Planned for Phase ${item.phase}`}
              >
                <Icon />
                <span>{item.label}</span>
                <span className="student-layout__phase-tag">{item.phase}</span>
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
            onClick={onLogout}
          >
            <FiLogOut />
            <span>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
