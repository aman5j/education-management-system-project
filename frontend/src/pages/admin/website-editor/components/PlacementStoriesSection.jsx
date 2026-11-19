
export default function PlacementStoriesSection({ settings }) {
  if (!settings?.enabled) return null;

  const stories = Array.isArray(settings.stories)
    ? settings.stories
        .filter((story) => story.isVisible !== false)
        .sort(
          (a, b) =>
            (a.displayOrder || 0) - (b.displayOrder || 0)
        )
    : [];

  if (stories.length === 0) return null;

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
        <span className="we-placement-heading-highlight">
          {highlightText}
        </span>
        {heading.slice(highlightIndex + highlightText.length)}
      </>
    );
  };

  return (
    <section className="we-preview-placement">
      <div className="we-preview-placement-heading">
        <h2>{renderHeading()}</h2>
      </div>

      <div className="we-preview-placement-grid">
        {stories.map((story, index) => (
          <article
            className="we-preview-placement-card"
            key={story.key}
          >
            <div className="we-preview-placement-image">
              <img
                src={story.imageUrl}
                alt={story.title || `Placement story ${index + 1}`}
                loading="lazy"
              />
            </div>

            <div className="we-preview-placement-content">
              <h3>{story.title}</h3>
              <p>{story.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
