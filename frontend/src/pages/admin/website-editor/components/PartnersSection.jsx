
export default function PartnersSection({ settings }) {
  if (!settings?.enabled) return null;

  const logos = Array.isArray(settings.logos)
    ? settings.logos
    : [];

  if (logos.length === 0) return null;

  const visibleCount = Math.min(
    8,
    Math.max(1, Number(settings.visibleCount) || 5)
  );

  // Repeat enough logos to fill the visible track, then repeat
  // that complete sequence for seamless continuous movement.
  const fillCount = Math.max(
    1,
    Math.ceil(visibleCount / logos.length)
  );

  const baseSequence = Array.from(
    { length: fillCount },
    () => logos
  ).flat();

  const loopSequence = [
    ...baseSequence,
    ...baseSequence,
  ];

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
        <span className="we-preview-partners-highlight">
          {highlightText}
        </span>
        {heading.slice(highlightIndex + highlightText.length)}
      </>
    );
  };

  const sliderDuration = Math.max(
    18,
    baseSequence.length * 4
  );

  return (
    <section className="we-preview-partners">
      <div className="we-preview-partners-heading">
        <span className="we-preview-partners-line" />
        <h2>{renderHeading()}</h2>
        <span className="we-preview-partners-line" />
      </div>

      <div
        className={`we-preview-partners-slider ${
          settings.autoSlide === false ? "is-paused" : ""
        }`}
        style={{
          "--partners-visible-count": visibleCount,
          "--partners-slide-duration": `${sliderDuration}s`,
        }}
        aria-label="Our partners"
      >
        <div className="we-preview-partners-track">
          {loopSequence.map((logo, index) => (
            <div
              className="we-preview-partners-item"
              key={`${logo.key}-${index}`}
            >
              <img
                src={logo.imageUrl}
                alt={
                  logo.name ||
                  `Partner logo ${(index % logos.length) + 1}`
                }
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
