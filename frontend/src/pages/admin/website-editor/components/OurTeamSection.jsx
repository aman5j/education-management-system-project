
export default function OurTeamSection({ settings }) {
  if (!settings?.enabled) return null;

  const members = Array.isArray(settings.members)
    ? settings.members
        .filter((member) => member.isVisible !== false)
        .sort(
          (a, b) =>
            (a.displayOrder || 0) - (b.displayOrder || 0)
        )
    : [];

  if (members.length === 0) return null;

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
        <span className="we-team-heading-highlight">
          {highlightText}
        </span>
        {heading.slice(highlightIndex + highlightText.length)}
      </>
    );
  };

  return (
    <section className="we-preview-team">
      <div className="we-preview-team-heading">
        <h2>{renderHeading()}</h2>

        {settings.description?.trim() && (
          <p>{settings.description}</p>
        )}
      </div>

      <div className="we-preview-team-grid">
        {members.map((member, index) => (
          <article
            className="we-preview-team-card"
            key={member.key}
          >
            <div className="we-preview-team-image">
              <img
                src={member.imageUrl}
                alt={member.name || `Team member ${index + 1}`}
                loading="lazy"
              />
            </div>

            <div className="we-preview-team-content">
              <h3>{member.name}</h3>
              <p>{member.designation}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
