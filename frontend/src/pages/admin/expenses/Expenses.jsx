

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiDollarSign,
  FiCalendar,
  FiTrendingUp,
  FiEdit2,
  FiTrash2,
} from "react-icons/fi";


import {
  getExpenses,
  getExpenseSummary,
  deleteExpense,
} from "../../../services/expenseService";

import "../../../styles/ExpenseManagement.css";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const CATEGORIES = [
  "Rent", "Salary", "Electricity", "Internet",
  "Stationery", "Equipment", "Maintenance",
  "Marketing", "Travel", "Software", "Utilities", "Other",
];

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1, total: 0, totalPages: 1,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    const params = {
      search: search.trim(),
      category,
      status,
      paymentMethod,
      from,
      to,
      page,
      limit: 10,
    };

    Object.keys(params).forEach((key) => {
      if (params[key] === "") delete params[key];
    });

    try {
      const [listResponse, summaryResponse] = await Promise.all([
        getExpenses(params),
        getExpenseSummary(),
      ]);

      const data = listResponse?.data?.data;
      setExpenses(Array.isArray(data?.expenses) ? data.expenses : []);
      setPagination(data?.pagination || {
        page: 1, total: 0, totalPages: 1,
      });
      setSummary(summaryResponse?.data?.data || null);
    } catch (err) {
      setError(
        err?.response?.data?.message || "Unable to load expenses."
      );
    } finally {
      setLoading(false);
    }
  }, [search, category, status, paymentMethod, from, to, page]);

  useEffect(() => {
    const timer = setTimeout(loadData, 300);
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
    if (!window.confirm(
      `Delete "${expense.title}"? This action cannot be undone.`
    )) return;

    try {
      await deleteExpense(expense._id);
      await loadData();
    } catch (err) {
      setError(
        err?.response?.data?.message || "Unable to delete expense."
      );
    }
  };

  return (
    <div className="expense-page">
      <div className="expense-page-header">
        <div>
          <h1>Expenses Management</h1>
          <p>Track institute spending and manage expense records.</p>
        </div>

        <Link to="/admin/expenses/add" className="expense-primary-button">
          <FiPlus /> Add Expense
        </Link>
      </div>

      <div className="expense-summary-grid">
        <article className="expense-summary-card">
          <span className="expense-summary-icon"><FiDollarSign /></span>
          <div>
            <p>Total Recorded Expenses</p>
            <h2>{money(summary?.overall?.totalAmount)}</h2>
            <small>{summary?.overall?.count || 0} records</small>
          </div>
        </article>

        <article className="expense-summary-card">
          <span className="expense-summary-icon"><FiCalendar /></span>
          <div>
            <p>This Month</p>
            <h2>{money(summary?.monthly?.totalAmount)}</h2>
            <small>{summary?.monthly?.count || 0} records</small>
          </div>
        </article>

        <article className="expense-summary-card">
          <span className="expense-summary-icon"><FiTrendingUp /></span>
          <div>
            <p>This Year</p>
            <h2>{money(summary?.yearly?.totalAmount)}</h2>
            <small>{summary?.yearly?.count || 0} records</small>
          </div>
        </article>
      </div>

      {error && <div className="expense-alert">{error}</div>}

      <section className="expense-card">
        <div className="expense-section-heading">
          <div>
            <h2>Expense Records</h2>
            <p>Search, filter and manage recorded expenses.</p>
          </div>
        </div>

        <div className="expense-filters">
          <div className="expense-search">
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

          <select value={category} onChange={(event) => {
            setCategory(event.target.value); setPage(1);
          }}>
            <option value="">All Categories</option>
            {CATEGORIES.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>

          <select value={status} onChange={(event) => {
            setStatus(event.target.value); setPage(1);
          }}>
            <option value="">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
          </select>

          <select value={paymentMethod} onChange={(event) => {
            setPaymentMethod(event.target.value); setPage(1);
          }}>
            <option value="">All Payment Methods</option>
            {["Cash", "UPI", "Card", "Bank Transfer", "Cheque", "Other"].map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>

          <label className="expense-date-filter">
            From
            <input type="date" value={from} onChange={(event) => {
              setFrom(event.target.value); setPage(1);
            }} />
          </label>

          <label className="expense-date-filter">
            To
            <input type="date" value={to} onChange={(event) => {
              setTo(event.target.value); setPage(1);
            }} />
          </label>

          <button type="button" className="expense-secondary-button"
            onClick={resetFilters}>
            <FiRefreshCw /> Reset
          </button>
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
          <div className="expense-table-wrapper">
            <table className="expense-table">
              <thead>
                <tr>
                  <th>Expense</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th>Payment Method</th>
                  <th>Vendor</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense._id}>
                    <td>
                      <strong>{expense.title}</strong>
                      {expense.description && (
                        <small className="expense-description">
                          {expense.description}
                        </small>
                      )}
                    </td>
                    <td>{expense.category}</td>
                    <td>
                      {expense.expenseDate
                        ? new Date(expense.expenseDate).toLocaleDateString("en-IN", {
                            timeZone: "UTC",
                          })
                        : "—"}
                    </td>
                    <td>{expense.paymentMethod}</td>
                    <td>{expense.vendor || "—"}</td>
                    <td><strong>{money(expense.amount)}</strong></td>
                    <td>
                      <span className={`expense-status expense-status-${expense.status.toLowerCase()}`}>
                        {expense.status}
                      </span>
                    </td>
                    <td>
                      <div className="expense-actions">
                        <Link
                          to={`/admin/expenses/${expense._id}/edit`}
                          title="Edit expense"
                          aria-label="Edit expense"
                        >
                          <FiEdit2 />
                        </Link>
                        <button
                          type="button"
                          title="Delete expense"
                          aria-label="Delete expense"
                          onClick={() => handleDelete(expense)}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && pagination.totalPages > 1 && (
          <div className="expense-pagination">
            <button disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}>
              Previous
            </button>
            <span>Page {page} of {pagination.totalPages}</span>
            <button disabled={page >= pagination.totalPages}
              onClick={() => setPage((current) => current + 1)}>
              Next
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default Expenses;
