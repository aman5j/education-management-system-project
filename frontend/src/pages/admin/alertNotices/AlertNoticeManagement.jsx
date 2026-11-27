
import { useEffect, useRef, useState } from "react";
import {
  FiBell,
  FiImage,
  FiUpload,
  FiEdit2,
  FiTrash2,
  FiPower,
  FiX,
  FiSave,
  FiRefreshCw,
  FiPlus,
  FiArrowLeft,
} from "react-icons/fi";

import {
  getAdminAlertNotices,
  createAlertNotice,
  updateAlertNotice,
  updateAlertNoticeStatus,
  deleteAlertNotice,
} from "../../../services/alertNoticeService";

import { getAssetUrl } from "../../../utils/assetUrl";
import notification, {
  getApiErrorMessage,
} from "../../../utils/notification";

import "./AlertNoticeManagement.css";

const localDateTime = (date = new Date()) => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset)
    .toISOString()
    .slice(0, 16);
};

const formatDate = (date) => {
  if (!date) return "No expiry";

  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const initialForm = () => ({
  title: "",
  startAt: localDateTime(),
  endAt: "",
  status: "Active",
});

export default function AlertNoticeManagement() {
  const fileRef = useRef(null);

  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [existingImage, setExistingImage] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const loadNotices = async () => {
    try {
      setLoading(true);

      const response = await getAdminAlertNotices();

      setNotices(
        Array.isArray(response?.data?.data)
          ? response.data.data
          : []
      );
    } catch (error) {
      notification.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotices();
  }, []);

  useEffect(() => {
    if (!imageFile) {
      setPreview("");
      return undefined;
    }

    const url = URL.createObjectURL(imageFile);
    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const resetForm = () => {
    setEditingId(null);
    setForm(initialForm());
    setImageFile(null);
    setExistingImage("");
    setHasUnsavedChanges(false);
    setShowForm(false);

    if (fileRef.current) {
      fileRef.current.value = "";
    }
  };

  const handleAddNotice = () => {
    resetForm();
    setShowForm(true);
  };

  const handleBackToList = async () => {
    if (hasUnsavedChanges) {
      const confirmed = await notification.confirm({
        title: "Discard changes?",
        text: "Your unsaved alert notice changes will be lost.",
        confirmText: "Yes, discard",
        icon: "warning",
      });

      if (!confirmed) return;
    }

    resetForm();
  };

  const updateFormField = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setHasUnsavedChanges(true);
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowed.includes(file.type)) {
      notification.error("Only JPG, PNG and WEBP images are allowed.");
      event.target.value = "";
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      notification.error("Image size must not exceed 8 MB.");
      event.target.value = "";
      return;
    }

    setImageFile(file);
    setHasUnsavedChanges(true);
  };

  const handleEdit = (notice) => {
    setEditingId(notice._id);

    setForm({
      title: notice.title || "",
      startAt: localDateTime(new Date(notice.startAt)),
      endAt: notice.endAt
        ? localDateTime(new Date(notice.endAt))
        : "",
      status: notice.status || "Active",
    });

    setExistingImage(notice.image || "");
    setImageFile(null);

    if (fileRef.current) {
      fileRef.current.value = "";
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    setHasUnsavedChanges(false);
    setShowForm(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!editingId && !imageFile) {
      notification.error("Please upload a notice image.");
      return;
    }

    if (
      form.endAt &&
      new Date(form.endAt) <= new Date(form.startAt)
    ) {
      notification.error("Expiry must be later than the start date.");
      return;
    }

    const data = new FormData();

    data.append("title", form.title.trim());
    data.append("startAt", new Date(form.startAt).toISOString());
    data.append("endAt", form.endAt
      ? new Date(form.endAt).toISOString()
      : ""
    );
    data.append("status", form.status);

    if (imageFile) {
      data.append("noticeImage", imageFile);
    }

    setSaving(true);

    try {
      if (editingId) {
        await updateAlertNotice(editingId, data);
        notification.success("Alert notice updated successfully.");
      } else {
        await createAlertNotice(data);
        notification.success("Alert notice created successfully.");
      }

      resetForm();
      await loadNotices();
    } catch (error) {
      notification.error(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (notice) => {
    const nextStatus =
      notice.status === "Active" ? "Inactive" : "Active";

    const confirmed = await notification.confirm({
      title: `${nextStatus} notice?`,
      text: `This notice will be ${nextStatus.toLowerCase()}.`,
      confirmText: `Yes, ${nextStatus.toLowerCase()}`,
      icon: "question",
    });

    if (!confirmed) return;

    try {
      await updateAlertNoticeStatus(notice._id, nextStatus);
      notification.success(`Notice ${nextStatus.toLowerCase()} successfully.`);
      await loadNotices();
    } catch (error) {
      notification.error(getApiErrorMessage(error));
    }
  };

  const handleDelete = async (notice) => {
    const confirmed = await notification.confirmDelete(
      `"${notice.title}"`
    );

    if (!confirmed) return;

    try {
      await deleteAlertNotice(notice._id);

      notification.success("Notice deleted successfully.");

      if (editingId === notice._id) {
        resetForm();
      }

      await loadNotices();
    } catch (error) {
      notification.error(getApiErrorMessage(error));
    }
  };


return (
  <div className="alert-notice-page">

    {/* PAGE HEADER */}
    <div className="alert-notice-header">
      <div>
        <span className="alert-notice-eyebrow">
          COMMUNICATION
        </span>

        <h1>
          <FiBell /> Alert Notice
        </h1>

        <p>
          Upload and manage image-based announcements for students.
        </p>
      </div>

      <div className="an-header-actions">

        {!showForm ? (
          <>
            <button
              type="button"
              className="an-refresh-btn"
              onClick={loadNotices}
              disabled={loading}
            >
              <FiRefreshCw />
              Refresh
            </button>

            <button
              type="button"
              className="an-add-btn"
              onClick={handleAddNotice}
            >
              <FiPlus />
              Add Alert Notice
            </button>
          </>
        ) : (
          <button
            type="button"
            className="an-back-btn"
            onClick={handleBackToList}
            disabled={saving}
          >
            <FiArrowLeft />
            Back to Alert Notices
          </button>
        )}

      </div>
    </div>

    {/* ADD / EDIT FORM */}
    {showForm && (
      <section className="an-form-card">

        <div className="an-section-heading">
          <div>
            <h2>
              {editingId
                ? "Edit Alert Notice"
                : "Add Alert Notice"}
            </h2>

            <p>
              Upload an image to display as a student popup.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="an-form-grid">

            <label className="an-field an-field-full">
              <span>
                Notice Title <b>*</b>
              </span>

              <input
                type="text"
                value={form.title}
                maxLength={150}
                onChange={(event) =>
                  updateFormField("title", event.target.value)
                }
                placeholder="Example: Diwali Holiday Notice"
                required
              />
            </label>

            <div className="an-field an-field-full">
              <span>
                Notice Image {!editingId && <b>*</b>}
              </span>

              <div className="an-upload-area">

                <div className="an-image-preview">
                  {preview || existingImage ? (
                    <img
                      src={
                        preview ||
                        getAssetUrl(existingImage)
                      }
                      alt="Notice preview"
                    />
                  ) : (
                    <div className="an-image-placeholder">
                      <FiImage />
                      <span>No image selected</span>
                    </div>
                  )}
                </div>

                <div className="an-upload-info">

                  <input
                    ref={fileRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    hidden
                  />

                  <button
                    type="button"
                    className="an-upload-btn"
                    onClick={() => fileRef.current?.click()}
                  >
                    <FiUpload />
                    Upload Image
                  </button>

                  <p>
                    JPG, PNG or WEBP. Maximum 8 MB.
                  </p>

                  <p>
                    Recommended: square or portrait promotional artwork.
                  </p>

                  {imageFile && (
                    <span className="an-selected-file">
                      {imageFile.name}
                    </span>
                  )}

                </div>
              </div>
            </div>

            <label className="an-field">
              <span>
                Show From <b>*</b>
              </span>

              <input
                type="datetime-local"
                value={form.startAt}
                onChange={(event) =>
                  updateFormField("startAt", event.target.value)
                }
                required
              />
            </label>

            <label className="an-field">
              <span>Expiry Date</span>

              <input
                type="datetime-local"
                value={form.endAt}
                min={form.startAt}
                onChange={(event) =>
                  updateFormField("endAt", event.target.value)
                }
              />

              <small>
                Leave empty for no expiry date.
              </small>
            </label>

            <label className="an-field">
              <span>Show To</span>
              <input value="All Students" disabled />
            </label>

            <label className="an-field">
              <span>Status</span>

              <select
                value={form.status}
                onChange={(event) =>
                  updateFormField("status", event.target.value)
                }
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </label>

          </div>

          <div className="an-form-actions">

            <button
              type="button"
              className="an-cancel-btn"
              onClick={handleBackToList}
              disabled={saving}
            >
              <FiX />
              Cancel
            </button>

            <button
              type="submit"
              className="an-save-btn"
              disabled={saving}
            >
              <FiSave />

              {saving
                ? "Saving..."
                : editingId
                  ? "Update Notice"
                  : "Save Notice"}
            </button>

          </div>
        </form>
      </section>
    )}

    {/* NOTICE TABLE */}
    {!showForm && (
      <section className="an-list-card">

        <div className="an-section-heading">
          <div>
            <h2>All Alert Notices</h2>
            <p>
              View and manage uploaded student announcements.
            </p>
          </div>

          <span className="an-count">
            {notices.length} notices
          </span>
        </div>

        {loading ? (
          <div className="an-empty">
            Loading notices...
          </div>
        ) : notices.length === 0 ? (
          <div className="an-empty">
            <FiBell />
            <strong>No notices created yet</strong>
            <span>
              Click Add Alert Notice to create your first notice.
            </span>
          </div>
        ) : (
          <div className="an-table-wrapper">

            <table className="an-table">

              <thead>
                <tr>
                  <th>Notice</th>
                  <th>Show From</th>
                  <th>Expiry Date</th>
                  <th>Show To</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {notices.map((notice) => (
                  <tr key={notice._id}>

                    <td>
                      <div className="an-table-notice">

                        <img
                          src={getAssetUrl(notice.image)}
                          alt={notice.title}
                          className="an-table-thumb"
                        />

                        <strong>
                          {notice.title}
                        </strong>

                      </div>
                    </td>

                    <td>
                      {formatDate(notice.startAt)}
                    </td>

                    <td>
                      {formatDate(notice.endAt)}
                    </td>

                    <td>
                      All Students
                    </td>

                    <td>
                      <span
                        className={`an-status ${
                          notice.status === "Active"
                            ? "is-active"
                            : "is-inactive"
                        }`}
                      >
                        {notice.status}
                      </span>
                    </td>

                    <td>
                      <div className="an-row-actions">

                        <button
                          type="button"
                          title="Edit notice"
                          onClick={() => handleEdit(notice)}
                        >
                          <FiEdit2 />
                        </button>

                        <button
                          type="button"
                          title={
                            notice.status === "Active"
                              ? "Deactivate notice"
                              : "Activate notice"
                          }
                          onClick={() => handleStatus(notice)}
                        >
                          <FiPower />
                        </button>

                        <button
                          type="button"
                          title="Delete notice"
                          className="an-delete-action"
                          onClick={() => handleDelete(notice)}
                        >
                          <FiTrash2 />
                        </button>

                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        )}
      </section>
    )}

  </div>
);

}
