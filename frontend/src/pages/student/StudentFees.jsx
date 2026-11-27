
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
import { IoWalletSharp } from "react-icons/io5";
import { MdCurrencyRupee } from "react-icons/md";
import studentPortalService from "../../services/studentPortalService";
import { getAssetUrl } from "../../utils/assetUrl";
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
    <article className={`dashboard-stat-card card-${tone}`}>
      <div className="stat-card-top">
        <div className={`stat-icon stat-icon-${tone}`}>
           <Icon aria-hidden="true" />
      </div>
      {/* <div className={`dashboard-stat-card ${tone}`}></div> */}
      </div>

      <div className="stat-card-body">
        <span className="stat-card-title">{title}</span>
        <strong className="stat-card-value">{value}</strong>
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


function CourseThumbnail({ image, courseName }) {
  const [imageError, setImageError] = useState(!image);

  useEffect(() => {
    setImageError(!image);
  }, [image]);

  const imageUrl = image ? getAssetUrl(image) : "";

  return (
    <div className="sf-course-thumbnail">
      {!imageError && imageUrl ? (
        <img
          src={imageUrl}
          alt={`${courseName || "Course"} thumbnail`}
          className="sf-course-thumbnail__image"
          onError={() => setImageError(true)}
        />
      ) : (
        <div
          className="sf-course-thumbnail__fallback"
          aria-label="Course image unavailable"
        >
          <FiBookOpen />
        </div>
      )}
    </div>
  );
}


export default function StudentFees() {
  const [activeTab, setActiveTab] = useState("balances");
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
    { id: "balances", label: "Fee Balances" },
    { id: "history", label: "Payment History" },
  ];

  return (
    <div className="student-fees">
      <div class="page-header"><div><h1>Fees &amp; Payments</h1>
          <p>View your admission fees, outstanding balances, and recorded payments.</p>
      
      </div></div>
      
      {error && (
        <div className="sf-error" role="alert">
          <FiAlertCircle />
          <span>{error}</span>
          <button type="button" onClick={() => loadFees(true)}>Try again</button>
        </div>
      )}

      <section className="sf-summary-grid">
        <SummaryCard
          icon={MdCurrencyRupee}
          title="Total Fees"
          value={money(summary.totalFees)}
          caption={`${summary.admissionCount} admission(s)`}
          tone="purple"
        />

        <SummaryCard
          icon={IoWalletSharp}
          title="Total Paid"
          value={money(summary.totalPaid)}
          caption={`${paidPercentage}% of total fees`}
          tone="success"
        />
        <SummaryCard
          icon={FiClock}
          title="Outstanding Balance"
          value={money(summary.outstanding)}
          caption="Remaining admission fees"
          tone="danger"
        />
        {/* <SummaryCard
          icon={FiCreditCard}
          title="Pending Payments"
          value={money(summary.pendingPayments)}
          caption="Awaiting verification"
          tone="purple"
        /> */}
      </section>

<div className="student-profile__tabs" role="tablist" aria-label="Fees sections">
          {tabs.map((tab) => (
            <button
              type="button"
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={activeTab === tab.id ? "active" : "sf-tab"}
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

    
        
 

       
         

          {activeTab === "balances" && (
            <>
              <div className="common-card">
                 <div className="panel-header">
                <div>
                  <h3>Admission Fee Balances</h3>
                  <p>Search your admissions and review remaining balances.</p>
                </div>

                <div className="right-filter">
                    <div className="input-search">
               
                  <FiSearch />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search course or batch..."
                  />
                   </div>
               <div className="input-search">
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter admission status">
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="dropped">Dropped</option>
                </select>
                </div>
                </div>
             
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
                <div className="common-table-wrapper">
                  <table className="common-table">
                    <thead>
                      <tr>
                        <th>Course/Batch</th>
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
                          {/* <td>
                            <div className="student-name-cell">
                              <div class="student-avatar-wrapper"><img alt="Narendra Lodhi" class="student-avatar" src="https://education-management-backend-79g1.onrender.com/uploads/students/1794900231774-WhatsApp-Image-2026-10-21-at-9-12-30-PM.jpeg" /></div>
                           <div><strong>{item.course}</strong>{item.batch}</div>
                            </div>

                          </td> */}


                          <td>
                            <div className="student-name-cell">
                              <CourseThumbnail
                                image={item.courseImage}
                                courseName={item.course}
                              />

                              <div>
                                <strong>{item.course}</strong>
                                {item.batch}
                              </div>
                            </div>
                          </td>

                         
                          <td>{formatDate(item.admissionDate)}</td>
                          <td><span className="tag-purple">{money(item.total)}</span></td>
                          <td><span className="tag-success">{money(item.paid)}</span></td>
                          <td><span className="tag-danger">{money(item.outstanding)}</span></td>
                          <td><PaymentStatus status={item.admissionStatus} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              </div>
            </>
          )}

          {activeTab === "history" && (
            <>
                <div className="common-card">
                 <div className="panel-header">
                <div>
                  <h3>Payment History</h3>
                  <p>Payments recorded against your student account.</p>
                </div>

                <div className="right-filter">
                    <div className="input-search">
               
                  <FiSearch />
                   <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search receipt, course, or mode..."
                  />
                   </div>
               <div className="input-search">
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter payment status">
                  <option value="all">All statuses</option>
                  <option value="verified">Verified</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="overdue">Overdue</option>
                </select>
                </div>
                </div>
             
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
                <div className="common-table-wrapper">
                  <table className="common-table">
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
                          <td>  <span className="student-roll">{payment.receiptNo || "—"}</span></td>
                          <td>{payment.course}</td>
                          <td>{payment.mode || "—"}</td>
                          <td><span className="tag-success">{money(payment.amount)}</span></td>
                          <td><PaymentStatus status={payment.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              </div>
            </>
          )}
       
      

      <p className="sf-privacy-note">
        Fee information is read from your own admission and payment records.
        If any amount looks incorrect, contact your institute administrator.
      </p>
    </div>
  );
}
