import {
  FiArrowRight,
  FiCheckCircle,
} from "react-icons/fi";

const PendingActions = ({
  actions = [],
}) => {
  return (
    <section className="dashboard-panel">
      <div className="panel-header">
        <div>
          <h3>Pending Actions</h3>

          <p>
            Items that may need attention
          </p>
        </div>
      </div>

      <div className="pending-actions-list">
        {actions.length === 0 ? (
          <div className="dashboard-empty-state compact">
            <div className="empty-state-icon">
              <FiCheckCircle />
            </div>

            <strong>
              Nothing pending
            </strong>

            <span>
              Pending tasks will appear here.
            </span>
          </div>
        ) : (
          actions.map((action) => (
            <div
              className="pending-action-row"
              key={action.id}
            >
              <div className="pending-action-icon">
                {action.count}
              </div>

              <div className="pending-action-content">
                <strong>
                  {action.title}
                </strong>

                <span>
                  {action.count} item
                  {action.count === 1
                    ? ""
                    : "s"} pending
                </span>
              </div>

              <FiArrowRight />
            </div>
          ))
        )}
      </div>
    </section>
  );
};

export default PendingActions;