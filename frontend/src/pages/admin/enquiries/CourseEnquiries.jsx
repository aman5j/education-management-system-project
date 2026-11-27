import { useCallback, useEffect, useState } from "react";
import {
  FiSearch, FiRefreshCw, FiEye, FiTrash2, FiX,
  FiChevronLeft, FiChevronRight, FiMessageSquare,
  FiPhone, FiMail, FiUsers, FiClock, FiUserCheck,
  FiCheckCircle, FiCalendar, FiBookOpen, FiExternalLink,
  FiEdit2
} from "react-icons/fi";

import contactUsService from "../../../services/contactUsService";
import notification, { getApiErrorMessage } from "../../../utils/notification";
import "./CourseEnquiries.css";
import { IoIosCall } from "react-icons/io";
import { MdDateRange, MdOutgoingMail } from "react-icons/md";

const STATUS_OPTIONS = ["New", "Contacted", "Closed"];
const STATUS_META = {
  New: { icon: FiClock, caption: "Awaiting your response" },
  Contacted: { icon: FiUserCheck, caption: "Follow-up in progress" },
  Closed: { icon: FiCheckCircle, caption: "Successfully completed" },
};

export default function CourseEnquiries() {
  const [enquiries, setEnquiries] = useState([]);
  const [counts, setCounts] = useState({ New: 0, Contacted: 0, Closed: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadEnquiries = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const data = await contactUsService.getEnquiries({
        page, limit: pagination.limit, search, status,
      });
      setEnquiries(data.enquiries || []);
      setCounts(data.counts || { New: 0, Contacted: 0, Closed: 0 });
      setPagination((current) => ({ ...current, ...(data.pagination || {}) }));
    } catch (error) {
      notification.error(getApiErrorMessage(error) || "Unable to load course enquiries.");
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, search, status]);

  useEffect(() => { loadEnquiries(1); }, [loadEnquiries]);

  const openEnquiry = async (id) => {
    try {
      setSelected(await contactUsService.getEnquiryById(id));
    } catch (error) {
      notification.error(getApiErrorMessage(error) || "Unable to open enquiry.");
    }
  };

  const updateStatus = async (id, nextStatus) => {
    setUpdatingStatus(true);
    try {
      await contactUsService.updateEnquiryStatus(id, nextStatus);
      setSelected((current) => current?._id === id ? { ...current, status: nextStatus } : current);
      notification.success("Enquiry status updated.");
      await loadEnquiries(pagination.page);
    } catch (error) {
      notification.error(getApiErrorMessage(error) || "Unable to update enquiry status.");
    } finally {
      setUpdatingStatus(false);
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
      if (selected?._id === enquiry._id) setSelected(null);
      const nextPage = enquiries.length === 1 && pagination.page > 1
        ? pagination.page - 1 : pagination.page;
      await loadEnquiries(nextPage);
    } catch (error) {
      notification.error(getApiErrorMessage(error) || "Unable to delete enquiry.");
    }
  };

  const formatDate = (value) => value
    ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
    : "—";

  const initials = (name = "") => name.trim().split(/\s+/).slice(0, 2)
    .map((part) => part[0]?.toUpperCase()).join("") || "NA";

  const page = pagination.page || 1;
  const totalPages = Math.max(1, pagination.totalPages || 1);
  const from = pagination.total ? (page - 1) * pagination.limit + 1 : 0;
  const to = Math.min(page * pagination.limit, pagination.total);
  const cardClass = {
    New: "success",
    Contacted: "purple",
    Closed: "danger",
  };
  return (
    <div className="course-enquiries-page">
      <div className="page-header">
        <div>

          <h1>Course Enquiries</h1>
          <p>Track, review and manage enquiries submitted through your website.</p>
        </div>
        <button type="button" className="themebtn enquiries-refresh-btn"
          onClick={() => loadEnquiries(page)} disabled={loading}>
          <FiRefreshCw className={loading ? "enquiries-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="enquiries-stat-grid">
        {STATUS_OPTIONS.map((item) => {
          const Icon = STATUS_META[item].icon;
          return (
            <button type="button"
              key={item}
              className={`dashboard-stat-card card-${cardClass[item]} ${status === item ? "selected" : ""
                }`}
              onClick={() => setStatus(status === item ? "" : item)}
              aria-pressed={status === item}>
              <div className="stat-card-top">
                <div className={`stat-icon stat-icon-${cardClass[item]} `}>
                  <Icon />
                </div>
              </div>
              <div className="stat-card-body">
                <span className="stat-card-title">{item} enquiries</span>
                <strong className="stat-card-value">{counts[item] || 0}</strong>
                {/* <p>{STATUS_META[item].caption}</p> */}
              </div>

            </button>
          );
        })}
      </div>

      <section className="common-card">
        <div className="panel-header">
          <div>
            <h3>All enquiries</h3>
            <p>Review applicant details and take action on each enquiry.</p>
          </div>
          <div className="enquiries-toolbar">
            <div className="input-search">
              <FiSearch />
              <input type="search" value={search}
                placeholder="Search name, email, phone or course..."
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search enquiries" />
              {search && <button type="button" onClick={() => setSearch("")}
                aria-label="Clear search"><FiX /></button>}
            </div>
            <div className="input-search">
              <select className="enquiries-status-filter" value={status}
                onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status">
                <option value="">All statuses</option>
                {STATUS_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
          </div>
        </div>



        <div className="common-table-wrapper">
          <table className="common-table">
            <thead><tr>
              <th>Applicant</th> <th>Contact</th> <th>Enquire Type</th><th> Date</th><th>Status</th> <th>Message</th> <th>Action</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="enquiries-empty">
                  <span className="enquiries-loading-spinner" />
                  <strong>Loading enquiries</strong><small>Please wait while we fetch the latest records.</small>
                </td></tr>
              ) : enquiries.length === 0 ? (
                <tr><td colSpan="5" className="enquiries-empty">
                  <span className="enquiries-empty-icon"><FiMessageSquare /></span>
                  <strong>No enquiries found</strong>
                  <small>{search || status ? "Try changing your search or filter." : "New website enquiries will appear here."}</small>
                  {(search || status) && <button className="enquiries-reset-filter" type="button"
                    onClick={() => { setSearch(""); setStatus(""); }}>Clear filters</button>}
                </td></tr>
              ) : enquiries.map((item) => (
                <tr key={item._id}>
                  <td>
                    <div className="admission-student-profile">
                      <div className="admission-student-fallback">{initials(item.fullName)}</div>
                        <div className="admission-student-info">
                          <strong>{item.fullName || "Unnamed applicant"}</strong>
                        </div>
                     
                    </div>
                  </td>
                  <td>
                    <div className="contact-details">
                      <div className="contact-li"> <IoIosCall />  <span>{item.phone}</span></div>
                      <div className="contact-li"> <MdOutgoingMail /> <span>{item.email || "-"}</span></div>
                    </div>
                  </td>
                  <td> {item.preparingFor || "Not specified"}</td>
                  <td>
                    
                  
                  
 <div className="contact-details">
                      <div className="contact-li"> <MdDateRange />  <span>{formatDate(item.createdAt)}</span></div>
                    </div>
 </td>
                  <td><span className={`enquiry-status enquiry-status-${(item.status || "new").toLowerCase()}`}>
                    <i /> {item.status || "New"}
                  </span></td>

                  <td>
                    <div className="discription">
                      { item.message}
                    </div>
                  </td>
                  <td>
                    <div className="student-actions">
                    <button className="tooltip" data-tooltip="Update Status" type="button" title="View enquiry" aria-label="View enquiry"
                      onClick={() => openEnquiry(item._id)}><FiEdit2 /></button>
                    <button className="tooltip"  data-tooltip="Delete Permanently" type="button"  aria-label="Delete enquiry"
                      onClick={() => deleteEnquiry(item)}><FiTrash2 /></button>
                  </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="enquiries-pagination">
          <span>Showing <strong>{from}–{to}</strong> of <strong>{pagination.total}</strong> enquiries</span>
          <div className="enquiries-pagination-controls">
            <button type="button" disabled={page <= 1 || loading}
              onClick={() => loadEnquiries(page - 1)} aria-label="Previous page"><FiChevronLeft /></button>
            <span>Page <strong>{page}</strong> of {totalPages}</span>
            <button type="button" disabled={page >= totalPages || loading}
              onClick={() => loadEnquiries(page + 1)} aria-label="Next page"><FiChevronRight /></button>
          </div>
        </div>
      </section>

      {selected && (
        <div className="enquiry-modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelected(null);
        }}>
          <section className="enquiry-modal" role="dialog" aria-modal="true" aria-labelledby="enquiry-modal-title">
            <header className="enquiry-modal-header">
              <div>
                <span className="enquiry-modal-eyebrow">ENQUIRY DETAILS</span>
                <h2 id="enquiry-modal-title">{selected.fullName}</h2>
                
              </div>
              <button type="button" onClick={() => setSelected(null)} aria-label="Close"><FiX /></button>
            </header>

            <div className="enquiry-modal-content">
              <div className="enquiry-status-control">
                <div><label htmlFor="enquiry-status">Update Enquiry Status</label>
                  </div>
                <select id="enquiry-status" value={selected.status || "New"}
                  disabled={updatingStatus}
                  onChange={(event) => updateStatus(selected._id, event.target.value)}>
                  {STATUS_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>

              <div className="enquiry-modal-actions">
                {selected.phone && <a className="enquiry-contact-action" href={`tel:${selected.phone}`}><FiPhone /> Call applicant</a>}
                <a className="enquiry-contact-action enquiry-email-action" href={`mailto:${selected.email}`}><FiMail /> Reply by email</a>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
