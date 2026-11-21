
import { useRef, useState } from "react";
import {
  FiPlus,
  FiTrash2,
  FiChevronUp,
  FiChevronDown,
  FiEye,
  FiEyeOff,
  FiImage,
  FiStar,
  FiLoader,
} from "react-icons/fi";

import { getAssetUrl } from "../../../../utils/assetUrl";
import notification from "../../../../utils/notification";

const MAX_TESTIMONIALS = 50;

const createTestimonial = () => ({
  key: `testimonial-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`,
  imageUrl: "",
  imageVersion: "",
  name: "",
  designation: "",
  rating: 5,
  review: "",
  displayOrder: 0,
  isVisible: true,
});

export default function TestimonialsControls({
  settings,
  onChange,
  onUploadImage,
}) {
  const [uploadingKey, setUploadingKey] = useState("");
  const inputRefs = useRef({});

  const testimonials = Array.isArray(settings.testimonials)
    ? settings.testimonials
    : [];

  const updateField = (field, value) => {
    onChange({
      ...settings,
      [field]: value,
    });
  };

  const updateTestimonial = (key, field, value) => {
    onChange({
      ...settings,
      testimonials: testimonials.map((item) =>
        item.key === key
          ? { ...item, [field]: value }
          : item
      ),
    });
  };

  const addTestimonial = () => {
    if (testimonials.length >= MAX_TESTIMONIALS) {
      notification.warning(
        `Maximum ${MAX_TESTIMONIALS} testimonials are allowed.`
      );
      return;
    }

    onChange({
      ...settings,
      testimonials: [
        ...testimonials,
        {
          ...createTestimonial(),
          displayOrder: testimonials.length,
        },
      ],
    });
  };

  const removeTestimonial = async (key) => {
    const confirmed = await notification.confirm({
      title: "Delete testimonial?",
      text: "This testimonial will be removed when you save the Website Editor.",
      icon: "warning",
      confirmText: "Delete",
      cancelText: "Cancel",
      confirmButtonColor: "#dc2626",
    });

    if (!confirmed) return;

    onChange({
      ...settings,
      testimonials: testimonials
        .filter((item) => item.key !== key)
        .map((item, index) => ({
          ...item,
          displayOrder: index,
        })),
    });
  };

  const moveTestimonial = (index, direction) => {
    const nextIndex = index + direction;

    if (
      nextIndex < 0 ||
      nextIndex >= testimonials.length
    ) return;

    const updated = [...testimonials];

    [updated[index], updated[nextIndex]] = [
      updated[nextIndex],
      updated[index],
    ];

    onChange({
      ...settings,
      testimonials: updated.map((item, order) => ({
        ...item,
        displayOrder: order,
      })),
    });
  };

  const handleImageUpload = async (key, file) => {
    if (!file) return;

    if (
      file.type !== "image/jpeg" &&
      !file.name.toLowerCase().match(/\.(jpg|jpeg)$/)
    ) {
      notification.warning("Please select a JPG/JPEG photograph.");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      notification.warning("Image must be 8 MB or smaller.");
      return;
    }

    setUploadingKey(key);

    try {
      const uploaded = await onUploadImage(file);

      if (!uploaded?.imageUrl || !uploaded?.imageVersion) {
        throw new Error("Image upload response is incomplete.");
      }

    //   updateTestimonial(key, "imageUrl", uploaded.imageUrl);
    //   updateTestimonial(key, "imageVersion", uploaded.imageVersion);

      onChange({
        ...settings,
        testimonials: testimonials.map((item) =>
            item.key === key
            ? {
                ...item,
                imageUrl: uploaded.imageUrl,
                imageVersion: uploaded.imageVersion,
                }
            : item
        ),
      });

      notification.success("Profile photograph uploaded.");
    } catch (error) {
      notification.error(
        error?.message || "Unable to upload profile photograph."
      );
    } finally {
      setUploadingKey("");

      if (inputRefs.current[key]) {
        inputRefs.current[key].value = "";
      }
    }
  };

  const removeImage = (key) => {
    onChange({
      ...settings,
      testimonials: testimonials.map((item) =>
        item.key === key
          ? {
              ...item,
              imageUrl: "",
              imageVersion: "",
            }
          : item
      ),
    });
  };

  return (
    <div className="we-testimonials-controls">
      <div className="we-testimonials-intro">
        <h4>Testimonials Management</h4>
        <p>
          Manage feedback, reviews and experiences shared by
          students, alumni, parents, clients or other people
          associated with your institute.
        </p>
      </div>

      <div className="we-testimonials-enable-row">
        <div>
          <strong>Show Testimonials Section</strong>
          <span>Enable or hide the complete public section.</span>
        </div>

        <button
          type="button"
          className={`we-testimonials-toggle ${
            settings.enabled ? "active" : ""
          }`}
          onClick={() =>
            updateField("enabled", !settings.enabled)
          }
          aria-label="Toggle Testimonials section"
        >
          <span />
        </button>
      </div>

      <div className="we-testimonials-panel">
        <h4>Section Content</h4>

        <label className="we-testimonials-field">
          Section Label *
          <input
            value={settings.sectionLabel || ""}
            maxLength={80}
            onChange={(e) =>
              updateField("sectionLabel", e.target.value)
            }
            placeholder="Testimonials"
          />
        </label>

        <label className="we-testimonials-field">
          Heading *
          <input
            value={settings.heading || ""}
            maxLength={180}
            onChange={(e) =>
              updateField("heading", e.target.value)
            }
            placeholder="What Our Students Say"
          />
        </label>

        <label className="we-testimonials-field">
          Highlight Text
          <input
            value={settings.highlightText || ""}
            maxLength={100}
            onChange={(e) =>
              updateField("highlightText", e.target.value)
            }
            placeholder="Students Say"
          />
          <small>
            The matching phrase in your heading appears in orange.
          </small>
        </label>

        <label className="we-testimonials-field">
          Description
          <textarea
            rows={3}
            maxLength={600}
            value={settings.description || ""}
            onChange={(e) =>
              updateField("description", e.target.value)
            }
            placeholder="Write an introduction for your testimonials..."
          />
        </label>
      </div>

      <div className="we-testimonials-panel">
        <div className="we-testimonials-list-heading">
          <div>
            <h4>Review Cards</h4>
            <span>
              {testimonials.length}/{MAX_TESTIMONIALS} testimonials
            </span>
          </div>

          <button
            type="button"
            className="we-testimonials-add-button"
            onClick={addTestimonial}
            disabled={testimonials.length >= MAX_TESTIMONIALS}
          >
            <FiPlus /> Add Review
          </button>
        </div>

        {testimonials.length === 0 ? (
          <div className="we-testimonials-empty">
            <FiStar />
            <strong>No testimonials added</strong>
            <span>
              Add your first review to get started.
            </span>
          </div>
        ) : (
          <div className="we-testimonials-admin-list">
            {testimonials.map((item, index) => (
              <article
                className="we-testimonials-admin-card"
                key={item.key}
              >
                <div className="we-testimonials-card-heading">
                  <div>
                    <strong>
                      {item.name || `Testimonial ${index + 1}`}
                    </strong>
                    <span>
                      {item.designation || "Designation not entered"}
                    </span>
                  </div>

                  <div className="we-testimonials-admin-actions">
                    <button
                      type="button"
                      title="Move up"
                      disabled={index === 0}
                      onClick={() => moveTestimonial(index, -1)}
                    >
                      <FiChevronUp />
                    </button>

                    <button
                      type="button"
                      title="Move down"
                      disabled={index === testimonials.length - 1}
                      onClick={() => moveTestimonial(index, 1)}
                    >
                      <FiChevronDown />
                    </button>

                    <button
                      type="button"
                      title={
                        item.isVisible === false
                          ? "Show testimonial"
                          : "Hide testimonial"
                      }
                      onClick={() =>
                        updateTestimonial(
                          item.key,
                          "isVisible",
                          item.isVisible === false
                        )
                      }
                    >
                      {item.isVisible === false ? (
                        <FiEyeOff />
                      ) : (
                        <FiEye />
                      )}
                    </button>

                    <button
                      type="button"
                      className="danger"
                      title="Delete testimonial"
                      onClick={() => removeTestimonial(item.key)}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>

                <div className="we-testimonials-image-row">
                  <div className="we-testimonials-image-preview">
                    {item.imageUrl ? (
                      <img
                        src={getAssetUrl(item.imageUrl)}
                        alt={item.name || "Testimonial profile"}
                      />
                    ) : (
                      <FiImage />
                    )}
                  </div>

                  <div className="we-testimonials-image-actions">
                    <input
                      ref={(element) => {
                        inputRefs.current[item.key] = element;
                      }}
                      type="file"
                      accept=".jpg,.jpeg,image/jpeg"
                      onChange={(e) =>
                        handleImageUpload(
                          item.key,
                          e.target.files?.[0]
                        )
                      }
                    />

                    {uploadingKey === item.key ? (
                      <small>
                        <FiLoader className="we-testimonials-spin" />
                        Uploading...
                      </small>
                    ) : (
                      <small>
                        Optional JPG/JPEG · Maximum 8 MB
                      </small>
                    )}

                    {item.imageUrl && (
                      <button
                        type="button"
                        className="we-testimonials-remove-image"
                        onClick={() => removeImage(item.key)}
                      >
                        Remove photograph
                      </button>
                    )}
                  </div>
                </div>

                <label className="we-testimonials-field">
                  Person Name *
                  <input
                    value={item.name || ""}
                    maxLength={120}
                    onChange={(e) =>
                      updateTestimonial(
                        item.key,
                        "name",
                        e.target.value
                      )
                    }
                    placeholder="e.g. Vinay Bhadoriya"
                  />
                </label>

                <label className="we-testimonials-field">
                  Designation / Role *
                  <input
                    value={item.designation || ""}
                    maxLength={120}
                    onChange={(e) =>
                      updateTestimonial(
                        item.key,
                        "designation",
                        e.target.value
                      )
                    }
                    placeholder="e.g. Software Developer, Alumni, Parent"
                  />
                </label>

                <label className="we-testimonials-field">
                  Rating *
                  <select
                    value={item.rating || 5}
                    onChange={(e) =>
                      updateTestimonial(
                        item.key,
                        "rating",
                        Number(e.target.value)
                      )
                    }
                  >
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <option key={rating} value={rating}>
                        {rating} / 5 stars
                      </option>
                    ))}
                  </select>
                </label>

                <div className="we-testimonials-rating-preview">
                  {Array.from({ length: 5 }, (_, star) => (
                    <FiStar
                      key={star}
                      className={
                        star < Number(item.rating)
                          ? "filled"
                          : ""
                      }
                    />
                  ))}
                </div>

                <label className="we-testimonials-field">
                  Review Text *
                  <textarea
                    rows={4}
                    maxLength={1500}
                    value={item.review || ""}
                    onChange={(e) =>
                      updateTestimonial(
                        item.key,
                        "review",
                        e.target.value
                      )
                    }
                    placeholder="Write the person's experience..."
                  />
                  <small>
                    {(item.review || "").length}/1500 characters
                  </small>
                </label>

                {item.isVisible === false && (
                  <div className="we-testimonials-hidden-note">
                    This review is hidden from the public website.
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="we-testimonials-note">
        <FiStar />
        <span>
          Photographs are optional. If no photograph is uploaded,
          the public website will display a default profile avatar.
          Changes are saved using Save Website Editor.
        </span>
      </div>
    </div>
  );
}
