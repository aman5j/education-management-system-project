
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowLeft, FiSave } from "react-icons/fi";

const CATEGORIES = [
  "Rent", "Salary", "Electricity", "Internet",
  "Stationery", "Equipment", "Maintenance",
  "Marketing", "Travel", "Software", "Utilities", "Other",
];

const PAYMENT_METHODS = [
  "Cash", "UPI", "Card", "Bank Transfer", "Cheque", "Other",
];

const EMPTY_FORM = {
  title: "",
  category: "Other",
  amount: "",
  expenseDate: new Date().toLocaleDateString("en-CA"),
  paymentMethod: "Cash",
  vendor: "",
  description: "",
  receiptUrl: "",
  status: "Paid",
};

const ExpenseForm = ({
  initialData,
  onSubmit,
  submitting = false,
  submitLabel = "Save Expense",
}) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!initialData) {
      setForm(EMPTY_FORM);
      return;
    }

    setForm({
      title: initialData.title || "",
      category: initialData.category || "Other",
      amount: String(initialData.amount ?? ""),
      expenseDate: initialData.expenseDate
        ? new Date(initialData.expenseDate).toLocaleDateString("en-CA", {
            timeZone: "UTC",
          })
        : EMPTY_FORM.expenseDate,
      paymentMethod: initialData.paymentMethod || "Cash",
      vendor: initialData.vendor || "",
      description: initialData.description || "",
      receiptUrl: initialData.receiptUrl || "",
      status: initialData.status || "Paid",
    });
  }, [initialData]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.title.trim()) {
      setError("Please enter an expense title.");
      return;
    }

    if (!form.amount || !Number.isFinite(Number(form.amount)) ||
        Number(form.amount) <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    if (!form.expenseDate) {
      setError("Please select the expense date.");
      return;
    }

    try {
      await onSubmit({
        ...form,
        title: form.title.trim(),
        amount: Number(form.amount),
        vendor: form.vendor.trim(),
        description: form.description.trim(),
        receiptUrl: form.receiptUrl.trim(),
      });
    } catch (submitError) {
      setError(submitError.message || "Unable to save expense.");
    }
  };

  return (
    <form className="expense-form" onSubmit={handleSubmit}>
      <div className="expense-form-heading">
        <div>
          <h2>Expense Information</h2>
          <p>Enter the institute expense details below.</p>
        </div>
      </div>

      {error && <div className="expense-alert">{error}</div>}

      <div className="expense-form-grid">
        <label>
          Expense Title <span>*</span>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            maxLength={150}
            placeholder="e.g. October electricity bill"
            required
          />
        </label>

        <label>
          Category <span>*</span>
          <select name="category" value={form.category}
            onChange={handleChange} required>
            {CATEGORIES.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>

        <label>
          Amount (₹) <span>*</span>
          <input
            name="amount"
            type="number"
            min="0.01"
            max="999999999"
            step="0.01"
            value={form.amount}
            onChange={handleChange}
            placeholder="0.00"
            required
          />
        </label>

        <label>
          Expense Date <span>*</span>
          <input
            name="expenseDate"
            type="date"
            value={form.expenseDate}
            onChange={handleChange}
            required
          />
        </label>

        <label>
          Payment Method <span>*</span>
          <select name="paymentMethod" value={form.paymentMethod}
            onChange={handleChange} required>
            {PAYMENT_METHODS.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>

        <label>
          Status
          <select name="status" value={form.status} onChange={handleChange}>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
          </select>
        </label>

        <label>
          Vendor / Paid To
          <input
            name="vendor"
            value={form.vendor}
            onChange={handleChange}
            maxLength={150}
            placeholder="Vendor or recipient name"
          />
        </label>

        <label>
          Receipt URL
          <input
            name="receiptUrl"
            type="url"
            value={form.receiptUrl}
            onChange={handleChange}
            maxLength={1000}
            placeholder="https://..."
          />
        </label>

        <label className="expense-full-width">
          Description / Notes
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={4}
            maxLength={1000}
            placeholder="Additional expense details..."
          />
        </label>
      </div>

      <div className="expense-form-actions">
        <Link to="/admin/expenses" className="expense-secondary-button">
          <FiArrowLeft /> Cancel
        </Link>

        <button
          className="expense-primary-button"
          type="submit"
          disabled={submitting}
        >
          <FiSave />
          {submitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
};

export default ExpenseForm;
