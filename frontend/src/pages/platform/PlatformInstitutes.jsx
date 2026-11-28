
import { useCallback, useEffect, useState } from "react";

import {
  FiPlus,
  FiSearch,
  FiRefreshCw,
  FiEye,
  FiEdit2,
  FiChevronLeft,
  FiChevronRight,
  FiHome,
  FiX,
  FiSave,
  FiShield,
  FiDatabase,
} from "react-icons/fi";

import platformInstituteService from "../../services/platformInstituteService";
import notification, {
  getApiErrorMessage,
} from "../../utils/notification";

const initialForm = {
  name: "",
  slug: "",
  contactEmail: "",
  phone: "",
  domain: "",
};

const statusLabel = (status) => {
  const labels = {
    active: "Active",
    suspended: "Suspended",
    deactivated: "Deactivated",
    pending: "Pending",
    provisioning: "Provisioning",
    ready: "Ready",
    failed: "Failed",
  };

  return labels[status] || status || "Unknown";
};

const PlatformInstitutes = () => {
  const [institutes, setInstitutes] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [provisioningStatus, setProvisioningStatus] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [modal, setModal] = useState("");
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

  const loadInstitutes = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);

        const result =
          await platformInstituteService.getInstitutes({
            search,
            status,
            provisioningStatus,
            page,
            limit: 10,
            sortOrder: "desc",
          });

        setInstitutes(result.institutes || []);
        setPagination(
          result.pagination || {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
          }
        );
      } catch (error) {
        notification.error(getApiErrorMessage(error));
      } finally {
        setLoading(false);
      }
    },
    [search, status, provisioningStatus]
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadInstitutes(1);
    }, 300);

    return () => clearTimeout(timeout);
  }, [loadInstitutes]);

  const closeModal = () => {
    setModal("");
    setSelected(null);
    setEditingId(null);
    setForm(initialForm);
  };

  const openCreate = () => {
    setForm(initialForm);
    setEditingId(null);
    setModal("create");
  };

  const openEdit = (institute) => {
    setSelected(institute);
    setEditingId(institute._id || institute.id);

    setForm({
      name: institute.name || "",
      slug: institute.slug || "",
      contactEmail: institute.contactEmail || "",
      phone: institute.phone || "",
      domain: institute.domain || "",
    });

    setModal("edit");
  };

  const openView = async (institute) => {
    try {
      const id = institute._id || institute.id;
      const result =
        await platformInstituteService.getInstitute(id);

      setSelected(result);
      setModal("view");
    } catch (error) {
      notification.error(getApiErrorMessage(error));
    }
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim() || !form.contactEmail.trim()) {
      notification.warning(
        "Institute name and contact email are required."
      );
      return;
    }

    try {
      setSubmitting(true);

      if (modal === "create") {
        await platformInstituteService.createInstitute(form);

        notification.success(
          "Institute registered. Database provisioning is pending."
        );
      } else {
        await platformInstituteService.updateInstitute(
          editingId,
          form
        );

        notification.success(
          "Institute details updated successfully."
        );
      }

      closeModal();
      await loadInstitutes(pagination.page);
    } catch (error) {
      notification.error(getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (institute, nextStatus) => {
    const name = institute.name || "this institute";

    const confirmed = await notification.confirm({
      title:
        nextStatus === "active"
          ? "Activate institute?"
          : nextStatus === "suspended"
            ? "Suspend institute?"
            : "Deactivate institute?",
      text:
        nextStatus === "active"
          ? `${name} will be allowed to access its institute services.`
          : `${name} will no longer be allowed to access its institute services.`,
      confirmText:
        nextStatus === "active"
          ? "Yes"
          : nextStatus === "suspended"
            ? "Yes"
            : "Yes",
      icon: "warning",
      confirmButtonColor:
        nextStatus === "active" ? "#16a34a" : "#dc2626",
    });

    if (!confirmed) return;

    try {
      const id = institute._id || institute.id;

      await platformInstituteService.updateStatus(
        id,
        nextStatus
      );

      notification.success(
        `Institute ${nextStatus} successfully.`
      );

      await loadInstitutes(pagination.page);
    } catch (error) {
      notification.error(getApiErrorMessage(error));
    }
  };

  const goToPage = (page) => {
    if (
      page < 1 ||
      page > pagination.totalPages ||
      page === pagination.page
    ) {
      return;
    }

    loadInstitutes(page);
  };

  const getStatusClass = (value) => {
    if (["active", "ready"].includes(value)) return "success";
    if (["suspended", "pending", "provisioning"].includes(value)) {
      return "warning";
    }
    if (["deactivated", "failed"].includes(value)) return "danger";
    return "neutral";
  };

  return (
    <div className="platform-page">
      <div className="platform-page-heading">
        <div>
          <span className="platform-eyebrow">
            PLATFORM MANAGEMENT
          </span>

          <h1>Institute Management</h1>

          <p>
            Register and manage institutes on your EMS platform.
          </p>
        </div>

        <button
          type="button"
          className="platform-institute-primary-button"
          onClick={openCreate}
        >
          <FiPlus /> Register Institute
        </button>
      </div>

      <section className="platform-institute-summary">
        <div>
          <span>Total institutes</span>
          <strong>{pagination.total}</strong>
        </div>

        <div>
          <span>Current page</span>
          <strong>{pagination.page}</strong>
        </div>

        <div>
          <span>Provisioning ready</span>
          <strong>
            {institutes.filter(
              (item) => item.provisioningStatus === "ready"
            ).length}
          </strong>
        </div>

        <div>
          <span>Pending provisioning</span>
          <strong>
            {institutes.filter(
              (item) =>
                ["pending", "provisioning"].includes(
                  item.provisioningStatus
                )
            ).length}
          </strong>
        </div>
      </section>

      <section className="platform-institute-panel">
        <div className="platform-institute-toolbar">
          <div className="platform-institute-search">
            <FiSearch />

            <input
              type="search"
              placeholder="Search institute, email, slug or domain..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filter by institute status"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="deactivated">Deactivated</option>
          </select>

          <select
            value={provisioningStatus}
            onChange={(event) =>
              setProvisioningStatus(event.target.value)
            }
            aria-label="Filter by provisioning status"
          >
            <option value="">All provisioning</option>
            <option value="pending">Pending</option>
            <option value="provisioning">Provisioning</option>
            <option value="ready">Ready</option>
            <option value="failed">Failed</option>
          </select>

          <button
            type="button"
            className="platform-institute-refresh"
            onClick={() => loadInstitutes(1)}
            disabled={loading}
            title="Refresh institutes"
          >
            <FiRefreshCw />
          </button>
        </div>

        <div className="platform-institute-table-wrap">
          <table className="platform-institute-table">
            <thead>
              <tr>
                <th>Institute</th>
                <th>Contact</th>
                <th>Database</th>
                <th>Status</th>
                <th>Provisioning</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="platform-institute-empty">
                    Loading institutes...
                  </td>
                </tr>
              ) : institutes.length === 0 ? (
                <tr>
                  <td colSpan="6" className="platform-institute-empty">
                    <FiHome />
                    <strong>No institutes found</strong>
                    <span>
                      Register your first institute or change the filters.
                    </span>
                  </td>
                </tr>
              ) : (
                institutes.map((institute) => {
                  const id = institute._id || institute.id;

                  return (
                    <tr key={id}>
                      <td>
                        <div className="platform-institute-name">
                          <strong>{institute.name}</strong>
                          <span>{institute.slug}</span>
                        </div>
                      </td>

                      <td>
                        <div className="platform-institute-contact">
                          <strong>{institute.contactEmail}</strong>
                          <span>{institute.phone || "—"}</span>
                        </div>
                      </td>

                      <td>
                        <span className="platform-database-name">
                          <FiDatabase />
                          {institute.databaseName}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`platform-institute-status ${getStatusClass(
                            institute.status
                          )}`}
                        >
                          {statusLabel(institute.status)}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`platform-institute-status ${getStatusClass(
                            institute.provisioningStatus
                          )}`}
                        >
                          {statusLabel(institute.provisioningStatus)}
                        </span>
                      </td>

                      <td>
                        <div className="platform-institute-actions">
                          <button
                            type="button"
                            title="View institute"
                            onClick={() => openView(institute)}
                          >
                            <FiEye />
                          </button>

                          <button
                            type="button"
                            title="Edit institute"
                            onClick={() => openEdit(institute)}
                          >
                            <FiEdit2 />
                          </button>

                          
                        {institute.status === "active" ? (
                        <>
                            <button
                            type="button"
                            className="danger"
                            title="Suspend institute"
                            onClick={() =>
                                handleStatusChange(institute, "suspended")
                            }
                            >
                            <FiShield />
                            </button>

                            <button
                            type="button"
                            className="danger"
                            title="Deactivate institute"
                            onClick={() =>
                                handleStatusChange(institute, "deactivated")
                            }
                            >
                            <FiX />
                            </button>
                        </>
                        ) : (
                        <>
                            <button
                            type="button"
                            className="success"
                            title={
                                institute.provisioningStatus === "ready"
                                ? "Activate institute"
                                : "Database provisioning must be completed before activation"
                            }
                            disabled={institute.provisioningStatus !== "ready"}
                            onClick={() =>
                                handleStatusChange(institute, "active")
                            }
                            >
                            <FiShield />
                            </button>

                            {institute.status !== "deactivated" && (
                            <button
                                type="button"
                                className="danger"
                                title="Deactivate institute"
                                onClick={() =>
                                handleStatusChange(institute, "deactivated")
                                }
                            >
                                <FiX />
                            </button>
                            )}
                        </>
                        )}

                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="platform-institute-pagination">
          <span>
            Showing {institutes.length} of {pagination.total} institutes
          </span>

          <div>
            <button
              type="button"
              onClick={() => goToPage(pagination.page - 1)}
              disabled={loading || pagination.page <= 1}
              aria-label="Previous page"
            >
              <FiChevronLeft />
            </button>

            <strong>
              {pagination.page} / {Math.max(pagination.totalPages, 1)}
            </strong>

            <button
              type="button"
              onClick={() => goToPage(pagination.page + 1)}
              disabled={
                loading ||
                pagination.page >= pagination.totalPages
              }
              aria-label="Next page"
            >
              <FiChevronRight />
            </button>
          </div>
        </div>
      </section>

      {modal && (
        <div
          className="platform-institute-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <section
            className="platform-institute-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="platform-institute-modal-title"
          >
            <div className="platform-institute-modal-header">
              <div>
                <span className="platform-eyebrow">
                  PLATFORM MANAGEMENT
                </span>

                <h2 id="platform-institute-modal-title">
                  {modal === "create"
                    ? "Register Institute"
                    : modal === "edit"
                      ? "Edit Institute"
                      : "Institute Details"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeModal}
                aria-label="Close"
              >
                <FiX />
              </button>
            </div>

            {modal === "view" && selected ? (
              <div className="platform-institute-details">
                {[
                  ["Institute name", selected.name],
                  ["Institute slug", selected.slug],
                  ["Contact email", selected.contactEmail],
                  ["Phone", selected.phone || "—"],
                  ["Domain", selected.domain || "Not configured"],
                  ["Database name", selected.databaseName],
                  ["Institute status", statusLabel(selected.status)],
                  [
                    "Provisioning status",
                    statusLabel(selected.provisioningStatus),
                  ],
                  [
                    "Provisioned at",
                    selected.provisionedAt
                      ? new Date(selected.provisionedAt).toLocaleString()
                      : "Not provisioned",
                  ],
                  [
                    "Created at",
                    selected.createdAt
                      ? new Date(selected.createdAt).toLocaleString()
                      : "—",
                  ],
                ].map(([label, value]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <form
                className="platform-institute-form"
                onSubmit={handleSubmit}
              >
                <label>
                  Institute name *
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleFormChange}
                    placeholder="Enter institute name"
                    maxLength={150}
                    required
                  />
                </label>

                <label>
                  Contact email *
                  <input
                    name="contactEmail"
                    type="email"
                    value={form.contactEmail}
                    onChange={handleFormChange}
                    placeholder="institute@example.com"
                    maxLength={254}
                    required
                  />
                </label>

                <label>
                  Phone number
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleFormChange}
                    placeholder="Enter contact phone"
                    maxLength={25}
                  />
                </label>

                <label>
                  Institute slug
                  <input
                    name="slug"
                    value={form.slug}
                    onChange={handleFormChange}
                    placeholder="Leave blank to generate from name"
                    maxLength={150}
                  />
                </label>

                <label>
                  Domain (optional)
                  <input
                    name="domain"
                    value={form.domain}
                    onChange={handleFormChange}
                    placeholder="abc.example.com"
                  />
                  <small>
                    Enter a hostname only, without https:// or a path.
                  </small>
                </label>

                {modal === "create" && (
                  <div className="platform-institute-provisioning-note">
                    <FiDatabase />
                    <span>
                      A unique database name will be generated.
                      Database creation will happen in Phase 3.
                      This institute will remain suspended until provisioning
                      is complete.
                    </span>
                  </div>
                )}

                <div className="platform-institute-modal-actions">
                  <button
                    type="button"
                    className="platform-institute-cancel"
                    onClick={closeModal}
                    disabled={submitting}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="platform-institute-primary-button"
                    disabled={submitting}
                  >
                    <FiSave />
                    {submitting
                      ? "Saving..."
                      : modal === "create"
                        ? "Register institute"
                        : "Save changes"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default PlatformInstitutes;
