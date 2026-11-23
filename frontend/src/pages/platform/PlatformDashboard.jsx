
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiActivity,
  FiAlertCircle,
  FiArrowRight,
  FiDatabase,
  FiRefreshCw,
  FiShield,
  FiUsers,
} from "react-icons/fi";

import platformAuthService from "../../services/platformAuthService";
import { usePlatformAuth } from "../../context/PlatformAuthContext";
import notification from "../../utils/notification";

const initialStatistics = {
  totalInstitutes: 0,
  activeInstitutes: 0,
  suspendedInstitutes: 0,
  pendingProvisioning: 0,
  failedProvisioning: 0,
};

const PlatformDashboard = () => {
  const { user } = usePlatformAuth();

  const [statistics, setStatistics] =
    useState(initialStatistics);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await platformAuthService.getDashboard();

      setStatistics({
        ...initialStatistics,
        ...data.statistics,
      });
    } catch (err) {
      const message =
        err.response?.data?.message ||
        "Unable to load platform dashboard.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const cards = [
    {
      label: "Total Institutes",
      value: statistics.totalInstitutes,
      icon: <FiUsers />,
      color: "blue",
    },
    {
      label: "Active Institutes",
      value: statistics.activeInstitutes,
      icon: <FiActivity />,
      color: "green",
    },
    {
      label: "Suspended Institutes",
      value: statistics.suspendedInstitutes,
      icon: <FiShield />,
      color: "orange",
    },
    {
      label: "Pending Provisioning",
      value: statistics.pendingProvisioning,
      icon: <FiDatabase />,
      color: "purple",
    },
    {
      label: "Failed Provisioning",
      value: statistics.failedProvisioning,
      icon: <FiAlertCircle />,
      color: "red",
    },
  ];

  return (
    <div className="platform-page">
      <div className="platform-page-heading">
        <div>
          <span className="platform-eyebrow">
            OVERVIEW
          </span>

          <h1>Platform Dashboard</h1>

          <p>
            Monitor your EMS platform and institute infrastructure.
          </p>
        </div>

        <button
          type="button"
          className="platform-outline-button"
          onClick={loadDashboard}
          disabled={loading}
        >
          <FiRefreshCw />
          Refresh
        </button>
      </div>

      <section className="platform-welcome-card">
        <div>
          <span>PLATFORM CONTROL CENTER</span>

          <h2>
            Welcome back, {user?.name || "Super Admin"}
          </h2>

          <p>
            Manage your institutes and monitor platform operations
            from one place.
          </p>
        </div>

        <div className="platform-welcome-icon">
          <FiShield />
        </div>
      </section>

      {error && (
        <div className="platform-error">
          <FiAlertCircle />
          <span>{error}</span>

          <button type="button" onClick={loadDashboard}>
            Retry
          </button>
        </div>
      )}

      <div className="platform-section-heading">
        <div>
          <h2>Platform Statistics</h2>
          <p>Live information from the platform database</p>
        </div>
      </div>

      <section className="platform-stat-grid">
        {cards.map((card) => (
          <article
            className="platform-stat-card"
            key={card.label}
          >
            <div className={`platform-stat-icon ${card.color}`}>
              {card.icon}
            </div>

            <div>
              <span>{card.label}</span>

              <strong>
                {loading ? "—" : card.value}
              </strong>
            </div>
          </article>
        ))}
      </section>

      <section className="platform-bottom-grid">
        <article className="platform-panel">
          <div className="platform-panel-heading">
            <div>
              <h3>Institute Management</h3>
              <p>Manage all registered institutes</p>
            </div>

            <FiUsers />
          </div>

          <div className="platform-panel-body">
            <div className="platform-empty-icon">
              <FiDatabase />
            </div>

            <h4>Institute registry</h4>

            <p>
              Institute registration and management will be
              implemented in Phase 2.
            </p>

            <Link
              to="/platform/institutes"
              className="platform-primary-link"
            >
              View institutes <FiArrowRight />
            </Link>
          </div>
        </article>

        <article className="platform-panel">
          <div className="platform-panel-heading">
            <div>
              <h3>Platform Account</h3>
              <p>Your administrator information</p>
            </div>

            <FiShield />
          </div>

          <div className="platform-account-details">
            <div>
              <span>Name</span>
              <strong>{user?.name || "—"}</strong>
            </div>

            <div>
              <span>Email</span>
              <strong>{user?.email || "—"}</strong>
            </div>

            <div>
              <span>Role</span>
              <strong className="platform-role-badge">
                {user?.role || "—"}
              </strong>
            </div>

            <div>
              <span>Account status</span>
              <strong className="platform-active-status">
                {user?.status || "—"}
              </strong>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
};

export default PlatformDashboard;
