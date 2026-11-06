
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import roleService from "../../services/roleService";
import Pagination from "../../components/common/Pagination";
import notification from "../../utils/notification";
import "./RoleManagement.css";

import { RiTeamLine } from "react-icons/ri";
import { MdOutlineFeaturedPlayList } from "react-icons/md";
import {
  FiEdit2,
  FiPlus,
  FiTrash2,
  FiCheckSquare,
  FiCheckCircle,
  FiSearch,
} from "react-icons/fi";

const GROUP_LABELS = {
  dashboard: "Dashboard",
  users: "Users & Staff",
  roles: "Role Management",
  students: "Students",
  admissions: "Admissions",
  courses: "Courses",
  subjects: "Subjects",
  question_bank: "Question Bank",
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

const formatRoleLabel = (value = "") =>
  value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const emptyForm = {
  name: "",
  description: "",
  permissions: [],
};

const PAGE_SIZES = [10, 25, 50];

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
  const [deletingId, setDeletingId] = useState(null);

  const [fieldErrors, setFieldErrors] = useState({});
  const [search, setSearch] = useState("");
  const [permissionSearch, setPermissionSearch] = useState("");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const loadData = useCallback(async (options = {}) => {
    const { silentFailure = false } = options;

    setLoading(true);

    try {
      const [rolesResponse, permissionsResponse] = await Promise.all([
        roleService.getRoles({ silent: true }),
        roleService.getPermissions(),
      ]);

      setRoles(
        Array.isArray(rolesResponse.data) ? rolesResponse.data : []
      );

      setAvailablePermissions(
        Array.isArray(permissionsResponse.data)
          ? permissionsResponse.data.filter(
              (permission) =>
                typeof permission === "string" && permission.trim()
            )
          : []
      );

      return true;
    } catch (error) {
      if (!silentFailure) {
        notification.error(error.message || "Unable to load roles.");
      }

      return false;
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
      setForm(emptyForm);
      setFieldErrors({});
      setPermissionSearch("");
      return;
    }

    if (!roleId) {
      setEditingRole(null);
      return;
    }

    const role = roles.find(
      (item) => String(item.id) === String(roleId)
    );

    if (!role) {
      if (!loading && roles.length > 0) {
        notification.error("Role not found.");
      }
      return;
    }

    setEditingRole(role);
    setForm({
      name: role.name || "",
      description: role.description || "",
      permissions: Array.isArray(role.permissions)
        ? [...role.permissions]
        : [],
    });
    setFieldErrors({});
  }, [isCreatePage, roleId, roles, loading]);

  const permissionGroups = useMemo(() => {
    const query = permissionSearch.trim().toLowerCase();
    const uniquePermissions = [...new Set(availablePermissions)];

    return uniquePermissions
      .filter((permission) => {
        if (!query) return true;

        const group = getPermissionGroup(permission);
        const groupLabel = GROUP_LABELS[group] || group;

        return (
          permission.toLowerCase().includes(query) ||
          groupLabel.toLowerCase().includes(query) ||
          formatPermission(permission).toLowerCase().includes(query)
        );
      })
      .reduce((groups, permission) => {
        const group = getPermissionGroup(permission);

        if (!groups[group]) groups[group] = [];
        groups[group].push(permission);

        return groups;
      }, {});
  }, [availablePermissions, permissionSearch]);

  const permissionGroupList = useMemo(
    () =>
      Object.entries(permissionGroups).map(([key, permissions]) => ({
        key,
        label: GROUP_LABELS[key] || key,
        permissions,
      })),
    [permissionGroups]
  );

  const filteredRoles = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return roles;

    return roles.filter((role) =>
      `${role.label || ""} ${role.name || ""} ${role.description || ""}`
        .toLowerCase()
        .includes(query)
    );
  }, [roles, search]);

  const totalPages = Math.ceil(filteredRoles.length / limit);
  const safePage = Math.min(page, Math.max(totalPages, 1));

  const paginatedRoles = useMemo(() => {
    const startIndex = (safePage - 1) * limit;
    return filteredRoles.slice(startIndex, startIndex + limit);
  }, [filteredRoles, safePage, limit]);

  useEffect(() => {
    if (page !== safePage) {
      setPage(safePage);
    }
  }, [page, safePage]);

  const openCreateForm = () => {
    if (saving) return;

    setEditingRole(null);
    setForm(emptyForm);
    setFieldErrors({});
    setPermissionSearch("");
    navigate("/admin/roles/new");
  };

  const openEditForm = (role) => {
    if (saving || deletingId) return;

    setFieldErrors({});
    setPermissionSearch("");
    navigate(`/admin/roles/${role.id}/edit`);
  };

  const closeForm = () => {
    if (saving) return;

    setFieldErrors({});
    navigate("/admin/roles");
  };

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

  const togglePermission = (permission) => {
    setForm((current) => {
      const selected = new Set(current.permissions);

      if (selected.has(permission)) {
        selected.delete(permission);
      } else {
        selected.add(permission);
      }

      return {
        ...current,
        permissions: [...selected],
      };
    });

    setFieldErrors((current) => ({
      ...current,
      permissions: "",
    }));
  };

  const toggleGroup = (permissions) => {
    setForm((current) => {
      const selected = new Set(current.permissions);

      const allSelected = permissions.every((permission) =>
        selected.has(permission)
      );

      permissions.forEach((permission) => {
        if (allSelected) {
          selected.delete(permission);
        } else {
          selected.add(permission);
        }
      });

      return {
        ...current,
        permissions: [...selected],
      };
    });

    setFieldErrors((current) => ({
      ...current,
      permissions: "",
    }));
  };

  const validateForm = () => {
    const errors = {};
    const roleName = form.name.trim();

    if (!editingRole) {
      if (!roleName) {
        errors.name = "Role name is required.";
      } else if (roleName.length < 2 || roleName.length > 80) {
        errors.name = "Role name must contain 2–80 characters.";
      } else if (!/^[a-zA-Z0-9]+([-_][a-zA-Z0-9]+)*$/.test(roleName)) {
        errors.name =
          "Use letters, numbers, hyphens or underscores only.";
      }
    }

    if (form.description.length > 300) {
      errors.description = "Description cannot exceed 300 characters.";
    }

    if (form.permissions.length === 0) {
      errors.permissions = "Select at least one permission.";
    }

    setFieldErrors(errors);

    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving || !validateForm()) return;

    const roleName = form.name.trim();

    const payload = {
      label: editingRole
        ? editingRole.label
        : formatRoleLabel(roleName),
      description: form.description.trim(),
      permissions: form.permissions,
    };

    if (!editingRole) {
      payload.name = roleName.toLowerCase();
    }

    setSaving(true);

    try {
      if (editingRole) {
        await roleService.updateRole(editingRole.id, payload);
        notification.success("Role updated successfully.");
      } else {
        await roleService.createRole(payload);
        notification.success("Role created successfully.");
      }

      setForm(emptyForm);
      setEditingRole(null);

      await loadData({ silentFailure: true });

      setPage(1);
      navigate("/admin/roles", { replace: true });
    } catch (error) {
      notification.error(error.message || "Unable to save the role.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (role) => {
    if (deletingId || saving) return;

    const roleLabel = role.label || role.name;

    const confirmed = await notification.confirmDelete(
      `the "${roleLabel}" role`
    );

    if (!confirmed) return;

    setDeletingId(role.id);

    try {
      await roleService.deleteRole(role.id);

      setRoles((current) =>
        current.filter((item) => item.id !== role.id)
      );

      notification.success("Role deleted successfully.");
    } catch (error) {
      notification.error(
        error.message || "Unable to delete the role."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const allPermissionsSelected =
    availablePermissions.length > 0 &&
    availablePermissions.every((permission) =>
      form.permissions.includes(permission)
    );

  return (
    <main className="role-management">
      {!showForm && (
        <>
          <div className="page-header">
            <div>
              <h1>Role Management</h1>
            </div>

            <button
              type="button"
              className="themebtn"
              onClick={openCreateForm}
            >
              <FiPlus /> Create Role
            </button>
          </div>

          <section className="role-management__summary">
            <article className="dashboard-stat-card card-success">
              <div className="stat-card-top">
                <div className="stat-icon stat-icon-success">
                  <RiTeamLine />
                </div>
              </div>
              <div className="stat-card-body">
                <span className="stat-card-title">Total Staff Roles</span>
                <strong className="stat-card-value">{roles.length}</strong>
              </div>
            </article>

            <article className="dashboard-stat-card card-purple">
              <div className="stat-card-top">
                <div className="stat-icon stat-icon-purple">
                  <MdOutlineFeaturedPlayList />
                </div>
              </div>
              <div className="stat-card-body">
                <span className="stat-card-title">
                  Available Permissions
                </span>
                <strong className="stat-card-value">
                  {availablePermissions.length}
                </strong>
              </div>
            </article>
          </section>

          <div className="common-card-filters">
            <div className="input-search">
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search roles..."
                aria-label="Search roles"
              />
              <FiSearch />
            </div>
          </div>

          <section className="common-card">
            {loading ? (
              <p className="role-management__state">Loading roles...</p>
            ) : filteredRoles.length === 0 ? (
              <div className="role-management__state">
                <strong>No roles found</strong>
                <p>Create a role or change your search.</p>
              </div>
            ) : (
              <div className="common-table-wrapper">
                <table className="common-table">
                  <thead>
                    <tr>
                      <th>Roles</th>
                      <th>Permissions</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedRoles.map((role) => (
                      <tr key={role.id}>
                        <td>
                          <strong className="tabletitle">
                            {role.label || role.name}
                          </strong>
                          <div className="role-management__role-name">
                            {role.name}
                          </div>
                        </td>

                        <td>
                          <span className="batchtag">
                            {(role.permissions || []).length} permissions
                          </span>
                        </td>

                        <td>
                          <span
                            className={`role-management__status ${
                              role.isActive ? "tag-success" : "tag-danger"
                            }`}
                          >
                            {role.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>

                        <td>
                          <div className="admission-actions">
                            <button
                              type="button"
                              data-tooltip="Edit"
                              className="tooltip"
                              onClick={() => openEditForm(role)}
                              disabled={Boolean(deletingId)}
                            >
                              <FiEdit2 />
                            </button>

                            <button
                              type="button"
                              data-tooltip="Delete"
                              className="tooltip"
                              onClick={() => handleDelete(role)}
                              disabled={Boolean(deletingId) || saving}
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

            {!loading && (
              <Pagination
                page={safePage}
                totalPages={totalPages}
                total={filteredRoles.length}
                itemCount={paginatedRoles.length}
                itemLabel="roles"
                limit={limit}
                loading={loading || Boolean(deletingId)}
                onPageChange={setPage}
                onLimitChange={(newLimit) => {
                  if (!PAGE_SIZES.includes(newLimit)) return;
                  setLimit(newLimit);
                  setPage(1);
                }}
              />
            )}
          </section>
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
            <div className="page-header">
              <div>
                <h1 id="role-form-title">
                  {editingRole ? "Edit Role" : "Create Role"}
                </h1>
              </div>
            </div>

            <div className="common-card">
              <form onSubmit={handleSubmit} noValidate>
                <div className="cardbody">
                  <div className="role-form-grid">
                    <div className="input-felid admission-form-full">
                      <label htmlFor="role-name">Role name *</label>
                      <input
                        id="role-name"
                        name="name"
                        value={form.name}
                        onChange={updateField}
                        placeholder="e.g. accountant"
                        required
                        minLength={2}
                        maxLength={80}
                        pattern="[a-zA-Z0-9]+([-_][a-zA-Z0-9]+)*"
                        disabled={Boolean(editingRole) || saving}
                        aria-invalid={Boolean(fieldErrors.name)}
                      />

                      {fieldErrors.name && (
                        <small className="role-management__field-error">
                          {fieldErrors.name}
                        </small>
                      )}

                      {editingRole && (
                        <small className="role-management__field-hint">
                          Role name cannot be changed after creation.
                        </small>
                      )}
                    </div>

                    <div className="input-felid admission-form-full">
                      <label htmlFor="role-description">
                        Description
                      </label>
                      <textarea
                        id="role-description"
                        name="description"
                        value={form.description}
                        onChange={updateField}
                        placeholder="Describe this staff role..."
                        maxLength={300}
                        rows={3}
                        disabled={saving}
                        aria-invalid={Boolean(fieldErrors.description)}
                      />

                      {fieldErrors.description && (
                        <small className="role-management__field-error">
                          {fieldErrors.description}
                        </small>
                      )}
                    </div>
                  </div>

                  <div className="role-management__permissions-card">
                    <div className="panel-header">
                      <div>
                        <h3>Assign Permissions</h3>
                        <p>
                          Select the permissions that will be assigned
                          to this role.
                        </p>
                      </div>

                      <div className="search-count">
                        <div className="role-management__permissions-toolbar">
                          <div className="role-management__permissions-count">
                            <FiCheckCircle />
                            <span>
                              <strong>{form.permissions.length}</strong> of{" "}
                              <strong>{availablePermissions.length}</strong>{" "}
                              selected
                            </span>
                          </div>

                          <button
                            type="button"
                            className="role-management__text-button"
                            onClick={() =>
                              setForm((current) => ({
                                ...current,
                                permissions: allPermissionsSelected
                                  ? current.permissions.filter(
                                      (permission) =>
                                        !availablePermissions.includes(permission)
                                    )
                                  : [
                                      ...new Set([
                                        ...current.permissions,
                                        ...availablePermissions,
                                      ]),
                                    ],
                              }))
                            }
                            disabled={saving || availablePermissions.length === 0}
                          >
                            <FiCheckSquare />
                            {allPermissionsSelected
                              ? "Deselect All"
                              : "Select All"}
                          </button>
                        </div>

                        <div className="role-management__module-search">
                          <FiSearch />
                          <input
                            type="search"
                            placeholder="Search modules or permissions..."
                            value={permissionSearch}
                            onChange={(event) =>
                              setPermissionSearch(event.target.value)
                            }
                            aria-label="Search permissions"
                          />
                        </div>
                      </div>
                    </div>

                    {fieldErrors.permissions && (
                      <small className="role-management__field-error role-management__permission-error">
                        {fieldErrors.permissions}
                      </small>
                    )}

                    <div className="common-table-wrapper">
                      <table className="common-table">
                        <thead>
                          <tr>
                            <th>Modules</th>
                            <th>VIEW</th>
                            <th>ADD</th>
                            <th>EDIT</th>
                            <th>DELETE</th>
                            <th>OTHER</th>
                          </tr>
                        </thead>

                        <tbody>
                          {permissionGroupList.map((group) => {
                            const groupPermissions = group.permissions;

                            const selectedCount = groupPermissions.filter(
                              (permission) =>
                                form.permissions.includes(permission)
                            ).length;

                            const allSelected =
                              groupPermissions.length > 0 &&
                              selectedCount === groupPermissions.length;

                            const findPermission = (action) =>
                              groupPermissions.find(
                                (permission) =>
                                  permission
                                    .split(".")
                                    .pop()
                                    .toLowerCase() === action
                              );

                            const otherPermissions = groupPermissions.filter(
                              (permission) =>
                                ![
                                  "view",
                                  "create",
                                  "update",
                                  "delete",
                                ].includes(
                                  permission.split(".").pop().toLowerCase()
                                )
                            );

                            return (
                              <tr key={group.key}>
                                <td className="table-left-header">
                                  <label className="role-management__module-name">
                                    <input
                                      type="checkbox"
                                      checked={allSelected}
                                      disabled={saving}
                                      onChange={() =>
                                        toggleGroup(groupPermissions)
                                      }
                                    />
                                    <span>{group.label}</span>
                                  </label>
                                </td>

                                {["view", "create", "update", "delete"].map(
                                  (action) => {
                                    const permission = findPermission(action);

                                    return (
                                      <td key={action}>
                                        {permission ? (
                                          <label className="role-management__permission-checkbox">
                                            <input
                                              type="checkbox"
                                              checked={form.permissions.includes(
                                                permission
                                              )}
                                              disabled={saving}
                                              onChange={() =>
                                                togglePermission(permission)
                                              }
                                            />
                                            <span />
                                          </label>
                                        ) : (
                                          <span className="role-management__permission-unavailable">
                                            —
                                          </span>
                                        )}
                                      </td>
                                    );
                                  }
                                )}

                                <td>
                                  {otherPermissions.length ? (
                                    <div className="role-management__other-permissions">
                                      {otherPermissions.map((permission) => (
                                        <label
                                          className="role-management__other-permission"
                                          key={permission}
                                          title={permission}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={form.permissions.includes(
                                              permission
                                            )}
                                            disabled={saving}
                                            onChange={() =>
                                              togglePermission(permission)
                                            }
                                          />
                                          <span>
                                            {formatPermission(permission) ||
                                              permission}
                                          </span>
                                        </label>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="role-management__permission-unavailable">
                                      —
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}

                          {permissionGroupList.length === 0 && (
                            <tr>
                              <td colSpan="6">
                                <div className="role-management__no-permissions">
                                  No matching modules or permissions found.
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <footer className="role-management__form-footer">
                  <button
                    type="button"
                    className="themebtn themebtnline"
                    onClick={closeForm}
                    disabled={saving}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="themebtn"
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
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
