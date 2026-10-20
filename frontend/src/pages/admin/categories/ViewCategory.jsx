
import React, { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

import { useAuth } from "../../../context/AuthContext";
import { getCategory } from "../../../services/categoryService";
import { getAssetUrl } from "../../../utils/assetUrl";

const ViewCategory = () => {
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuth();

  const basePath = location.pathname.startsWith("/staff")
    ? "/staff/categories"
    : "/admin/categories";

  const permissions = user?.assignedRole?.permissions || [];
  const canView =
    user?.role === "admin" ||
    permissions.includes("*") ||
    permissions.includes("courses.view");

  const canUpdate =
    user?.role === "admin" ||
    permissions.includes("*") ||
    permissions.includes("courses.update");

  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadCategory = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await getCategory(id);

        if (active) {
          setCategory(response?.data?.data || null);
        }
      } catch (requestError) {
        if (active) {
          setError(
            requestError?.response?.data?.message ||
              "Failed to load category."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadCategory();

    return () => {
      active = false;
    };
  }, [id]);

  if (!canView) {
    return (
      <div className="category-list-error" role="alert">
        You do not have permission to view categories.
        <p><Link to={basePath}>Back to Categories</Link></p>
      </div>
    );
  }

  if (loading) {
    return <div className="category-loading">Loading category...</div>;
  }

  if (error || !category) {
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
          <h1>View Category</h1>
          <p>Review category details and status.</p>
        </div>

        <div className="category-view-actions">
          {canUpdate && (
            <Link
              to={`${basePath}/${id}/edit`}
              className="category-add-button"
            >
              Edit Category
            </Link>
          )}

          <Link to={basePath} className="category-add-button">
            Back to Categories
          </Link>
        </div>
      </div>

      <div className="category-card">
        <div className="category-details">
          <div className="category-detail-item">
            <span>Category Name</span>
            <strong>{category.categoryName}</strong>
          </div>

          <div className="category-detail-item">
            <span>Display Order</span>
            <strong>{category.displayOrder ?? 0}</strong>
          </div>

          <div className="category-detail-item">
            <span>Status</span>
            <strong>{category.status}</strong>
          </div>

          <div className="category-detail-item">
            <span>Category Icon</span>
            {category.categoryIcon ? (
              <img
                className="category-view-icon"
                src={getAssetUrl(category.categoryIcon)}
                alt={category.categoryName}
              />
            ) : (
              <strong>No icon</strong>
            )}
          </div>

          <div className="category-detail-item">
            <span>Created</span>
            <strong>
              {category.createdAt
                ? new Date(category.createdAt).toLocaleString()
                : "—"}
            </strong>
          </div>

          <div className="category-detail-item">
            <span>Updated</span>
            <strong>
              {category.updatedAt
                ? new Date(category.updatedAt).toLocaleString()
                : "—"}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewCategory;
