import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FiShield, FiUser, FiMail, FiCheckCircle, FiLogOut } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import { useAuth as useAuthGuard } from "../../context/AuthContext";
import "./StaffDashboard.css";

const StaffDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const permissions = useMemo(() => {
    const list = user?.assignedRole?.permissions;
    return Array.isArray(list) ? list : [];
  }, [user?.assignedRole?.permissions]);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <main className="staff-dashboard">
      <header className="staff-dashboard__header">
        <div>
          <p className="staff-dashboard__eyebrow">STAFF PORTAL</p>
          <h1>Welcome back, {user?.name || "Staff Member"}</h1>
          <p className="staff-dashboard__subtitle">
            Your workspace and account access are managed by your institute administrator.
          </p>
        </div>
        <button className="staff-dashboard__logout" type="button" onClick={handleLogout}>
          <FiLogOut aria-hidden="true" /> Sign out
        </button>
      </header>

      <section className="staff-dashboard__cards" aria-label="Account overview">
        <article className="staff-dashboard__card">
          <span className="staff-dashboard__card-icon"><FiUser /></span>
          <div><p>Account</p><h2>{user?.name || "Staff member"}</h2><span>{user?.email || "No email available"}</span></div>
        </article>
        <article className="staff-dashboard__card">
          <span className="staff-dashboard__card-icon"><FiShield /></span>
          <div><p>Assigned role</p><h2>{user?.assignedRole?.label || user?.assignedRole?.name || "Role not assigned"}</h2><span>Role-based access</span></div>
        </article>
        <article className="staff-dashboard__card">
          <span className="staff-dashboard__card-icon"><FiCheckCircle /></span>
          <div><p>Account status</p><h2 className={user?.status === "active" ? "is-active" : "is-inactive"}>{user?.status || "Unknown"}</h2><span>Verified on sign in</span></div>
        </article>
      </section>

      <section className="staff-dashboard__panel">
        <div className="staff-dashboard__panel-heading">
          <div>
            <h2>Your access permissions</h2>
            <p>These permissions come from your assigned role. Access is also checked by the backend.</p>
          </div>
          <span className="staff-dashboard__count">{permissions.length} {permissions.length === 1 ? "permission" : "permissions"}</span>
        </div>

        {permissions.length > 0 ? (
          <ul className="staff-dashboard__permissions">
            {permissions.map((permission) => (
              <li key={permission}><FiCheckCircle aria-hidden="true" /><span>{permission}</span></li>
            ))}
          </ul>
        ) : (
          <div className="staff-dashboard__empty">
            <FiShield aria-hidden="true" />
            <h3>No permissions are available</h3>
            <p>Contact your administrator to assign an active staff role with the required permissions.</p>
          </div>
        )}
      </section>

      <section className="staff-dashboard__notice">
        <FiMail aria-hidden="true" />
        <p><strong>Need access to another module?</strong> Contact your administrator to update your role permissions. Do not share your password with anyone.</p>
      </section>
    </main>
  );
};

export default StaffDashboard;
