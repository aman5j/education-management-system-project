
import React from "react";
import { Link } from "react-router-dom";
import { MdOutlineDateRange } from "react-icons/md";
import { FiEye, FiEdit2, FiTrash2 } from "react-icons/fi";
import { CiImageOff } from "react-icons/ci";

import { getAssetUrl } from "../../utils/assetUrl";

const CategoryTable = ({
  categories = [],
  basePath = "/admin/categories",
  canView = false,
  canUpdate = false,
  canDelete = false,
  onDelete,
}) => {
  if (!categories.length) {
    return (
      <div className="category-empty">
        No categories found. Create a category to get started.
      </div>
    );
  }

  return (
    <div className="common-table-wrapper">
      <table className="common-table">
        <thead>
          <tr>
            <th>Icon</th>
            <th>Category Name</th>
            <th>Display Order</th>
            <th>Status</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {categories.map((category) => (
            <tr key={category._id}>
              <td>
                {category.categoryIcon ? (
                  <img
                    className="student-avatar"
                    src={getAssetUrl(category.categoryIcon)}
                    alt={category.categoryName}
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="student-avatar">
                    <CiImageOff />
                  </div>
                )}
              </td>

              <td>
                <strong className="student-roll">
                  {category.categoryName}
                </strong>
              </td>

              <td>{category.displayOrder ?? 0}</td>

              <td>
                <span
                  className={`category-status-badge ${
                    category.status === "Active"
                      ? "active"
                      : "inactive"
                  }`}
                >
                  {category.status}
                </span>
              </td>

              <td>
                <div className="contact-details">
                  <div className="contact-li">
                    <MdOutlineDateRange />
                    <span>
                      {category.createdAt
                        ? new Date(
                            category.createdAt
                          ).toLocaleDateString()
                        : "—"}
                    </span>
                  </div>
                </div>
              </td>

              <td>
                <div className="student-actions">
                  {canView && (
                    <Link
                      className="tooltip"
                      data-tooltip="View"
                      aria-label={`View ${category.categoryName}`}
                      to={`${basePath}/${category._id}`}
                    >
                      <FiEye />
                    </Link>
                  )}

                  {canUpdate && (
                    <Link
                      className="tooltip"
                      data-tooltip="Edit"
                      aria-label={`Edit ${category.categoryName}`}
                      to={`${basePath}/${category._id}/edit`}
                    >
                      <FiEdit2 />
                    </Link>
                  )}

                  {canDelete && (
                    <button
                      type="button"
                      className="tooltip"
                      data-tooltip="Delete"
                      aria-label={`Delete ${category.categoryName}`}
                      onClick={() => onDelete?.(category._id)}
                    >
                      <FiTrash2 />
                    </button>
                  )}

                  {!canView && !canUpdate && !canDelete && (
                    <span>View only</span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CategoryTable;
