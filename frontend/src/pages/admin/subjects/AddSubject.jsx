
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiSave,
  FiPlus,
  FiTrash2,
} from "react-icons/fi";

import { createSubject } from "../../../services/subjectService";
import "../../../styles/SubjectManagement.css";

const emptyTopic = () => ({ title: "", description: "" });

const emptyUnit = () => ({
  title: "",
  description: "",
  durationHours: "0",
  topics: [emptyTopic()],
});

const INITIAL_FORM = {
  subjectName: "",
  subjectCode: "",
  description: "",
  status: "Active",
  syllabus: [],
};

export default function AddSubject() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const changeField = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: name === "subjectCode" ? value.toUpperCase() : value,
    }));

    setFieldErrors((previous) => ({ ...previous, [name]: "" }));
    setError("");
  };

  const changeUnit = (unitIndex, field, value) => {
    setFormData((previous) => ({
      ...previous,
      syllabus: previous.syllabus.map((unit, index) =>
        index === unitIndex ? { ...unit, [field]: value } : unit
      ),
    }));
  };

  const changeTopic = (unitIndex, topicIndex, field, value) => {
    setFormData((previous) => ({
      ...previous,
      syllabus: previous.syllabus.map((unit, index) =>
        index !== unitIndex
          ? unit
          : {
              ...unit,
              topics: unit.topics.map((topic, index2) =>
                index2 === topicIndex
                  ? { ...topic, [field]: value }
                  : topic
              ),
            }
      ),
    }));
  };

  const validateForm = () => {
    const errors = {};

    if (formData.subjectName.trim().length < 2) {
      errors.subjectName = "Subject name must contain at least 2 characters.";
    }

    if (formData.subjectCode.trim().length < 2) {
      errors.subjectCode = "Subject code must contain at least 2 characters.";
    }

    formData.syllabus.forEach((unit, index) => {
      if (!unit.title.trim()) {
        errors[`unit-${index}`] = "Enter a title for this syllabus unit.";
      }

      unit.topics.forEach((topic, topicIndex) => {
        if (!topic.title.trim()) {
          errors[`topic-${index}-${topicIndex}`] = "Enter a topic title.";
        }
      });
    });

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!validateForm()) return;

    try {
      setSaving(true);

      await createSubject({
        subjectName: formData.subjectName.trim(),
        subjectCode: formData.subjectCode.trim().toUpperCase(),
        description: formData.description.trim(),
        status: formData.status,
        syllabus: formData.syllabus.map((unit) => ({
          title: unit.title.trim(),
          description: unit.description.trim(),
          durationHours: Number(unit.durationHours) || 0,
          topics: unit.topics.map((topic) => ({
            title: topic.title.trim(),
            description: topic.description.trim(),
          })),
        })),
      });

      navigate("/admin/subjects", {
        replace: true,
        state: { message: "Subject created successfully." },
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to create subject. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="subject-page subject-form-page">
      <div className="subject-page-header">
        <div>
          <h1>Add Subject</h1>
          <p>Create an independent subject and define its syllabus.</p>
        </div>
        <button
          type="button"
          className="subject-secondary-btn"
          onClick={() => navigate("/admin/subjects")}
        >
          <FiArrowLeft /> Back to Subjects
        </button>
      </div>

      {error && (
        <div className="subject-alert subject-alert-error" role="alert">
          {error}
        </div>
      )}

      <div className="subject-card">
        <form onSubmit={handleSubmit} noValidate>
          <div className="subject-form-grid">
            <div className="subject-field">
              <label htmlFor="subjectName">Subject Name *</label>
              <input
                id="subjectName"
                name="subjectName"
                value={formData.subjectName}
                onChange={changeField}
                maxLength={100}
                required
              />
              {fieldErrors.subjectName && (
                <p className="subject-field-error">{fieldErrors.subjectName}</p>
              )}
            </div>

            <div className="subject-field">
              <label htmlFor="subjectCode">Subject Code *</label>
              <input
                id="subjectCode"
                name="subjectCode"
                value={formData.subjectCode}
                onChange={changeField}
                maxLength={30}
                placeholder="e.g. JS101"
                required
              />
              {fieldErrors.subjectCode && (
                <p className="subject-field-error">{fieldErrors.subjectCode}</p>
              )}
            </div>

            <div className="subject-field">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={changeField}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="subject-field subject-field-full">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                rows={3}
                maxLength={1000}
                value={formData.description}
                onChange={changeField}
                placeholder="Describe this subject"
              />
            </div>
          </div>

          <section className="subject-syllabus">
            <div className="subject-syllabus-heading">
              <div>
                <h2>Syllabus</h2>
                <p>Add units and topics for this subject.</p>
              </div>
              <button
                type="button"
                className="subject-secondary-btn"
                onClick={() =>
                  setFormData((previous) => ({
                    ...previous,
                    syllabus: [...previous.syllabus, emptyUnit()],
                  }))
                }
              >
                <FiPlus /> Add Unit
              </button>
            </div>

            {formData.syllabus.length === 0 && (
              <p className="subject-syllabus-empty">
                No units added yet. You can save the subject now and add a
                syllabus later.
              </p>
            )}

            {formData.syllabus.map((unit, unitIndex) => (
              <div className="subject-syllabus-unit" key={unitIndex}>
                <div className="subject-syllabus-unit-heading">
                  <h3>Unit {unitIndex + 1}</h3>
                  <button
                    type="button"
                    className="subject-danger-btn"
                    onClick={() =>
                      setFormData((previous) => ({
                        ...previous,
                        syllabus: previous.syllabus.filter(
                          (_, index) => index !== unitIndex
                        ),
                      }))
                    }
                  >
                    <FiTrash2 /> Remove Unit
                  </button>
                </div>

                <div className="subject-form-grid">
                  <div className="subject-field">
                    <label>Unit Title *</label>
                    <input
                      value={unit.title}
                      maxLength={150}
                      onChange={(event) =>
                        changeUnit(unitIndex, "title", event.target.value)
                      }
                      placeholder="e.g. JavaScript Fundamentals"
                    />
                    {fieldErrors[`unit-${unitIndex}`] && (
                      <p className="subject-field-error">
                        {fieldErrors[`unit-${unitIndex}`]}
                      </p>
                    )}
                  </div>

                  <div className="subject-field">
                    <label>Duration (hours)</label>
                    <input
                      type="number"
                      min="0"
                      value={unit.durationHours}
                      onChange={(event) =>
                        changeUnit(unitIndex, "durationHours", event.target.value)
                      }
                    />
                  </div>

                  <div className="subject-field subject-field-full">
                    <label>Unit Description</label>
                    <textarea
                      rows={2}
                      maxLength={2000}
                      value={unit.description}
                      onChange={(event) =>
                        changeUnit(unitIndex, "description", event.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="subject-syllabus-topics">
                  <h4>Topics</h4>

                  {unit.topics.map((topic, topicIndex) => (
                    <div className="subject-syllabus-topic" key={topicIndex}>
                      <div className="subject-field">
                        <label>Topic Title *</label>
                        <input
                          value={topic.title}
                          maxLength={150}
                          onChange={(event) =>
                            changeTopic(
                              unitIndex,
                              topicIndex,
                              "title",
                              event.target.value
                            )
                          }
                          placeholder="Enter topic title"
                        />
                        {fieldErrors[`topic-${unitIndex}-${topicIndex}`] && (
                          <p className="subject-field-error">
                            {fieldErrors[`topic-${unitIndex}-${topicIndex}`]}
                          </p>
                        )}
                      </div>

                      <div className="subject-field">
                        <label>Topic Description</label>
                        <input
                          value={topic.description}
                          maxLength={2000}
                          onChange={(event) =>
                            changeTopic(
                              unitIndex,
                              topicIndex,
                              "description",
                              event.target.value
                            )
                          }
                          placeholder="Optional description"
                        />
                      </div>

                      <button
                        type="button"
                        className="subject-icon-remove"
                        aria-label="Remove topic"
                        title="Remove topic"
                        onClick={() =>
                          setFormData((previous) => ({
                            ...previous,
                            syllabus: previous.syllabus.map((item, index) =>
                              index !== unitIndex
                                ? item
                                : {
                                    ...item,
                                    topics: item.topics.filter(
                                      (_, index2) => index2 !== topicIndex
                                    ),
                                  }
                            ),
                          }))
                        }
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    className="subject-secondary-btn"
                    onClick={() =>
                      setFormData((previous) => ({
                        ...previous,
                        syllabus: previous.syllabus.map((item, index) =>
                          index !== unitIndex
                            ? item
                            : {
                                ...item,
                                topics: [...item.topics, emptyTopic()],
                              }
                        ),
                      }))
                    }
                  >
                    <FiPlus /> Add Topic
                  </button>
                </div>
              </div>
            ))}
          </section>

          <div className="subject-form-actions">
            <button
              type="button"
              className="subject-secondary-btn"
              onClick={() => navigate("/admin/subjects")}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="subject-primary-btn"
              disabled={saving}
            >
              <FiSave /> {saving ? "Saving..." : "Save Subject"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
