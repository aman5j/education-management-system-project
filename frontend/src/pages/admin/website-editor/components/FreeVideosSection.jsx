
import { useEffect, useRef, useState } from "react";
import {
  FiChevronLeft,
  FiChevronRight,
  FiPlay,
  FiX,
} from "react-icons/fi";

export default function FreeVideosSection({ settings }) {
  const sliderRef = useRef(null);
  const [activeVideo, setActiveVideo] = useState(null);
  const [thumbnailErrors, setThumbnailErrors] = useState({});

  useEffect(() => {
    if (!activeVideo) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setActiveVideo(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeVideo]);

  if (!settings?.enabled) return null;

  const videos = Array.isArray(settings.videos)
    ? settings.videos
        .filter((video) => video.isVisible !== false)
        .sort(
          (a, b) =>
            (a.displayOrder || 0) - (b.displayOrder || 0)
        )
    : [];

  if (videos.length === 0) return null;

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
        <span className="we-free-videos-heading-highlight">
          {highlightText}
        </span>
        {heading.slice(highlightIndex + highlightText.length)}
      </>
    );
  };

  const scrollSlider = (direction) => {
    const slider = sliderRef.current;
    if (!slider) return;

    const firstCard = slider.querySelector(
      ".we-preview-free-video-card"
    );

    const styles = window.getComputedStyle(slider);
    const gap = parseFloat(styles.columnGap || styles.gap) || 16;

    const cardWidth = firstCard
      ? firstCard.getBoundingClientRect().width
      : slider.clientWidth / 4;

    slider.scrollBy({
      left: direction * (cardWidth + gap),
      behavior: "smooth",
    });
  };

  return (
    <section className="we-preview-free-videos">
      <div className="we-preview-free-videos-decoration we-decoration-left" />
      <div className="we-preview-free-videos-decoration we-decoration-right" />

      <div className="we-preview-free-videos-heading">
        <h2>{renderHeading()}</h2>

        {settings.description?.trim() && (
          <p>{settings.description}</p>
        )}
      </div>

      <div className="we-preview-free-videos-toolbar">
        <div className="we-preview-free-videos-arrows">
          <button
            type="button"
            aria-label="Previous videos"
            onClick={() => scrollSlider(-1)}
          >
            <FiChevronLeft />
          </button>

          <button
            type="button"
            aria-label="Next videos"
            onClick={() => scrollSlider(1)}
          >
            <FiChevronRight />
          </button>
        </div>
      </div>

      <div
        className="we-preview-free-videos-slider"
        ref={sliderRef}
      >
        {videos.map((video, index) => {
          const thumbnailUrl =
            `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`;

          return (
            <article
              className="we-preview-free-video-card"
              key={video.key}
            >
              <button
                type="button"
                className="we-preview-free-video-thumbnail"
                onClick={() => setActiveVideo(video)}
                aria-label={`Play ${video.title}`}
              >
                {!thumbnailErrors[video.key] ? (
                  <img
                    src={thumbnailUrl}
                    alt={video.title}
                    loading="lazy"
                    onError={() =>
                      setThumbnailErrors((previous) => ({
                        ...previous,
                        [video.key]: true,
                      }))
                    }
                  />
                ) : (
                  <div className="we-preview-free-video-thumbnail-fallback">
                    <span>Video thumbnail unavailable</span>
                  </div>
                )}

                <span className="we-preview-free-video-play">
                  <FiPlay />
                </span>
              </button>

              <div className="we-preview-free-video-title">
                <h3>{video.title}</h3>
              </div>
            </article>
          );
        })}
      </div>

      {activeVideo && (
        <div
          className="we-free-video-modal"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setActiveVideo(null);
            }
          }}
        >
          <div
            className="we-free-video-modal-content"
            role="dialog"
            aria-modal="true"
            aria-label={activeVideo.title}
          >
            <div className="we-free-video-modal-header">
              <h3>{activeVideo.title}</h3>

              <button
                type="button"
                aria-label="Close video"
                onClick={() => setActiveVideo(null)}
              >
                <FiX />
              </button>
            </div>

            <div className="we-free-video-player">
              <iframe
                key={activeVideo.videoId}
                src={`https://www.youtube-nocookie.com/embed/${activeVideo.videoId}?autoplay=1&rel=0`}
                title={activeVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
