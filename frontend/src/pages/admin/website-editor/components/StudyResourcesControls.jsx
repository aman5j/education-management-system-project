
import { useRef, useState } from "react";
import {
  FiBookOpen,
  FiUpload,
  FiTrash2,
  FiChevronUp,
  FiChevronDown,
  FiEye,
  FiEyeOff,
  FiExternalLink,
  FiPlus,
  FiImage,
  FiLoader,
} from "react-icons/fi";

import notification from "../../../../utils/notification";
import { getAssetUrl } from "../../../../utils/assetUrl";

const MAX_ITEMS = 8;

const createResource = () => ({
  key: `resource-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  imageUrl: "",
  imageVersion: "",
  title: "",
  description: "",
  buttonText: "Explore Now",
  buttonUrl: "",
  openInNewTab: true,
  isVisible: true,
  displayOrder: 0,
});

export default function StudyResourcesControls({
  items = [],
  onChange,
  onUploadImage,
}) {
  const [uploadingKey, setUploadingKey] = useState("");
  const inputRefs = useRef({});

  const updateItem = (key, field, value) => {
    onChange(
      items.map((item) =>
        item.key === key ? { ...item, [field]: value } : item
      )
    );
  };

  const addItem = () => {
    if (items.length >= MAX_ITEMS) return;

    onChange([
      ...items,
      { ...createResource(), displayOrder: items.length },
    ]);
  };

const removeItem = async (key) => {
  const confirmed = await notification.confirm({
    title: "Delete Study Resource?",
    text: "This card will be removed when you save the Website Editor.",
    icon: "warning",
    confirmText: "Delete",
    cancelText: "Cancel",
    confirmButtonColor: "#dc2626",
  });

  if (!confirmed) return;

  onChange(
    items
      .filter((item) => item.key !== key)
      .map((item, index) => ({ ...item, displayOrder: index }))
  );
};

  const moveItem = (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) return;

    const updated = [...items];
    [updated[index], updated[nextIndex]] = [
      updated[nextIndex],
      updated[index],
    ];

    onChange(
      updated.map((item, order) => ({
        ...item,
        displayOrder: order,
      }))
    );
  };

  const handleImageUpload = async (key, file) => {
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
    notification.warning("Choose a JPG, PNG or WEBP image.");
    return;
    }

    if (file.size > 8 * 1024 * 1024) {
    notification.warning("Image size must be 8 MB or smaller.");
    return;
    }

    setUploadingKey(key);

    try {
      const uploaded = await onUploadImage(file);

      if (!uploaded?.imageUrl || !uploaded?.imageVersion) {
        throw new Error("Image upload response is incomplete.");
      }

    //   updateItem(key, "imageUrl", uploaded.imageUrl);
    //   updateItem(key, "imageVersion", uploaded.imageVersion);
    onChange(
        items.map((item) =>
            item.key === key
            ? {
                ...item,
                imageUrl: uploaded.imageUrl,
                imageVersion: uploaded.imageVersion,
                }
            : item
        )
    );
    } catch (error) {
      notification.error(
        error?.message || "Unable to upload the image."
      );
    } finally {
      setUploadingKey("");
      if (inputRefs.current[key]) {
        inputRefs.current[key].value = "";
      }
    }
  };

  return (
    <div className="we-study-controls">
      <div className="we-study-intro">
        <h4>Study Resources</h4>
        <p>
          Add up to 8 resource cards. These cards will appear on the
          public Study Resources page.
        </p>
      </div>

      <div className="we-study-stats">
        <div>
          <strong>{items.length}</strong>
          <span>Total cards</span>
        </div>
        <div>
          <strong>{items.filter((item) => item.isVisible !== false).length}</strong>
          <span>Visible</span>
        </div>
        <div>
          <strong>{MAX_ITEMS - items.length}</strong>
          <span>Remaining</span>
        </div>
      </div>

      <button
        type="button"
        className="we-study-add-button"
        onClick={addItem}
        disabled={items.length >= MAX_ITEMS}
      >
        <FiPlus />
        Add Study Resource
      </button>

      {items.length === 0 ? (
        <div className="we-study-empty">
          <FiBookOpen />
          <strong>No Study Resources added</strong>
          <span>
            Your resource section is empty. Add your first card to
            get started.
          </span>
        </div>
      ) : (
        <div className="we-study-list">
          {items.map((item, index) => (
            <article className="we-study-card-editor" key={item.key}>
              <div className="we-study-card-editor-heading">
                <strong>Resource {index + 1}</strong>

                <div className="we-study-card-actions">
                  <button
                    type="button"
                    title={item.isVisible === false ? "Show card" : "Hide card"}
                    onClick={() =>
                      updateItem(
                        item.key,
                        "isVisible",
                        item.isVisible === false
                      )
                    }
                  >
                    {item.isVisible === false ? <FiEye /> : <FiEyeOff />}
                  </button>

                  <button
                    type="button"
                    title="Move up"
                    disabled={index === 0}
                    onClick={() => moveItem(index, -1)}
                  >
                    <FiChevronUp />
                  </button>

                  <button
                    type="button"
                    title="Move down"
                    disabled={index === items.length - 1}
                    onClick={() => moveItem(index, 1)}
                  >
                    <FiChevronDown />
                  </button>

                  <button
                    type="button"
                    title="Delete card"
                    className="danger"
                    onClick={() => removeItem(item.key)}
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>

              <div className="we-study-image-row">
                <div className="we-study-image-preview">
                  {item.imageUrl ? (
                    <img
                      src={getAssetUrl(item.imageUrl)}
                      alt={item.title || "Resource preview"}
                    />
                  ) : (
                    <FiImage />
                  )}
                </div>

                <div className="we-study-image-upload">
                  <strong>Card image</strong>
                  <span>JPG, PNG or WEBP · Maximum 8 MB</span>

                  <input
                    ref={(node) => {
                      inputRefs.current[item.key] = node;
                    }}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) =>
                      handleImageUpload(
                        item.key,
                        event.target.files?.[0]
                      )
                    }
                  />

                  {uploadingKey === item.key && (
                    <small>
                      <FiLoader className="we-study-spin" />
                      Uploading image...
                    </small>
                  )}
                </div>
              </div>

              <label>
                Resource title *
                <input
                  type="text"
                  maxLength={60}
                  value={item.title || ""}
                  placeholder="Example: Free Study Notes"
                  onChange={(event) =>
                    updateItem(item.key, "title", event.target.value)
                  }
                />
              </label>

              <label>
                Description *
                <textarea
                  rows={3}
                  maxLength={250}
                  value={item.description || ""}
                  placeholder="Write a short description for students."
                  onChange={(event) =>
                    updateItem(
                      item.key,
                      "description",
                      event.target.value
                    )
                  }
                />
              </label>

              <div className="we-study-two-columns">
                <label>
                  Button text *
                  <input
                    type="text"
                    maxLength={40}
                    value={item.buttonText || ""}
                    placeholder="Explore Now"
                    onChange={(event) =>
                      updateItem(
                        item.key,
                        "buttonText",
                        event.target.value
                      )
                    }
                  />
                </label>

                <label>
                  Button URL *
                  <input
                    type="text"
                    maxLength={500}
                    value={item.buttonUrl || ""}
                    placeholder="/resources/notes or https://..."
                    onChange={(event) =>
                      updateItem(
                        item.key,
                        "buttonUrl",
                        event.target.value
                      )
                    }
                  />
                </label>
              </div>

              <div className="we-study-options">
                <label>
                  <input
                    type="checkbox"
                    checked={item.openInNewTab === true}
                    onChange={(event) =>
                      updateItem(
                        item.key,
                        "openInNewTab",
                        event.target.checked
                      )
                    }
                  />
                  Open link in new tab
                </label>

                <span className={item.isVisible === false ? "hidden" : "visible"}>
                  {item.isVisible === false ? "Hidden" : "Visible"}
                </span>
              </div>

              {item.buttonUrl && (
                <a
                  className="we-study-link-check"
                  href={item.buttonUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Preview destination <FiExternalLink />
                </a>
              )}
            </article>
          ))}
        </div>
      )}

      <div className="we-study-note">
        <FiBookOpen />
        <span>
          Changes are saved when you click the Website Editor's
          <strong> Save Draft</strong> button. Hidden cards are not
          shown on the public page.
        </span>
      </div>
    </div>
  );
}
