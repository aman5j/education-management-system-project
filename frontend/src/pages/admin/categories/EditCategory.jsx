
// import React, { useCallback, useEffect, useState } from "react";
import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams, Navigate } from "react-router-dom";

import CategoryForm from "../../../components/categories/CategoryForm";
import { useAuth } from "../../../context/AuthContext";
import { getCategory, updateCategory } from "../../../services/categoryService";

import { hasPermission } from "../../../utils/permissions";

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
  const [error, setError] = useState("");

  // const loadCategory = useCallback(async () => {
  //   if (authLoading || !user || !canUpdate) {
  //     setLoading(false);
  //     return;
  //   }

  //   try {
  //     setLoading(true);
  //     setError("");
  //     const response = await getCategory(id);
  //     setCategory(response?.data?.data || null);
  //   } catch (requestError) {
  //     setError(
  //       requestError?.response?.data?.message ||
  //         "Failed to load category."
  //     );
  //   } finally {
  //     setLoading(false);
  //   }
  // }, [id, authLoading, user, canUpdate]);

  // useEffect(() => {
  //   if (!authLoading) {
  //     loadCategory();
  //   }
  // }, [loadCategory, authLoading]);

  
  useEffect(() => {
    if (authLoading) {
      return undefined;
    }

    if (!user || !canUpdate) {
      setCategory(null);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    const loadCategory = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await getCategory(id);

        if (!cancelled) {
          setCategory(response?.data?.data || null);
        }
      } catch (requestError) {
        if (!cancelled) {
          setCategory(null);
          setError(
            requestError?.response?.data?.message ||
              "Failed to load category."
          );
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
