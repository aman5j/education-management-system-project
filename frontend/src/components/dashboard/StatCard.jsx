import {
  FiArrowDownRight,
  FiArrowUpRight,
} from "react-icons/fi";

const StatCard = ({
  title,
  value,
  icon: Icon,
  change = 0,
  comparison = "Compared with last month",
  type = "primary",
}) => {
  const positive = Number(change) >= 0;

  return (
    <article className="dashboard-stat-card">
      <div className="stat-card-top">
        <div className={`stat-icon stat-icon-${type}`}>
          <Icon />
        </div>

        <span
          className={`stat-change ${
            positive
              ? "stat-change-positive"
              : "stat-change-negative"
          }`}
        >
          {positive ? (
            <FiArrowUpRight />
          ) : (
            <FiArrowDownRight />
          )}

          {Math.abs(change)}%
        </span>
      </div>

      <div className="stat-card-body">
        <span className="stat-card-title">
          {title}
        </span>

        <strong className="stat-card-value">
          {value}
        </strong>

        <span className="stat-card-comparison">
          {comparison}
        </span>
      </div>
    </article>
  );
};

export default StatCard;