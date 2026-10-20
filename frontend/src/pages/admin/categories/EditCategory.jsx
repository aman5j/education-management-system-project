
import React, { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import CategoryForm from "../../../components/categories/CategoryForm";
import { useAuth } from "../../../context/AuthContext";
import { getCategory, updateCategory } from "../../../services/categoryService";

const EditCategory = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const basePath = location.pathname.startsWith("/staff")
    ? "/staff/categories"
    : "/admin/categories";

  const permissions = user?.assignedRole?.permissions || [];
  const canUpdate =
    user?.role === "admin" ||
    permissions.includes("*") ||
    permissions.includes("courses.update");

  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadCategory = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await getCategory(id);
      setCategory(response?.data?.data || null);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          "Failed to load category."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadCategory();
  }, [loadCategory]);

  const handleSubmit = async (formData) => {
    setSaving(true);
    setError("");

    try {
      await updateCategory(id, formData);
      navigate(basePath, { replace: true });
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          "Failed to update category."
      );
      throw requestError;
    } finally {
      setSaving(false);
    }
  };

  if (!canUpdate) {
    return (
      <div className="category-list-error" role="alert">
        You do not have permission to edit categories.
        <p><Link to={basePath}>Back to Categories</Link></p>
      </div>
    );
  }

  if (loading) {
    return <div className="category-loading">Loading category...</div>;
  }

  if (!category) {
    return (
      <div className="category-list-error">
        {error || "Category not found."}
        <p><Link to={basePath}>Back to Categories</Link></p>
      </div>
    );
  }

  return (
    <div className="category-page">
      <div className="category-page-header">
        <div>
          <h1>Edit Category</h1>
          <p>Update category details and availability.</p>
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

      <div className="category-card">
        <CategoryForm
          initialData={category}
          loading={saving}
          submitLabel="Update Category"
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
};

export default EditCategory;
