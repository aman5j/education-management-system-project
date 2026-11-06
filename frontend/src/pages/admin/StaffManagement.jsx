
import { useCallback, useEffect, useRef, useState } from "react";

import staffService from "../../services/staffService";
import roleService from "../../services/roleService";

import notification, {
  getApiErrorMessage,
} from "../../utils/notification";

import "./StaffManagement.css";

import { FiPlus, FiSearch } from "react-icons/fi";
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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [roles, setRoles] = useState([]);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);

  const [loading, setLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState({});

  const [busyAction, setBusyAction] = useState("");

  // Prevent outdated requests from overwriting newer results.
  const staffRequestId = useRef(0);
  const rolesRequestId = useRef(0);

  const activeRoles = roles.filter(
    (role) => role.isActive !== false
  );

  // ---------------------------------------
  // Load staff
  // ---------------------------------------

  const loadStaff = useCallback(async () => {
    const requestId = ++staffRequestId.current;

    setLoading(true);

    try {
      const response = await staffService.getStaff({
        search: search.trim(),
        status,
        page,
        limit: 10,
      });

      if (requestId !== staffRequestId.current) return;

      const data = response?.data || {};

      setStaff(Array.isArray(data.staff) ? data.staff : []);

      setPagination(
        data.pagination || {
          ...DEFAULT_PAGINATION,
          page,
        }
      );
    } catch (error) {
      if (requestId !== staffRequestId.current) return;

      notification.error(
        getApiErrorMessage(error),
        { id: "staff-list-error" }
      );
    } finally {
      if (requestId === staffRequestId.current) {
        setLoading(false);
      }
    }
  }, [search, status, page]);

  // ---------------------------------------
  // Load staff roles
  // ---------------------------------------

  const loadRoles = useCallback(async () => {
    const requestId = ++rolesRequestId.current;

    setRolesLoading(true);

    try {
      const response = await roleService.getRoles({
        silent: true,
      });

      if (requestId !== rolesRequestId.current) return;

      const data = response?.data;

      const roleList = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
          ? data
          : [];

      setRoles(roleList);
    } catch (error) {
      if (requestId !== rolesRequestId.current) return;

      notification.error(
        getApiErrorMessage(error),
        { id: "staff-roles-error" }
      );
    } finally {
      if (requestId === rolesRequestId.current) {
        setRolesLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadStaff();

    return () => {
      staffRequestId.current += 1;
    };
  }, [loadStaff]);

  useEffect(() => {
    loadRoles();

    return () => {
      rolesRequestId.current += 1;
    };
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
    setShowPassword(false);
    setShowForm(true);
  };

  const closeCreateForm = () => {
    if (saving) return;

    setShowForm(false);
    setForm(emptyForm);
    setFieldErrors({});
    setShowPassword(false);
  };

  const validateForm = () => {
    const errors = {};

    const name = form.name.trim();
    const email = form.email.trim();
    const password = form.password;

    if (!name) {
      errors.name = "Please enter the staff name.";
    } else if (name.length < 2 || name.length > 100) {
      errors.name = "Name must contain 2–100 characters.";
    }

    if (!email) {
      errors.email = "Please enter the email address.";
    } else if (!EMAIL_REGEX.test(email)) {
      errors.email = "Please enter a valid email address.";
    }

    if (!form.assignedRoleId) {
      errors.assignedRoleId = "Please select a staff role.";
    } else if (
      !activeRoles.some(
        (role) => String(role.id) === String(form.assignedRoleId)
      )
    ) {
      errors.assignedRoleId = "Please select an active staff role.";
    }

    if (!password) {
      errors.password = "Please enter the initial password.";
    } else if (password.length < 12 || password.length > 128) {
      errors.password = "Password must contain 12–128 characters.";
    }

    setFieldErrors(errors);

    return Object.keys(errors).length === 0;
  };

  // ---------------------------------------
  // Create staff account
  // ---------------------------------------

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving || !validateForm()) return;

    setSaving(true);

    try {
      await staffService.createStaff({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
        assignedRoleId: form.assignedRoleId,
      });

      notification.success("Staff account created successfully.");

      setShowForm(false);
      setForm(emptyForm);
      setFieldErrors({});
      setShowPassword(false);

      setPage(1);
      setSearch("");
      setStatus("");
    } catch (error) {
      notification.error(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------
  // Suspend / Reactivate
  // ---------------------------------------

  const handleStatusChange = async (member) => {
    if (busyAction) return;

    const isActive = member.status === "active";
    const nextStatus = isActive ? "suspended" : "active";

    const confirmed = await notification.confirmStatusChange({
      itemName: member.name,
      action: isActive ? "suspend" : "reactivate",
    });

    if (!confirmed) return;

    setBusyAction(`${member.id}-status`);

    try {
      await staffService.updateStatus(member.id, nextStatus);

      notification.success(
        `${member.name}'s account has been ${
          nextStatus === "active" ? "reactivated" : "suspended"
        } successfully.`
      );

      await loadStaff();
    } catch (error) {
      notification.error(getApiErrorMessage(error));
    } finally {
      setBusyAction("");
    }
  };

  // ---------------------------------------
  // Reset password
  // ---------------------------------------

  const handlePasswordReset = async (member) => {
    if (busyAction) return;

    // The password prompt already contains its own
    // confirmation button. Do not ask for confirmation twice.
    const newPassword = await notification.promptPassword({
      title: "Reset staff password",
      text: `Enter a new temporary password for ${member.name}.`,
      confirmText: "Reset password",
      minLength: 12,
      maxLength: 128,
    });

    if (newPassword === null) return;

    setBusyAction(`${member.id}-password`);

    try {
      const response = await staffService.resetPassword(
        member.id,
        newPassword
      );

      notification.success(
        response?.message ||
        `Password reset successfully for ${member.name}.`
      );
    } catch (error) {
      notification.error(getApiErrorMessage(error));
    } finally {
      setBusyAction("");
    }
  };

  // ---------------------------------------
  // Reset filters
  // ---------------------------------------

  const resetFilters = () => {
    setSearch("");
    setStatus("");
    setPage(1);
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
                  <div className="input-felid">
                    <label>
                      Full name <span className="required">*</span>
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

                  <div className="input-felid">
                    <label>
                      Email address <span className="required">*</span>
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

                  <div className="input-felid">
                    <label>
                      Staff role <span className="required">*</span>
                    </label>

                    <select
                      name="assignedRoleId"
                      value={form.assignedRoleId}
                      onChange={updateField}
                      required
                      disabled={rolesLoading}
                      aria-invalid={!!fieldErrors.assignedRoleId}
                    >
                      <option value="">
                        {rolesLoading
                          ? "Loading roles..."
                          : "Select a staff role"}
                      </option>

                      {activeRoles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.label || role.name}
                        </option>
                      ))}
                    </select>

                    {fieldErrors.assignedRoleId && (
                      <small className="field-error">
                        {fieldErrors.assignedRoleId}
                      </small>
                    )}

                    {!rolesLoading && activeRoles.length === 0 && (
                      <small>
                        No active staff roles found. Create a role under
                        Settings → Roles first.
                      </small>
                    )}
                  </div>

                  <div className="input-felid">
                    <label>
                      Initial password <span className="required">*</span>
                    </label>

                    <div className="staff-management__password-field">
                      <input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={updateField}
                        minLength={12}
                        maxLength={128}
                        required
                        autoComplete="new-password"
                        placeholder="At least 12 characters"
                        aria-invalid={!!fieldErrors.password}
                      />

                      <button
                        type="button"
                        className="staff-management__password-toggle"
                        onClick={() =>
                          setShowPassword((visible) => !visible)
                        }
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>

                    {fieldErrors.password && (
                      <small className="field-error">
                        {fieldErrors.password}
                      </small>
                    )}

                    <small>
                      Use at least 12 characters. Share the initial
                      password securely with the staff member.
                    </small>
                  </div>
                </div>

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
                      rolesLoading ||
                      activeRoles.length === 0
                    }
                  >
                    {saving ? "Creating..." : "Create Staff"}
                  </button>
                </footer>
              </div>
            </form>
          </div>
        </section>
      ) : (
        <section className="staff-management__panel">
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
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <button
                type="button"
                className="themebtn themebtnline"
                onClick={resetFilters}
                disabled={!search && !status && page === 1}
              >
                Reset
              </button>
            </div>
          </div>

          {loading ? (
            <p className="staff-management__state">
              Loading staff accounts...
            </p>
          ) : staff.length === 0 ? (
            <div className="staff-management__state">
              <strong>No staff accounts found</strong>
              <p>Create a staff account or adjust your search.</p>
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
                    {staff.map((member) => {
                      const statusBusy =
                        busyAction === `${member.id}-status`;

                      const passwordBusy =
                        busyAction === `${member.id}-password`;

                      return (
                        <tr key={member.id}>
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
                                <strong>{member.name}</strong>

                                <label className="roleassign">
                                  <RiTeamLine />

                                  {member.assignedRole?.label ||
                                    member.assignedRole?.name ||
                                    "No role assigned"}
                                </label>
                              </div>
                            </div>
                          </td>

                          <td>
                            <div className="contact-details">
                              <div className="contact-li">
                                <IoIosCall />
                                <span>{member.phone || "—"}</span>
                              </div>

                              <div className="contact-li">
                                <MdOutgoingMail />
                                <span>{member.email}</span>
                              </div>
                            </div>
                          </td>

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

                          <td>
                            <div className="contact-details">
                              <div className="contact-li">
                                <MdDateRange />
                                <span>
                                  {member.createdAt
                                    ? new Date(
                                        member.createdAt
                                      ).toLocaleDateString("en-IN")
                                    : "—"}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <div className="staff-management__row-actions">
                              <button
                                type="button"
                                className="themebtn smallbtn"
                                disabled={Boolean(busyAction)}
                                onClick={() => handleStatusChange(member)}
                              >
                                {statusBusy
                                  ? "Please wait..."
                                  : member.status === "active"
                                    ? "Suspend"
                                    : "Activate"}
                              </button>

                              <button
                                type="button"
                                className="themebtn smallbtn"
                                disabled={Boolean(busyAction)}
                                onClick={() => handlePasswordReset(member)}
                              >
                                {passwordBusy
                                  ? "Resetting..."
                                  : "Reset Password"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <footer className="staff-management__pagination">
            <span>
              Page {pagination.page || page} of{" "}
              {Math.max(pagination.totalPages || 0, 1)}
              {" · "}
              {pagination.total || 0} staff accounts
            </span>

            <div>
              <button
                type="button"
                className="staff-management__secondary"
                onClick={() =>
                  setPage((current) => Math.max(1, current - 1))
                }
                disabled={loading || page <= 1}
              >
                Previous
              </button>

              <button
                type="button"
                className="staff-management__secondary"
                onClick={() => setPage((current) => current + 1)}
                disabled={
                  loading ||
                  page >= (pagination.totalPages || 1)
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
