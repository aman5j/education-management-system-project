
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiAlertCircle,
  FiBookOpen,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiFileText,
  FiRefreshCw,
  FiSearch,
  FiDollarSign,
} from "react-icons/fi";

import studentPortalService from "../../services/studentPortalService";
import "./StudentFees.css";

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const statusClass = (status) =>
  String(status || "unknown").toLowerCase().replace(/[^a-z]+/g, "-");

function SummaryCard({ icon: Icon, title, value, caption, tone }) {
  return (
    <article className={`sf-summary sf-summary--${tone}`}>
      <div className="sf-summary__icon">
        <Icon aria-hidden="true" />
      </div>
      <div className="sf-summary__content">
        <span>{title}</span>
        <strong>{value}</strong>
        <small>{caption}</small>
      </div>
    </article>
  );
}

function PaymentStatus({ status }) {
  return (
    <span className={`sf-status sf-status--${statusClass(status)}`}>
      {status || "Unknown"}
    </span>
  );
}

export default function StudentFees() {
  const [activeTab, setActiveTab] = useState("overview");
  const [data, setData] = useState({
    summary: {
      totalFees: 0,
      totalPaid: 0,
      outstanding: 0,
      admissionCount: 0,
      verifiedPayments: 0,
      pendingPayments: 0,
    },
    admissions: [],
    payments: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadFees = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const response = await studentPortalService.getMyFees();

      if (!response?.success) {
        throw new Error(response?.message || "Unable to load fee details.");
      }

      setData({
        summary: {
          totalFees: 0,
          totalPaid: 0,
          outstanding: 0,
          admissionCount: 0,
          verifiedPayments: 0,
          pendingPayments: 0,
          ...(response.data?.summary || {}),
        },
        admissions: Array.isArray(response.data?.admissions)
          ? response.data.admissions
          : [],
        payments: Array.isArray(response.data?.payments)
          ? response.data.payments
          : [],
      });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to load fees and payments."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFees();
  }, [loadFees]);

  const filteredAdmissions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return data.admissions.filter((item) => {
      const matchesSearch =
        !query ||
        [item.course, item.batch, item.admissionStatus]
          .some((value) => String(value || "").toLowerCase().includes(query));

      const matchesStatus =
        statusFilter === "all" ||
        String(item.admissionStatus).toLowerCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [data.admissions, search, statusFilter]);

  const filteredPayments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return data.payments.filter((item) => {
      const matchesSearch =
        !query ||
        [item.course, item.receiptNo, item.mode, item.status]
          .some((value) => String(value || "").toLowerCase().includes(query));

      const matchesStatus =
        statusFilter === "all" ||
        String(item.status).toLowerCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [data.payments, search, statusFilter]);

  const summary = data.summary;
  const paidPercentage = summary.totalFees > 0
    ? Math.min(100, Math.round((summary.totalPaid / summary.totalFees) * 100))
    : 0;

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "balances", label: "Fee Balances" },
    { id: "history", label: "Payment History" },
  ];

  return (
    <div className="student-fees">
      <header className="sf-page-header">
        <div>
          <span className="sf-eyebrow">STUDENT PORTAL</span>
          <h1>Fees &amp; Payments</h1>
          <p>View your admission fees, outstanding balances, and recorded payments.</p>
        </div>

        <button
          type="button"
          className="sf-refresh"
          onClick={() => loadFees(true)}
          disabled={loading || refreshing}
        >
          <FiRefreshCw className={refreshing ? "sf-spinning" : ""} />
          Refresh
        </button>
      </header>

      {error && (
        <div className="sf-error" role="alert">
          <FiAlertCircle />
          <span>{error}</span>
          <button type="button" onClick={() => loadFees(true)}>Try again</button>
        </div>
      )}

      <section className="sf-summary-grid">
        <SummaryCard
          icon={FiDollarSign}
          title="Total Fees"
          value={money(summary.totalFees)}
          caption={`${summary.admissionCount} admission(s)`}
          tone="blue"
        />
        <SummaryCard
          icon={FiCheckCircle}
          title="Total Paid"
          value={money(summary.totalPaid)}
          caption={`${paidPercentage}% of total fees`}
          tone="green"
        />
        <SummaryCard
          icon={FiClock}
          title="Outstanding Balance"
          value={money(summary.outstanding)}
          caption="Remaining admission fees"
          tone="orange"
        />
        <SummaryCard
          icon={FiCreditCard}
          title="Pending Payments"
          value={money(summary.pendingPayments)}
          caption="Awaiting verification"
          tone="purple"
        />
      </section>

      <section className="sf-panel sf-main-panel">
        <div className="sf-tabs" role="tablist" aria-label="Fees sections">
          {tabs.map((tab) => (
            <button
              type="button"
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={activeTab === tab.id ? "sf-tab sf-tab--active" : "sf-tab"}
              onClick={() => {
                setActiveTab(tab.id);
                setSearch("");
                setStatusFilter("all");
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="sf-panel-body">
          {activeTab === "overview" && (
            <>
              <div className="sf-overview-heading">
                <div>
                  <h2>Fee Overview</h2>
                  <p>Summary calculated from your admission records.</p>
                </div>
                <span className="sf-overview-percent">{paidPercentage}% paid</span>
              </div>

              <div
                className="sf-progress"
                role="progressbar"
                aria-label="Total fees paid"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={paidPercentage}
              >
                <span style={{ width: `${paidPercentage}%` }} />
              </div>

              <div className="sf-progress-labels">
                <span>Paid: {money(summary.totalPaid)}</span>
                <span>Remaining: {money(summary.outstanding)}</span>
              </div>

              <div className="sf-section-heading">
                <div>
                  <h2>Admission Fee Balances</h2>
                  <p>Each row represents one of your admissions.</p>
                </div>
                <button type="button" className="sf-text-button" onClick={() => setActiveTab("balances")}>
                  View all
                </button>
              </div>

              {loading ? (
                <div className="sf-state">Loading your fee details...</div>
              ) : data.admissions.length === 0 ? (
                <div className="sf-state">
                  <FiFileText />
                  <strong>No admission fee records found</strong>
                  <span>Your fee details will appear here once an admission is recorded.</span>
                </div>
              ) : (
                <div className="sf-admission-list">
                  {data.admissions.slice(0, 4).map((item) => (
                    <article className="sf-admission-card" key={item.admissionId}>
                      <div className="sf-admission-card__icon"><FiBookOpen /></div>
                      <div className="sf-admission-card__main">
                        <div className="sf-admission-card__title">
                          <strong>{item.course}</strong>
                          <PaymentStatus status={item.admissionStatus} />
                        </div>
                        <span className="sf-muted">
                          {item.batch} · Admitted {formatDate(item.admissionDate)}
                        </span>
                        <div className="sf-progress sf-progress--small">
                          <span style={{ width: `${item.paymentPercentage}%` }} />
                        </div>
                        <div className="sf-progress-labels">
                          <span>{item.paymentPercentage}% paid</span>
                          <strong>{money(item.outstanding)} due</strong>
                        </div>
                      </div>
                    </article>
                  ))}
                  {data.admissions.length > 4 && (
                    <button
                      type="button"
                      className="sf-view-more"
                      onClick={() => setActiveTab("balances")}
                    >
                      View all {data.admissions.length} admissions
                    </button>
                  )}
                </div>
              )}

              <div className="sf-section-heading sf-history-heading">
                <div>
                  <h2>Recent Payments</h2>
                  <p>Latest recorded payment activity.</p>
                </div>
                <button type="button" className="sf-text-button" onClick={() => setActiveTab("history")}>
                  Payment history
                </button>
              </div>

              {loading ? (
                <div className="sf-state">Loading payment history...</div>
              ) : data.payments.length === 0 ? (
                <div className="sf-empty-inline">No payments have been recorded yet.</div>
              ) : (
                <div className="sf-table-wrap">
                  <table className="sf-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Course</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.payments.slice(0, 5).map((payment) => (
                        <tr key={payment.id}>
                          <td>{formatDate(payment.date)}</td>
                          <td>{payment.course}</td>
                          <td className="sf-amount">{money(payment.amount)}</td>
                          <td><PaymentStatus status={payment.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {activeTab === "balances" && (
            <>
              <div className="sf-section-heading sf-balances-heading">
                <div>
                  <h2>Admission Fee Balances</h2>
                  <p>Search your admissions and review remaining balances.</p>
                </div>
              </div>

              <div className="sf-filters">
                <label className="sf-search">
                  <FiSearch />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search course or batch..."
                  />
                </label>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter admission status">
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="dropped">Dropped</option>
                </select>
              </div>

              {loading ? (
                <div className="sf-state">Loading fee balances...</div>
              ) : filteredAdmissions.length === 0 ? (
                <div className="sf-state">
                  <FiFileText />
                  <strong>No matching admissions</strong>
                  <span>Try changing your search or status filter.</span>
                </div>
              ) : (
                <div className="sf-table-wrap">
                  <table className="sf-table">
                    <thead>
                      <tr>
                        <th>Course / Batch</th>
                        <th>Admission Date</th>
                        <th>Total Fees</th>
                        <th>Paid</th>
                        <th>Outstanding</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAdmissions.map((item) => (
                        <tr key={item.admissionId}>
                          <td>
                            <strong className="sf-table-course">{item.course}</strong>
                            <small>{item.batch}</small>
                          </td>
                          <td>{formatDate(item.admissionDate)}</td>
                          <td>{money(item.total)}</td>
                          <td className="sf-paid-amount">{money(item.paid)}</td>
                          <td className="sf-outstanding-amount">{money(item.outstanding)}</td>
                          <td><PaymentStatus status={item.admissionStatus} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {activeTab === "history" && (
            <>
              <div className="sf-section-heading sf-balances-heading">
                <div>
                  <h2>Payment History</h2>
                  <p>Payments recorded against your student account.</p>
                </div>
              </div>

              <div className="sf-filters">
                <label className="sf-search">
                  <FiSearch />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search receipt, course, or mode..."
                  />
                </label>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter payment status">
                  <option value="all">All statuses</option>
                  <option value="verified">Verified</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>

              {loading ? (
                <div className="sf-state">Loading payment history...</div>
              ) : filteredPayments.length === 0 ? (
                <div className="sf-state">
                  <FiCreditCard />
                  <strong>No matching payments</strong>
                  <span>Recorded payments will appear here after they are added by your institute.</span>
                </div>
              ) : (
                <div className="sf-table-wrap">
                  <table className="sf-table">
                    <thead>
                      <tr>
                        <th>Payment Date</th>
                        <th>Course</th>
                        <th>Receipt No.</th>
                        <th>Mode</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPayments.map((payment) => (
                        <tr key={payment.id}>
                          <td>{formatDate(payment.date)}</td>
                          <td>{payment.course}</td>
                          <td className="sf-receipt">{payment.receiptNo || "—"}</td>
                          <td>{payment.mode || "—"}</td>
                          <td className="sf-amount">{money(payment.amount)}</td>
                          <td><PaymentStatus status={payment.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <p className="sf-privacy-note">
        Fee information is read from your own admission and payment records.
        If any amount looks incorrect, contact your institute administrator.
      </p>
    </div>
  );
}
