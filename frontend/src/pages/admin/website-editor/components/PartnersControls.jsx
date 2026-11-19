
import { useRef, useState } from "react";
import {
  FiBriefcase,
  FiUpload,
  FiPlus,
  FiTrash2,
  FiChevronUp,
  FiChevronDown,
  FiImage,
  FiLoader,
  FiEye,
  FiEyeOff,
} from "react-icons/fi";

import { getAssetUrl } from "../../../../utils/assetUrl";
import notification from "../../../../utils/notification";

const MAX_LOGOS = 20;

const createLogo = () => ({
  key: `partner-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`,
  name: "",
  imageUrl: "",
  imageVersion: "",
  displayOrder: 0,
});

export default function PartnersControls({
  settings,
  onChange,
  onUploadLogo,
}) {
  const [uploadingKey, setUploadingKey] = useState("");
  const inputRefs = useRef({});

  const logos = Array.isArray(settings.logos)
    ? settings.logos
    : [];

  const updateField = (field, value) => {
    onChange({
      ...settings,
      [field]: value,
    });
  };

  const updateLogo = (key, field, value) => {
    onChange({
      ...settings,
      logos: logos.map((logo) =>
        logo.key === key
          ? { ...logo, [field]: value }
          : logo
      ),
    });
  };

  const addLogo = () => {
    if (logos.length >= MAX_LOGOS) {
      notification.warning(
        `You can add a maximum of ${MAX_LOGOS} partner logos.`
      );
      return;
    }

    onChange({
      ...settings,
      logos: [
        ...logos,
        {
          ...createLogo(),
          displayOrder: logos.length,
        },
      ],
    });
  };

  const removeLogo = async (key) => {
    const confirmed = await notification.confirm({
      title: "Remove partner logo?",
      text: "This logo will be removed when you save the Website Editor.",
      icon: "warning",
      confirmText: "Remove",
      cancelText: "Cancel",
      confirmButtonColor: "#dc2626",
    });

    if (!confirmed) return;

    onChange({
      ...settings,
      logos: logos
        .filter((logo) => logo.key !== key)
        .map((logo, index) => ({
          ...logo,
          displayOrder: index,
        })),
    });
  };

  const moveLogo = (index, direction) => {
    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= logos.length) return;

    const updated = [...logos];

    [updated[index], updated[nextIndex]] = [
      updated[nextIndex],
      updated[index],
    ];

    onChange({
      ...settings,
      logos: updated.map((logo, order) => ({
        ...logo,
        displayOrder: order,
      })),
    });
  };

  const handleUpload = async (key, file) => {
    if (!file) return;

    if (
      file.type !== "image/jpeg" &&
      !file.name.toLowerCase().match(/\.(jpg|jpeg)$/)
    ) {
      notification.warning("Only JPG/JPEG logo images are allowed.");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      notification.warning("Logo image must be 8 MB or smaller.");
      return;
    }

    setUploadingKey(key);

    try {
      const uploaded = await onUploadLogo(file);

      if (!uploaded?.imageUrl || !uploaded?.imageVersion) {
        throw new Error("Logo upload response is incomplete.");
      }

    //   updateLogo(key, "imageUrl", uploaded.imageUrl);

      // Update both image fields together to avoid stale state.
      onChange({
        ...settings,
        logos: logos.map((logo) =>
          logo.key === key
            ? {
                ...logo,
                imageUrl: uploaded.imageUrl,
                imageVersion: uploaded.imageVersion,
              }
            : logo
        ),
      });

      notification.success("Partner logo uploaded successfully.");
    } catch (error) {
      notification.error(
        error?.message || "Unable to upload partner logo."
      );
    } finally {
      setUploadingKey("");

      if (inputRefs.current[key]) {
        inputRefs.current[key].value = "";
      }
    }
  };

  return (
    <div className="we-partners-controls">
      <div className="we-partners-intro">
        <h4>Partners Section</h4>
        <p>
          Manage the heading, visible logo count and client logos
          displayed in your website's Partners slider.
        </p>
      </div>

      <div className="we-partners-enable-row">
        <div>
          <strong>Show Partners Section</strong>
          <span>Display or hide the section on the public website.</span>
        </div>

        <button
          type="button"
          className={`we-partners-toggle ${
            settings.enabled ? "active" : ""
          }`}
          onClick={() =>
            updateField("enabled", !settings.enabled)
          }
          aria-label="Toggle Partners section"
        >
          <span />
        </button>
      </div>

      <div className="we-partners-panel">
        <div className="we-partners-panel-heading">
          <FiBriefcase />
          <strong>Heading Settings</strong>
        </div>

        <label className="we-partners-field">
          Heading *
          <input
            type="text"
            maxLength={180}
            value={settings.heading || ""}
            placeholder="Trusted by industry leaders and valued partners worldwide"
            onChange={(event) =>
              updateField("heading", event.target.value)
            }
          />
        </label>

        <label className="we-partners-field">
          Highlight Text
          <input
            type="text"
            maxLength={100}
            value={settings.highlightText || ""}
            placeholder="industry leaders and valued partners"
            onChange={(event) =>
              updateField("highlightText", event.target.value)
            }
          />
          <small>
            This exact phrase in the heading will be highlighted
            in orange/red.
          </small>
        </label>
      </div>

      <div className="we-partners-panel">
        <div className="we-partners-panel-heading">
          <FiEye />
          <strong>Slider Settings</strong>
        </div>

        <label className="we-partners-field">
          Logos to show at once on desktop
          <select
            value={settings.visibleCount || 5}
            onChange={(event) =>
              updateField("visibleCount", Number(event.target.value))
            }
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((count) => (
              <option key={count} value={count}>
                {count} logos
              </option>
            ))}
          </select>
          <small>
            Tablet automatically shows 3 logos and mobile shows 2.
          </small>
        </label>

        <label className="we-partners-checkbox">
          <input
            type="checkbox"
            checked={settings.autoSlide !== false}
            onChange={(event) =>
              updateField("autoSlide", event.target.checked)
            }
          />
          Automatically slide partner logos
        </label>
      </div>

      <div className="we-partners-panel">
        <div className="we-partners-logo-heading">
          <div className="we-partners-panel-heading">
            <FiImage />
            <strong>Client / Partner Logos</strong>
          </div>

          <span>{logos.length}/{MAX_LOGOS}</span>
        </div>

        <button
          type="button"
          className="we-partners-add-button"
          onClick={addLogo}
          disabled={logos.length >= MAX_LOGOS}
        >
          <FiPlus />
          Add Client Logo
        </button>

        {logos.length === 0 ? (
          <div className="we-partners-empty">
            <FiImage />
            <strong>No partner logos added</strong>
            <span>
              Upload your first client or partner logo to get started.
            </span>
          </div>
        ) : (
          <div className="we-partners-logo-list">
            {logos.map((logo, index) => (
              <article
                className="we-partners-logo-card"
                key={logo.key}
              >
                <div className="we-partners-logo-card-heading">
                  <strong>Partner {index + 1}</strong>

                  <div className="we-partners-logo-actions">
                    <button
                      type="button"
                      title="Move up"
                      disabled={index === 0}
                      onClick={() => moveLogo(index, -1)}
                    >
                      <FiChevronUp />
                    </button>

                    <button
                      type="button"
                      title="Move down"
                      disabled={index === logos.length - 1}
                      onClick={() => moveLogo(index, 1)}
                    >
                      <FiChevronDown />
                    </button>

                    <button
                      type="button"
                      title="Remove logo"
                      className="danger"
                      onClick={() => removeLogo(logo.key)}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>

                <div className="we-partners-logo-upload-row">
                  <div className="we-partners-logo-preview">
                    {logo.imageUrl ? (
                      <img
                        src={getAssetUrl(logo.imageUrl)}
                        alt={logo.name || `Partner ${index + 1}`}
                      />
                    ) : (
                      <FiImage />
                    )}
                  </div>

                  <div className="we-partners-logo-upload">
                    <input
                      ref={(element) => {
                        inputRefs.current[logo.key] = element;
                      }}
                      type="file"
                      accept=".jpg,.jpeg,image/jpeg"
                      onChange={(event) =>
                        handleUpload(
                          logo.key,
                          event.target.files?.[0]
                        )
                      }
                    />

                    {uploadingKey === logo.key && (
                      <small>
                        <FiLoader className="we-partners-spin" />
                        Uploading...
                      </small>
                    )}

                    <small>JPG/JPEG only · Maximum 8 MB</small>
                  </div>
                </div>

                <label className="we-partners-field">
                  Client / Company Name (optional)
                  <input
                    type="text"
                    maxLength={100}
                    value={logo.name || ""}
                    placeholder="Enter partner name"
                    onChange={(event) =>
                      updateLogo(logo.key, "name", event.target.value)
                    }
                  />
                </label>

                {!logo.imageUrl && (
                  <div className="we-partners-missing">
                    Upload a JPG image before saving this logo.
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="we-partners-note">
        <FiEye />
        <span>
          The slider displays logos in the order shown above.
          Changes are saved using the Website Editor's Save Draft button.
        </span>
      </div>
    </div>
  );
}
