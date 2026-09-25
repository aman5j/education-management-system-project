import {
  FiArrowRight,
  FiUser,
} from "react-icons/fi";

import {
  useNavigate,
} from "react-router-dom";

const RecentAdmissions = ({
  admissions = [],
}) => {
  const navigate = useNavigate();

  return (
    <section className="dashboard-panel">
      <div className="panel-header">
        <div>
          <h3>Recent Admissions</h3>

          <p>
            Latest student registrations
          </p>
        </div>

        <button
          className="panel-link-button"
          onClick={() =>
            navigate("/admin/admissions")
          }
        >
          View all
          <FiArrowRight />
        </button>
      </div>

      <div className="admissions-list">
        {admissions.length === 0 ? (
          <div className="dashboard-empty-state">
            <div className="empty-state-icon">
              <FiUser />
            </div>

            <strong>
              No admissions yet
            </strong>

            <span>
              Recent student admissions will
              appear here.
            </span>
          </div>
        ) : (
          admissions.map(
            (admission) => (
              <div
                className="admission-row"
                key={admission.id}
              >
                <div className="admission-avatar">
                  {admission.studentName
                    ?.charAt(0)
                    ?.toUpperCase()}
                </div>

                <div className="admission-info">
                  <strong>
                    {
                      admission.studentName
                    }
                  </strong>

                  <span>
                    {admission.email}
                  </span>
                </div>

                <span className="status-badge status-badge-success">
                  {admission.status}
                </span>
              </div>
            )
          )
        )}
      </div>
    </section>
  );
};

export default RecentAdmissions;