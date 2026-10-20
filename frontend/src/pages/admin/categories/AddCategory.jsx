
import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import CategoryForm from "../../../components/categories/CategoryForm";
import { useAuth } from "../../../context/AuthContext";
import { createCategory } from "../../../services/categoryService";

const AddCategory = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const basePath = location.pathname.startsWith("/staff")
    ? "/staff/categories"
    : "/admin/categories";

  const permissions = user?.assignedRole?.permissions || [];
  const canCreate =
    user?.role === "admin" ||
    permissions.includes("*") ||
    permissions.includes("courses.create");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!canCreate) {
    return (
      <div className="category-list-error" role="alert">
        You do not have permission to create categories.
        <p><Link to={basePath}>Back to Categories</Link></p>
      </div>
    );
  }

  const handleSubmit = async (formData) => {
    setLoading(true);
    setError("");

    try {
      await createCategory(formData);
      navigate(basePath, { replace: true });
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          "Failed to create category."
      );
      throw requestError;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="category-page">
      <div className="page-header">
        <div>
          <h1>Add Category</h1>
          <p>Create a reusable category for your institute's courses.</p>
        </div>
        <Link to={basePath} className="category-add-button">
          Back to Categories
        </Link>
      </div>

      {error && (
        <div className="category-list-error" role="alert">
          {error}
        </div>
      )}

      <div className="common-card">
        <CategoryForm
          loading={loading}
          submitLabel="Create Category"
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
};

export default AddCategory;
