
import { FiBookOpen, FiExternalLink, FiImage } from "react-icons/fi";

export default function StudyResourcesSection({ items = [] }) {
  const visibleItems = Array.isArray(items)
    ? items.filter((item) => item.isVisible !== false)
    : [];

  return (
    <section className="we-preview-study-resources">
      <div className="we-preview-study-inner">
        <div className="we-preview-study-heading">
          <span>LEARN AND GROW</span>
          <h2>Study Resources</h2>
          <p>
            Explore useful learning materials and resources to support
            your studies.
          </p>
        </div>

        {visibleItems.length === 0 ? (
          <div className="we-preview-study-empty">
            <FiBookOpen />
            <strong>Your Study Resources will appear here</strong>
            <span>Add resource cards from the Study Resources editor.</span>
          </div>
        ) : (
          <div className="we-preview-study-grid">
            {visibleItems.map((item) => (
              <article className="we-preview-study-card" key={item.key}>
                <div className="we-preview-study-card-image">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.title} />
                  ) : (
                    <div className="we-preview-study-image-empty">
                      <FiImage />
                    </div>
                  )}
                </div>

                <div className="we-preview-study-card-body">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>

                  <a
                    href={item.buttonUrl || "#"}
                    target={item.openInNewTab ? "_blank" : undefined}
                    rel={
                      item.openInNewTab
                        ? "noopener noreferrer"
                        : undefined
                    }
                  >
                    {item.buttonText || "Explore Now"}
                    <FiExternalLink />
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
