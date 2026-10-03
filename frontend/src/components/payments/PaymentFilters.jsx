import {
  FiRefreshCw,
  FiSearch,
} from "react-icons/fi";

const PaymentFilters = ({
  search,
  setSearch,
  status,
  setStatus,
  paymentMode,
  setPaymentMode,
  onReset,
}) => {
  return (
    <div className="payment-filters">
      <div className="payment-search">
        <FiSearch />

        <input
          type="text"
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="Search receipt no, student name or roll no..."
        />
      </div>

      <select
        value={status}
        onChange={(event) =>
          setStatus(event.target.value)
        }
      >
        <option value="">
          All Status
        </option>

        <option value="Verified">
          Verified
        </option>

        <option value="Pending">
          Pending
        </option>

        <option value="Failed">
          Failed
        </option>

        <option value="Overdue">
          Overdue
        </option>
      </select>

      <select
        value={paymentMode}
        onChange={(event) =>
          setPaymentMode(event.target.value)
        }
      >
        <option value="">
          All Payment Modes
        </option>

        <option value="Cash">
          Cash
        </option>

        <option value="UPI">
          UPI
        </option>

        <option value="Card">
          Card
        </option>

        <option value="Bank Transfer">
          Bank Transfer
        </option>
      </select>

      <button
        type="button"
        className="payment-reset-button"
        onClick={onReset}
      >
        <FiRefreshCw />
        Reset
      </button>
    </div>
  );
};

export default PaymentFilters;