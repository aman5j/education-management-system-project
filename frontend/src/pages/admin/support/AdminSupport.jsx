
import { useCallback, useEffect, useState } from "react";

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
} from "react-icons/fi";

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
      <div className="admin-support__heading">
        <div>
          <span className="admin-support__eyebrow">
            STUDENT SERVICES
          </span>
          <h1>HelpDesk & Support</h1>
          <p>
            Review student issues and manage support conversations.
          </p>
        </div>

        <button
          type="button"
          className="as-refresh"
          onClick={handleRefresh}
          disabled={loading || statsLoading || submitting}
        >
          <FiRefreshCw /> Refresh
        </button>
      </div>

      <section className="as-stats">
        <div className="as-stat as-stat--total">
          <span><FiTag /></span>
          <strong>{statsLoading ? "—" : stats.total || 0}</strong>
          <small>Total Tickets</small>
        </div>

        <div className="as-stat as-stat--open">
          <span><FiClock /></span>
          <strong>{statsLoading ? "—" : stats.Open || 0}</strong>
          <small>Open</small>
        </div>

        <div className="as-stat as-stat--progress">
          <span><FiRefreshCw /></span>
          <strong>
            {statsLoading ? "—" : stats["In Progress"] || 0}
          </strong>
          <small>In Progress</small>
        </div>

        <div className="as-stat as-stat--resolved">
          <span><FiCheckCircle /></span>
          <strong>{statsLoading ? "—" : stats.Resolved || 0}</strong>
          <small>Resolved</small>
        </div>

        <div className="as-stat as-stat--closed">
          <span><FiShield /></span>
          <strong>{statsLoading ? "—" : stats.Closed || 0}</strong>
          <small>Closed</small>
        </div>
      </section>

      {selectedTicket ? (
        <section className="as-detail">
          <div className="as-detail__header">
            <div>
              <button
                type="button"
                className="as-back"
                onClick={closeTicket}
              >
                ← Back to all tickets
              </button>

              <div className="as-detail__ticket-id">
                {selectedTicket.ticketNumber}
              </div>

              <h2>{selectedTicket.title}</h2>
            </div>

            <span
              className={`as-status as-status--${statusClass(
                selectedTicket.status
              )}`}
            >
              {selectedTicket.status}
            </span>
          </div>

          <div className="as-detail__layout">
            <aside className="as-info">
              <h3>Ticket Information</h3>

              <div className="as-info__student">
                <div className="as-avatar">
                  {getStudentName(student).charAt(0).toUpperCase()}
                </div>

                <div>
                  <strong>{getStudentName(student)}</strong>
                  <small>Roll No: {student?.rollNo || "—"}</small>
                </div>
              </div>

              <div className="as-info__row">
                <span>Mobile</span>
                <strong>
                  {selectedTicket.mobile || student?.mobile || "—"}
                </strong>
              </div>

              <div className="as-info__row">
                <span>Category</span>
                <strong>{selectedTicket.category || "—"}</strong>
              </div>

              <div className="as-info__row">
                <span>Created</span>
                <strong>{formatDate(selectedTicket.createdAt)}</strong>
              </div>

              <div className="as-info__row">
                <span>Last Activity</span>
                <strong>{formatDate(selectedTicket.lastMessageAt)}</strong>
              </div>

              <div className="as-control">
                <label htmlFor="as-priority">Priority</label>
                <select
                  id="as-priority"
                  value={selectedTicket.priority || "Medium"}
                  onChange={(event) => handlePriority(event.target.value)}
                  disabled={submitting}
                >
                  {PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </div>

              <div className="as-control">
                <label htmlFor="as-status">Ticket Status</label>
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

              <div className="as-description">
                <h4>Issue Description</h4>
                <p>{selectedTicket.description}</p>
              </div>
            </aside>

            <div className="as-chat-panel">
              <div className="as-chat-panel__heading">
                <div>
                  <h3><FiMessageCircle /> Conversation</h3>
                  <p>Reply directly to the student.</p>
                </div>

                <button
                  type="button"
                  className="as-refresh as-refresh--small"
                  onClick={refreshSelected}
                  disabled={detailLoading}
                  aria-label="Refresh conversation"
                >
                  <FiRefreshCw />
                </button>
              </div>

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
                <div className="as-messages">
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
                          className={`as-message ${
                            isAdmin
                              ? "as-message--admin"
                              : "as-message--student"
                          }`}
                        >
                          <div className="as-message__meta">
                            {isAdmin
                              ? "Support Team"
                              : getStudentName(student)}
                            <time>{formatDate(message.createdAt)}</time>
                          </div>

                          <p>{message.message}</p>
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
                <form className="as-reply" onSubmit={handleReply}>
                  <input
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    placeholder="Type your reply to the student…"
                    maxLength={3000}
                    required
                    disabled={submitting}
                  />

                  <button
                    type="submit"
                    disabled={submitting || !reply.trim()}
                    aria-label="Send reply"
                  >
                    <FiSend />
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      ) : (
        <section className="as-list-panel">
          <div className="as-list-panel__heading">
            <div>
              <h2><FiTag /> All Support Tickets</h2>
              <p>Search, filter and open a ticket to manage it.</p>
            </div>

            <span className="as-total-label">
              {pagination.total || 0} tickets
            </span>
          </div>

          <div className="as-filters">
            <label className="as-search">
              <FiSearch />
              <input
                value={search}
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
                placeholder="Search ticket, title or student…"
              />
            </label>

            <label>
              <FiFilter />
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
            </label>

            <label>
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
            </label>

            <label>
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
            </label>
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
            <div className="as-ticket-list">
              {tickets.map((ticket) => (
                <button
                  type="button"
                  key={ticket._id}
                  className="as-ticket-row"
                  onClick={() => openTicket(ticket)}
                  disabled={loading}
                >
                  <div className="as-ticket-row__main">
                    <span className="as-ticket-number">
                      {ticket.ticketNumber}
                    </span>

                    <strong>{ticket.title}</strong>

                    <small>
                      {getStudentName(ticket.student_id)}
                      {ticket.student_id?.rollNo
                        ? ` · ${ticket.student_id.rollNo}`
                        : ""}
                    </small>
                  </div>

                  <div className="as-ticket-row__category">
                    {ticket.category}
                  </div>

                  <span
                    className={`as-priority as-priority--${ticket.priority?.toLowerCase()}`}
                  >
                    {ticket.priority}
                  </span>

                  <span
                    className={`as-status as-status--${statusClass(
                      ticket.status
                    )}`}
                  >
                    {ticket.status}
                  </span>

                  <time>{formatDate(ticket.createdAt)}</time>
                </button>
              ))}
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
        </section>
      )}
    </div>
  );
}
