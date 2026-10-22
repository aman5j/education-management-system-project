import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import ExpenseForm from "../../../components/expenses/ExpenseForm";
import { getExpense, updateExpense } from "../../../services/expenseService";
import "../../../styles/ExpenseManagement.css";

const EditExpense = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const basePath = location.pathname.startsWith("/staff")
    ? "/staff"
    : "/admin";

  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadExpense = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await getExpense(id);

        if (active) {
          setExpense(response?.data?.data || null);
        }
      } catch (err) {
        if (active) {
          setError(
            err?.response?.data?.message || "Unable to load expense."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadExpense();

    return () => {
      active = false;
    };
  }, [id]);

  const handleSubmit = async (data) => {
    setSaving(true);
    setError("");

    try {
      await updateExpense(id, data);
      navigate(`${basePath}/expenses`, { replace: true });
    } catch (err) {
      const message =
        err?.response?.data?.message || "Unable to update expense.";

      setError(message);
      throw new Error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="expense-state">Loading expense...</div>;
  }

  if (error && !expense) {
    return <div className="expense-alert" role="alert">{error}</div>;
  }

  if (!expense) {
    return <div className="expense-empty">Expense not found.</div>;
  }

  return (
    <div className="expense-page">
      <div className="expense-page-header">
        <div>
          <h1>Edit Expense</h1>
          <p>Update the selected expense record.</p>
        </div>
      </div>

      {error && <div className="expense-alert" role="alert">{error}</div>}

      <ExpenseForm
        initialData={expense}
        onSubmit={handleSubmit}
        submitting={saving}
        submitLabel="Update Expense"
      />
    </div>
  );
};

export default EditExpense;
