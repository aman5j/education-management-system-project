import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import roleService from "../../services/roleService";
import "./RoleManagement.css";
import { RiTeamLine } from "react-icons/ri";
import { MdOutlineFeaturedPlayList } from "react-icons/md";
import {
  FiEdit2,
  FiPlus,
  FiTrash2,
  FiShield,
  FiCheckSquare,
  FiCheckCircle,
  FiSearch,
  FiX,
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
  const [notice, setNotice] = useState(location.state?.notice || "");
  const [search, setSearch] = useState("");
  const [permissionSearch, setPermissionSearch] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [rolesResponse, permissionsResponse] = await Promise.all([
        roleService.getRoles(),
        roleService.getPermissions(),
      ]);
      setRoles(Array.isArray(rolesResponse.data) ? rolesResponse.data : []);
      setAvailablePermissions(
        Array.isArray(permissionsResponse.data)
          ? permissionsResponse.data.filter(
              (permission) => typeof permission === "string" && permission.trim()
            )
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
      setPermissionSearch("");
      setForm(emptyForm);
      setError("");
      return;
    }
    if (!roleId) return;

    const role = roles.find((item) => String(item.id) === String(roleId));
    if (!role) {
      if (roles.length > 0) {
        setError("Role not found. Return to the role list and try again.");
      }
      return;
    }

    setEditingRole(role);
    setForm({
      name: role.name || "",
      label: role.label || "",
      description: role.description || "",
      permissions: Array.isArray(role.permissions) ? [...role.permissions] : [],
    });
    setError("");
  }, [isCreatePage, roleId, roles]);

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

  const openCreateForm = () => {
    if (saving) return;
    setPermissionSearch("");
    setError("");
    setNotice("");
    setEditingRole(null);
    setForm(emptyForm);
    navigate("/admin/roles/new");
  };

  const openEditForm = (role) => {
    if (saving) return;
    setPermissionSearch("");
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
      if (selected.has(permission)) selected.delete(permission);
      else selected.add(permission);
      return { ...current, permissions: [...selected] };
    });
  };

  const toggleGroup = (permissions) => {
    setForm((current) => {
      const selected = new Set(current.permissions);
      const allSelected = permissions.every((permission) => selected.has(permission));
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

    const roleName = form.name.trim();
    const payload = {
      label: form.label.trim() || formatRoleLabel(roleName),
      description: form.description.trim(),
      permissions: form.permissions,
    };
    if (!editingRole) payload.name = roleName.toLowerCase();

    setSaving(true);
    try {
      if (editingRole) {
        await roleService.updateRole(editingRole.id, payload);
      } else {
        await roleService.createRole(payload);
      }
      const successMessage = editingRole
        ? "Role updated successfully."
        : "Role created successfully.";
      setEditingRole(null);
      setForm(emptyForm);
      await loadData();
      navigate("/admin/roles", {
        replace: true,
        state: { notice: successMessage },
      });
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to save the role. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (role) => {
    const confirmed = window.confirm(
      `Delete the "${role.label || role.name}" role? This cannot be undone.`
    );
    if (!confirmed) return;
    setError("");
    setNotice("");
    try {
      await roleService.deleteRole(role.id);
      setNotice("Role deleted successfully.");
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete the role.");
    }
  };

  const allPermissionsSelected =
    availablePermissions.length > 0 &&
    availablePermissions.every((permission) => form.permissions.includes(permission));

  return (
    <main className="role-management">
     

      {!showForm && (
        <>
          <div className="page-header">
            <div><h1>Role Management</h1></div>
            <button type="button" className="themebtn" onClick={openCreateForm}>
              <FiPlus /> Create Role
            </button>
          </div>

          {error && <div className="role-management__alert role-management__alert--error">{error}</div>}
          {notice && <div className="role-management__alert role-management__alert--success">{notice}</div>}

          <section className="role-management__summary">
            <article className="dashboard-stat-card card-success">
              <div className="stat-card-top"><div className="stat-icon stat-icon-success"><RiTeamLine /></div></div>
              <div className="stat-card-body"><span className="stat-card-title">Total Staff Roles</span><strong className="stat-card-value">{roles.length}</strong></div>
            </article>
            <article className="dashboard-stat-card card-purple">
              <div className="stat-card-top"><div className="stat-icon stat-icon-purple"><MdOutlineFeaturedPlayList /></div></div>
              <div className="stat-card-body"><span className="stat-card-title">Available Permissions</span><strong className="stat-card-value">{availablePermissions.length}</strong></div>
            </article>
          </section>

          <div className="common-card-filters">
            <div className="input-search">
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search roles..." aria-label="Search roles" />
              <FiSearch />
            </div>
          </div>

          <section className="common-card">
            {loading ? (
              <p className="role-management__state">Loading roles...</p>
            ) : filteredRoles.length === 0 ? (
              <div className="role-management__state"><strong>No roles found</strong><p>Create a role or change your search.</p></div>
            ) : (
              <div className="common-table-wrapper">
                <table className="common-table">
                  <thead><tr><th>Roles</th><th>Permissions</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {filteredRoles.map((role) => (
                      <tr key={role.id}>
                        <td><strong className="tabletitle">{role.name}</strong></td>
                        {/* <td>{role.description || "—"}</td> */}
                        <td><span className="batchtag">{(role.permissions || []).length} permissions</span></td>
                        <td><span className={`role-management__status ${role.isActive ? "tag-success" : "tag-danger"}`}>{role.isActive ? "Active" : "Inactive"}</span></td>
                        <td><div className="admission-actions">
                          <button type="button" data-tooltip="Edit" className="tooltip" onClick={() => openEditForm(role)}><FiEdit2 /></button>
                          <button type="button" data-tooltip="Delete" className="tooltip" onClick={() => handleDelete(role)}><FiTrash2 /></button>
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {showForm && (
        <div className="role-management__page-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm(); }}>
          <section className="role-management__form-page" aria-labelledby="role-form-title">
            <div className="page-header">
              <div><h1 id="role-form-title">{editingRole ? "Edit Role" : "Create Role"}</h1></div>
              
            </div>

            {error && <div className="role-management__alert role-management__alert--error">{error}</div>}

            <div className="common-card">
              <form onSubmit={handleSubmit}>
                <div className="cardbody">
                  <div className="role-form-grid">
                    <div className="input-felid admission-form-full">
                      <label htmlFor="role-name">Role name</label>
                      <input id="role-name" name="name" value={form.name} onChange={updateField} placeholder="e.g. accountant" required minLength={2} maxLength={80} pattern="[a-zA-Z0-9]+([-_][a-zA-Z0-9]+)*" disabled={Boolean(editingRole) || saving} />
                    </div>
                  </div>
                

              
                <div className="role-management__permissions-card">

               

                 

                  <div class="panel-header"><div><h3>Assign Permissions</h3>
                  <p>Select the permissions that will be assigned to this role.

</p> </div>

<div className="search-count">
                            

                          

                          <div className="role-management__permissions-toolbar">
                            <div className="role-management__permissions-count"><FiCheckCircle /><span><strong>{form.permissions.length}</strong> of <strong>{availablePermissions.length}</strong> selected</span></div>
                             <button type="button" className="role-management__text-button" onClick={() => setForm((current) => ({ ...current, permissions: allPermissionsSelected ? current.permissions.filter((permission) => !availablePermissions.includes(permission)) : [...new Set([...current.permissions, ...availablePermissions])] }))} disabled={saving || availablePermissions.length === 0}>
                      <FiCheckSquare /> {allPermissionsSelected ? "Deselect All" : "Select All"}
                    </button>
                          </div>
                          <div className="role-management__module-search">
                            <FiSearch />
                            <input type="search" placeholder="Search modules or permissions..." value={permissionSearch} onChange={(event) => setPermissionSearch(event.target.value)} aria-label="Search permissions" />
                          </div>
                  </div>

</div>
                 
                  <div className="common-table-wrapper">
                    <table className="common-table">
                      <thead><tr><th> Modules</th><th>VIEW</th><th>ADD</th><th>EDIT</th><th>DELETE</th><th>OTHER</th></tr></thead>
                      <tbody>
                        {permissionGroupList.map((group) => {
                          const groupPermissions = group.permissions;
                          const selectedCount = groupPermissions.filter((permission) => form.permissions.includes(permission)).length;
                          const allSelected = groupPermissions.length > 0 && selectedCount === groupPermissions.length;
                          const findPermission = (action) => groupPermissions.find((permission) => permission.split(".").pop().toLowerCase() === action);
                          const otherPermissions = groupPermissions.filter((permission) => !["view", "create", "update", "delete"].includes(permission.split(".").pop().toLowerCase()));

                          return (
                            <tr key={group.key}>
                              <td className="table-left-header">
                                <label className="role-management__module-name"><input type="checkbox" checked={allSelected} disabled={saving} onChange={() => toggleGroup(groupPermissions)} /><span>{group.label}</span></label>
                                {/* <small className="role-management__module-count">{selectedCount}/{groupPermissions.length} selected</small> */}
                              </td>
                              {["view", "create", "update", "delete"].map((action) => {
                                const permission = findPermission(action);
                                return <td key={action}>{permission ? (
                                  <label className="role-management__permission-checkbox"><input type="checkbox" checked={form.permissions.includes(permission)} disabled={saving} onChange={() => togglePermission(permission)} /><span /></label>
                                ) : <span className="role-management__permission-unavailable">—</span>}</td>;
                              })}
                              <td>{otherPermissions.length ? <div className="role-management__other-permissions">{otherPermissions.map((permission) => (
                                <label className="role-management__other-permission" key={permission} title={permission}><input type="checkbox" checked={form.permissions.includes(permission)} disabled={saving} onChange={() => togglePermission(permission)} /><span>{formatPermission(permission) || permission}</span></label>
                              ))}</div> : <span className="role-management__permission-unavailable">—</span>}</td>
                            </tr>
                          );
                        })}
                        {permissionGroupList.length === 0 && <tr><td colSpan="6"><div className="role-management__no-permissions">No matching modules or permissions found.</div></td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

                <footer className="role-management__form-footer">
                  <div>
                {form.permissions.length === 0 && <div className="role-management__form-hint text-alert">Please select at least one permission for this role.</div>}

                  </div>

                  <div>
                    {/* <button type="button" className="themebtn themebtnline" onClick={closeForm} disabled={saving}>Cancel</button> */}
                  <button type="submit" className="themebtn " disabled={saving || availablePermissions.length === 0}>{saving ? "Saving..." : editingRole ? "Save Changes" : "Create Role"}</button>
                  </div>
                </footer>
              </form>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}