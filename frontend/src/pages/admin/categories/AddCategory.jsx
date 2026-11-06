
import React, { useState } from "react";
import { Link, useLocation, useNavigate, Navigate } from "react-router-dom";

import CategoryForm from "../../../components/categories/CategoryForm";
import { useAuth } from "../../../context/AuthContext";
import { createCategory } from "../../../services/categoryService";
import { hasPermission } from "../../../utils/permissions";
import notification, {
  getApiErrorMessage,
} from "../../../utils/notification";

const AddCategory = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  const basePath = location.pathname.startsWith("/staff")
    ? "/staff/categories"
    : "/admin/categories";

  const canCreate = hasPermission(user, "courses.create");

  const [saving, setSaving] = useState(false);

  if (authLoading) {
    return <div className="category-loading">Checking permissions...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!canCreate) {
    return (
      <div className="category-list-error" role="alert">
        You do not have permission to create categories.
        <p><Link to={basePath}>Back to Categories</Link></p>
      </div>
    );
  }

  const handleSubmit = async (formData) => {
    setSaving(true);

    try {
      await createCategory(formData);

      notification.success("Category created successfully.");

      navigate(basePath, { replace: true });
    } catch (error) {
      notification.error(getApiErrorMessage(error));
      throw error;
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="category-page">
      <div className="page-header">
        <div>
          <h1>Add Category</h1>
        </div>
      </div>

      <div className="common-card">
        <CategoryForm
          loading={saving}
          submitLabel="Create Category"
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
};

export default AddCategory;
