import {
  FiCalendar,
  FiClock,
} from "react-icons/fi";

const TodaysClasses = () => {
  return (
    <section className="dashboard-panel">
      <div className="panel-header">
        <div>
          <h3>Today's Classes</h3>

          <p>
            Scheduled classes for today
          </p>
        </div>

        <FiCalendar className="panel-header-icon" />
      </div>

      <div className="dashboard-empty-state compact">
        <div className="empty-state-icon">
          <FiClock />
        </div>

        <strong>
          No classes scheduled
        </strong>

        <span>
          Class schedules will appear here
          after batches and schedules are
          configured.
        </span>
      </div>
    </section>
  );
};

export default TodaysClasses;