

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import roleService from "../../services/roleService";
import "./RoleManagement.css";


const GROUP_LABELS = {
  dashboard: "Dashboard",
  users: "Users & Staff",
  roles: "Role Management",
  students: "Students",
  admissions: "Admissions",
  courses: "Courses",
  batches: "Batches",
  attendance: "Attendance",
  fees: "Fees",
  payments: "Payments",
  exams: "Exams",
  results: "Results",
  certificates: "Certificates",
  website: "Website Management",
  reports: "Reports",
  expenses: "Expenses",
  settings: "Settings",
};

const getPermissionGroup = (permission) => {
  const [first, second] = permission.split(".");
  return GROUP_LABELS[first] ? first : second || first;
};

const formatPermission = (permission) =>
  permission
    .split(".")
    .slice(1)
    .join(" ")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const emptyForm = {
  name: "",
  label: "",
  description: "",
  permissions: [],
};

export default function RoleManagement() {
    const navigate = useNavigate();
    const location = useLocation();
    const { roleId } = useParams();

    const isCreatePage = location.pathname === "/admin/roles/new";
    const showForm = isCreatePage || Boolean(roleId);


  const [roles, setRoles] = useState([]);
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingRole, setEditingRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
//   const [showForm, setShowForm] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [rolesResponse, permissionsResponse] = await Promise.all([
        roleService.getRoles(),
        roleService.getPermissions(),
      ]);

      setRoles(
        Array.isArray(rolesResponse.data) ? rolesResponse.data : []
      );
      setAvailablePermissions(
        Array.isArray(permissionsResponse.data)
          ? permissionsResponse.data
          : []
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load roles. Please check your login and backend."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  

useEffect(() => {
  if (isCreatePage) {
    setEditingRole(null);
    setForm({
      name: "",
      label: "",
      description: "",
      permissions: [],
    });
    setError("");
    return;
  }

  if (!roleId) return;

  const role = roles.find((item) => item.id === roleId);

  if (!role) {
    if (roles.length > 0) {
      setError("Role not found. Return to the role list and try again.");
    }
    return;
  }

  setEditingRole(role);
  setForm({
    name: role.name,
    label: role.label,
    description: role.description || "",
    permissions: [...(role.permissions || [])],
  });
  setError("");
}, [isCreatePage, roleId, roles]);



  const permissionGroups = useMemo(() => {
    return availablePermissions.reduce((groups, permission) => {
      const group = getPermissionGroup(permission);
      if (!groups[group]) groups[group] = [];
      groups[group].push(permission);
      return groups;
    }, {});
  }, [availablePermissions]);

  const filteredRoles = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return roles;

    return roles.filter((role) =>
      `${role.label} ${role.name} ${role.description || ""}`
        .toLowerCase()
        .includes(query)
    );
  }, [roles, search]);



const openCreateForm = () => {
  if (saving) return;

  setError("");
  setNotice("");
  setEditingRole(null);

  setForm({
    name: "",
    label: "",
    description: "",
    permissions: [],
  });

  navigate("/admin/roles/new");
};


const openEditForm = (role) => {
  if (saving) return;
  setError("");
  setNotice("");
  navigate(`/admin/roles/${role.id}/edit`);
};

const closeForm = () => {
  if (saving) return;
  setError("");
  navigate("/admin/roles");
};


  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const togglePermission = (permission) => {
    setForm((current) => {
      const selected = new Set(current.permissions);

      if (selected.has(permission)) {
        selected.delete(permission);
      } else {
        selected.add(permission);
      }

      return { ...current, permissions: [...selected] };
    });
  };

  const toggleGroup = (permissions) => {
    setForm((current) => {
      const selected = new Set(current.permissions);
      const allSelected = permissions.every((permission) =>
        selected.has(permission)
      );

      permissions.forEach((permission) => {
        if (allSelected) selected.delete(permission);
        else selected.add(permission);
      });

      return { ...current, permissions: [...selected] };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    const payload = {
      label: form.label.trim(),
      description: form.description.trim(),
      permissions: form.permissions,
    };

    if (!editingRole) {
      payload.name = form.name.trim().toLowerCase();
    }

    setSaving(true);

    try {
      if (editingRole) {
        await roleService.updateRole(editingRole.id, payload);
        setNotice("Role updated successfully.");
      } else {
        await roleService.createRole(payload);
        setNotice("Role created successfully.");
      }

      setEditingRole(null);
    setForm(emptyForm);
    await loadData();
    navigate("/admin/roles", {
    replace: true,
    state: {
        notice: editingRole
        ? "Role updated successfully."
        : "Role created successfully.",
    },
    });

    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to save the role. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (role) => {
    const confirmed = window.confirm(
      `Delete the "${role.label}" role? This cannot be undone.`
    );

    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      await roleService.deleteRole(role.id);
      setNotice("Role deleted successfully.");
      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to delete the role."
      );
    }
  };

  return (
  <main className="role-management">
    {!showForm && (
      <>
        <header className="role-management__header">
        <div>
          <p className="role-management__eyebrow">ADMINISTRATION</p>
          <h1>Role Management</h1>
          <p className="role-management__subtitle">
            Create staff roles and control which parts of EMS they can access.
          </p>
        </div>

        <button
          type="button"
          className="role-management__primary-button"
          onClick={openCreateForm}
        >
          + Create Role
        </button>
      </header>

      {error && (
        <div className="role-management__alert role-management__alert--error">
          {error}
        </div>
      )}

      {notice && (
        <div className="role-management__alert role-management__alert--success">
          {notice}
        </div>
      )}

      <section className="role-management__summary">
        <div className="role-management__summary-card">
          <span>Total staff roles</span>
          <strong>{roles.length}</strong>
        </div>
        <div className="role-management__summary-card">
          <span>Available permissions</span>
          <strong>{availablePermissions.length}</strong>
        </div>
      </section>

      <section className="role-management__panel">
        <div className="role-management__toolbar">
          <div>
            <h2>Staff roles</h2>
            <p>Manage permissions assigned to staff accounts.</p>
          </div>

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search roles..."
            aria-label="Search roles"
          />
        </div>

        {loading ? (
          <p className="role-management__state">Loading roles...</p>
        ) : filteredRoles.length === 0 ? (
          <div className="role-management__state">
            <strong>No roles found</strong>
            <p>Create a role or change your search.</p>
          </div>
        ) : (
          <div className="role-management__table-wrap">
            <table className="role-management__table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Description</th>
                  <th>Permissions</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoles.map((role) => (
                  <tr key={role.id}>
                    <td>
                      <strong>{role.label}</strong>
                      <small>{role.name}</small>
                    </td>
                    <td>{role.description || "—"}</td>
                    <td>
                      <span className="role-management__count">
                        {(role.permissions || []).length} permissions
                      </span>
                    </td>
                    <td>
                      <span
                        className={`role-management__status ${
                          role.isActive
                            ? "role-management__status--active"
                            : "role-management__status--inactive"
                        }`}
                      >
                        {role.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className="role-management__actions">
                        <button
                          type="button"
                          className="role-management__text-button"
                          onClick={() => openEditForm(role)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="role-management__text-button role-management__text-button--danger"
                          onClick={() => handleDelete(role)}
                        >
                          Delete
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

      {/* Insert them right here */}
      </>
    )}

      {showForm && (
        <div
          className="role-management__page-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForm();
          }}
        >
          <section
            className="role-management__form-page"
            aria-labelledby="role-form-title"
          >
            <header className="role-management__modal-header">
              <div>
                <h2 id="role-form-title">
                  {editingRole ? "Edit staff role" : "Create staff role"}
                </h2>
                <p>Choose a clear role name and assign only necessary permissions.</p>
              </div>
              <button
                type="button"
                className="role-management__secondary-button"
                onClick={closeForm}
                disabled={saving}
                >
                ← Back to Roles
              </button>
            </header>

            <form onSubmit={handleSubmit}>
              <div className="role-management__form-fields">
                <label>
                  Role name
                  <input
                    name="name"
                    value={form.name}
                    onChange={updateField}
                    placeholder="e.g. accountant"
                    required
                    minLength={2}
                    maxLength={80}
                    pattern="[a-zA-Z0-9]+([-_][a-zA-Z0-9]+)*"
                    disabled={Boolean(editingRole) || saving}
                  />
                  <small>
                    Used internally; lowercase letters, numbers, hyphens and underscores.
                  </small>
                </label>

                <label>
                  Display label
                  <input
                    name="label"
                    value={form.label}
                    onChange={updateField}
                    placeholder="e.g. Accountant"
                    required
                    minLength={1}
                    maxLength={80}
                    disabled={saving}
                  />
                </label>

                <label>
                  Description
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={updateField}
                    placeholder="Describe this role's responsibilities"
                    maxLength={300}
                    rows={2}
                    disabled={saving}
                  />
                </label>
              </div>

              <div className="role-management__permissions-heading">
                <div>
                  <h3>Permissions</h3>
                  <p>{form.permissions.length} selected</p>
                </div>
                <button
                  type="button"
                  className="role-management__text-button"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      permissions: [],
                    }))
                  }
                  disabled={saving}
                >
                  Clear selection
                </button>
              </div>

              <div className="role-management__permission-groups">
                {Object.entries(permissionGroups).map(([group, permissions]) => (
                  <fieldset
                    className="role-management__permission-group"
                    key={group}
                  >
                    <legend>
                      <label className="role-management__group-label">
                        <input
                          type="checkbox"
                          checked={permissions.every((permission) =>
                            form.permissions.includes(permission)
                          )}
                          onChange={() => toggleGroup(permissions)}
                          disabled={saving}
                        />
                        <span>{GROUP_LABELS[group] || group}</span>
                        <small>{permissions.length}</small>
                      </label>
                    </legend>

                    <div className="role-management__permission-options">
                      {permissions.map((permission) => (
                        <label
                          className="role-management__permission-option"
                          key={permission}
                        >
                          <input
                            type="checkbox"
                            checked={form.permissions.includes(permission)}
                            onChange={() => togglePermission(permission)}
                            disabled={saving}
                          />
                          <span>{formatPermission(permission)}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
              </div>

              <footer className="role-management__form-footer">
                <button
                  type="button"
                  className="role-management__secondary-button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="role-management__primary-button"
                  disabled={saving || availablePermissions.length === 0}
                >
                  {saving
                    ? "Saving..."
                    : editingRole
                      ? "Save Changes"
                      : "Create Role"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </main>
    
    
  );
}
