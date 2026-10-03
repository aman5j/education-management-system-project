import {
  useEffect,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  FiPlus,
} from "react-icons/fi";

import PaymentFilters from "../../../components/payments/PaymentFilters";
import PaymentTable from "../../../components/payments/PaymentTable";

import {
  getPayments,
  deletePayment,
} from "../../../services/paymentService";

import "../../../styles/PaymentManagement.css";

const Payments = () => {
  const [
    payments,
    setPayments,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    status,
    setStatus,
  ] = useState("");

  const [
    paymentMode,
    setPaymentMode,
  ] = useState("");

  const [
    page,
    setPage,
  ] = useState(1);

  const [
    pagination,
    setPagination,
  ] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const loadPayments =
    async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await getPayments({
            search,
            status,
            payment_mode:
              paymentMode,
            page,
            limit: 10,
          });

        const data =
          response?.data?.data;

        setPayments(
          Array.isArray(
            data?.payments
          )
            ? data.payments
            : []
        );

        setPagination(
          data?.pagination || {
            page,
            limit: 10,
            total: 0,
            totalPages: 1,
          }
        );
      } catch (loadError) {
        console.error(
          "Load payments error:",
          loadError
        );

        setError(
          loadError?.response
            ?.data?.message ||
            "Unable to load payments."
        );
      } finally {
        setLoading(false);
      }
    };

  // useEffect(() => {
  //   loadPayments();
  // }, [
  //   page,
  //   status,
  //   paymentMode,
  // ]);

  // useEffect(() => {
  //   const timer =
  //     setTimeout(() => {
  //       setPage(1);
  //       loadPayments();
  //     }, 400);

  //   return () =>
  //     clearTimeout(timer);
  // }, [search]);

  // useEffect(() => {
  //   const timer = setTimeout(() => {
  //     loadPayments();
  //   }, 400);

  //   return () => {
  //     clearTimeout(timer);
  //   };
  // }, [
  //   search,
  //   page,
  //   status,
  //   paymentMode,
  // ]);

  // useEffect(() => {
  //     setPage(1);
  //   }, [
  //     search,
  //     status,
  //     paymentMode,
  //   ]);

  //   useEffect(() => {
  //     const timer = setTimeout(() => {
  //       loadPayments();
  //     }, 400);

  //     return () => {
  //       clearTimeout(timer);
  //     };
  //   }, [
  //     search,
  //     page,
  //     status,
  //     paymentMode,
  //   ]);

//   useEffect(() => {
//   if (page !== 1) {
//     setPage(1);
//     return;
//   }

//   const timer = setTimeout(() => {
//     loadPayments();
//   }, 400);

//   return () => {
//     clearTimeout(timer);
//   };
// }, [
//   search,
//   status,
//   paymentMode,
//   page,
// ]);

useEffect(() => {
  const timer = setTimeout(() => {
    loadPayments();
  }, 400);

  return () => {
    clearTimeout(timer);
  };
}, [
  search,
  status,
  paymentMode,
  page,
]);

  const handleDelete =
    async (id) => {
      const confirmed =
        window.confirm(
          "Are you sure you want to delete this payment?"
        );

      if (!confirmed) {
        return;
      }

      try {
        await deletePayment(
          id
        );

        await loadPayments();
      } catch (deleteError) {
        alert(
          deleteError?.response
            ?.data?.message ||
            "Unable to delete payment."
        );
      }
    };

  const resetFilters =
    () => {
      setSearch("");
      setStatus("");
      setPaymentMode("");
      setPage(1);
    };

  const handleSearchChange = (value) => {
      setSearch(value);
      setPage(1);
    };

  return (
    <div className="payment-page">
      <div className="payment-page-header">
        <div>
          <h1>
            Manage Payments
          </h1>

          <p>
            Manage student payment transactions and receipts.
          </p>
        </div>

        <Link
          to="/admin/payments/add"
          className="payment-primary-button"
        >
          <FiPlus />
          Add Payment
        </Link>
      </div>

      <div className="payment-card">
        {/* <PaymentFilters
          search={search}
          setSearch={
            setSearch
          }
          status={status}
          setStatus={
            setStatus
          }
          paymentMode={
            paymentMode
          }
          setPaymentMode={
            setPaymentMode
          }
          onReset={
            resetFilters
          }
        /> */}

        <PaymentFilters
            search={search}
            setSearch={handleSearchChange}
            status={status}
            setStatus={(value) => {
              setStatus(value);
              setPage(1);
            }}
            paymentMode={paymentMode}
            setPaymentMode={(value) => {
              setPaymentMode(value);
              setPage(1);
            }}
            onReset={resetFilters}
          />

        {error && (
          <div className="payment-error">
            {error}
          </div>
        )}

        {loading ? (
          <div className="payment-state">
            Loading payments...
          </div>
        ) : (
          <PaymentTable
            payments={
              payments
            }
            onDelete={
              handleDelete
            }
          />
        )}

        {!loading &&
          pagination.totalPages >
            1 && (
            <div className="payment-pagination">
              <button
                type="button"
                disabled={
                  page <= 1
                }
                onClick={() =>
                  setPage(
                    (previous) =>
                      previous - 1
                  )
                }
              >
                Previous
              </button>

              <span>
                Page{" "}
                {page} of{" "}
                {
                  pagination.totalPages
                }
              </span>

              <button
                type="button"
                disabled={
                  page >=
                  pagination.totalPages
                }
                onClick={() =>
                  setPage(
                    (previous) =>
                      previous + 1
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