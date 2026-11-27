
import { useCallback, useEffect, useState } from "react";
import supportIcon from "../../../assets/aaa.png";

import {
  FiCheckCircle,
  FiClock,
  FiFilter,
  FiMessageCircle,
  FiRefreshCw,
  FiSearch,
  FiSend,
  FiShield,
  FiTag,
    FiCalendar,
     FiAlertCircle,
} from "react-icons/fi";
import { HiStatusOnline } from "react-icons/hi";
import { IoIosCall } from "react-icons/io";

import supportService from "../../../services/supportService";
import Pagination from "../../../components/common/Pagination";
import notification, {
  getApiErrorMessage,
} from "../../../utils/notification";

import "./AdminSupport.css";

const STATUSES = ["All", "Open", "In Progress", "Resolved", "Closed"];
const PRIORITIES = ["Low", "Medium", "High", "Urgent"];

const CATEGORIES = [
  "Academic Query",
  "General Inquiry",
  "Technical Issue",
  "Fees & Payments",
  "Examination",
  "Attendance",
  "Other",
];

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const EMPTY_STATS = {
  total: 0,
  Open: 0,
  "In Progress": 0,
  Resolved: 0,
  Closed: 0,
};

const EMPTY_PAGINATION = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
};

const unwrap = (response) => response?.data ?? response ?? {};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusClass = (status = "Open") =>
  status.toLowerCase().replace(/\s+/g, "-");

const getStudentName = (student) => {
  if (!student) return "Student";

  return (
    [student.firstName, student.surname].filter(Boolean).join(" ") ||
    student.name ||
    "Student"
  );
};


const getStudentInitials = (student) => {
  const name = getStudentName(student);

  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
};

const getStudentImageUrl = (imagePath) => {
  if (!imagePath || typeof imagePath !== "string") return "";

  const image = imagePath.trim();

  if (/^(https?:|data:|blob:)/i.test(image)) {
    return image;
  }

  const apiUrl =
    import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  const serverOrigin = apiUrl
    .replace(/\/api\/?$/i, "")
    .replace(/\/+$/, "");

  return `${serverOrigin}/${image.replace(/^\/+/, "")}`;
};

const getMessage = (response, fallback) =>
  response?.message || fallback;

export default function AdminSupport() {
  const [stats, setStats] = useState(EMPTY_STATS);
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);

  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");

  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);

  const [selectedTicketLoadingError, setSelectedTicketLoadingError] =
    useState(false);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);

    try {
      const response = await supportService.getAdminStats();
      const data = unwrap(response);

      setStats(data.data ?? data);
    } catch (error) {
      notification.error(getApiErrorMessage(error));
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadTickets = useCallback(async () => {
    setLoading(true);

    try {
      const params = {
        page,
        limit: pageSize,
        ...(statusFilter !== "All" ? { status: statusFilter } : {}),
        ...(priorityFilter ? { priority: priorityFilter } : {}),
        ...(categoryFilter ? { category: categoryFilter } : {}),
        ...(search.trim() ? { search: search.trim() } : {}),
      };

      const response = await supportService.getAdminTickets(params);
      const data = unwrap(response);
      const result = data.data ?? data;

      const records = Array.isArray(result.tickets)
        ? result.tickets
        : [];

      const pageInfo = result.pagination ?? {
        ...EMPTY_PAGINATION,
        page,
        limit: pageSize,
        total: records.length,
      };

      setTickets(records);
      setPagination(pageInfo);

      // If filters/deletions cause the current page to become invalid,
      // move to the last available page.
      if (
        pageInfo.totalPages > 0 &&
        page > pageInfo.totalPages
      ) {
        setPage(pageInfo.totalPages);
      }
    } catch (error) {
      setTickets([]);
      setPagination({
        ...EMPTY_PAGINATION,
        page,
        limit: pageSize,
      });

      notification.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [
    page,
    pageSize,
    statusFilter,
    priorityFilter,
    categoryFilter,
    search,
  ]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadTickets();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [loadTickets]);

  const loadSelectedTicket = useCallback(async (ticketId) => {
    setDetailLoading(true);
    setSelectedTicketLoadingError(false);

    try {
      const [ticketResponse, messageResponse] = await Promise.all([
        supportService.getAdminTicket(ticketId),
        supportService.getAdminMessages(ticketId),
      ]);

      const ticketPayload = unwrap(ticketResponse);
      const messagePayload = unwrap(messageResponse);

      const ticket = ticketPayload.data ?? ticketPayload;
      const messageList = messagePayload.data ?? messagePayload;

      setSelectedTicket(ticket);
      setMessages(Array.isArray(messageList) ? messageList : []);

      return true;
    } catch (error) {
      setSelectedTicketLoadingError(true);
      notification.error(getApiErrorMessage(error));
      return false;
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const openTicket = async (ticket) => {
    setSelectedTicket(ticket);
    setMessages([]);
    setReply("");
    await loadSelectedTicket(ticket._id);
  };

  const refreshSelected = async () => {
    if (!selectedTicket?._id) return;

    await loadSelectedTicket(selectedTicket._id);
  };

  const handleRefresh = async () => {
    await Promise.all([loadStats(), loadTickets()]);

    if (selectedTicket?._id) {
      await refreshSelected();
    }

    notification.success("Support information refreshed.");
  };

  const handleReply = async (event) => {
    event.preventDefault();

    if (!reply.trim() || !selectedTicket || submitting) return;

    if (reply.trim().length > 3000) {
      notification.warning("Reply cannot exceed 3000 characters.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await supportService.sendAdminMessage(
        selectedTicket._id,
        reply.trim()
      );

      setReply("");

      await refreshSelected();
      await loadTickets();

      notification.success(
        getMessage(response, "Reply sent successfully.")
      );
    } catch (error) {
      notification.error(getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatus = async (nextStatus) => {
    if (!selectedTicket || submitting) return;

    const currentStatus = selectedTicket.status;

    if (nextStatus === currentStatus) return;

    const needsConfirmation = ["Resolved", "Closed", "Open"].includes(
      nextStatus
    );

    if (needsConfirmation) {
      const confirmed = await notification.confirm({
        title:
          nextStatus === "Open"
            ? "Reopen this ticket?"
            : `${nextStatus} this ticket?`,
        text:
          nextStatus === "Open"
            ? "The ticket will be reopened and the conversation can continue."
            : nextStatus === "Resolved"
              ? "Mark this support issue as resolved?"
              : "Close this support ticket?",
        confirmText:
          nextStatus === "Open"
            ? "Yes, reopen"
            : `Yes, ${nextStatus.toLowerCase()}`,
        cancelText: "Cancel",
        icon: "question",
        confirmButtonColor:
          nextStatus === "Closed" ? "#dc2626" : "#2563eb",
      });

      if (!confirmed) return;
    }

    setSubmitting(true);

    try {
      const response = await supportService.updateStatus(
        selectedTicket._id,
        nextStatus
      );

      const payload = unwrap(response);
      const updatedTicket = payload.data ?? payload;

      setSelectedTicket(updatedTicket);

      await Promise.all([loadStats(), loadTickets()]);

      notification.success(
        getMessage(response, `Ticket status updated to ${nextStatus}.`)
      );
    } catch (error) {
      notification.error(getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePriority = async (nextPriority) => {
    if (!selectedTicket || submitting) return;

    if (nextPriority === selectedTicket.priority) return;

    setSubmitting(true);

    try {
      const response = await supportService.updatePriority(
        selectedTicket._id,
        nextPriority
      );

      const payload = unwrap(response);
      const updatedTicket = payload.data ?? payload;

      setSelectedTicket((current) => ({
        ...current,
        ...updatedTicket,
      }));

      await loadTickets();

      notification.success(
        getMessage(response, "Ticket priority updated successfully.")
      );
    } catch (error) {
      notification.error(getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const closeTicket = () => {
    setSelectedTicket(null);
    setMessages([]);
    setReply("");
    setSelectedTicketLoadingError(false);
  };

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setPriorityFilter("");
    setCategoryFilter("");
    setPage(1);
  };

  const student = selectedTicket?.student_id;

  return (
    <div className="admin-support">


      {selectedTicket ? (

        <section className="">
          <div class="page-header"><div><h1>Ticket Details</h1><p>View ticket information and conversation with the support team.</p></div>
            <button
              type="button"
              className="themebtn"
              onClick={closeTicket}
            >
              Back to tickets
            </button>

          </div> 
          <div className="sh-detail-layout">
            <aside className="sh-ticket-info common-card">
              <div className="cardbody">
                <div class="sh-ticket-info__banner"><span class="sh-ticket-number"> {selectedTicket.ticketNumber}</span><h2>{selectedTicket.title}</h2><p>{selectedTicket.description}</p></div>

              <div className="sh-ticket-info__details">
                 <div className="sh-info-item">
                    <span className="sh-info-icon sh-info-icon--purple">
                      <FiTag />
                    </span>
                    <div>
                      <small>Category</small>
                      <strong>{selectedTicket.category || "—"}</strong>
                    </div>
                  </div>
                 <div className="sh-info-item">
                                    <span className="sh-info-icon sh-info-icon--blue">
                                      <HiStatusOnline />
                                    </span>
                                    <div>
                                      <small>Status</small>
                                      <span
                                        className={`sh-status sh-status--${statusClass(
                                          selectedTicket.status
                                        )}`}
                                      >
                                        {selectedTicket.status}
                                      </span>
                                    </div>
                                  </div>

                

                   <div className="sh-info-item">
                                      <span className="sh-info-icon sh-info-icon--red">
                                        <FiAlertCircle />
                                      </span>
                                      <div>
                                        <small>Priority</small>
                                        <strong
                                          className={`sh-priority sh-priority--${selectedTicket.priority?.toLowerCase()}`}
                                        >
                                          {selectedTicket.priority}
                                        </strong>
                                      </div>
                                    </div>


              </div>
             
             <div className="sh-info-item">
                                 <span className="sh-info-icon sh-info-icon--blue">
                                   <FiCalendar />
                                 </span>
                                 <div>
                                   <small>Created On</small>
                                   <strong>
                                     {formatDate(selectedTicket.createdAt)}
                                   </strong>
                                 </div>
                               </div>


 <div className="sh-info-item">
                    <span className="sh-info-icon sh-info-icon--green">
                      <FiClock />
                    </span>
                    <div>
                      <small>Last Updated</small>
                      <strong>
                        {formatDate(selectedTicket.lastMessageAt)}
                      </strong>
                    </div>
                  </div>

              

              

              

              <div className="input-search">
                <label>Ticket Status</label>
                <select
                  id="as-status"
                  value={selectedTicket.status}
                  onChange={(event) => handleStatus(event.target.value)}
                  disabled={submitting}
                >
                  {STATUSES.filter((status) => status !== "All").map(
                    (status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    )
                  )}
                </select>
              </div>

             
              </div>
            </aside>

            <div className="sh-chat-panel common-card">
              <div className="sh-chat-panel__header">
                
                 <div className="as-info__student">
                <div className="as-avatar">
                {getStudentInitials(student)}

                {getStudentImageUrl(student?.profileImage) && (
                  <img
                    src={getStudentImageUrl(student?.profileImage)}
                    alt={getStudentName(student)}
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                )}
              </div>

                <div>
                  <strong>{getStudentName(student)}</strong>
                  <small>Roll No: {student?.rollNo || "—"}</small>
                 
                </div>
              </div>

                 <div style={{display:'flex'}} >
                  {student?.mobile ? (
  <a
    className="calltostudent"
    href={`tel:${student.mobile.replace(/[^\d+]/g, "")}`}
    aria-label={`Call ${student?.name || student.mobile}`}
    title={`Call ${student.mobile}`}
  >
    <IoIosCall aria-hidden="true" />
  </a>
) : (
  <span aria-label="No mobile number available">—</span>
)}

                <button
                  type="button"
                  className="sh-chat-refresh"
                  onClick={refreshSelected}
                  disabled={detailLoading}
                  aria-label="Refresh conversation"
                >
                  <FiRefreshCw />
                </button>
                 </div>
              </div>
              <div className="sh-chat">
                
                  
              {detailLoading ? (
                <div className="as-empty">
                  Loading conversation…
                </div>
              ) : selectedTicketLoadingError ? (
                <div className="as-empty">
                  <p>Unable to load this conversation.</p>
                  <button
                    type="button"
                    className="as-refresh"
                    onClick={refreshSelected}
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <div className="sh-chat__messages">
                  {messages?.[0]?.createdAt && (
  <div className="sh-chat-date">
    <span>{formatDate(messages[0].createdAt)}</span>
  </div>
)}
                  {messages.length === 0 ? (
                    <div className="as-empty">
                      No messages in this conversation yet.
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isAdmin = message.sender_role === "admin";

                      return (
                        <div
                          key={message._id}
                          className={`sh-message  ${isAdmin
                              ? "sh-message--mine"
                              : "sh-message--support"
                            }`}
                        >
                          <div className="sh-message__body">
                            
                              <div className="sh-message__author">
                                <strong>{isAdmin
                              ? "You"
                              : getStudentName(student)}</strong>
                                   <time>{formatDate(message.createdAt)}</time>
                              </div>
                           
                            <div className="sh-message__bubble">{message.message}</div>
                          </div>

                          <div
                            className={`sh-message__avatar ${
                              isAdmin
                                ? "sh-message__avatar--support"
                                : "sh-message__avatar--student"
                            }`}
                          >
                            {isAdmin ? (
                              <img
                                src={supportIcon}
                                alt="Support Team"
                              />
                            ) : (
                              <>
                                {getStudentInitials(student)}

                                {getStudentImageUrl(student?.profileImage) && (
                                  <img
                                    src={getStudentImageUrl(student?.profileImage)}
                                    alt={getStudentName(student)}
                                    onError={(event) => {
                                      event.currentTarget.style.display = "none";
                                    }}
                                  />
                                )}
                              </>
                            )}
                          </div>

                          
                        </div>
                      );
                    })
                  )}
                </div>
              )}



              {["Resolved", "Closed"].includes(selectedTicket.status) ? (
                <div className="as-closed-note">
                  This ticket is {selectedTicket.status.toLowerCase()}.
                  Change the status to Open to continue the conversation.
                </div>
              ) : (
                <form className="sh-reply" onSubmit={handleReply}>
                  <div className="sh-reply__input-wrap">
                  <input
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    placeholder="Type your reply to the student…"
                    maxLength={3000}
                    required
                    disabled={submitting}
                  />
 <span className="sh-reply__counter">
                        {reply.length}/3000
                      </span>
                  <button
                    type="submit"
                    disabled={submitting || !reply.trim()}
                    aria-label="Send reply"
                  >
                    <FiSend />
                  </button>
                  </div>
                </form>
              )}
              </div>
            </div>
          </div>
        </section>
      ) : (

        <section className="">
          <div class="page-header"><div>
            <h1>HelpDesk & Support</h1>
            <p>Review student issues and manage support conversations.</p>

          </div>
            <button
              type="button"
              className="themebtn"
              onClick={handleRefresh}
              disabled={loading || statsLoading || submitting}
            >
              <FiRefreshCw /> Refresh
            </button>
          </div>

          <section className="as-stats">

            <article class="dashboard-stat-card card-success">
              <div class="stat-card-top">
                <div class="stat-icon stat-icon-success">
                  <FiTag />
                </div>
              </div>
              <div class="stat-card-body">
                <span class="stat-card-title">Total Tickets</span>
                <strong class="stat-card-value">{statsLoading ? "—" : stats.total || 0}</strong>

              </div>
            </article>

            <article class="dashboard-stat-card card-warning">
              <div class="stat-card-top">
                <div class="stat-icon stat-icon-warning">
                  <FiClock />
                </div>
              </div>
              <div class="stat-card-body">
                <span class="stat-card-title">Open</span>
                <strong class="stat-card-value">{statsLoading ? "—" : stats.Open || 0}</strong>

              </div>
            </article>




            <article class="dashboard-stat-card card-purple">
              <div class="stat-card-top">
                <div class="stat-icon stat-icon-purple">
                  <FiRefreshCw />
                </div>
              </div>
              <div class="stat-card-body">
                <span class="stat-card-title">In Progress</span>
                <strong class="stat-card-value"> {statsLoading ? "—" : stats["In Progress"] || 0}</strong>

              </div>
            </article>

            <article class="dashboard-stat-card card-bluewarning">
              <div class="stat-card-top">
                <div class="stat-icon stat-icon-bluewarning">
                  <FiCheckCircle />
                </div>
              </div>
              <div class="stat-card-body">
                <span class="stat-card-title">Resolved</span>
                <strong class="stat-card-value"> {statsLoading ? "—" : stats.Resolved || 0}</strong>

              </div>
            </article>

            <article class="dashboard-stat-card card-danger">
              <div class="stat-card-top">
                <div class="stat-icon stat-icon-danger">
                  <FiShield />
                </div>
              </div>
              <div class="stat-card-body">
                <span class="stat-card-title">Closed</span>
                <strong class="stat-card-value">{statsLoading ? "—" : stats.Closed || 0}</strong>

              </div>
            </article>

          </section>

          <div className="common-card-filters">
            <div className="input-search">
              <FiSearch />
              <input
                value={search}
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
                placeholder="Search ticket, title or student…"
              />
            </div>

            <div className="input-search">
              <select
                value={statusFilter}
                onChange={(event) => {
                  setPage(1);
                  setStatusFilter(event.target.value);
                }}
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status === "All" ? "All Statuses" : status}
                  </option>
                ))}
              </select>
            </div>

            <div className="input-search">
              <select
                value={priorityFilter}
                onChange={(event) => {
                  setPage(1);
                  setPriorityFilter(event.target.value);
                }}
              >
                <option value="">All Priorities</option>
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </div>

            <div className="input-search">
              <select
                value={categoryFilter}
                onChange={(event) => {
                  setPage(1);
                  setCategoryFilter(event.target.value);
                }}
              >
                <option value="">All Categories</option>
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="common-card">
            <div className="panel-header">
              <div>
                <h3><FiTag /> All Support Tickets</h3>
                <p>Search, filter and open a ticket to manage it.</p>
              </div>

              <span className="as-total-label">
                {pagination.total || 0} tickets
              </span>
            </div>



            {loading ? (
              <div className="as-empty">
                Loading support tickets…
              </div>
            ) : tickets.length === 0 ? (
              <div className="as-empty">
                No support tickets found.
                {(search || statusFilter !== "All" || priorityFilter || categoryFilter) && (
                  <div>
                    <button
                      type="button"
                      className="as-refresh"
                      onClick={resetFilters}
                    >
                      Clear filters
                    </button>
                  </div>
                )}
              </div>
            ) : (

              <div className="common-table-wrapper">
                <table className="common-table">
                  <thead>
                    <tr>
                      <th>Ticket Details</th>
                      <th>Student</th>
                      <th>Category</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Created Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {tickets.map((ticket) => (
                      <tr
                        key={ticket._id}
                        onClick={() => openTicket(ticket)}
                        className="as-ticket-table-row"
                      >
                        <td>
                          <div className="as-ticket-info">
                            <span className="as-ticket-number">
                              {ticket.ticketNumber}
                            </span>
                            <strong style={{ whiteSpace: 'wrap' }}>{ticket.title}</strong>
                          </div>
                        </td>

                        <td>
                          <div className="as-ticket-student">
                            <strong>{getStudentName(ticket.student_id)}</strong>
                            <small>
                              {ticket.student_id?.rollNo || "—"}
                            </small>
                          </div>
                        </td>

                        <td>
                          <span className="as-category-badge">
                            {ticket.category}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`as-priority as-priority--${ticket.priority?.toLowerCase()}`}
                          >
                            <span className="as-priority-dot" />
                            {ticket.priority}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`as-status as-status--${statusClass(ticket.status)}`}
                          >
                            {ticket.status}
                          </span>
                        </td>

                        <td>
                          <span className="as-ticket-date">
                            {formatDate(ticket.createdAt)}
                          </span>
                        </td>

                        <td className="la-actions">
                          <button
                            type="button"
                            className="la-approve"
                            onClick={(e) => {
                              e.stopPropagation();
                              openTicket(ticket);
                            }}
                            disabled={loading}
                            aria-label="View ticket"
                          >
                            View Details

                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {tickets.length === 0 && (
                  <div className="as-ticket-empty">
                    <strong>No support tickets found</strong>
                    <p>New student support requests will appear here.</p>
                  </div>
                )}
              </div>

            )}

            {!loading && pagination.total > 0 && (
              <Pagination
                page={page}
                totalPages={pagination.totalPages || 1}
                total={pagination.total || 0}
                itemCount={tickets.length}
                itemLabel="tickets"
                limit={pageSize}
                loading={loading}
                onPageChange={setPage}
                onLimitChange={(limit) => {
                  if (!PAGE_SIZE_OPTIONS.includes(limit)) return;
                  setPageSize(limit);
                  setPage(1);
                }}
              />
            )}
          </div>
        </section>
      )}
    </div>
  );
}
