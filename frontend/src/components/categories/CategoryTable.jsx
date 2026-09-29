import React from "react";
import {
  Link,
} from "react-router-dom";

import {
  getAssetUrl,
} from "../../utils/assetUrl";

const CategoryTable = ({
  categories,
  onDelete,
}) => {
  if (
    !categories ||
    categories.length === 0
  ) {
    return (
      <div className="category-empty">
        No categories found.
      </div>
    );
  }

  return (
    <div className="category-table-wrapper">
      <table className="category-table">
        <thead>
          <tr>
            <th>
              Icon
            </th>

            <th>
              Category Name
            </th>

            <th>
              Display Order
            </th>

            <th>
              Status
            </th>

            <th>
              Created
            </th>

            <th>
              Actions
            </th>
          </tr>
        </thead>

        <tbody>
          {categories.map(
            (category) => (
              <tr
                key={
                  category._id
                }
              >
                <td>
                  {category.categoryIcon ? (
                    <img
                      className="category-table-icon"
                      src={getAssetUrl(
                        category.categoryIcon
                      )}
                      alt={
                        category.categoryName
                      }
                      onError={(
                        event
                      ) => {
                        event.currentTarget.style.display =
                          "none";
                      }}
                    />
                  ) : (
                    <div className="category-no-icon">
                      —
                    </div>
                  )}
                </td>

                <td>
                  <strong>
                    {
                      category.categoryName
                    }
                  </strong>
                </td>

                <td>
                  {
                    category.displayOrder
                  }
                </td>

                <td>
                  <span
                    className={`category-status-badge ${
                      category.status ===
                      "Active"
                        ? "active"
                        : "inactive"
                    }`}
                  >
                    {
                      category.status
                    }
                  </span>
                </td>

                <td>
                  {category.createdAt
                    ? new Date(
                        category.createdAt
                      ).toLocaleDateString()
                    : "—"}
                </td>

                <td>
                  <div className="category-actions">
                    <Link
                      to={`/admin/categories/${category._id}`}
                      className="category-action view"
                    >
                      View
                    </Link>

                    <Link
                      to={`/admin/categories/${category._id}/edit`}
                      className="category-action edit"
                    >
                      Edit
                    </Link>

                    <button
                      type="button"
                      className="category-action delete"
                      onClick={() =>
                        onDelete(
                          category._id
                        )
                      }
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
};

export default CategoryTable;