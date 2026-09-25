import {
  FiChevronRight,
  FiHome,
} from "react-icons/fi";

import {
  Link,
  useLocation,
} from "react-router-dom";

const formatSegment = (segment) => {
  return segment
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
};

const Breadcrumb = ({
  currentPage,
}) => {
  const location = useLocation();

  const segments =
    location.pathname
      .split("/")
      .filter(Boolean);

  return (
    <div className="breadcrumb-wrapper">
      <Link
        to="/admin/dashboard"
        className="breadcrumb-home"
      >
        <FiHome />
        <span>Home</span>
      </Link>

      {segments
        .slice(1)
        .map((segment, index) => {
          const path =
            "/" +
            segments
              .slice(0, index + 2)
              .join("/");

          const isLast =
            index ===
            segments.slice(1).length - 1;

          return (
            <div
              className="breadcrumb-item"
              key={`${segment}-${index}`}
            >
              <FiChevronRight />

              {isLast ? (
                <span>
                  {currentPage ||
                    formatSegment(
                      segment
                    )}
                </span>
              ) : (
                <Link to={path}>
                  {formatSegment(segment)}
                </Link>
              )}
            </div>
          );
        })}
    </div>
  );
};

export default Breadcrumb;