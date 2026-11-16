
import { useRef, useState } from "react";

import {
  FiPlus,
  FiImage,
  FiTrash2,
  FiUpload,
  FiChevronUp,
  FiChevronDown,
  FiEye,
  FiEyeOff,
} from "react-icons/fi";

import { getAssetUrl } from "../../../../utils/assetUrl";
import notification from "../../../../utils/notification";

const MAX_ITEMS = 8;

const createItem = () => ({
  key: `highlight-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`,
  title: "",
  description: "",
  iconUrl: "",
  iconVersion: "",
  isVisible: true,
});

export default function CategoryHighlightsControls({
  items = [],
  onChange,
  onUploadIcon,
}) {
  const [uploadingKey, setUploadingKey] = useState("");
  const inputRefs = useRef({});

  const updateItem = (key, field, value) => {
    onChange(
      items.map((item) =>
        item.key === key
          ? { ...item, [field]: value }
          : item
      )
    );
  };

  const addItem = () => {
    if (items.length >= MAX_ITEMS) {
      notification.warning(
        `You can add a maximum of ${MAX_ITEMS} highlights.`
      );
      return;
    }

    onChange([...items, createItem()]);
  };

  const deleteItem = (key) => {
    onChange(items.filter((item) => item.key !== key));
  };

  const moveItem = (index, direction) => {
    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= items.length) return;

    const nextItems = [...items];

    [nextItems[index], nextItems[nextIndex]] = [
      nextItems[nextIndex],
      nextItems[index],
    ];

    onChange(nextItems);
  };

  const handleIconUpload = async (event, item) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      notification.warning("Choose a JPG, PNG or WEBP icon image.");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      notification.warning("Icon image must be 8 MB or smaller.");
      return;
    }

    setUploadingKey(item.key);

    try {
      const uploaded = await onUploadIcon(file);

      if (!uploaded?.iconUrl || !uploaded?.iconVersion) {
        throw new Error("The uploaded icon response was incomplete.");
      }

      onChange(
        items.map((current) =>
            current.key === item.key
            ? {
                ...current,
                iconUrl: uploaded.iconUrl,
                iconVersion: uploaded.iconVersion,
                }
            : current
        )
      );
      
    } catch (error) {
      notification.error(
        error?.message || "Unable to upload highlight icon."
      );
    } finally {
      setUploadingKey("");
    }
  };

  return (
    <div className="we-category-controls">
      <div className="we-category-intro">
        <div>
          <h4>Category Highlights</h4>
          <p>
            Manage the highlights strip displayed below the homepage banner.
          </p>
        </div>

        <span className="we-category-count">
          {items.length}/{MAX_ITEMS}
        </span>
      </div>

      <div className="we-category-note">
        <FiImage />
        <span>
          Upload an individual icon for every highlight. Recommended:
          square PNG or WEBP images with a transparent background.
        </span>
      </div>

      {items.map((item, index) => (
        <div className="we-category-card" key={item.key}>
          <div className="we-category-card-heading">
            <strong>Highlight {index + 1}</strong>

            <div className="we-category-card-actions">
              <button
                type="button"
                title="Move up"
                aria-label={`Move highlight ${index + 1} up`}
                disabled={index === 0 || uploadingKey === item.key}
                onClick={() => moveItem(index, -1)}
              >
                <FiChevronUp />
              </button>

              <button
                type="button"
                title="Move down"
                aria-label={`Move highlight ${index + 1} down`}
                disabled={
                  index === items.length - 1 ||
                  uploadingKey === item.key
                }
                onClick={() => moveItem(index, 1)}
              >
                <FiChevronDown />
              </button>

              <button
                type="button"
                title={item.isVisible === false ? "Show highlight" : "Hide highlight"}
                aria-label="Toggle highlight visibility"
                onClick={() =>
                  updateItem(
                    item.key,
                    "isVisible",
                    item.isVisible === false
                  )
                }
              >
                {item.isVisible === false ? <FiEyeOff /> : <FiEye />}
              </button>

              <button
                type="button"
                className="danger"
                title="Delete highlight"
                aria-label={`Delete highlight ${index + 1}`}
                disabled={uploadingKey === item.key}
                onClick={() => deleteItem(item.key)}
              >
                <FiTrash2 />
              </button>
            </div>
          </div>

          <div className="we-category-icon-row">
            <div className="we-category-icon-preview">
              {item.iconUrl ? (
                <img
                  src={getAssetUrl(item.iconUrl)}
                  alt={`${item.title || "Highlight"} icon`}
                />
              ) : (
                <FiImage />
              )}
            </div>

            <div className="we-category-icon-upload">
              <strong>Highlight icon</strong>
              <span>
                {item.iconUrl
                  ? "Replace the current icon image."
                  : "Upload an icon image for this highlight."}
              </span>

              <button
                type="button"
                disabled={uploadingKey === item.key}
                onClick={() => inputRefs.current[item.key]?.click()}
              >
                <FiUpload />
                {uploadingKey === item.key
                  ? "Uploading..."
                  : item.iconUrl
                    ? "Replace Icon"
                    : "Upload Icon"}
              </button>

              <input
                ref={(node) => {
                  inputRefs.current[item.key] = node;
                }}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={(event) =>
                  handleIconUpload(event, item)
                }
              />
            </div>
          </div>

          <label className="we-control-field">
            Highlight title
            <input
              type="text"
              maxLength={60}
              value={item.title || ""}
              placeholder="e.g. Daily Live"
              onChange={(event) =>
                updateItem(item.key, "title", event.target.value)
              }
            />
          </label>

          <label className="we-control-field">
            Description
            <input
              type="text"
              maxLength={150}
              value={item.description || ""}
              placeholder="e.g. Interactive classes"
              onChange={(event) =>
                updateItem(
                  item.key,
                  "description",
                  event.target.value
                )
              }
            />
          </label>

          {item.isVisible === false && (
            <div className="we-category-hidden-note">
              This highlight is hidden from the preview.
            </div>
          )}
        </div>
      ))}

      {items.length === 0 && (
        <div className="we-category-empty">
          <FiImage />
          <strong>No highlights added</strong>
          <span>Add a highlight to display it below the homepage banner.</span>
        </div>
      )}

      <button
        type="button"
        className="we-category-add-button"
        disabled={items.length >= MAX_ITEMS}
        onClick={addItem}
      >
        <FiPlus />
        Add Highlight
      </button>

      <p className="we-category-footer-note">
        Maximum {MAX_ITEMS} highlights. Supported icon formats: JPG, PNG
        and WEBP. Maximum file size: 8 MB.
      </p>
    </div>
  );
}
