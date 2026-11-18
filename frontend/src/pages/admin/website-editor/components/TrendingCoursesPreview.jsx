
import {
  FiBookOpen,
  FiClock,
  FiLayers,
} from "react-icons/fi";

const formatPrice = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

export default function TrendingCoursesPreview({
  courses = [],
}) {
  if (!Array.isArray(courses) || courses.length === 0) {
    return null;
  }

  return (
    <section
      className="we-preview-trending"
      aria-label="Trending courses"
    >
      <div className="we-preview-trending-inner">
        <div className="we-preview-trending-heading">
          <h2>Explore Top Trending Courses</h2>
          <p>Choose the right course for your learning journey.</p>
        </div>

        <div className="we-preview-trending-grid">
          {courses.map((course) => (
            <article
              className="we-preview-trending-card"
              key={course._id}
            >
              <div className="we-preview-trending-image-wrap">
                {course.courseImage ? (
                  <img
                    className="we-preview-trending-image"
                    src={course.courseImage}
                    alt={course.courseTitle || "Course"}
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="we-preview-trending-image-empty">
                    <FiBookOpen />
                    <span>No course image</span>
                  </div>
                )}

                <span
                  className={`we-preview-trending-ribbon ${
                    course.courseType === "Offline"
                      ? "offline"
                      : "online"
                  }`}
                >
                  {course.courseType || "COURSE"}
                </span>
              </div>

              <div className="we-preview-trending-body">
                {course.courseCategory && (
                  <span className="we-preview-trending-category">
                    {course.courseCategory}
                  </span>
                )}

                <h3>{course.courseTitle}</h3>

                <div className="we-preview-trending-details">
                  <div>
                    <FiClock />
                    <span>
                      Duration: {course.duration || 0}{" "}
                      {course.durationUnit || ""}
                    </span>
                  </div>

                  <div>
                    <FiBookOpen />
                    <span>
                      Total Lectures: {course.totalLectures ?? 0}
                    </span>
                  </div>

                  <div>
                    <FiLayers />
                    <span>
                      Batch Status: {course.batchStatus || "Not Available"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="we-preview-trending-footer">
                <div className="we-preview-trending-price">
                  <strong>{formatPrice(course.price)}</strong>

                  {course.mrpVisible !== false &&
                    Number(course.mrp) > Number(course.price) && (
                      <del>{formatPrice(course.mrp)}</del>
                    )}
                </div>

                <span className="we-preview-trending-button">
                  View Details
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
