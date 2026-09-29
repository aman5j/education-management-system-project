import React, {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router-dom";

import {
  getCategory,
} from "../../../services/categoryService";

import {
  getAssetUrl,
} from "../../../utils/assetUrl";

const ViewCategory = () => {
  const {
    id,
  } = useParams();

  const [
    category,
    setCategory,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    const loadCategory =
      async () => {
        try {
          const response =
            await getCategory(
              id
            );

          setCategory(
            response?.data?.data
          );
        } catch (requestError) {
          console.error(
            "Failed to load category:",
            requestError
          );

          setError(
            requestError?.response
              ?.data?.message ||
              "Failed to load category."
          );
        } finally {
          setLoading(false);
        }
      };

    loadCategory();
  }, [id]);

  if (loading) {
    return (
      <div className="category-loading">
        Loading category...
      </div>
    );
  }

  if (error) {
    return (
      <div className="category-list-error">
        {error}
      </div>
    );
  }

  if (!category) {
    return (
      <div className="category-list-error">
        Category not found.
      </div>
    );
  }

  return (
    <div className="category-page">
      <div className="category-page-header">
        <div>
          <h1>
            View Category
          </h1>

          <p>
            Category details.
          </p>
        </div>

        <Link
          to={`/admin/categories/${id}/edit`}
          className="category-add-button"
        >
          Edit Category
        </Link>
      </div>

      <div className="category-card">
        <div className="category-details">
          <div className="category-detail-item">
            <span>
              Category Name
            </span>

            <strong>
              {
                category.categoryName
              }
            </strong>
          </div>

          <div className="category-detail-item">
            <span>
              Display Order
            </span>

            <strong>
              {
                category.displayOrder
              }
            </strong>
          </div>

          <div className="category-detail-item">
            <span>
              Status
            </span>

            <strong>
              {
                category.status
              }
            </strong>
          </div>

          <div className="category-detail-item">
            <span>
              Category Icon
            </span>

            {category.categoryIcon ? (
              <img
                className="category-view-icon"
                src={getAssetUrl(
                  category.categoryIcon
                )}
                alt={
                  category.categoryName
                }
              />
            ) : (
              <strong>
                No icon
              </strong>
            )}
          </div>

          <div className="category-detail-item">
            <span>
              Created
            </span>

            <strong>
              {category.createdAt
                ? new Date(
                    category.createdAt
                  ).toLocaleString()
                : "—"}
            </strong>
          </div>

          <div className="category-detail-item">
            <span>
              Updated
            </span>

            <strong>
              {category.updatedAt
                ? new Date(
                    category.updatedAt
                  ).toLocaleString()
                : "—"}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewCategory;