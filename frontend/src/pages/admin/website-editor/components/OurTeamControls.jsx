
import { useRef, useState } from "react";
import {
  FiImage,
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

const MAX_MEMBERS = 20;

const createMember = () => ({
  key: `team-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`,
  imageUrl: "",
  imageVersion: "",
  name: "",
  designation: "",
  displayOrder: 0,
  isVisible: true,
});

export default function OurTeamControls({
  settings,
  onChange,
  onUploadImage,
}) {
  const [uploadingKey, setUploadingKey] = useState("");
  const inputRefs = useRef({});

  const members = Array.isArray(settings.members)
    ? settings.members
    : [];

  const updateField = (field, value) => {
    onChange({
      ...settings,
      [field]: value,
    });
  };

  const updateMember = (key, field, value) => {
    onChange({
      ...settings,
      members: members.map((member) =>
        member.key === key
          ? { ...member, [field]: value }
          : member
      ),
    });
  };

  const addMember = () => {
    if (members.length >= MAX_MEMBERS) {
      notification.warning(
        `You can add a maximum of ${MAX_MEMBERS} team members.`
      );
      return;
    }

    onChange({
      ...settings,
      members: [
        ...members,
        {
          ...createMember(),
          displayOrder: members.length,
        },
      ],
    });
  };

  const removeMember = async (key) => {
    const confirmed = await notification.confirm({
      title: "Delete team member?",
      text: "This member will be removed when you save the Website Editor.",
      icon: "warning",
      confirmText: "Delete",
      cancelText: "Cancel",
      confirmButtonColor: "#dc2626",
    });

    if (!confirmed) return;

    onChange({
      ...settings,
      members: members
        .filter((member) => member.key !== key)
        .map((member, index) => ({
          ...member,
          displayOrder: index,
        })),
    });
  };

  const moveMember = (index, direction) => {
    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= members.length) return;

    const updated = [...members];

    [updated[index], updated[nextIndex]] = [
      updated[nextIndex],
      updated[index],
    ];

    onChange({
      ...settings,
      members: updated.map((member, order) => ({
        ...member,
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
        "Please select a JPG/JPEG team member photograph."
      );
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      notification.warning(
        "Team member image must be 8 MB or smaller."
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
        members: members.map((member) =>
          member.key === key
            ? {
                ...member,
                imageUrl: uploaded.imageUrl,
                imageVersion: uploaded.imageVersion,
              }
            : member
        ),
      });

      notification.success(
        "Team member image uploaded successfully."
      );
    } catch (error) {
      notification.error(
        error?.message || "Unable to upload team member image."
      );
    } finally {
      setUploadingKey("");

      if (inputRefs.current[key]) {
        inputRefs.current[key].value = "";
      }
    }
  };

  return (
    <div className="we-team-controls">
      <div className="we-team-intro">
        <h4>Our Team</h4>
        <p>
          Introduce your institute team with professional photographs,
          names and designations.
        </p>
      </div>

      <div className="we-team-enable-row">
        <div>
          <strong>Show Our Team Section</strong>
          <span>
            Enable or hide the complete section in the website preview.
          </span>
        </div>

        <button
          type="button"
          className={`we-team-toggle ${
            settings.enabled ? "active" : ""
          }`}
          onClick={() =>
            updateField("enabled", !settings.enabled)
          }
          aria-label="Toggle Our Team section"
        >
          <span />
        </button>
      </div>

      <div className="we-team-panel">
        <div className="we-team-panel-heading">
          <FiImage />
          <strong>Section Content</strong>
        </div>

        <label className="we-team-field">
          Heading *
          <input
            type="text"
            maxLength={180}
            value={settings.heading || ""}
            placeholder="Our Team"
            onChange={(event) =>
              updateField("heading", event.target.value)
            }
          />
        </label>

        <label className="we-team-field">
          Highlight Text
          <input
            type="text"
            maxLength={100}
            value={settings.highlightText || ""}
            placeholder="Team"
            onChange={(event) =>
              updateField("highlightText", event.target.value)
            }
          />
          <small>
            This exact phrase in the heading will appear in orange.
          </small>
        </label>

        <label className="we-team-field">
          Section Description
          <textarea
            rows={4}
            maxLength={600}
            value={settings.description || ""}
            placeholder="Write a short introduction about your team..."
            onChange={(event) =>
              updateField("description", event.target.value)
            }
          />
          <small>
            Maximum 600 characters.
          </small>
        </label>
      </div>

      <div className="we-team-panel">
        <div className="we-team-list-heading">
          <div className="we-team-panel-heading">
            <FiImage />
            <strong>Team Members</strong>
          </div>

          <span>
            {members.length}/{MAX_MEMBERS}
          </span>
        </div>

        <button
          type="button"
          className="we-team-add-button"
          onClick={addMember}
          disabled={members.length >= MAX_MEMBERS}
        >
          <FiPlus />
          Add Team Member
        </button>

        {members.length === 0 ? (
          <div className="we-team-empty">
            <FiImage />
            <strong>No team members added</strong>
            <span>
              Add your first team member to get started.
            </span>
          </div>
        ) : (
          <div className="we-team-member-list">
            {members.map((member, index) => (
              <article
                className="we-team-member-editor-card"
                key={member.key}
              >
                <div className="we-team-member-card-heading">
                  <strong>Team Member {index + 1}</strong>

                  <div className="we-team-member-actions">
                    <button
                      type="button"
                      title="Move up"
                      disabled={index === 0}
                      onClick={() => moveMember(index, -1)}
                    >
                      <FiChevronUp />
                    </button>

                    <button
                      type="button"
                      title="Move down"
                      disabled={index === members.length - 1}
                      onClick={() => moveMember(index, 1)}
                    >
                      <FiChevronDown />
                    </button>

                    <button
                      type="button"
                      title={
                        member.isVisible === false
                          ? "Show member"
                          : "Hide member"
                      }
                      onClick={() =>
                        updateMember(
                          member.key,
                          "isVisible",
                          member.isVisible === false
                        )
                      }
                    >
                      {member.isVisible === false ? (
                        <FiEyeOff />
                      ) : (
                        <FiEye />
                      )}
                    </button>

                    <button
                      type="button"
                      title="Delete member"
                      className="danger"
                      onClick={() => removeMember(member.key)}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>

                <div className="we-team-upload-row">
                  <div className="we-team-image-preview">
                    {member.imageUrl ? (
                      <img
                        src={getAssetUrl(member.imageUrl)}
                        alt={member.name || "Team member"}
                      />
                    ) : (
                      <FiImage />
                    )}
                  </div>

                  <div className="we-team-upload-content">
                    <input
                      ref={(element) => {
                        inputRefs.current[member.key] = element;
                      }}
                      type="file"
                      accept=".jpg,.jpeg,image/jpeg"
                      onChange={(event) =>
                        handleImageUpload(
                          member.key,
                          event.target.files?.[0]
                        )
                      }
                    />

                    {uploadingKey === member.key ? (
                      <small>
                        <FiLoader className="we-team-spin" />
                        Uploading image...
                      </small>
                    ) : (
                      <small>JPG/JPEG only · Maximum 8 MB</small>
                    )}
                  </div>
                </div>

                <label className="we-team-field">
                  Team Member Name *
                  <input
                    type="text"
                    maxLength={120}
                    value={member.name || ""}
                    placeholder="e.g. Michael Scott"
                    onChange={(event) =>
                      updateMember(
                        member.key,
                        "name",
                        event.target.value
                      )
                    }
                  />
                </label>

                <label className="we-team-field">
                  Designation *
                  <input
                    type="text"
                    maxLength={120}
                    value={member.designation || ""}
                    placeholder="e.g. Co-Founder, Chief Architect"
                    onChange={(event) =>
                      updateMember(
                        member.key,
                        "designation",
                        event.target.value
                      )
                    }
                  />
                </label>

                {member.isVisible === false && (
                  <div className="we-team-hidden-note">
                    This member is hidden from the preview.
                  </div>
                )}

                {(!member.imageUrl ||
                  !member.imageVersion ||
                  !member.name?.trim() ||
                  !member.designation?.trim()) && (
                  <div className="we-team-incomplete-note">
                    Complete the image, name and designation before saving.
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="we-team-note">
        <FiImage />
        <span>
          Use the arrow buttons to arrange members. Hidden members
          remain saved in admin but do not appear in the website preview.
        </span>
      </div>
    </div>
  );
}
