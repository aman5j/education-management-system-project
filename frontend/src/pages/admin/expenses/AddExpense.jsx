import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import ExpenseForm from "../../../components/expenses/ExpenseForm";
import { createExpense } from "../../../services/expenseService";
import notification, {
  getApiErrorMessage,
} from "../../../utils/notification";

import "../../../styles/ExpenseManagement.css";

const AddExpense = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const basePath = location.pathname.startsWith("/staff")
    ? "/staff"
    : "/admin";

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (data) => {
    setSaving(true);
    setError("");

    try {
      await createExpense(data);

      notification.success("Expense created successfully.");

      navigate(`${basePath}/expenses`, {
        replace: true,
      });
    } catch (err) {
      const message = getApiErrorMessage(err);

      setError(message);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="expense-page">
      <div className="expense-page-header">
        <div>
          <h1>Add Expense</h1>
          <p>Record a new institute expense.</p>
        </div>
      </div>

      {error && (
        <div className="expense-alert" role="alert">
          {error}
        </div>
      )}

      <ExpenseForm
        onSubmit={handleSubmit}
        submitting={saving}
        submitLabel="Create Expense"
      />
    </div>
  );
};

export default AddExpense;