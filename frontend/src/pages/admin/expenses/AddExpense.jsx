
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ExpenseForm from "../../../components/expenses/ExpenseForm";
import { createExpense } from "../../../services/expenseService";
import "../../../styles/ExpenseManagement.css";

const AddExpense = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (data) => {
    setSaving(true);
    try {
      await createExpense(data);
      navigate("/admin/expenses");
    } catch (error) {
      throw new Error(
        error?.response?.data?.message || "Unable to create expense."
      );
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

      <ExpenseForm
        onSubmit={handleSubmit}
        submitting={saving}
        submitLabel="Create Expense"
      />
    </div>
  );
};

export default AddExpense;
