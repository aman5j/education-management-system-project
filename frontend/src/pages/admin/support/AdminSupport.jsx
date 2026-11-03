
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

const getError = (error) =>
  error.response?.data?.message || "Something went wrong. Please try again.";

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
  return [student.firstName, student.surname].filter(Boolean).join(" ") ||
    student.name ||
    "Student";
};

export default function AdminSupport() {
  const [stats, setStats] = useState({
    total: 0,
    Open: 0,
    "In Progress": 0,
    Resolved: 0,
    Closed: 0,
  });
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
  });

  const loadStats = useCallback(async () => {
    try {
      const response = await supportService.getAdminStats();
      setStats(response.data || {});
    } catch (err) {
      setError(getError(err));
    }
  }, []);

  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = {
        page,
        limit: 10,
        ...(statusFilter !== "All" ? { status: statusFilter } : {}),
        ...(priorityFilter ? { priority: priorityFilter } : {}),
        ...(categoryFilter ? { category: categoryFilter } : {}),
        ...(search.trim() ? { search: search.trim() } : {}),
      };

      const response = await supportService.getAdminTickets(params);
      setTickets(response.data?.tickets || []);
      setPagination(
        response.data?.pagination || { total: 0, totalPages: 1 }
      );
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, priorityFilter, categoryFilter, search]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    const timer = setTimeout(() => loadTickets(), 300);
    return () => clearTimeout(timer);
  }, [loadTickets]);

  const openTicket = async (ticket) => {
    try {
      setSelectedTicket(ticket);
      setDetailLoading(true);
      setError("");

      const [ticketResponse, messageResponse] = await Promise.all([
        supportService.getAdminTicket(ticket._id),
        supportService.getAdminMessages(ticket._id),
      ]);

      setSelectedTicket(ticketResponse.data);
      setMessages(messageResponse.data || []);
    } catch (err) {
      setError(getError(err));
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshSelected = async () => {
    if (!selectedTicket) return;

    const [ticketResponse, messageResponse] = await Promise.all([
      supportService.getAdminTicket(selectedTicket._id),
      supportService.getAdminMessages(selectedTicket._id),
    ]);

    setSelectedTicket(ticketResponse.data);
    setMessages(messageResponse.data || []);
  };

  const handleReply = async (event) => {
    event.preventDefault();
    if (!reply.trim() || !selectedTicket) return;

    try {
      setSubmitting(true);
      setError("");

      await supportService.sendAdminMessage(
        selectedTicket._id,
        reply.trim()
      );

      setReply("");
      await refreshSelected();
      await loadTickets();
    } catch (err) {
      setError(getError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatus = async (status) => {
    if (!selectedTicket) return;

    try {
      setSubmitting(true);
      setError("");

      const response = await supportService.updateStatus(
        selectedTicket._id,
        status
      );

      setSelectedTicket(response.data);
      await Promise.all([loadStats(), loadTickets()]);
    } catch (err) {
      setError(getError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePriority = async (priority) => {
    if (!selectedTicket) return;

    try {
      setSubmitting(true);
      setError("");

      const response = await supportService.updatePriority(
        selectedTicket._id,
        priority
      );

      setSelectedTicket(response.data);
      await loadTickets();
    } catch (err) {
      setError(getError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const closeTicket = () => {
    setSelectedTicket(null);
    setMessages([]);
    setReply("");
  };

  const student = selectedTicket?.student_id;

  return (
    <div className="admin-support">
      <div className="admin-support__heading">
        <div>
          <span className="admin-support__eyebrow">STUDENT SERVICES</span>
          <h1>HelpDesk & Support</h1>
          <p>Review student issues and manage support conversations.</p>
        </div>

        <button
          className="as-refresh"
          onClick={() => {
            loadStats();
            loadTickets();
            if (selectedTicket) refreshSelected();
          }}
          disabled={loading}
        >
          <FiRefreshCw /> Refresh
        </button>
      </div>

      {error && (
        <div className="as-alert">
          {error}
          <button onClick={() => setError("")}>×</button>
        </div>
      )}

      <section className="as-stats">
        <div className="as-stat as-stat--total">
          <span><FiTag /></span>
          <strong>{stats.total || 0}</strong>
          <small>Total Tickets</small>
        </div>
        <div className="as-stat as-stat--open">
          <span><FiClock /></span>
          <strong>{stats.Open || 0}</strong>
          <small>Open</small>
        </div>
        <div className="as-stat as-stat--progress">
          <span><FiRefreshCw /></span>
          <strong>{stats["In Progress"] || 0}</strong>
          <small>In Progress</small>
        </div>
        <div className="as-stat as-stat--resolved">
          <span><FiCheckCircle /></span>
          <strong>{stats.Resolved || 0}</strong>
          <small>Resolved</small>
        </div>
        <div className="as-stat as-stat--closed">
          <span><FiShield /></span>
          <strong>{stats.Closed || 0}</strong>
          <small>Closed</small>
        </div>
      </section>

      {selectedTicket ? (
        <section className="as-detail">
          <div className="as-detail__header">
            <div>
              <button className="as-back" onClick={closeTicket}>
                ← Back to all tickets
              </button>
              <div className="as-detail__ticket-id">
                {selectedTicket.ticketNumber}
              </div>
              <h2>{selectedTicket.title}</h2>
            </div>
            <span className={`as-status as-status--${statusClass(selectedTicket.status)}`}>
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
                <strong>{selectedTicket.mobile || student?.mobile || "—"}</strong>
              </div>
              <div className="as-info__row">
                <span>Category</span>
                <strong>{selectedTicket.category}</strong>
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
                  value={selectedTicket.priority}
                  onChange={(e) => handlePriority(e.target.value)}
                  disabled={submitting}
                >
                  {PRIORITIES.map((priority) => (
                    <option key={priority}>{priority}</option>
                  ))}
                </select>
              </div>

              <div className="as-control">
                <label htmlFor="as-status">Ticket Status</label>
                <select
                  id="as-status"
                  value={selectedTicket.status}
                  onChange={(e) => handleStatus(e.target.value)}
                  disabled={submitting}
                >
                  {STATUSES.filter((status) => status !== "All").map((status) => (
                    <option key={status}>{status}</option>
                  ))}
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
                  className="as-refresh as-refresh--small"
                  onClick={refreshSelected}
                  disabled={detailLoading}
                >
                  <FiRefreshCw />
                </button>
              </div>

              {detailLoading ? (
                <div className="as-empty">Loading conversation…</div>
              ) : (
                <div className="as-messages">
                  {messages.length === 0 ? (
                    <div className="as-empty">No messages in this conversation yet.</div>
                  ) : (
                    messages.map((message) => {
                      const isAdmin = message.sender_role === "admin";

                      return (
                        <div
                          key={message._id}
                          className={`as-message ${isAdmin ? "as-message--admin" : "as-message--student"}`}
                        >
                          <div className="as-message__meta">
                            {isAdmin ? "Support Team" : getStudentName(student)}
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
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Type your reply to the student…"
                    maxLength={3000}
                    required
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
            <span className="as-total-label">{pagination.total || 0} tickets</span>
          </div>

          <div className="as-filters">
            <label className="as-search">
              <FiSearch />
              <input
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
                placeholder="Search ticket, title or student…"
              />
            </label>

            <label>
              <FiFilter />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setPage(1);
                  setStatusFilter(e.target.value);
                }}
              >
                {STATUSES.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>

            <label>
              <select
                value={priorityFilter}
                onChange={(e) => {
                  setPage(1);
                  setPriorityFilter(e.target.value);
                }}
              >
                <option value="">All Priorities</option>
                {PRIORITIES.map((priority) => (
                  <option key={priority}>{priority}</option>
                ))}
              </select>
            </label>

            <label>
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setPage(1);
                  setCategoryFilter(e.target.value);
                }}
              >
                <option value="">All Categories</option>
                {CATEGORIES.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </label>
          </div>

          {loading ? (
            <div className="as-empty">Loading support tickets…</div>
          ) : tickets.length === 0 ? (
            <div className="as-empty">No support tickets found.</div>
          ) : (
            <>
              <div className="as-ticket-list">
                {tickets.map((ticket) => (
                  <button
                    key={ticket._id}
                    className="as-ticket-row"
                    onClick={() => openTicket(ticket)}
                  >
                    <div className="as-ticket-row__main">
                      <span className="as-ticket-number">{ticket.ticketNumber}</span>
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
                    <span className={`as-priority as-priority--${ticket.priority?.toLowerCase()}`}>
                      {ticket.priority}
                    </span>
                    <span className={`as-status as-status--${statusClass(ticket.status)}`}>
                      {ticket.status}
                    </span>
                    <time>{formatDate(ticket.createdAt)}</time>
                  </button>
                ))}
              </div>

              <div className="as-pagination">
                <span>
                  Page {page} of {pagination.totalPages || 1}
                </span>
                <div>
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((current) => current - 1)}
                  >
                    Previous
                  </button>
                  <button
                    disabled={page >= (pagination.totalPages || 1)}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
