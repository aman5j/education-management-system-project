
import { useRef, useState } from "react";
import {
  FiImage,
  FiUpload,
  FiPlus,
  FiTrash2,
  FiChevronUp,
  FiChevronDown,
  FiExternalLink,
  FiEye,
  FiEyeOff,
  FiLoader,
} from "react-icons/fi";

import { getAssetUrl } from "../../../../utils/assetUrl";
import notification from "../../../../utils/notification";

const createListItem = () => ({
  key: `certificate-item-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 7)}`,
  text: "",
  displayOrder: 0,
});

export default function CertificateSectionControls({
  settings,
  onChange,
  onUploadImage,
}) {
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef(null);

  const updateField = (field, value) => {
    onChange({
      ...settings,
      [field]: value,
    });
  };

  const handleImageUpload = async (file) => {
    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      notification.warning("Choose a JPG, PNG or WEBP image.");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      notification.warning("Image size must be 8 MB or smaller.");
      return;
    }

    setUploading(true);

    try {
      const uploaded = await onUploadImage(file);

      if (!uploaded?.imageUrl || !uploaded?.imageVersion) {
        throw new Error("Image upload response is incomplete.");
      }

      onChange({
        ...settings,
        imageUrl: uploaded.imageUrl,
        imageVersion: uploaded.imageVersion,
      });
    } catch (error) {
      notification.error(
        error?.message || "Unable to upload certificate image."
      );
    } finally {
      setUploading(false);

      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  };

  const addListItem = () => {
    const items = Array.isArray(settings.listItems)
      ? settings.listItems
      : [];

    onChange({
      ...settings,
      listItems: [
        ...items,
        {
          ...createListItem(),
          displayOrder: items.length,
        },
      ],
    });
  };

  const updateListItem = (key, value) => {
    onChange({
      ...settings,
      listItems: settings.listItems.map((item) =>
        item.key === key ? { ...item, text: value } : item
      ),
    });
  };

  const removeListItem = (key) => {
    onChange({
      ...settings,
      listItems: settings.listItems
        .filter((item) => item.key !== key)
        .map((item, index) => ({
          ...item,
          displayOrder: index,
        })),
    });
  };

  const moveListItem = (index, direction) => {
    const items = [...(settings.listItems || [])];
    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= items.length) return;

    [items[index], items[nextIndex]] = [
      items[nextIndex],
      items[index],
    ];

    onChange({
      ...settings,
      listItems: items.map((item, order) => ({
        ...item,
        displayOrder: order,
      })),
    });
  };

  return (
    <div className="we-certificate-controls">
      <div className="we-certificate-intro">
        <h4>Certificate Section</h4>
        <p>
          Manage the certificate image, content, instructions and
          button displayed on your website.
        </p>
      </div>

      <div className="we-certificate-enable-row">
        <div>
          <strong>Show Certificate Section</strong>
          <span>
            Enable or hide this section on the public website.
          </span>
        </div>

        <button
          type="button"
          className={`we-certificate-toggle ${
            settings.enabled ? "active" : ""
          }`}
          onClick={() =>
            updateField("enabled", !settings.enabled)
          }
          aria-label="Toggle Certificate Section visibility"
        >
          <span />
        </button>
      </div>

      {/* Left-side image */}
      <div className="we-certificate-panel">
        <div className="we-certificate-panel-heading">
          <FiImage />
          <strong>Left Side — Certificate Image</strong>
        </div>

        <div className="we-certificate-image-area">
          {settings.imageUrl ? (
            <img
              src={getAssetUrl(settings.imageUrl)}
              alt="Certificate section preview"
            />
          ) : (
            <div className="we-certificate-image-empty">
              <FiImage />
              <strong>No certificate image uploaded</strong>
              <span>Upload the certificate image shown on the left.</span>
            </div>
          )}
        </div>

        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={(event) =>
            handleImageUpload(event.target.files?.[0])
          }
        />

        <button
          type="button"
          className="we-certificate-upload-button"
          disabled={uploading}
          onClick={() => imageInputRef.current?.click()}
        >
          {uploading ? (
            <>
              <FiLoader className="we-certificate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <FiUpload />
              {settings.imageUrl
                ? "Replace Certificate Image"
                : "Upload Certificate Image"}
            </>
          )}
        </button>

        <small>JPG, PNG or WEBP · Maximum 8 MB</small>
      </div>

      {/* Right-side content */}
      <div className="we-certificate-panel">
        <div className="we-certificate-panel-heading">
          <FiImage />
          <strong>Right Side — Content Settings</strong>
        </div>

        <label className="we-certificate-field">
          Title *
          <input
            type="text"
            maxLength={180}
            value={settings.title || ""}
            placeholder="Download Your Officially Verified Certificate Now."
            onChange={(event) =>
              updateField("title", event.target.value)
            }
          />
        </label>

        <label className="we-certificate-field">
          Orange Highlight Text
          <input
            type="text"
            maxLength={100}
            value={settings.highlightText || ""}
            placeholder="Verified Certificate"
            onChange={(event) =>
              updateField("highlightText", event.target.value)
            }
          />
          <small>
            Enter a phrase that appears inside the title. That phrase
            will be displayed in orange.
          </small>
        </label>

        <label className="we-certificate-field">
          Description *
          <textarea
            rows={4}
            maxLength={1000}
            value={settings.description || ""}
            placeholder="Write the certificate section description..."
            onChange={(event) =>
              updateField("description", event.target.value)
            }
          />
        </label>
      </div>

      {/* Dynamic list */}
      <div className="we-certificate-panel">
        <div className="we-certificate-list-heading">
          <div className="we-certificate-panel-heading">
            <FiImage />
            <strong>Instruction List</strong>
          </div>

          <button
            type="button"
            className="we-certificate-add-button"
            onClick={addListItem}
          >
            <FiPlus />
            Add Point
          </button>
        </div>

        {(settings.listItems || []).length === 0 ? (
          <div className="we-certificate-list-empty">
            No instruction points added. Add your first point.
          </div>
        ) : (
          <div className="we-certificate-list">
            {settings.listItems.map((item, index) => (
              <div className="we-certificate-list-item" key={item.key}>
                <div className="we-certificate-list-number">
                  {index + 1}
                </div>

                <textarea
                  rows={2}
                  maxLength={300}
                  value={item.text || ""}
                  placeholder="Enter instruction or information..."
                  onChange={(event) =>
                    updateListItem(item.key, event.target.value)
                  }
                />

                <div className="we-certificate-list-actions">
                  <button
                    type="button"
                    title="Move up"
                    disabled={index === 0}
                    onClick={() => moveListItem(index, -1)}
                  >
                    <FiChevronUp />
                  </button>

                  <button
                    type="button"
                    title="Move down"
                    disabled={
                      index === settings.listItems.length - 1
                    }
                    onClick={() => moveListItem(index, 1)}
                  >
                    <FiChevronDown />
                  </button>

                  <button
                    type="button"
                    title="Delete point"
                    className="danger"
                    onClick={() => removeListItem(item.key)}
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Button settings */}
      <div className="we-certificate-panel">
        <div className="we-certificate-panel-heading">
          <FiExternalLink />
          <strong>Button Settings</strong>
        </div>

        <label className="we-certificate-field">
          Button Text *
          <input
            type="text"
            maxLength={60}
            value={settings.buttonText || ""}
            placeholder="View Full Certificate"
            onChange={(event) =>
              updateField("buttonText", event.target.value)
            }
          />
        </label>

        <div className="we-certificate-action-options">
          <label>
            <input
              type="radio"
              name="certificate-button-action"
              checked={settings.buttonAction === "image"}
              onChange={() =>
                updateField("buttonAction", "image")
              }
            />
            <span>
              <strong>View Uploaded Certificate</strong>
              <small>
                Open the uploaded certificate image in a new tab.
              </small>
            </span>
          </label>

          <label>
            <input
              type="radio"
              name="certificate-button-action"
              checked={settings.buttonAction === "url"}
              onChange={() =>
                updateField("buttonAction", "url")
              }
            />
            <span>
              <strong>Open External URL</strong>
              <small>
                Open another website or verification page.
              </small>
            </span>
          </label>
        </div>

        {settings.buttonAction === "image" ? (
          <div className="we-certificate-action-info">
            <FiEye />
            The button will open the uploaded certificate image in
            a new browser tab.
          </div>
        ) : (
          <label className="we-certificate-field">
            External URL *
            <input
              type="url"
              maxLength={1000}
              value={settings.externalUrl || ""}
              placeholder="https://example.com/certificate-verification"
              onChange={(event) =>
                updateField("externalUrl", event.target.value)
              }
            />
          </label>
        )}
      </div>

      <div className="we-certificate-note">
        <FiEye />
        <span>
          Use the Website Editor's <strong>Save Draft</strong> button
          to save your changes. The section is shown publicly only
          when it is enabled.
        </span>
      </div>
    </div>
  );
}
