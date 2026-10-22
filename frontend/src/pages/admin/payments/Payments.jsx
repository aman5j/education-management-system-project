import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { Link, useLocation } from "react-router-dom";
import { FiPlus } from "react-icons/fi";

import { useAuth } from "../../../context/AuthContext";
import { hasPermission } from "../../../utils/permissions";

import PaymentFilters from "../../../components/payments/PaymentFilters";
import PaymentTable from "../../../components/payments/PaymentTable";

import {
  getPayments,
  deletePayment,
} from "../../../services/paymentService";

import "../../../styles/PaymentManagement.css";

const PAGE_SIZE = 10;

const Payments = () => {
  const { user } = useAuth();
  const location = useLocation();

  const basePath = location.pathname.startsWith("/staff")
    ? "/staff"
    : "/admin";

  const canManagePayments = hasPermission(
    user,
    "payments.manage"
  );

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState("");

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getPayments({
        search: search.trim(),
        status,
        payment_mode: paymentMode,
        page,
        limit: PAGE_SIZE,
      });

      const data = response?.data?.data;

      setPayments(
        Array.isArray(data?.payments) ? data.payments : []
      );

      setPagination(
        data?.pagination || {
          page,
          limit: PAGE_SIZE,
          total: 0,
          totalPages: 1,
        }
      );
    } catch (loadError) {
      console.error("Load payments error:", loadError);
      setError(
        loadError?.response?.data?.message ||
          "Unable to load payments."
      );
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [search, status, paymentMode, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPayments();
    }, 300);

    return () => clearTimeout(timer);
  }, [loadPayments]);

  const handleDelete = async (id) => {
    if (!canManagePayments || deletingId) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this payment? The admission's paid amount will be recalculated."
    );

    if (!confirmed) return;

    try {
      setDeletingId(id);
      setError("");

      await deletePayment(id);

      // If the last row on a page was deleted, go back one page.
      if (payments.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await loadPayments();
      }
    } catch (deleteError) {
      const message =
        deleteError?.response?.data?.message ||
        "Unable to delete payment.";

      setError(message);
    } finally {
      setDeletingId("");
    }
  };

  const resetFilters = () => {
    setSearch("");
    setStatus("");
    setPaymentMode("");
    setPage(1);
  };

  const handleSearchChange = (value) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusChange = (value) => {
    setStatus(value);
    setPage(1);
  };

  const handlePaymentModeChange = (value) => {
    setPaymentMode(value);
    setPage(1);
  };

  return (
    <div className="payment-page">
      <div className="payment-page-header">
        <div>
          <h1>Manage Payments</h1>
          <p>
            Manage student payment transactions and receipts.
          </p>
        </div>

        {canManagePayments && (
          <Link
            to={`${basePath}/payments/add`}
            className="payment-primary-button"
          >
            <FiPlus />
            Add Payment
          </Link>
        )}
      </div>

      <div className="payment-card">
        <PaymentFilters
          search={search}
          setSearch={handleSearchChange}
          status={status}
          setStatus={handleStatusChange}
          paymentMode={paymentMode}
          setPaymentMode={handlePaymentModeChange}
          onReset={resetFilters}
        />

        {error && (
          <div className="payment-error" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="payment-state">
            Loading payments...
          </div>
        ) : (
          <PaymentTable
            payments={payments}
            basePath={basePath}
            canManagePayments={canManagePayments}
            deletingId={deletingId}
            onDelete={handleDelete}
          />
        )}

        {!loading && pagination.totalPages > 1 && (
          <div className="payment-pagination">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() =>
                setPage((current) => Math.max(1, current - 1))
              }
            >
              Previous
            </button>

            <span>
              Page {page} of {pagination.totalPages}
            </span>

            <button
              type="button"
              disabled={page >= pagination.totalPages}
              onClick={() =>
                setPage((current) =>
                  Math.min(pagination.totalPages, current + 1)
                )
              }
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Payments;