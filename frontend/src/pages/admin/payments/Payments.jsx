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
import Pagination from "../../../components/common/Pagination";

import {
  getPayments,
  deletePayment,
} from "../../../services/paymentService";

import notification, {
  getApiErrorMessage,
} from "../../../utils/notification";

import "../../../styles/PaymentManagement.css";

const DEFAULT_PAGE_SIZE = 10;
const ALLOWED_PAGE_SIZES = [10, 25, 50];

const EMPTY_PAGINATION = {
  page: 1,
  limit: DEFAULT_PAGE_SIZE,
  total: 0,
  totalPages: 1,
};

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
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [paymentMode, setPaymentMode] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [deletingId, setDeletingId] = useState("");

  const [pagination, setPagination] = useState(
    EMPTY_PAGINATION
  );

  const loadPayments = useCallback(async () => {
    setLoading(true);

    try {
      const response = await getPayments({
        search: search.trim(),
        status,
        payment_mode: paymentMode,
        page,
        limit: pageSize,
      });

      const data =
        response?.data?.data ??
        response?.data ??
        {};

      const records = Array.isArray(data?.payments)
        ? data.payments
        : [];

      const pageInfo = data?.pagination || {
        page,
        limit: pageSize,
        total: records.length,
        totalPages: 1,
      };

      setPayments(records);
      setPagination(pageInfo);
    } catch (error) {
      setPayments([]);
      setPagination({
        ...EMPTY_PAGINATION,
        page,
        limit: pageSize,
      });

      notification.error(
        getApiErrorMessage(error)
      );
    } finally {
      setLoading(false);
    }
  }, [search, status, paymentMode, page, pageSize]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadPayments();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [loadPayments]);

  const handleDelete = async (id) => {
    if (!canManagePayments || deletingId || !id) {
      return;
    }

    const payment = payments.find(
      (item) => String(item._id) === String(id)
    );

    const receiptNumber =
      payment?.receipt_no || "this payment";

    const confirmed = await notification.confirm({
      title: "Delete payment?",
      text:
        `Are you sure you want to delete ${receiptNumber}? ` +
        "The admission's paid amount will be recalculated using the remaining verified payments.",
      confirmText: "Yes, delete",
      cancelText: "Cancel",
      icon: "warning",
      confirmButtonColor: "#dc2626",
    });

    if (!confirmed) {
      return;
    }

    setDeletingId(id);

    try {
      await deletePayment(id);

      notification.success(
        "Payment deleted successfully. Admission paid amount has been recalculated."
      );

      // If the deleted row was the only row on this page,
      // navigate to the previous page.
      if (payments.length === 1 && page > 1) {
        setPage((current) => Math.max(current - 1, 1));
      } else {
        await loadPayments();
      }
    } catch (error) {
      notification.error(
        getApiErrorMessage(error)
      );
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

  const handlePageChange = (nextPage) => {
    const totalPages = Math.max(
      Number(pagination.totalPages) || 1,
      1
    );

    if (
      nextPage < 1 ||
      nextPage > totalPages ||
      nextPage === page
    ) {
      return;
    }

    setPage(nextPage);
  };

  const handlePageSizeChange = (nextLimit) => {
    const limit = Number(nextLimit);

    if (!ALLOWED_PAGE_SIZES.includes(limit)) {
      return;
    }

    setPageSize(limit);
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

        {!loading && pagination.total > 0 && (
          <Pagination
            page={pagination.page || page}
            totalPages={pagination.totalPages || 1}
            total={pagination.total || 0}
            itemCount={payments.length}
            itemLabel="payments"
            limit={pageSize}
            loading={loading || Boolean(deletingId)}
            onPageChange={handlePageChange}
            onLimitChange={handlePageSizeChange}
          />
        )}
      </div>
    </div>
  );
};

export default Payments;