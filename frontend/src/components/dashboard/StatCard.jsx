import {
  FiArrowDownRight,
  FiArrowUpRight,
} from "react-icons/fi";

const StatCard = ({
  title,
  value,
  icon: Icon,
  change = 0,
  type = "primary",
}) => {
  const positive = Number(change) >= 0;

  return (
    <article className={`dashboard-stat-card card-${type}`}>
      <div className="stat-card-top">
        <div className={`stat-icon stat-icon-${type}`}>
          <Icon />
        </div>
      </div>

      <div className="stat-card-body">
        <span className="stat-card-title">
          {title}
        </span>

        <strong className="stat-card-value">
          {value} 
        </strong>

        
      </div>
    </article>
  );
};

export default StatCard;