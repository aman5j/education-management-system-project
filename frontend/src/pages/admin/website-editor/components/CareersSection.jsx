
import {
  FiBriefcase,
  FiMapPin,
  FiClock,
  FiArrowRight,
} from "react-icons/fi";

const getPostedLabel = (postedAt) => {
  if (!postedAt) return "Posted recently";

  const date = new Date(postedAt);

  if (Number.isNaN(date.getTime())) return "Posted recently";

  const days = Math.max(
    0,
    Math.floor(
      (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
    )
  );

  if (days === 0) return "Posted today";
  if (days === 1) return "Posted 1 day ago";
  if (days < 7) return `Posted ${days} days ago`;

  const weeks = Math.floor(days / 7);

  if (weeks === 1) return "Posted 1 week ago";
  if (weeks < 5) return `Posted ${weeks} weeks ago`;

  const months = Math.floor(days / 30);

  if (months <= 1) return "Posted 1 month ago";
  return `Posted ${months} months ago`;
};

export default function CareersSection({ settings }) {
  if (!settings?.enabled) return null;

  const jobs = Array.isArray(settings.jobs)
    ? settings.jobs
        .filter((job) => job.isVisible !== false)
        .sort(
          (a, b) =>
            (a.displayOrder || 0) - (b.displayOrder || 0)
        )
    : [];

  if (jobs.length === 0) return null;

  const heading = settings.heading || "";
  const highlightText = settings.highlightText || "";

  const highlightIndex = highlightText
    ? heading.indexOf(highlightText)
    : -1;

  const renderHeading = () => {
    if (highlightIndex < 0) return heading;

    return (
      <>
        {heading.slice(0, highlightIndex)}
        <span className="we-careers-heading-highlight">
          {highlightText}
        </span>
        {heading.slice(highlightIndex + highlightText.length)}
      </>
    );
  };

  return (
    <section className="we-preview-careers">
      <div className="we-careers-decoration we-careers-decoration-left" />
      <div className="we-careers-decoration we-careers-decoration-right" />

      <div className="we-careers-container">
        <div className="we-careers-heading">
          <span className="we-careers-eyebrow">
            <FiBriefcase />
            JOB UPDATES
          </span>

          <h2>{renderHeading()}</h2>

          {settings.description?.trim() && (
            <p>{settings.description}</p>
          )}
        </div>

        <div className="we-careers-grid">
          {jobs.map((job) => (
            <article
              className="we-career-card"
              key={job.key}
            >
              <div className="we-career-card-top-line" />

              <div className="we-career-card-content">
                <div className="we-career-badges">
                  <span className="we-career-team">
                    {job.team}
                  </span>

                  <span className="we-career-type">
                    {job.employmentType}
                  </span>

                  {job.isUrgent && (
                    <span className="we-career-urgent">
                      Urgent
                    </span>
                  )}
                </div>

                <h3>{job.position}</h3>

                <div className="we-career-meta">
                  <span>
                    <FiMapPin />
                    {job.location}
                  </span>

                  <span>
                    <FiBriefcase />
                    {job.workMode}
                  </span>

                  <span>
                    <FiClock />
                    {getPostedLabel(job.postedAt)}
                  </span>
                </div>

                {job.skills?.length > 0 && (
                  <div className="we-career-skills">
                    {job.skills.map((skill) => (
                      <span key={skill}>{skill}</span>
                    ))}
                  </div>
                )}

                <div className="we-career-card-footer">
                  <a
                    href={job.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="we-career-apply-button"
                  >
                    Apply Now
                    <FiArrowRight />
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
