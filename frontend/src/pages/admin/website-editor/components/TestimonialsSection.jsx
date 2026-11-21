
import { useEffect, useState } from "react";
import {
  FiChevronLeft,
  FiChevronRight,
  FiUserRound,
  FiQuote,
  FiStar,
} from "react-icons/fi";

const getVisibleCount = () => {
  if (typeof window === "undefined") return 3;
  if (window.innerWidth <= 600) return 1;
  if (window.innerWidth <= 900) return 2;
  return 3;
};

export default function TestimonialsSection({ settings }) {
  const [visibleCount, setVisibleCount] = useState(getVisibleCount);
  const [page, setPage] = useState(0);
  const [touchStart, setTouchStart] = useState(null);

  useEffect(() => {
    const handleResize = () => {
      setVisibleCount(getVisibleCount());
      setPage(0);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  if (!settings?.enabled) return null;

  const testimonials = Array.isArray(settings.testimonials)
    ? settings.testimonials
        .filter((item) => item.isVisible !== false)
        .sort(
          (a, b) =>
            (a.displayOrder || 0) - (b.displayOrder || 0)
        )
    : [];

  if (testimonials.length === 0) return null;

  const pageCount = Math.ceil(
    testimonials.length / visibleCount
  );

  const safePage = Math.min(page, pageCount - 1);

  const startIndex = safePage * visibleCount;

  const visibleTestimonials = testimonials.slice(
    startIndex,
    startIndex + visibleCount
  );

  const changePage = (nextPage) => {
    setPage(Math.max(0, Math.min(nextPage, pageCount - 1)));
  };

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
        <span className="we-testimonials-heading-highlight">
          {highlightText}
        </span>
        {heading.slice(highlightIndex + highlightText.length)}
      </>
    );
  };

  const handleTouchStart = (event) => {
    setTouchStart(event.changedTouches[0].clientX);
  };

  const handleTouchEnd = (event) => {
    if (touchStart === null) return;

    const difference =
      touchStart - event.changedTouches[0].clientX;

    if (Math.abs(difference) > 45) {
      changePage(safePage + (difference > 0 ? 1 : -1));
    }

    setTouchStart(null);
  };

  return (
    <section className="we-preview-testimonials">
      <div className="we-testimonials-decoration we-testimonials-decoration-left" />
      <div className="we-testimonials-decoration we-testimonials-decoration-right" />

      <div className="we-testimonials-container">
        <header className="we-testimonials-heading">
          {settings.sectionLabel?.trim() && (
            <span className="we-testimonials-eyebrow">
              <FiQuote />
              {settings.sectionLabel}
            </span>
          )}

          <h2>{renderHeading()}</h2>

          {settings.description?.trim() && (
            <p>{settings.description}</p>
          )}
        </header>

        <div className="we-testimonials-carousel">
          <button
            type="button"
            className="we-testimonials-arrow previous"
            onClick={() => changePage(safePage - 1)}
            disabled={safePage === 0}
            aria-label="Previous testimonials"
          >
            <FiChevronLeft />
          </button>

          <div
            className="we-testimonials-grid"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {visibleTestimonials.map((item) => (
              <article
                className="we-testimonial-card"
                key={item.key}
              >
                <div className="we-testimonial-card-content">
                  <div className="we-testimonial-person">
                    <div className="we-testimonial-avatar">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                        />
                      ) : (
                        <FiUserRound />
                      )}
                    </div>

                    <div className="we-testimonial-person-info">
                      <h3>{item.name}</h3>
                      <span>{item.designation}</span>

                      <div
                        className="we-testimonial-stars"
                        aria-label={`${item.rating} out of 5 stars`}
                      >
                        {Array.from(
                          { length: 5 },
                          (_, index) => (
                            <FiStar
                              key={index}
                              className={
                                index < Number(item.rating)
                                  ? "filled"
                                  : ""
                              }
                            />
                          )
                        )}
                      </div>
                    </div>

                    <FiQuote className="we-testimonial-quote" />
                  </div>

                  <p className="we-testimonial-review">
                    {item.review}
                  </p>
                </div>
              </article>
            ))}
          </div>

          <button
            type="button"
            className="we-testimonials-arrow next"
            onClick={() => changePage(safePage + 1)}
            disabled={safePage >= pageCount - 1}
            aria-label="Next testimonials"
          >
            <FiChevronRight />
          </button>
        </div>

        {pageCount > 1 && (
          <div className="we-testimonials-dots">
            {Array.from({ length: pageCount }, (_, index) => (
              <button
                key={index}
                type="button"
                className={
                  index === safePage ? "active" : ""
                }
                onClick={() => changePage(index)}
                aria-label={`Go to testimonial page ${index + 1}`}
                aria-current={
                  index === safePage ? "page" : undefined
                }
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
