
import { useState } from "react";
import {
  FiPlus,
  FiTrash2,
  FiEdit2,
  FiChevronUp,
  FiChevronDown,
  FiEye,
  FiEyeOff,
  FiBriefcase,
  FiX,
  FiSave,
} from "react-icons/fi";

import notification from "../../../../utils/notification";

const MAX_JOBS = 50;

const TEAM_OPTIONS = [
  "Academic Team",
  "Engineering",
  "Analytics",
  "Marketing",
  "Sales",
  "Operations",
  "Student Support",
  "Other",
];

const EMPLOYMENT_OPTIONS = [
  "Full-time",
  "Part-time",
  "Contract",
  "Internship",
];

const WORK_MODE_OPTIONS = [
  "On-site",
  "Remote",
  "Hybrid",
];

const createJob = () => ({
  key: `career-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`,
  team: "Academic Team",
  employmentType: "Full-time",
  workMode: "On-site",
  isUrgent: false,
  position: "",
  location: "",
  postedAt: null,
  skills: [],
  applyUrl: "",
  displayOrder: 0,
  isVisible: true,
});

export default function CareersControls({ settings, onChange }) {
  const [editingKey, setEditingKey] = useState(null);
  const [draft, setDraft] = useState(createJob());
  const [skillsText, setSkillsText] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  const jobs = Array.isArray(settings.jobs)
    ? settings.jobs
    : [];

  const updateSection = (field, value) => {
    onChange({
      ...settings,
      [field]: value,
    });
  };

  const updateDraft = (field, value) => {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const openAddForm = () => {
    if (jobs.length >= MAX_JOBS) {
      notification.warning(
        `Maximum ${MAX_JOBS} job postings are allowed.`
      );
      return;
    }

    setEditingKey(null);
    setDraft(createJob());
    setSkillsText("");
    setFormOpen(true);
  };

  const openEditForm = (job) => {
    setEditingKey(job.key);
    setDraft({ ...job });
    setSkillsText((job.skills || []).join(", "));
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingKey(null);
    setDraft(createJob());
    setSkillsText("");
  };

  const saveJob = (event) => {
    event.preventDefault();

    const skills = [
      ...new Set(
        skillsText
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean)
      ),
    ];

    if (skills.length > 12) {
      notification.warning("Maximum 12 skills are allowed.");
      return;
    }

    if (skills.some((skill) => skill.length > 50)) {
      notification.warning(
        "Each skill must be 50 characters or fewer."
      );
      return;
    }

    let updatedJobs;

    const nextJob = {
      ...draft,
      skills,
      displayOrder: editingKey
        ? jobs.findIndex((job) => job.key === editingKey)
        : jobs.length,
    };

    if (editingKey) {
      updatedJobs = jobs.map((job) =>
        job.key === editingKey ? nextJob : job
      );
    } else {
      updatedJobs = [...jobs, nextJob];
    }

    onChange({
      ...settings,
      jobs: updatedJobs.map((job, index) => ({
        ...job,
        displayOrder: index,
      })),
    });

    closeForm();

    notification.success(
      editingKey
        ? "Job details updated. Save Website Editor to apply."
        : "Job added. Save Website Editor to apply."
    );
  };

  const deleteJob = async (key) => {
    const confirmed = await notification.confirm({
      title: "Delete job posting?",
      text: "This job will be removed when you save the Website Editor.",
      icon: "warning",
      confirmText: "Delete",
      cancelText: "Cancel",
      confirmButtonColor: "#dc2626",
    });

    if (!confirmed) return;

    onChange({
      ...settings,
      jobs: jobs
        .filter((job) => job.key !== key)
        .map((job, index) => ({
          ...job,
          displayOrder: index,
        })),
    });

    if (editingKey === key) closeForm();
  };

  const moveJob = (index, direction) => {
    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= jobs.length) return;

    const updated = [...jobs];

    [updated[index], updated[nextIndex]] = [
      updated[nextIndex],
      updated[index],
    ];

    onChange({
      ...settings,
      jobs: updated.map((job, order) => ({
        ...job,
        displayOrder: order,
      })),
    });
  };

  const toggleVisibility = (job) => {
    onChange({
      ...settings,
      jobs: jobs.map((item) =>
        item.key === job.key
          ? { ...item, isVisible: item.isVisible === false }
          : item
      ),
    });
  };

  return (
    <div className="we-careers-controls">
      <div className="we-careers-intro">
        <h4>Careers Management</h4>
        <p>
          Manage job openings and career opportunities displayed
          on your public institute website.
        </p>
      </div>

      <div className="we-careers-enable-row">
        <div>
          <strong>Show Careers Section</strong>
          <span>
            Enable or hide the complete Careers section.
          </span>
        </div>

        <button
          type="button"
          className={`we-careers-toggle ${
            settings.enabled ? "active" : ""
          }`}
          onClick={() =>
            updateSection("enabled", !settings.enabled)
          }
          aria-label="Toggle Careers section"
        >
          <span />
        </button>
      </div>

      <div className="we-careers-panel">
        <h4>Section Content</h4>

        <label className="we-careers-field">
          Heading *
          <input
            value={settings.heading || ""}
            maxLength={180}
            required
            onChange={(e) =>
              updateSection("heading", e.target.value)
            }
            placeholder="Join Our Growing Team"
          />
        </label>

        <label className="we-careers-field">
          Highlight Text
          <input
            value={settings.highlightText || ""}
            maxLength={100}
            onChange={(e) =>
              updateSection("highlightText", e.target.value)
            }
            placeholder="Team"
          />
          <small>
            This phrase will receive the orange highlight.
          </small>
        </label>

        <label className="we-careers-field">
          Description
          <textarea
            rows={3}
            maxLength={600}
            value={settings.description || ""}
            onChange={(e) =>
              updateSection("description", e.target.value)
            }
            placeholder="Describe career opportunities at your institute..."
          />
        </label>
      </div>

      <div className="we-careers-panel">
        <div className="we-careers-list-heading">
          <div>
            <h4>Job Postings</h4>
            <span>{jobs.length}/{MAX_JOBS} jobs</span>
          </div>

          <button
            type="button"
            className="we-careers-add-button"
            onClick={openAddForm}
            disabled={jobs.length >= MAX_JOBS}
          >
            <FiPlus /> Add Job
          </button>
        </div>

        {formOpen && (
          <form
            className="we-careers-job-form"
            onSubmit={saveJob}
          >
            <div className="we-careers-form-heading">
              <h4>
                {editingKey ? "Edit Job Posting" : "Add Job Posting"}
              </h4>

              <button
                type="button"
                onClick={closeForm}
                aria-label="Close form"
              >
                <FiX />
              </button>
            </div>

            <label className="we-careers-field">
              Team *
              <select
                value={draft.team}
                onChange={(e) =>
                  updateDraft("team", e.target.value)
                }
                required
              >
                {TEAM_OPTIONS.map((team) => (
                  <option key={team} value={team}>
                    {team}
                  </option>
                ))}
              </select>
            </label>

            <div className="we-careers-form-grid">
              <label className="we-careers-field">
                Employment Type *
                <select
                  value={draft.employmentType}
                  onChange={(e) =>
                    updateDraft("employmentType", e.target.value)
                  }
                  required
                >
                  {EMPLOYMENT_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="we-careers-field">
                Work Mode *
                <select
                  value={draft.workMode}
                  onChange={(e) =>
                    updateDraft("workMode", e.target.value)
                  }
                  required
                >
                  {WORK_MODE_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="we-careers-urgent">
              <input
                type="checkbox"
                checked={draft.isUrgent}
                onChange={(e) =>
                  updateDraft("isUrgent", e.target.checked)
                }
              />
              <span>Urgent hiring</span>
            </label>

            <label className="we-careers-field">
              Job Position *
              <input
                required
                maxLength={180}
                value={draft.position}
                onChange={(e) =>
                  updateDraft("position", e.target.value)
                }
                placeholder="Senior Content Developer"
              />
            </label>

            <label className="we-careers-field">
              Location *
              <input
                required
                maxLength={160}
                value={draft.location}
                onChange={(e) =>
                  updateDraft("location", e.target.value)
                }
                placeholder="Bangalore, India"
              />
            </label>

            <label className="we-careers-field">
              Skills
              <input
                value={skillsText}
                onChange={(e) => setSkillsText(e.target.value)}
                placeholder="React, Node.js, MongoDB"
              />
              <small>
                Separate skills with commas. Maximum 12 skills.
              </small>
            </label>

            <label className="we-careers-field">
              Apply Now URL *
              <input
                type="url"
                required
                maxLength={1000}
                value={draft.applyUrl}
                onChange={(e) =>
                  updateDraft("applyUrl", e.target.value)
                }
                placeholder="https://example.com/apply"
              />
              <small>
                Applicants will be redirected to this URL.
              </small>
            </label>

            <div className="we-careers-form-actions">
              <button
                type="button"
                className="we-careers-cancel-button"
                onClick={closeForm}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="we-careers-save-job-button"
              >
                <FiSave />
                {editingKey ? "Update Job" : "Add Job"}
              </button>
            </div>
          </form>
        )}

        {jobs.length === 0 ? (
          <div className="we-careers-empty">
            <FiBriefcase />
            <strong>No job postings yet</strong>
            <span>Add your first job opening to get started.</span>
          </div>
        ) : (
          <div className="we-careers-admin-list">
            {jobs.map((job, index) => (
              <article
                className="we-careers-admin-card"
                key={job.key}
              >
                <div className="we-careers-admin-card-top">
                  <div>
                    <strong>{job.position || "Untitled position"}</strong>
                    <span>
                      {job.team} · {job.employmentType} · {job.workMode}
                    </span>
                  </div>

                  {job.isUrgent && (
                    <span className="we-careers-urgent-label">
                      Urgent
                    </span>
                  )}
                </div>

                <div className="we-careers-admin-card-actions">
                  <button
                    type="button"
                    title="Move up"
                    disabled={index === 0}
                    onClick={() => moveJob(index, -1)}
                  >
                    <FiChevronUp />
                  </button>

                  <button
                    type="button"
                    title="Move down"
                    disabled={index === jobs.length - 1}
                    onClick={() => moveJob(index, 1)}
                  >
                    <FiChevronDown />
                  </button>

                  <button
                    type="button"
                    title="Edit job"
                    onClick={() => openEditForm(job)}
                  >
                    <FiEdit2 />
                  </button>

                  <button
                    type="button"
                    title={job.isVisible === false ? "Show job" : "Hide job"}
                    onClick={() => toggleVisibility(job)}
                  >
                    {job.isVisible === false ? <FiEyeOff /> : <FiEye />}
                  </button>

                  <button
                    type="button"
                    className="danger"
                    title="Delete job"
                    onClick={() => deleteJob(job.key)}
                  >
                    <FiTrash2 />
                  </button>
                </div>

                {job.isVisible === false && (
                  <small className="we-careers-hidden-note">
                    This job is hidden from the public website.
                  </small>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="we-careers-note">
        <FiBriefcase />
        <span>
          Job changes are saved when you click Save Website Editor.
          Posted dates are generated automatically and retained when
          existing jobs are edited.
        </span>
      </div>
    </div>
  );
}
