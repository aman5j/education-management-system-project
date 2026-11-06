
import React, { useEffect, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  Navigate,
} from "react-router-dom";

import CategoryForm from "../../../components/categories/CategoryForm";
import { useAuth } from "../../../context/AuthContext";
import {
  getCategory,
  updateCategory,
} from "../../../services/categoryService";
import { hasPermission } from "../../../utils/permissions";
import notification, {
  getApiErrorMessage,
} from "../../../utils/notification";

const EditCategory = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  const basePath = location.pathname.startsWith("/staff")
    ? "/staff/categories"
    : "/admin/categories";

  const canUpdate = hasPermission(user, "courses.update");

  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return undefined;

    if (!user || !canUpdate) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    const loadCategory = async () => {
      setLoading(true);

      try {
        const response = await getCategory(id);

        if (!cancelled) {
          const data = response?.data?.data || null;
          setCategory(data);

          if (!data) {
            notification.error("Category not found.");
          }
        }
      } catch (error) {
        if (!cancelled) {
          setCategory(null);
          notification.error(getApiErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadCategory();

    return () => {
      cancelled = true;
    };
  }, [id, authLoading, user, canUpdate]);

  const handleSubmit = async (formData) => {
    setSaving(true);

    try {
      await updateCategory(id, formData);

      notification.success("Category updated successfully.");

      navigate(basePath, { replace: true });
    } catch (error) {
      notification.error(getApiErrorMessage(error));
      throw error;
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return <div className="category-loading">Checking permissions...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

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
        Category could not be loaded.
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
