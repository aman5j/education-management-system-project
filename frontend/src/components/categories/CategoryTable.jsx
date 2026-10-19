import React from "react";
import {
  Link,
} from "react-router-dom";
import { MdOutlineDateRange } from "react-icons/md";
import { FiEye } from "react-icons/fi";

import {
  getAssetUrl,
} from "../../utils/assetUrl";
import { CiImageOff } from "react-icons/ci";

import { FiEdit2 } from "react-icons/fi";
import { FiTrash2 } from "react-icons/fi";
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
    <div className="common-table-wrapper">
      <table className="common-table">
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
                      className="student-avatar"
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
                    <div className="student-avatar ">
                      <CiImageOff />

                    </div>
                  )}
                </td>

                <td>
                  <strong className="student-roll">
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

                  <div class="contact-details">
                    <div class="contact-li">
                      <MdOutlineDateRange />

                       <span> {category.createdAt
                    ? new Date(
                        category.createdAt
                      ).toLocaleDateString()
                    : "—"}</span>
                       </div></div>

                 
                </td>

                <td>
                  <div className="student-actions">
                    <Link className="tooltip" data-tooltip="View"
                      to={`/admin/categories/${category._id}`}
                      
                    >
                      <FiEye />
                    </Link>

                    <Link
                      to={`/admin/categories/${category._id}/edit`}
                      className="tooltip" data-tooltip="Edit"
                    >
                     <FiEdit2 />
                    </Link>

                    <button
                      type="button"
                     className="tooltip" data-tooltip="Delete"
                      onClick={() =>
                        onDelete(
                          category._id
                        )
                      }
                    >
                       <FiTrash2 />
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