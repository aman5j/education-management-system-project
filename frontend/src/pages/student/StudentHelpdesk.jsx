
import { useCallback, useEffect, useState } from "react";

import {
  FiArrowLeft,
  FiCheckCircle,
  FiClock,
  FiMessageCircle,
  FiPlus,
  FiRefreshCw,
  FiSend,
  FiShield,
  FiTag,
  FiX,
} from "react-icons/fi";


import supportService from "../../services/supportService";
import "./StudentHelpdesk.css";

const CATEGORIES = [
  "Academic Query",
  "General Inquiry",
  "Technical Issue",
  "Fees & Payments",
  "Examination",
  "Attendance",
  "Other",
];

const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const FILTERS = ["All", "Open", "In Progress", "Resolved", "Closed"];

const emptyForm = {
  title: "",
  description: "",
  mobile: "",
  category: "Academic Query",
  priority: "Medium",
};

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

const timeAgo = (value) => {
  if (!value) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value)) / 1000));

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return formatDate(value);
};

const statusClass = (status = "Open") =>
  status.toLowerCase().replace(/\s+/g, "-");

export default function StudentHelpdesk() {
  const [stats, setStats] = useState({
    total: 0,
    Open: 0,
    "In Progress": 0,
    Resolved: 0,
    Closed: 0,
  });
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState("All");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [statsResponse, ticketsResponse] = await Promise.all([
        supportService.getMyStats(),
        supportService.getMyTickets({ page: 1, limit: 50 }),
      ]);

      setStats(statsResponse.data || {});
      setTickets(ticketsResponse.data?.tickets || []);
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const openTicket = async (ticket) => {
    try {
      setDetailLoading(true);
      setError("");
      setSelectedTicket(ticket);
      setShowForm(false);

      const [ticketResponse, messageResponse] = await Promise.all([
        supportService.getMyTicket(ticket._id),
        supportService.getMyMessages(ticket._id),
      ]);

      setSelectedTicket(ticketResponse.data);
      setMessages(messageResponse.data || []);
    } catch (err) {
      setError(getError(err));
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshConversation = async () => {
    if (!selectedTicket || detailLoading) return;

    try {
        setDetailLoading(true);
        setError("");

        const [ticketResponse, messageResponse] = await Promise.all([
        supportService.getMyTicket(selectedTicket._id),
        supportService.getMyMessages(selectedTicket._id),
        ]);

        setSelectedTicket(ticketResponse.data);
        setMessages(messageResponse.data || []);
    } catch (err) {
        setError(getError(err));
    } finally {
        setDetailLoading(false);
    }
    };

  const handleCreateTicket = async (event) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const response = await supportService.createTicket(form);
      setForm(emptyForm);
      setShowForm(false);
      setSuccess("Your support ticket has been submitted.");

      await loadDashboard();

      if (response.data) {
        await openTicket(response.data);
      }
    } catch (err) {
      setError(getError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async (event) => {
    event.preventDefault();
    if (!reply.trim() || !selectedTicket) return;

    try {
      setSubmitting(true);
      setError("");

      await supportService.sendStudentMessage(
        selectedTicket._id,
        reply.trim()
      );

      setReply("");
      const response = await supportService.getMyMessages(selectedTicket._id);
      setMessages(response.data || []);
      await loadDashboard();
    } catch (err) {
      setError(getError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReopen = async () => {
    if (!selectedTicket) return;

    try {
      setSubmitting(true);
      setError("");

      const response = await supportService.reopenMyTicket(selectedTicket._id);
      setSelectedTicket(response.data);
      await loadDashboard();
    } catch (err) {
      setError(getError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const visibleTickets =
    filter === "All"
      ? tickets
      : tickets.filter((ticket) => ticket.status === filter);

  const closeDetails = () => {
    setSelectedTicket(null);
    setMessages([]);
    setReply("");
  };

  return (
    <div className="student-helpdesk">
      <div className="page-header">
        <div>
          <h1>HelpDesk & Support</h1>
          <p>Raise an issue and stay updated until it is resolved.</p>

         
        </div>

          {!selectedTicket && !showForm && (
          <button
            className="themebtn"
            onClick={() => {
              setShowForm(true);
              setSuccess("");
            }}
          >
            <FiPlus /> Raise New Ticket
          </button>
        )}

      </div>


      {error && (
        <div className="sh-alert sh-alert--error">
          {error}
          <button onClick={() => setError("")}><FiX /></button>
        </div>
      )}

      {success && (
        <div className="sh-alert sh-alert--success">
          {success}
          <button onClick={() => setSuccess("")}><FiX /></button>
        </div>
      )}

      {selectedTicket ? (
        <section className="sh-conversation">
          <div className="sh-conversation__top">
            <button className="sh-back" onClick={closeDetails}>
                <FiArrowLeft /> Back to tickets
            </button>

            <div className="sh-conversation__actions">
                <span className={`sh-status sh-status--${statusClass(selectedTicket.status)}`}>
                {selectedTicket.status}
                </span>

                <button
                type="button"
                className="sh-refresh-chat"
                onClick={refreshConversation}
                disabled={detailLoading}
                title="Refresh conversation"
                aria-label="Refresh conversation"
                >
                <FiRefreshCw className={detailLoading ? "sh-refresh-chat--spinning" : ""} />
                </button>
            </div>
            </div>

          <div className="sh-ticket-summary">
            <div>
              <span className="sh-ticket-number">{selectedTicket.ticketNumber}</span>
              <h2>{selectedTicket.title}</h2>
              <p>{selectedTicket.description}</p>
            </div>
            <div className="sh-ticket-meta">
              <span>{selectedTicket.category}</span>
              <span className={`sh-priority sh-priority--${selectedTicket.priority?.toLowerCase()}`}>
                {selectedTicket.priority}
              </span>
              <small>Created {formatDate(selectedTicket.createdAt)}</small>
            </div>
          </div>

          {detailLoading ? (
            <div className="sh-empty">Loading conversation…</div>
          ) : (
            <div className="sh-chat">
              <div className="sh-chat__messages">
                {messages.length === 0 ? (
                  <div className="sh-empty">
                    No replies yet. Send a message to the support team.
                  </div>
                ) : (
                  messages.map((message) => {
                    const isStudent = message.sender_role === "student";

                    return (
                      <div
                        key={message._id}
                        className={`sh-message ${isStudent ? "sh-message--mine" : "sh-message--support"}`}
                      >
                        <div className="sh-message__author">
                          {isStudent ? "You" : "Support Team"}
                          <time>{formatDate(message.createdAt)}</time>
                        </div>
                        <p>{message.message}</p>
                      </div>
                    );
                  })
                )}
              </div>

              {["Resolved", "Closed"].includes(selectedTicket.status) ? (
                <div className="sh-reopen-panel">
                  <span>This ticket is currently {selectedTicket.status.toLowerCase()}.</span>
                  <button
                    className="sh-button sh-button--outline"
                    onClick={handleReopen}
                    disabled={submitting}
                  >
                    <FiRefreshCw /> Reopen Ticket
                  </button>
                </div>
              ) : (
                <form className="sh-reply" onSubmit={handleSendReply}>
                  <input
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    placeholder="Type your message…"
                    maxLength={3000}
                    required
                  />
                  <button
                    type="submit"
                    aria-label="Send message"
                    disabled={submitting || !reply.trim()}
                  >
                    <FiSend />
                  </button>
                </form>
              )}
            </div>
          )}
        </section>
      ) : showForm ? (
        <section className="sh-form-card">
          <div className="sh-section-title">
            <div>
              <h2>Raise New Ticket</h2>
              <p>Describe your issue. Our administrator will review it.</p>
            </div>
            <button className="sh-icon-button" onClick={() => setShowForm(false)}>
              <FiX />
            </button>
          </div>

          <form onSubmit={handleCreateTicket} className="sh-form">
            <label>
              Issue Title <span>*</span>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Enter a short title for your issue"
                maxLength={150}
                required
              />
            </label>

            <label>
              Description <span>*</span>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Explain your issue in detail…"
                rows={5}
                maxLength={3000}
                required
              />
              <small>{form.description.length}/3000</small>
            </label>

            <div className="sh-form__grid">
              <label>
                Mobile
                <input
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                  placeholder="Contact number"
                  maxLength={20}
                />
              </label>

              <label>
                Category <span>*</span>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {CATEGORIES.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>
            </div>

            <fieldset className="sh-priority-picker">
              <legend>Set Priority Level</legend>
              <div>
                {PRIORITIES.map((priority) => (
                  <button
                    type="button"
                    key={priority}
                    className={`sh-priority-choice ${form.priority === priority ? "is-selected" : ""} sh-priority-choice--${priority.toLowerCase()}`}
                    onClick={() => setForm({ ...form, priority })}
                  >
                    {priority}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="sh-form__actions">
              <button
                type="button"
                className="sh-button sh-button--outline"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="sh-button sh-button--primary"
                disabled={submitting}
              >
                <FiSend /> {submitting ? "Submitting…" : "Submit Ticket"}
              </button>
            </div>
          </form>
        </section>
      ) : (
        <>
          <section className="sh-stats">
            <article class="dashboard-stat-card card-success">
              <div class="stat-card-top">
                <div class="stat-icon stat-icon-success"><FiTag /></div>
                </div>
                <div class="stat-card-body">
                  <span class="stat-card-title">Total Tickets</span>
                <strong class="stat-card-value">{stats.total || 0}</strong>
                </div>
                  </article>


            
             <article class="dashboard-stat-card card-warning">
              <div class="stat-card-top">
                <div class="stat-icon stat-icon-warning"><FiClock /></div>
                </div>
                <div class="stat-card-body">
                  <span class="stat-card-title">Open</span>
                <strong class="stat-card-value">{stats.Open || 0}</strong>
                </div>
                  </article>

                     <article class="dashboard-stat-card card-purple">
              <div class="stat-card-top">
                <div class="stat-icon stat-icon-purple"><FiRefreshCw /></div>
                </div>
                <div class="stat-card-body">
                  <span class="stat-card-title">In Progress</span>
                <strong class="stat-card-value">{stats["In Progress"] || 0}</strong>
                </div>
                  </article>

                     <article class="dashboard-stat-card card-bluewarning">
              <div class="stat-card-top">
                <div class="stat-icon stat-icon-bluewarning"><FiCheckCircle /></div>
                </div>
                <div class="stat-card-body">
                  <span class="stat-card-title">Resolved</span>
                <strong class="stat-card-value">{stats.Resolved || 0}</strong>
                </div>
                  </article>

                       <article class="dashboard-stat-card card-danger">
              <div class="stat-card-top">
                <div class="stat-icon stat-icon-danger"><FiShield /></div>
                </div>
                <div class="stat-card-body">
                  <span class="stat-card-title">Closed</span>
                <strong class="stat-card-value">{stats.Closed || 0}</strong>
                </div>
                  </article>


           

          </section>

 <div className="student-profile__tabs">
              {FILTERS.map((item) => (
                <button
                  key={item}
                  className={filter === item ? "active" : ""}
                  onClick={() => setFilter(item)}
                >
                  {item}
                  {item === "All" && <span>{stats.total || 0}</span>}
                </button>
              ))}
            </div>

          <section className="common-card">
             <div class="panel-header"><div><h3>My Support Tickets</h3>  <p>Track your submitted issues and support replies.</p></div>
               <button className="themebtn themebtnline" onClick={loadDashboard} disabled={loading}>
                <FiRefreshCw /> Refresh
              </button>
            </div>
            <div className="cardbody">
           


           

            {loading ? (
              <div className="sh-empty">Loading your tickets…</div>
            ) : visibleTickets.length === 0 ? (
              <div className="sh-empty-state">
                <span><FiMessageCircle /></span>
                <h3>{filter === "All" ? "Need Help?" : `No ${filter} tickets`}</h3>
                <p>
                  {filter === "All"
                    ? "Submit your issue and our support team will get back to you."
                    : "There are no tickets in this status."}
                </p>
                {filter === "All" && (
                  <button
                    className="sh-button sh-button--primary"
                    onClick={() => setShowForm(true)}
                  >
                    <FiPlus /> Raise New Ticket
                  </button>
                )}
              </div>
            ) : (
              <div className="sh-ticket-grid">
                {visibleTickets.map((ticket) => (
                  <button
                    className="sh-ticket-card"
                    key={ticket._id}
                    onClick={() => openTicket(ticket)}
                  >
                    <div className="sh-ticket-card__top">
                      <span className="sh-ticket-number">{ticket.ticketNumber}</span>
                      <span className={`sh-status sh-status--${statusClass(ticket.status)}`}>
                        {ticket.status}
                      </span>
                    </div>
                    <h3>{ticket.title}</h3>
                    <p>{ticket.description}</p>
                    <div className="sh-ticket-card__bottom">
                      <span className={`sh-priority sh-priority--${ticket.priority?.toLowerCase()}`}>
                        {ticket.priority}
                      </span>
                      <small><FiClock /> {timeAgo(ticket.lastMessageAt || ticket.createdAt)}</small>
                    </div>
                  </button>
                ))}
              </div>
            )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
