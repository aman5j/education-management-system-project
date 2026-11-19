
import { useRef, useState } from "react";
import {
  FiImage,
  FiUpload,
  FiPlus,
  FiTrash2,
  FiChevronUp,
  FiChevronDown,
  FiEye,
  FiEyeOff,
  FiLoader,
} from "react-icons/fi";

import { getAssetUrl } from "../../../../utils/assetUrl";
import notification from "../../../../utils/notification";

const MAX_STORIES = 20;

const createStory = () => ({
  key: `placement-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`,
  imageUrl: "",
  imageVersion: "",
  title: "",
  description: "",
  displayOrder: 0,
  isVisible: true,
});

export default function PlacementStoriesControls({
  settings,
  onChange,
  onUploadImage,
}) {
  const [uploadingKey, setUploadingKey] = useState("");
  const inputRefs = useRef({});

  const stories = Array.isArray(settings.stories)
    ? settings.stories
    : [];

  const updateField = (field, value) => {
    onChange({
      ...settings,
      [field]: value,
    });
  };

  const updateStory = (key, field, value) => {
    onChange({
      ...settings,
      stories: stories.map((story) =>
        story.key === key
          ? { ...story, [field]: value }
          : story
      ),
    });
  };

  const addStory = () => {
    if (stories.length >= MAX_STORIES) {
      notification.warning(
        `You can add a maximum of ${MAX_STORIES} placement stories.`
      );
      return;
    }

    onChange({
      ...settings,
      stories: [
        ...stories,
        {
          ...createStory(),
          displayOrder: stories.length,
        },
      ],
    });
  };

  const removeStory = async (key) => {
    const confirmed = await notification.confirm({
      title: "Delete placement story?",
      text: "This story will be removed when you save the Website Editor.",
      icon: "warning",
      confirmText: "Delete",
      cancelText: "Cancel",
      confirmButtonColor: "#dc2626",
    });

    if (!confirmed) return;

    onChange({
      ...settings,
      stories: stories
        .filter((story) => story.key !== key)
        .map((story, index) => ({
          ...story,
          displayOrder: index,
        })),
    });
  };

  const moveStory = (index, direction) => {
    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= stories.length) return;

    const updated = [...stories];

    [updated[index], updated[nextIndex]] = [
      updated[nextIndex],
      updated[index],
    ];

    onChange({
      ...settings,
      stories: updated.map((story, order) => ({
        ...story,
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
      notification.warning(
        "Choose a JPG/JPEG placement photograph."
      );
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      notification.warning(
        "Placement image must be 8 MB or smaller."
      );
      return;
    }

    setUploadingKey(key);

    try {
      const uploaded = await onUploadImage(file);

      if (!uploaded?.imageUrl || !uploaded?.imageVersion) {
        throw new Error("Image upload response is incomplete.");
      }

      onChange({
        ...settings,
        stories: stories.map((story) =>
          story.key === key
            ? {
                ...story,
                imageUrl: uploaded.imageUrl,
                imageVersion: uploaded.imageVersion,
              }
            : story
        ),
      });

      notification.success(
        "Placement story image uploaded successfully."
      );
    } catch (error) {
      notification.error(
        error?.message || "Unable to upload placement image."
      );
    } finally {
      setUploadingKey("");

      if (inputRefs.current[key]) {
        inputRefs.current[key].value = "";
      }
    }
  };

  return (
    <div className="we-placement-controls">
      <div className="we-placement-intro">
        <h4>Placement Stories</h4>
        <p>
          Showcase your students' placement achievements with
          photographs, names and job designations.
        </p>
      </div>

      <div className="we-placement-enable-row">
        <div>
          <strong>Show Placement Stories</strong>
          <span>
            Enable or hide the complete section on the website.
          </span>
        </div>

        <button
          type="button"
          className={`we-placement-toggle ${
            settings.enabled ? "active" : ""
          }`}
          onClick={() =>
            updateField("enabled", !settings.enabled)
          }
          aria-label="Toggle Placement Stories"
        >
          <span />
        </button>
      </div>

      <div className="we-placement-panel">
        <div className="we-placement-panel-heading">
          <FiImage />
          <strong>Section Heading</strong>
        </div>

        <label className="we-placement-field">
          Heading *
          <input
            type="text"
            maxLength={180}
            value={settings.heading || ""}
            placeholder="Our Success Placement Story"
            onChange={(event) =>
              updateField("heading", event.target.value)
            }
          />
        </label>

        <label className="we-placement-field">
          Highlight Text
          <input
            type="text"
            maxLength={100}
            value={settings.highlightText || ""}
            placeholder="Placement Story"
            onChange={(event) =>
              updateField("highlightText", event.target.value)
            }
          />
          <small>
            This exact phrase in the heading will appear in orange.
          </small>
        </label>
      </div>

      <div className="we-placement-panel">
        <div className="we-placement-list-heading">
          <div className="we-placement-panel-heading">
            <FiImage />
            <strong>Student Placement Cards</strong>
          </div>

          <span>
            {stories.length}/{MAX_STORIES}
          </span>
        </div>

        <button
          type="button"
          className="we-placement-add-button"
          onClick={addStory}
          disabled={stories.length >= MAX_STORIES}
        >
          <FiPlus />
          Add Placement Story
        </button>

        {stories.length === 0 ? (
          <div className="we-placement-empty">
            <FiImage />
            <strong>No placement stories added</strong>
            <span>
              Add your first student success story to get started.
            </span>
          </div>
        ) : (
          <div className="we-placement-story-list">
            {stories.map((story, index) => (
              <article
                className="we-placement-story-card"
                key={story.key}
              >
                <div className="we-placement-story-card-heading">
                  <strong>Story {index + 1}</strong>

                  <div className="we-placement-story-actions">
                    <button
                      type="button"
                      title="Move up"
                      disabled={index === 0}
                      onClick={() => moveStory(index, -1)}
                    >
                      <FiChevronUp />
                    </button>

                    <button
                      type="button"
                      title="Move down"
                      disabled={index === stories.length - 1}
                      onClick={() => moveStory(index, 1)}
                    >
                      <FiChevronDown />
                    </button>

                    <button
                      type="button"
                      title={
                        story.isVisible === false
                          ? "Show story"
                          : "Hide story"
                      }
                      onClick={() =>
                        updateStory(
                          story.key,
                          "isVisible",
                          story.isVisible === false
                        )
                      }
                    >
                      {story.isVisible === false ? (
                        <FiEyeOff />
                      ) : (
                        <FiEye />
                      )}
                    </button>

                    <button
                      type="button"
                      title="Delete story"
                      className="danger"
                      onClick={() => removeStory(story.key)}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>

                <div className="we-placement-upload-row">
                  <div className="we-placement-image-preview">
                    {story.imageUrl ? (
                      <img
                        src={getAssetUrl(story.imageUrl)}
                        alt={story.title || `Placement story ${index + 1}`}
                      />
                    ) : (
                      <FiImage />
                    )}
                  </div>

                  <div className="we-placement-upload-content">
                    <input
                      ref={(element) => {
                        inputRefs.current[story.key] = element;
                      }}
                      type="file"
                      accept=".jpg,.jpeg,image/jpeg"
                      onChange={(event) =>
                        handleImageUpload(
                          story.key,
                          event.target.files?.[0]
                        )
                      }
                    />

                    {uploadingKey === story.key ? (
                      <small>
                        <FiLoader className="we-placement-spin" />
                        Uploading image...
                      </small>
                    ) : (
                      <small>JPG/JPEG only · Maximum 8 MB</small>
                    )}
                  </div>
                </div>

                <label className="we-placement-field">
                  Student Name / Title *
                  <input
                    type="text"
                    maxLength={120}
                    value={story.title || ""}
                    placeholder="e.g. KHUSHBOO"
                    onChange={(event) =>
                      updateStory(
                        story.key,
                        "title",
                        event.target.value
                      )
                    }
                  />
                </label>

                <label className="we-placement-field">
                  Placement Description / Job Designation *
                  <textarea
                    rows={2}
                    maxLength={300}
                    value={story.description || ""}
                    placeholder="e.g. UI/UX Developer"
                    onChange={(event) =>
                      updateStory(
                        story.key,
                        "description",
                        event.target.value
                      )
                    }
                  />
                  <small>
                    Maximum 300 characters.
                  </small>
                </label>

                {story.isVisible === false && (
                  <div className="we-placement-hidden-note">
                    This story is hidden from the public website.
                  </div>
                )}

                {(!story.imageUrl ||
                  !story.imageVersion ||
                  !story.title?.trim() ||
                  !story.description?.trim()) && (
                  <div className="we-placement-incomplete-note">
                    Complete the image, title and description before saving.
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="we-placement-note">
        <FiEye />
        <span>
          Use the arrow buttons to arrange the cards. Hidden stories
          remain saved in admin but do not appear in the public preview.
        </span>
      </div>
    </div>
  );
}
