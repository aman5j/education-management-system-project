
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowLeft, FiSave, FiUpload, FiX } from "react-icons/fi";
import { uploadExpenseReceipt } from "../../services/expenseService";

const CATEGORIES = [
  "Rent", "Salary", "Electricity", "Internet", "Stationery",
  "Equipment", "Maintenance", "Marketing", "Travel",
  "Software", "Utilities", "Other",
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

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

const ExpenseForm = ({
  initialData,
  onSubmit,
  submitting = false,
  submitLabel = "Save Expense",
}) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [receiptFile, setReceiptFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState("");

  useEffect(() => {
    if (!initialData) {
      setForm(EMPTY_FORM);
      setReceiptFile(null);
      setReceiptPreview("");
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

    setReceiptFile(null);
    setReceiptPreview("");
  }, [initialData]);

  useEffect(() => {
    if (!receiptFile || receiptFile.type === "application/pdf") {
      setReceiptPreview("");
      return;
    }

    const url = URL.createObjectURL(receiptFile);
    setReceiptPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [receiptFile]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleReceiptChange = (event) => {
    const file = event.target.files?.[0];
    setError("");

    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Choose a JPG, PNG, WEBP, or PDF receipt.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("Receipt size must not exceed 5 MB.");
      event.target.value = "";
      return;
    }

    setReceiptFile(file);
  };

  const removeReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview("");
    setForm((previous) => ({ ...previous, receiptUrl: "" }));

    const input = document.getElementById("expense-receipt");
    if (input) input.value = "";
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

    let receiptUrl = form.receiptUrl;

    try {
      if (receiptFile) {
        setUploading(true);

        const uploadResponse = await uploadExpenseReceipt(receiptFile);
        receiptUrl = uploadResponse?.data?.data?.receiptUrl;

        if (!receiptUrl) {
          throw new Error("The server did not return the uploaded receipt.");
        }
      }

      await onSubmit({
        ...form,
        title: form.title.trim(),
        amount: Number(form.amount),
        vendor: form.vendor.trim(),
        description: form.description.trim(),
        receiptUrl,
      });
    } catch (submitError) {
      setError(
        submitError?.response?.data?.message ||
          submitError.message ||
          "Unable to save expense."
      );
    } finally {
      setUploading(false);
    }
  };

  const receiptIsPdf =
    receiptFile?.type === "application/pdf" ||
    (!receiptFile && /\.pdf($|\?)/i.test(form.receiptUrl));

  const receiptLink = form.receiptUrl
    ? /^https?:\/\//i.test(form.receiptUrl)
      ? form.receiptUrl
      : `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}`
          .replace(/\/api\/?$/, "") + form.receiptUrl
    : "";

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
          <input name="amount" type="number" min="0.01"
            max="999999999" step="0.01" value={form.amount}
            onChange={handleChange} placeholder="0.00" required />
        </label>

        <label>
          Expense Date <span>*</span>
          <input name="expenseDate" type="date"
            value={form.expenseDate} onChange={handleChange} required />
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
          <input name="vendor" value={form.vendor} onChange={handleChange}
            maxLength={150} placeholder="Vendor or recipient name" />
        </label>

        <div className="expense-full-width expense-receipt-field">
          <label htmlFor="expense-receipt">
            Upload Receipt / Bill
          </label>

          <label className="expense-upload-box" htmlFor="expense-receipt">
            <FiUpload size={22} />
            <strong>{receiptFile ? receiptFile.name : "Choose a receipt file"}</strong>
            <span>JPG, PNG, WEBP or PDF · Maximum 5 MB</span>
            <input
              id="expense-receipt"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
              onChange={handleReceiptChange}
            />
          </label>

          {receiptFile && (
            <div className="expense-receipt-preview">
              {receiptPreview && (
                <img src={receiptPreview} alt="Receipt preview" />
              )}
              {receiptFile.type === "application/pdf" && (
                <span>PDF receipt selected: {receiptFile.name}</span>
              )}
              <button type="button" onClick={removeReceipt}
                className="expense-remove-receipt">
                <FiX /> Remove selected file
              </button>
            </div>
          )}

          {!receiptFile && form.receiptUrl && (
            <div className="expense-receipt-preview">
              {receiptIsPdf ? (
                <a href={receiptLink} target="_blank" rel="noreferrer">
                  View existing receipt PDF
                </a>
              ) : (
                <a href={receiptLink} target="_blank" rel="noreferrer">
                  View existing receipt
                </a>
              )}
              <button type="button" onClick={removeReceipt}
                className="expense-remove-receipt">
                <FiX /> Remove receipt
              </button>
            </div>
          )}
        </div>

        <label className="expense-full-width">
          Description / Notes
          <textarea name="description" value={form.description}
            onChange={handleChange} rows={4} maxLength={1000}
            placeholder="Additional expense details..." />
        </label>
      </div>

      <div className="expense-form-actions">
        <Link to="/admin/expenses" className="expense-secondary-button">
          <FiArrowLeft /> Cancel
        </Link>

        <button className="expense-primary-button" type="submit"
          disabled={submitting || uploading}>
          <FiSave />
          {uploading ? "Uploading receipt..." :
            submitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
};

export default ExpenseForm;
