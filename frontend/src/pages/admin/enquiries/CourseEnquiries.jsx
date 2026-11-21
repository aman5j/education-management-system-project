
import { useCallback, useEffect, useState } from "react";
import {
  FiSearch,
  FiRefreshCw,
  FiEye,
  FiTrash2,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiMessageSquare,
  FiPhone,
  FiMail,
} from "react-icons/fi";

import contactUsService from "../../../services/contactUsService";
import notification, {
  getApiErrorMessage,
} from "../../../utils/notification";

import "./CourseEnquiries.css";

const STATUS_OPTIONS = ["New", "Contacted", "Closed"];

export default function CourseEnquiries() {
  const [enquiries, setEnquiries] = useState([]);
  const [counts, setCounts] = useState({
    New: 0,
    Contacted: 0,
    Closed: 0,
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const loadEnquiries = useCallback(async (page = 1) => {
    setLoading(true);

    try {
      const data = await contactUsService.getEnquiries({
        page,
        limit: pagination.limit,
        search,
        status,
      });

      setEnquiries(data.enquiries || []);
      setCounts(data.counts || {
        New: 0,
        Contacted: 0,
        Closed: 0,
      });

      setPagination((current) => ({
        ...current,
        ...(data.pagination || {}),
      }));
    } catch (error) {
      notification.error(
        getApiErrorMessage(error) ||
          "Unable to load course enquiries."
      );
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, search, status]);

  useEffect(() => {
    loadEnquiries(1);
  }, [loadEnquiries]);

  const openEnquiry = async (id) => {
    try {
      const enquiry = await contactUsService.getEnquiryById(id);
      setSelected(enquiry);
    } catch (error) {
      notification.error(
        getApiErrorMessage(error) ||
          "Unable to open enquiry."
      );
    }
  };

  const updateStatus = async (id, nextStatus) => {
    try {
      await contactUsService.updateEnquiryStatus(
        id,
        nextStatus
      );

      notification.success("Enquiry status updated.");
      setSelected((current) =>
        current?._id === id
          ? { ...current, status: nextStatus }
          : current
      );

      await loadEnquiries(pagination.page);
    } catch (error) {
      notification.error(
        getApiErrorMessage(error) ||
          "Unable to update enquiry status."
      );
    }
  };

  const deleteEnquiry = async (enquiry) => {
    const confirmed = await notification.confirm({
      title: "Delete enquiry permanently?",
      text: `The enquiry from ${enquiry.fullName} will be permanently deleted. This cannot be undone.`,
      icon: "warning",
      confirmText: "Delete permanently",
      cancelText: "Cancel",
      confirmButtonColor: "#dc2626",
    });

    if (!confirmed) return;

    try {
      await contactUsService.deleteEnquiry(enquiry._id);

      notification.success("Enquiry permanently deleted.");

      if (selected?._id === enquiry._id) {
        setSelected(null);
      }

      await loadEnquiries(pagination.page);
    } catch (error) {
      notification.error(
        getApiErrorMessage(error) ||
          "Unable to delete enquiry."
      );
    }
  };

  const formatDate = (value) => {
    if (!value) return "—";

    return new Date(value).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <div className="course-enquiries-page">
      <div className="course-enquiries-header">
        <div>
          <span className="course-enquiries-eyebrow">
            WEBSITE MANAGEMENT
          </span>
          <h1>Course Enquiries</h1>
          <p>View and manage enquiries submitted through Contact Us.</p>
        </div>

        <button
          type="button"
          className="enquiries-refresh-button"
          onClick={() => loadEnquiries(pagination.page)}
          disabled={loading}
        >
          <FiRefreshCw className={loading ? "enquiries-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="enquiries-stat-grid">
        {STATUS_OPTIONS.map((item) => (
          <button
            type="button"
            key={item}
            className={`enquiries-stat-card ${
              status === item ? "selected" : ""
            }`}
            onClick={() => setStatus(
              status === item ? "" : item
            )}
          >
            <span>{item} enquiries</span>
            <strong>{counts[item] || 0}</strong>
          </button>
        ))}
      </div>

      <div className="enquiries-toolbar">
        <div className="enquiries-search">
          <FiSearch />
          <input
            type="search"
            value={search}
            placeholder="Search name, email, phone or course..."
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </div>

      <div className="enquiries-table-card">
        <div className="enquiries-table-scroll">
          <table className="enquiries-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Preparing For</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="enquiries-empty">
                    Loading enquiries...
                  </td>
                </tr>
              ) : enquiries.length === 0 ? (
                <tr>
                  <td colSpan="5" className="enquiries-empty">
                    <FiMessageSquare />
                    <strong>No enquiries found</strong>
                    <span>New website enquiries will appear here.</span>
                  </td>
                </tr>
              ) : (
                enquiries.map((item) => (
                  <tr key={item._id}>
                    <td>
                      <strong>{item.fullName}</strong>
                      <small>{item.email}</small>
                      {item.phone && <small>{item.phone}</small>}
                    </td>

                    <td>
                      {item.preparingFor || "Not specified"}
                    </td>

                    <td>{formatDate(item.createdAt)}</td>

                    <td>
                      <span
                        className={`enquiry-status enquiry-status-${item.status.toLowerCase()}`}
                      >
                        {item.status}
                      </span>
                    </td>

                    <td>
                      <div className="enquiries-actions">
                        <button
                          type="button"
                          title="View enquiry"
                          onClick={() => openEnquiry(item._id)}
                        >
                          <FiEye />
                        </button>

                        <button
                          type="button"
                          title="Delete permanently"
                          className="delete"
                          onClick={() => deleteEnquiry(item)}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="enquiries-pagination">
          <span>
            {pagination.total} total enquiries
          </span>

          <div>
            <button
              type="button"
              disabled={pagination.page <= 1 || loading}
              onClick={() => loadEnquiries(pagination.page - 1)}
            >
              <FiChevronLeft />
            </button>

            <strong>
              {pagination.page} / {Math.max(1, pagination.totalPages)}
            </strong>

            <button
              type="button"
              disabled={
                pagination.page >= pagination.totalPages ||
                loading
              }
              onClick={() => loadEnquiries(pagination.page + 1)}
            >
              <FiChevronRight />
            </button>
          </div>
        </div>
      </div>

      {selected && (
        <div
          className="enquiry-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelected(null);
            }
          }}
        >
          <section className="enquiry-modal">
            <header>
              <div>
                <span>ENQUIRY DETAILS</span>
                <h2>{selected.fullName}</h2>
              </div>

              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close"
              >
                <FiX />
              </button>
            </header>

            <div className="enquiry-modal-content">
              <p><FiMail /> {selected.email}</p>
              {selected.phone && (
                <p><FiPhone /> {selected.phone}</p>
              )}

              <div>
                <small>Preparing for</small>
                <strong>{selected.preparingFor || "Not specified"}</strong>
              </div>

              <div>
                <small>Submitted on</small>
                <strong>{formatDate(selected.createdAt)}</strong>
              </div>

              <div className="enquiry-message">
                <small>Message</small>
                <p>{selected.message}</p>
              </div>

              <div className="enquiry-status-control">
                <label htmlFor="enquiry-status">Update status</label>
                <select
                  id="enquiry-status"
                  value={selected.status}
                  onChange={(event) =>
                    updateStatus(selected._id, event.target.value)
                  }
                >
                  {STATUS_OPTIONS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>

              {selected.phone && (
                <a
                  className="enquiry-contact-action"
                  href={`tel:${selected.phone}`}
                >
                  <FiPhone /> Call applicant
                </a>
              )}

              <a
                className="enquiry-contact-action"
                href={`mailto:${selected.email}`}
              >
                <FiMail /> Reply by email
              </a>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
