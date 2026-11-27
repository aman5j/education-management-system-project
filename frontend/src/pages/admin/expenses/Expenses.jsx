import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiDollarSign,
  FiCalendar,
  FiTrendingUp,
  FiEdit2,
  FiTrash2,
  FiFileText,
} from "react-icons/fi";
import { GiExpense } from "react-icons/gi";
import {
  getExpenses,
  getExpenseSummary,
  deleteExpense,
} from "../../../services/expenseService";

import { useAuth } from "../../../context/AuthContext";
import { hasPermission } from "../../../utils/permissions";
import Pagination from "../../../components/common/Pagination";
import notification, {
  getApiErrorMessage,
} from "../../../utils/notification";

import "../../../styles/ExpenseManagement.css";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const CATEGORIES = [
  "Rent",
  "Salary",
  "Electricity",
  "Internet",
  "Stationery",
  "Equipment",
  "Maintenance",
  "Marketing",
  "Travel",
  "Software",
  "Utilities",
  "Other",
];

const PAYMENT_METHODS = [
  "Cash",
  "UPI",
  "Card",
  "Bank Transfer",
  "Cheque",
  "Other",
];

const getReceiptUrl = (receiptUrl) => {
  if (!receiptUrl) return "";

  if (/^https?:\/\//i.test(receiptUrl)) {
    return receiptUrl;
  }

  const apiUrl =
    import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  const serverUrl = apiUrl.replace(/\/api\/?$/, "");

  return `${serverUrl}${receiptUrl.startsWith("/") ? "" : "/"}${receiptUrl}`;
};

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const location = useLocation();
  const { user } = useAuth();

  const basePath = location.pathname.startsWith("/staff")
    ? "/staff"
    : "/admin";

  const canManageExpenses = hasPermission(user, "expenses.manage");

  const loadData = useCallback(async () => {
    setLoading(true);

    const filters = {
      search: search.trim(),
      category,
      status,
      paymentMethod,
      from,
      to,
    };

    const params = {
      ...filters,
      page,
      limit,
    };

    Object.keys(params).forEach((key) => {
      if (params[key] === "") delete params[key];
    });

    const summaryParams = { ...filters };
    Object.keys(summaryParams).forEach((key) => {
      if (summaryParams[key] === "") delete summaryParams[key];
    });

    try {
      const [listResponse, summaryResponse] = await Promise.all([
        getExpenses(params),
        getExpenseSummary(summaryParams),
      ]);

      const data = listResponse?.data?.data;
      const nextPagination = data?.pagination || {
        page: 1,
        limit,
        total: 0,
        totalPages: 0,
      };

      setExpenses(
        Array.isArray(data?.expenses) ? data.expenses : []
      );
      setPagination(nextPagination);
      setSummary(summaryResponse?.data?.data || null);

      // If a record was deleted from the last page, move back
      // to the last page that still contains records.
      if (
        nextPagination.totalPages > 0 &&
        page > nextPagination.totalPages
      ) {
        setPage(nextPagination.totalPages);
      }
    } catch (error) {
      notification.error(getApiErrorMessage(error));
      setExpenses([]);
      setSummary(null);
      setPagination({
        page: 1,
        limit,
        total: 0,
        totalPages: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [
    search,
    category,
    status,
    paymentMethod,
    from,
    to,
    page,
    limit,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 300);

    return () => clearTimeout(timer);
  }, [loadData]);

  const resetFilters = () => {
    setSearch("");
    setCategory("");
    setStatus("");
    setPaymentMethod("");
    setFrom("");
    setTo("");
    setPage(1);
  };

  const handleDelete = async (expense) => {
    const confirmed = await notification.confirmDelete(
      `"${expense.title}"`
    );

    if (!confirmed) return;

    try {
      await deleteExpense(expense._id);
      notification.success("Expense deleted successfully.");

      // Reload with the current filters and pagination.
      await loadData();
    } catch (error) {
      notification.error(getApiErrorMessage(error));
    }
  };

  return (
    <div className="expense-page">
      <div class="page-header"><div>
        <h1>Expenses Management</h1>
                  <p>Track institute spending and manage expense records.</p>

        </div>
          {canManageExpenses && (
          <Link
            to={`${basePath}/expenses/add`}
            className="themebtn"
          >
            <FiPlus /> Add Expense
          </Link>
        )}
        </div>


      <div className="expense-summary-grid">
        
        <article class="dashboard-stat-card card-danger">
          <div class="stat-card-top">
            <div class="stat-icon stat-icon-danger">
             <GiExpense />
            </div>
            </div>
            <div class="stat-card-body">
              <span class="stat-card-title">Total Expenses</span>
              <strong class="stat-card-value">{money(summary?.overall?.totalAmount)}</strong>
              <small>{summary?.overall?.count || 0} records</small>
              </div>
              </article>

               <article class="dashboard-stat-card card-purple">
          <div class="stat-card-top">
            <div class="stat-icon stat-icon-purple">
               <FiCalendar />
            </div>
            </div>
            <div class="stat-card-body">
              <span class="stat-card-title">This Month</span>
              <strong class="stat-card-value">{money(summary?.monthly?.totalAmount)}</strong>
              <small>{summary?.monthly?.count || 0} records</small>
              </div>
              </article>

                <article class="dashboard-stat-card card-warning">
          <div class="stat-card-top">
            <div class="stat-icon stat-icon-warning">
              <FiTrendingUp />
            </div>
            </div>
            <div class="stat-card-body">
              <span class="stat-card-title">This Year</span>
              <strong class="stat-card-value">{money(summary?.yearly?.totalAmount)}</strong>
              <small>{summary?.yearly?.count || 0} records</small>
              </div>
              </article>

      </div>

      <section className="">

 <div className="common-card-filters">
 
          <div className="input-search">
             <label>Search</label>
            <FiSearch />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search title, vendor or notes..."
            />
          </div>
 <div className="input-search">
  <label>Category</label>
          <select
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          </div>


 <div className="input-search">
  <label>status</label>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
          </select>
          </div>

 <div className="input-search">
  <label>Payment Method</label>
          <select
            value={paymentMethod}
            onChange={(event) => {
              setPaymentMethod(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All Payment Methods</option>
            {PAYMENT_METHODS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
</div>

           <div className="input-search noicon">
           <label> From</label>
            <input
              type="date"
              value={from}
              onChange={(event) => {
                setFrom(event.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="input-search noicon">
           <label> To</label>
            <input
              type="date"
              value={to}
              onChange={(event) => {
                setTo(event.target.value);
                setPage(1);
              }}
            />
          </div>

          <button
            type="button"
            className="themebtn themebtnline"
            onClick={resetFilters}
          >
            <FiRefreshCw /> Reset
          </button>
        
        </div>

              <div className="common-card">
                <div className="panel-header">
          <div>
            <h3>Expense Records</h3>
          </div>
        </div>

       

        {loading ? (
          <div className="expense-state">Loading expenses...</div>
        ) : expenses.length === 0 ? (
          <div className="expense-empty">
            <FiDollarSign />
            <h3>No expenses found</h3>
            <p>Add an expense or adjust your filters.</p>
          </div>
        ) : (
          <div className="common-table-wrapper">
            <table className="common-table">
              <thead>
                <tr>
                  <th>Expense</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th>Payment Method</th>
                  <th>Vendor</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Receipt / Actions</th>
                </tr>
              </thead>

              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense._id}>
                    <td>
                      <strong className="tabletitle">{expense.title}</strong>
                      {expense.description && (
                        <p className="expense-description">
                          {expense.description}
                        </p>
                      )}
                    </td>

                    <td>{expense.category}</td>

                    <td>
                      {expense.expenseDate
                        ? new Date(
                            expense.expenseDate
                          ).toLocaleDateString("en-IN", {
                            timeZone: "UTC",
                          })
                        : "—"}
                    </td>

                    <td> <span className="">{expense.paymentMethod}</span> </td>
                    <td><span className="">{expense.vendor || "—"}</span></td>
                    <td>
                      <span className="tag-danger">{money(expense.amount)}</span>
                    </td>

                    <td>
                      <span
                        className={`expense-status expense-status-${(
                          expense.status || ""
                        ).toLowerCase()}`}
                      >
                        {expense.status || "—"}
                      </span>
                    </td>

                    <td>
                      <div className="admission-actions">
                        {expense.receiptUrl ? (
                          <a
                            href={getReceiptUrl(expense.receiptUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-tooltip="View Receipt"
                            aria-label={`View receipt for ${expense.title}`}
                            className="tooltip"
                          >
                            <FiFileText />
                          </a>
                        ) : (
                          <a
                           
                            style={{ cursor: 'not-allowed' }}
                           
                            data-tooltip="Receipt Not Available"
                            aria-label={`View receipt for ${expense.title}`}
                            className="tooltip"
                          >
                            -
                          </a>
                        )}

                        {canManageExpenses && (
                          <>
                            <Link className="tooltip"
                              to={`${basePath}/expenses/${expense._id}/edit`}
                               data-tooltip="Edit"
                              aria-label={`Edit expense ${expense.title}`}
                            >
                              <FiEdit2 />
                            </Link>

                            <button
                              type="button"
                               data-tooltip="Delete"
                               className="tooltip"
                              aria-label={`Delete expense ${expense.title}`}
                              onClick={() => handleDelete(expense)}
                            >
                              <FiTrash2 />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && (
          <Pagination
            page={page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            itemCount={expenses.length}
            itemLabel="expenses"
            limit={limit}
            loading={loading}
            onPageChange={setPage}
            onLimitChange={(nextLimit) => {
              setLimit(nextLimit);
              setPage(1);
            }}
          />
        )}
              </div>
      </section>
    </div>
  );
};

export default Expenses;