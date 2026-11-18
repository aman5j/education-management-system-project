
import { FiCheck } from "react-icons/fi";

export default function CertificateSection({
  settings,
  previewMode = false,
}) {
  if (!settings) return null;

  if (!settings.enabled && !previewMode) return null;

  const title = settings.title || "";
  const highlightText = settings.highlightText || "";

  const highlightIndex = highlightText
    ? title.indexOf(highlightText)
    : -1;

  const renderTitle = () => {
    if (highlightIndex === -1) return title;

    const before = title.slice(0, highlightIndex);
    const highlighted = title.slice(
      highlightIndex,
      highlightIndex + highlightText.length
    );
    const after = title.slice(
      highlightIndex + highlightText.length
    );

    return (
      <>
        {before}
        <span className="we-certificate-highlight">
          {highlighted}
        </span>
        {after}
      </>
    );
  };

  const buttonUrl =
    settings.buttonAction === "url"
      ? settings.externalUrl
      : settings.imageUrl;

  return (
    <section className="we-preview-certificate-section">
      <div className="we-preview-certificate-inner">
        <div className="we-preview-certificate-image-column">
          {settings.imageUrl ? (
            <img
              src={settings.imageUrl}
              alt="Certificate"
              className="we-preview-certificate-image"
            />
          ) : (
            <div className="we-preview-certificate-image-placeholder">
              Certificate image preview
            </div>
          )}
        </div>

        <div className="we-preview-certificate-content">
          {title && <h2>{renderTitle()}</h2>}

          {settings.description && (
            <p className="we-preview-certificate-description">
              {settings.description}
            </p>
          )}

          {settings.listItems?.length > 0 && (
            <ul className="we-preview-certificate-list">
              {settings.listItems.map((item) => (
                <li key={item.key}>
                  <FiCheck />
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          )}

          {settings.buttonText && buttonUrl && (
            <a
              className="we-preview-certificate-button"
              href={buttonUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {settings.buttonText}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
