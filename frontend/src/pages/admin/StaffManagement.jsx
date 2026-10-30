
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import staffService from "../../services/staffService";
import roleService from "../../services/roleService";
import "./StaffManagement.css";
import { FiPlus, FiSearch } from "react-icons/fi";
import { IoIosCall } from "react-icons/io";
import { MdOutgoingMail } from "react-icons/md";
import { MdDateRange } from "react-icons/md";
import { RiTeamLine } from "react-icons/ri";


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


  
const handleStatusChange = async (member) => {
  const nextStatus =
    member.status === "active" ? "suspended" : "active";

  const confirmed = window.confirm(
    nextStatus === "suspended"
      ? `Suspend ${member.name}'s account? They should lose access to the system.`
      : `Reactivate ${member.name}'s account?`
  );

  if (!confirmed) return;

  setError("");
  setNotice("");

  try {
    await staffService.updateStatus(member.id, nextStatus);
    setNotice(
      `${member.name}'s account is now ${nextStatus}.`
    );
    await loadStaff();
  } catch (err) {
    setError(
      err.response?.data?.message ||
        "Unable to update the staff account status."
    );
  }
};

const handlePasswordReset = async (member) => {
  const newPassword = window.prompt(
    `Enter a new temporary password for ${member.name} (minimum 12 characters):`
  );

  if (newPassword === null) return;

  if (newPassword.length < 12 || newPassword.length > 128) {
    setError("Password must contain 12–128 characters.");
    return;
  }

  const confirmed = window.confirm(
    `Reset the password for ${member.name}? The current password cannot be recovered.`
  );

  if (!confirmed) return;

  setError("");
  setNotice("");

  try {
    const response = await staffService.resetPassword(
      member.id,
      newPassword
    );

    setNotice(
      response.message ||
        `Password reset successfully for ${member.name}.`
    );
  } catch (err) {
    setError(
      err.response?.data?.message ||
        "Unable to reset the staff password."
    );
  }
};


  return (
    <main className="staff-management">
      
      <div class="page-header"><div><h1>Staff Management</h1></div>
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
        
           {/* <div class="page-header"><div><h1>Create Staff Account</h1></div>
            <button
              type="button"
              className="themebtn"
              onClick={closeCreateForm}
              disabled={saving}
            >
              Back to Staff
            </button> </div> */}



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
                />
             
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
                />
             

</div>
<div className="input-felid">
              <label>
                Phone number
                  </label>
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
              <label className="staff-management__full-width">
                Staff role <span className="required">*</span>
                   </label>
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
           
            </div>

              <div className="input-felid">
            <label>
            Initial password <span className="required"> *</span>
               </label>
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
                disabled={saving || roles.length === 0}
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
            {/* <div>
              <h2>Staff Accounts</h2>
              <p>{pagination.total} total staff accounts</p>
            </div> */}

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
                    {/* <th>Assigned role</th> */}
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {staff.map((member) => (
                    <tr key={member.id}>
                      <td>

                        <div class="student-name-cell">
                          <div class="student-avatar-wrapper"><img alt="utpam singh" class="student-avatar" src="http://localhost:5000/uploads/students/1792903718008-81YP9oMWB1L-_SX569_.jpg" /></div>
                          <div><strong>{member.name}</strong>  <label className="roleassign">  <RiTeamLine /> {member.assignedRole?.label ||
                          member.assignedRole?.name ||
                          "No role assigned"}</label></div></div>

                       
                      </td>
                      <td>
                         <div className="contact-details">
                     <div className="contact-li"> <IoIosCall />  <span> {member.phone || "—"}</span></div>
                    <div className="contact-li"> <MdOutgoingMail /> <span>{member.email}</span></div>
                    </div>
                       </td>
                      {/* <td>
                       

                        <span className="roleassign">  <RiTeamLine /> {member.assignedRole?.label ||
                          member.assignedRole?.name ||
                          "No role assigned"}</span>
                      </td> */}
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
                                             <div className="contact-li"><MdDateRange />  <span> {member.createdAt
                          ? new Date(member.createdAt).toLocaleDateString()
                          : "—"}</span></div>
                                            
                                            </div>

                       
                      </td>

                      
                        <td>
                        <div className="staff-management__row-actions">
                            <button
                            type="button"
                            className=" themebtn smallbtn"
                            onClick={() => handleStatusChange(member)}
                            >
                            {member.status === "active" ? "Suspend" : "Activate"}
                            </button>

                            <button
                            type="button"
                            className=" themebtn smallbtn"
                            onClick={() => handlePasswordReset(member)}
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
