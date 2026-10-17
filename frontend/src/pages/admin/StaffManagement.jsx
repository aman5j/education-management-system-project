
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import staffService from "../../services/staffService";
import roleService from "../../services/roleService";
import "./StaffManagement.css";

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  assignedRoleId: "",
};

export default function StaffManagement() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [staff, setStaff] = useState([]);
  const [roles, setRoles] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 0,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadStaff = useCallback(async () => {
    setLoading(true);
    setError("");

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
          page,
          total: 0,
          totalPages: 0,
        }
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load staff accounts."
      );
    } finally {
      setLoading(false);
    }
  }, [search, status, page]);

//   const loadRoles = useCallback(async () => {
//     try {
//       const response = await roleService.getRoles();
//       const data = response.data;
//       setRoles(Array.isArray(data) ? data : data?.roles || []);
//     } catch (err) {
//       setError(
//         err.response?.data?.message ||
//           "Unable to load staff roles."
//       );
//     }
//   }, []);


const loadRoles = useCallback(async () => {
  try {
    const response = await roleService.getRoles();
    const data = response.data;

    setRoles(
      Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
          ? data
          : []
    );
  } catch (err) {
    setError(
      err.response?.data?.message ||
        "Unable to load staff roles."
    );
  }
}, []);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const openCreateForm = () => {
    setError("");
    setNotice("");
    setForm(emptyForm);
    setShowForm(true);
    setShowPassword(false);
  };

  const closeCreateForm = () => {
    if (saving) return;
    setShowForm(false);
    setForm(emptyForm);
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!form.assignedRoleId) {
      setError("Please select a staff role.");
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

      setShowForm(false);
      setForm(emptyForm);
      setPage(1);
      setNotice("Staff account created successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to create the staff account."
      );
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (notice && !showForm) {
      loadStaff();
    }
  }, [notice, showForm, loadStaff]);

  return (
    <main className="staff-management">
      <header className="staff-management__header">
        <div>
          <h1>Staff Management</h1>
          <p>
            Create staff accounts and assign their access roles.
          </p>
        </div>

        {!showForm && (
          <button
            type="button"
            className="staff-management__primary"
            onClick={openCreateForm}
          >
            + Create Staff
          </button>
        )}
      </header>

      {error && (
        <div className="staff-management__alert staff-management__alert--error">
          {error}
        </div>
      )}

      {notice && !showForm && (
        <div className="staff-management__alert staff-management__alert--success">
          {notice}
        </div>
      )}

      {showForm ? (
        <section className="staff-management__panel">
          <div className="staff-management__panel-header">
            <div>
              <h2>Create Staff Account</h2>
              <p>Enter account details and assign a custom staff role.</p>
            </div>

            <button
              type="button"
              className="staff-management__secondary"
              onClick={closeCreateForm}
              disabled={saving}
            >
              Back to Staff
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="staff-management__form-grid">
              <label>
                Full name *
                <input
                  name="name"
                  value={form.name}
                  onChange={updateField}
                  minLength={2}
                  maxLength={100}
                  required
                  autoComplete="name"
                  placeholder="Enter staff name"
                />
              </label>

              <label>
                Email address *
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={updateField}
                  required
                  autoComplete="email"
                  placeholder="staff@example.com"
                />
              </label>

              <label>
                Phone number
                <input
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={updateField}
                  maxLength={30}
                  autoComplete="tel"
                  placeholder="Enter phone number"
                />
              </label>

              {/* <label>
                Initial password *
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={updateField}
                  minLength={12}
                  required
                  autoComplete="new-password"
                  placeholder="At least 12 characters"
                />
                <small>
                  Share this securely with the staff member.
                  Never reuse an existing password.
                </small>
              </label> */}

              
            <label>
            Initial password *
            <div className="staff-management__password-field">
                <input
                name="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={updateField}
                minLength={12}
                required
                autoComplete="new-password"
                placeholder="At least 12 characters"
                />

                <button
                type="button"
                className="staff-management__password-toggle"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                >
                {showPassword ? "Hide" : "Show"}
                </button>
            </div>

            <small>
                Use at least 12 characters. Share the initial password securely
                with the staff member.
            </small>
            </label>


              <label className="staff-management__full-width">
                Staff role *
                <select
                  name="assignedRoleId"
                  value={form.assignedRoleId}
                  onChange={updateField}
                  required
                >
                  <option value="">Select a staff role</option>
                  {roles
                    .filter((role) => role.isActive !== false)
                    .map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.label || role.name}
                      </option>
                    ))}
                </select>

                {roles.length === 0 && (
                  <small>
                    No staff roles found. Create a role under
                    Settings → Roles first.
                  </small>
                )}
              </label>
            </div>

            <footer className="staff-management__form-footer">
              <button
                type="button"
                className="staff-management__secondary"
                onClick={closeCreateForm}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="staff-management__primary"
                disabled={saving || roles.length === 0}
              >
                {saving ? "Creating..." : "Create Staff"}
              </button>
            </footer>
          </form>
        </section>
      ) : (
        <section className="staff-management__panel">
          <div className="staff-management__toolbar">
            <div>
              <h2>Staff Accounts</h2>
              <p>{pagination.total} total staff accounts</p>
            </div>

            <div className="staff-management__filters">
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
            <div className="staff-management__table-wrap">
              <table className="staff-management__table">
                <thead>
                  <tr>
                    <th>Staff member</th>
                    <th>Phone</th>
                    <th>Assigned role</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>

                <tbody>
                  {staff.map((member) => (
                    <tr key={member.id}>
                      <td>
                        <strong>{member.name}</strong>
                        <small>{member.email}</small>
                      </td>
                      <td>{member.phone || "—"}</td>
                      <td>
                        {member.assignedRole?.label ||
                          member.assignedRole?.name ||
                          "No role assigned"}
                      </td>
                      <td>
                        <span
                          className={`staff-management__status ${
                            member.status === "active"
                              ? "staff-management__status--active"
                              : "staff-management__status--inactive"
                          }`}
                        >
                          {member.status}
                        </span>
                      </td>
                      <td>
                        {member.createdAt
                          ? new Date(member.createdAt).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <footer className="staff-management__pagination">
            <span>
              Page {pagination.page || page} of{" "}
              {Math.max(pagination.totalPages || 0, 1)}
            </span>

            <div>
              <button
                type="button"
                className="staff-management__secondary"
                onClick={() => setPage((current) => current - 1)}
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
