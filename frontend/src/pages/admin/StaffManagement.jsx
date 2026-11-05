
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import staffService from "../../services/staffService";
import roleService from "../../services/roleService";

import notification, {
  getApiErrorMessage,
} from "../../utils/notification";

import "./StaffManagement.css";

import {
  FiPlus,
  FiSearch,
} from "react-icons/fi";

import { IoIosCall } from "react-icons/io";
import { MdOutgoingMail, MdDateRange } from "react-icons/md";
import { RiTeamLine } from "react-icons/ri";

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  assignedRoleId: "",
};

const DEFAULT_PAGINATION = {
  page: 1,
  total: 0,
  totalPages: 0,
};

export default function StaffManagement() {
  const [showPassword, setShowPassword] =
    useState(false);

  const [staff, setStaff] = useState([]);
  const [roles, setRoles] = useState([]);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState(
    DEFAULT_PAGINATION
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const [fieldErrors, setFieldErrors] = useState({});

  const activeRoles = roles.filter(
    (role) => role.isActive !== false
  );

  // ---------------------------------------
  // Load staff accounts
  // ---------------------------------------

  const loadStaff = useCallback(async () => {
    setLoading(true);

    try {
      const response = await staffService.getStaff({
        search: search.trim(),
        status,
        page,
        limit: 10,
      });

      const data = response.data || {};

      setStaff(data.staff || []);

      setPagination(
        data.pagination || {
          ...DEFAULT_PAGINATION,
          page,
        }
      );
    } catch (error) {
      notification.error(
        getApiErrorMessage(error)
      );
    } finally {
      setLoading(false);
    }
  }, [search, status, page]);

  // ---------------------------------------
  // Load roles
  // ---------------------------------------

  const loadRoles = useCallback(async () => {
    try {
      // const response = await roleService.getRoles();
      const response = await roleService.getRoles({
        silent: true,
      });

      const data = response.data;

      const roleList = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
          ? data
          : [];

      setRoles(roleList);
    } catch (error) {
      notification.error(
        getApiErrorMessage(error)
      );
    }
  }, []);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  // ---------------------------------------
  // Form handling
  // ---------------------------------------

  const updateField = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setFieldErrors((current) => ({
      ...current,
      [name]: "",
    }));
  };

  const openCreateForm = () => {
    setForm(emptyForm);
    setFieldErrors({});
    setShowForm(true);
    setShowPassword(false);
  };

  const closeCreateForm = () => {
    if (saving) return;

    setShowForm(false);
    setForm(emptyForm);
    setFieldErrors({});
  };

  const validateForm = () => {
    const errors = {};

    const name = form.name.trim();
    const email = form.email.trim();
    const password = form.password;

    if (!name) {
      errors.name = "Please enter the staff name.";
    } else if (name.length < 2) {
      errors.name =
        "Name must contain at least 2 characters.";
    } else if (name.length > 100) {
      errors.name =
        "Name cannot exceed 100 characters.";
    }

    if (!email) {
      errors.email =
        "Please enter the email address.";
    }

    if (!form.assignedRoleId) {
      errors.assignedRoleId =
        "Please select a staff role.";
    }

    if (!password) {
      errors.password =
        "Please enter the initial password.";
    } else if (password.length < 12) {
      errors.password =
        "Password must contain at least 12 characters.";
    } else if (password.length > 128) {
      errors.password =
        "Password cannot exceed 128 characters.";
    }

    setFieldErrors(errors);

    return Object.keys(errors).length === 0;
  };

  // ---------------------------------------
  // Create staff account
  // ---------------------------------------

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving) return;

    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      await staffService.createStaff({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
        assignedRoleId: form.assignedRoleId,
      });

      notification.success(
        "Staff account created successfully."
      );

      setShowForm(false);
      setForm(emptyForm);
      setFieldErrors({});
      setShowPassword(false);

      setPage(1);
      setSearch("");
      setStatus("");
    } catch (error) {
      notification.error(
        getApiErrorMessage(error)
      );
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------
  // Suspend / Reactivate staff
  // ---------------------------------------

  const handleStatusChange = async (member) => {
    const isActive = member.status === "active";

    const nextStatus = isActive
      ? "suspended"
      : "active";

    const confirmed =
      await notification.confirmStatusChange({
        itemName: member.name,
        action: isActive
          ? "suspend"
          : "reactivate",
      });

    if (!confirmed) return;

    const loadingToast = notification.loading(
      isActive
        ? "Suspending staff account..."
        : "Reactivating staff account..."
    );

    try {
      await staffService.updateStatus(
        member.id,
        nextStatus
      );

      notification.dismiss(loadingToast);

      notification.success(
        `${member.name}'s account has been ${
          nextStatus === "active"
            ? "reactivated"
            : "suspended"
        } successfully.`
      );

      await loadStaff();
    } catch (error) {
      notification.dismiss(loadingToast);

      notification.error(
        getApiErrorMessage(error)
      );
    }
  };

  // ---------------------------------------
  // Reset staff password
  // ---------------------------------------

  const handlePasswordReset = async (member) => {
    const newPassword =
      await notification.promptPassword({
        title: "Reset staff password",
        text: `Enter a new temporary password for ${member.name}.`,
        confirmText: "Reset password",
        minLength: 12,
        maxLength: 128,
      });

    if (newPassword === null) return;

    const confirmed = await notification.confirm({
      title: "Confirm password reset?",
      text: `The current password for ${member.name} will be replaced.`,
      icon: "warning",
      confirmText: "Yes, reset password",
      confirmButtonColor: "#dc2626",
    });

    if (!confirmed) return;

    const loadingToast = notification.loading(
      "Resetting staff password..."
    );

    try {
      const response =
        await staffService.resetPassword(
          member.id,
          newPassword
        );

      notification.dismiss(loadingToast);

      notification.success(
        response.message ||
          `Password reset successfully for ${member.name}.`
      );
    } catch (error) {
      notification.dismiss(loadingToast);

      notification.error(
        getApiErrorMessage(error)
      );
    }
  };

  // ---------------------------------------
  // Render
  // ---------------------------------------

  return (
    <main className="staff-management">

      <div className="page-header">
        <div>
          <h1>Staff Management</h1>
        </div>

        {!showForm && (
          <button
            type="button"
            className="themebtn"
            onClick={openCreateForm}
          >
            <FiPlus /> Create Staff
          </button>
        )}
      </div>

      {showForm ? (
        <section className="staff-management__panel">

          <div className="common-card">
            <form onSubmit={handleSubmit}>
              <div className="cardbody">

                <div className="StaffManagement-form-grid">

                  {/* Full name */}

                  <div className="input-felid">
                    <label>
                      Full name{" "}
                      <span className="required">*</span>
                    </label>

                    <input
                      name="name"
                      value={form.name}
                      onChange={updateField}
                      minLength={2}
                      maxLength={100}
                      required
                      autoComplete="name"
                      placeholder="Enter staff name"
                      aria-invalid={!!fieldErrors.name}
                    />

                    {fieldErrors.name && (
                      <small className="field-error">
                        {fieldErrors.name}
                      </small>
                    )}
                  </div>

                  {/* Email */}

                  <div className="input-felid">
                    <label>
                      Email address{" "}
                      <span className="required">*</span>
                    </label>

                    <input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={updateField}
                      required
                      autoComplete="email"
                      placeholder="staff@example.com"
                      aria-invalid={!!fieldErrors.email}
                    />

                    {fieldErrors.email && (
                      <small className="field-error">
                        {fieldErrors.email}
                      </small>
                    )}
                  </div>

                  {/* Phone */}

                  <div className="input-felid">
                    <label>Phone number</label>

                    <input
                      name="phone"
                      type="tel"
                      value={form.phone}
                      onChange={updateField}
                      maxLength={30}
                      autoComplete="tel"
                      placeholder="Enter phone number"
                    />
                  </div>

                  {/* Role */}

                  <div className="input-felid">
                    <label>
                      Staff role{" "}
                      <span className="required">*</span>
                    </label>

                    <select
                      name="assignedRoleId"
                      value={form.assignedRoleId}
                      onChange={updateField}
                      required
                      aria-invalid={
                        !!fieldErrors.assignedRoleId
                      }
                    >
                      <option value="">
                        Select a staff role
                      </option>

                      {activeRoles.map((role) => (
                        <option
                          key={role.id}
                          value={role.id}
                        >
                          {role.label || role.name}
                        </option>
                      ))}
                    </select>

                    {fieldErrors.assignedRoleId && (
                      <small className="field-error">
                        {fieldErrors.assignedRoleId}
                      </small>
                    )}

                    {activeRoles.length === 0 && (
                      <small>
                        No active staff roles found.
                        Create a role under Settings
                        → Roles first.
                      </small>
                    )}
                  </div>

                  {/* Initial password */}

                  <div className="input-felid">
                    <label>
                      Initial password{" "}
                      <span className="required">*</span>
                    </label>

                    <div className="staff-management__password-field">
                      <input
                        name="password"
                        type={
                          showPassword
                            ? "text"
                            : "password"
                        }
                        value={form.password}
                        onChange={updateField}
                        minLength={12}
                        maxLength={128}
                        required
                        autoComplete="new-password"
                        placeholder="At least 12 characters"
                        aria-invalid={
                          !!fieldErrors.password
                        }
                      />

                      <button
                        type="button"
                        className="staff-management__password-toggle"
                        onClick={() =>
                          setShowPassword(
                            (visible) => !visible
                          )
                        }
                        aria-label={
                          showPassword
                            ? "Hide password"
                            : "Show password"
                        }
                      >
                        {showPassword
                          ? "Hide"
                          : "Show"}
                      </button>
                    </div>

                    {fieldErrors.password && (
                      <small className="field-error">
                        {fieldErrors.password}
                      </small>
                    )}

                    <small>
                      Use at least 12 characters.
                      Share the initial password
                      securely with the staff member.
                    </small>
                  </div>

                </div>

                {/* Form actions */}

                <footer className="subject-form-actions">

                  <button
                    type="button"
                    className="themebtn themebtnline"
                    onClick={closeCreateForm}
                    disabled={saving}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="themebtn"
                    disabled={
                      saving ||
                      activeRoles.length === 0
                    }
                  >
                    {saving
                      ? "Creating..."
                      : "Create Staff"}
                  </button>

                </footer>

              </div>
            </form>
          </div>
        </section>
      ) : (
        <section className="staff-management__panel">

          {/* Filters */}

          <div className="staff-management__toolbar">

            <div className="common-card-filters">

              <div className="input-search">
                <FiSearch />

                <input
                  type="search"
                  value={search}
                  onChange={(event) => {
                    setPage(1);
                    setSearch(event.target.value);
                  }}
                  placeholder="Search staff..."
                  aria-label="Search staff"
                />
              </div>

              <div className="input-search">
                <select
                  value={status}
                  onChange={(event) => {
                    setPage(1);
                    setStatus(event.target.value);
                  }}
                  aria-label="Filter by status"
                >
                  <option value="">All statuses</option>
                  <option value="active">Active</option>
                  <option value="suspended">
                    Suspended
                  </option>
                </select>
              </div>

            </div>
          </div>

          {/* Staff table */}

          {loading ? (
            <p className="staff-management__state">
              Loading staff accounts...
            </p>
          ) : staff.length === 0 ? (
            <div className="staff-management__state">
              <strong>No staff accounts found</strong>
              <p>
                Create a staff account or adjust
                your search.
              </p>
            </div>
          ) : (
            <div className="common-card">

              <div className="common-table-wrapper">

                <table className="common-table">
                  <thead>
                    <tr>
                      <th>Staff / Role</th>
                      <th>Phone</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {staff.map((member) => (
                      <tr key={member.id}>

                        {/* Staff details */}

                        <td>
                          <div className="student-name-cell">

                            <div className="student-avatar-wrapper">
                              <div className="student-avatar staff-avatar-fallback">
                                {member.name
                                  ?.charAt(0)
                                  ?.toUpperCase() || "S"}
                              </div>
                            </div>

                            <div>
                              <strong>
                                {member.name}
                              </strong>

                              <label className="roleassign">
                                <RiTeamLine />

                                {member.assignedRole?.label ||
                                  member.assignedRole?.name ||
                                  "No role assigned"}
                              </label>
                            </div>

                          </div>
                        </td>

                        {/* Contact details */}

                        <td>
                          <div className="contact-details">

                            <div className="contact-li">
                              <IoIosCall />
                              <span>
                                {member.phone || "—"}
                              </span>
                            </div>

                            <div className="contact-li">
                              <MdOutgoingMail />
                              <span>
                                {member.email}
                              </span>
                            </div>

                          </div>
                        </td>

                        {/* Status */}

                        <td>
                          <span
                            className={`staff-management__status ${
                              member.status === "active"
                                ? "tag-success"
                                : "tag-danger"
                            }`}
                          >
                            {member.status}
                          </span>
                        </td>

                        {/* Created date */}

                        <td>
                          <div className="contact-details">

                            <div className="contact-li">
                              <MdDateRange />

                              <span>
                                {member.createdAt
                                  ? new Date(
                                      member.createdAt
                                    ).toLocaleDateString()
                                  : "—"}
                              </span>
                            </div>

                          </div>
                        </td>

                        {/* Actions */}

                        <td>
                          <div className="staff-management__row-actions">

                            <button
                              type="button"
                              className="themebtn smallbtn"
                              onClick={() =>
                                handleStatusChange(member)
                              }
                            >
                              {member.status === "active"
                                ? "Suspend"
                                : "Activate"}
                            </button>

                            <button
                              type="button"
                              className="themebtn smallbtn"
                              onClick={() =>
                                handlePasswordReset(member)
                              }
                            >
                              Reset Password
                            </button>

                          </div>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>

              </div>
            </div>
          )}

          {/* Pagination */}

          <footer className="staff-management__pagination">

            <span>
              Page {pagination.page || page} of{" "}
              {Math.max(
                pagination.totalPages || 0,
                1
              )}
            </span>

            <div>
              <button
                type="button"
                className="staff-management__secondary"
                onClick={() =>
                  setPage((current) =>
                    Math.max(1, current - 1)
                  )
                }
                disabled={loading || page <= 1}
              >
                Previous
              </button>

              <button
                type="button"
                className="staff-management__secondary"
                onClick={() =>
                  setPage((current) => current + 1)
                }
                disabled={
                  loading ||
                  page >=
                    (pagination.totalPages || 1)
                }
              >
                Next
              </button>
            </div>

          </footer>

        </section>
      )}

    </main>
  );
}
