
import { useMemo, useState } from "react";
import {
  FiImage,
  FiSearch,
  FiArrowUp,
  FiArrowDown,
  FiCheckCircle,
  FiInfo,
} from "react-icons/fi";

import { getAssetUrl } from "../../../../utils/assetUrl";

export default function CourseCategoriesControls({
  categories = [],
  selectedCategoryIds = [],
  onChange,
}) {
  const [search, setSearch] = useState("");

  const selectedSet = useMemo(
    () => new Set(selectedCategoryIds.map(String)),
    [selectedCategoryIds]
  );

  const activeCategories = useMemo(
    () =>
      categories.filter(
        (category) => category.status === "Active"
      ),
    [categories]
  );

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return categories;

    return categories.filter((category) =>
      category.categoryName
        ?.toLowerCase()
        .includes(query)
    );
  }, [categories, search]);

  const selectedCategories = useMemo(
    () =>
      selectedCategoryIds
        .map((id) =>
          activeCategories.find(
            (category) => String(category._id) === String(id)
          )
        )
        .filter(Boolean),
    [selectedCategoryIds, activeCategories]
  );

  const toggleCategory = (category) => {
    if (category.status !== "Active") return;

    const id = String(category._id);

    if (selectedSet.has(id)) {
      onChange(
        selectedCategoryIds.filter(
          (selectedId) => String(selectedId) !== id
        )
      );
      return;
    }

    onChange([...selectedCategoryIds, id]);
  };

  const selectAllActive = () => {
    const nextIds = [
      ...selectedCategoryIds.filter((id) =>
        activeCategories.some(
          (category) => String(category._id) === String(id)
        )
      ),
      ...activeCategories
        .filter(
          (category) => !selectedSet.has(String(category._id))
        )
        .map((category) => String(category._id)),
    ];

    onChange(nextIds);
  };

  const clearSelection = () => {
    onChange([]);
  };

  const moveSelected = (index, direction) => {
    const next = [...selectedCategoryIds];
    const targetIndex = index + direction;

    if (
      targetIndex < 0 ||
      targetIndex >= next.length
    ) {
      return;
    }

    [next[index], next[targetIndex]] = [
      next[targetIndex],
      next[index],
    ];

    onChange(next);
  };

  return (
    <div className="we-course-category-controls">
      <div className="we-course-category-intro">
        <h4>Popular Course Categories</h4>
        <p>
          Select the categories you want to display in the
          homepage Popular Category section.
        </p>
      </div>

      <div className="we-course-category-stats">
        <div>
          <strong>{categories.length}</strong>
          <span>Total categories</span>
        </div>

        <div>
          <strong>{activeCategories.length}</strong>
          <span>Active categories</span>
        </div>

        <div>
          <strong>{selectedCategories.length}</strong>
          <span>Selected</span>
        </div>
      </div>

      <div className="we-course-category-search">
        <FiSearch />

        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search categories..."
          aria-label="Search categories"
        />
      </div>

      <div className="we-course-category-actions">
        <button
          type="button"
          onClick={selectAllActive}
          disabled={!activeCategories.length}
        >
          <FiCheckCircle />
          Select All Active
        </button>

        <button
          type="button"
          onClick={clearSelection}
          disabled={!selectedCategoryIds.length}
        >
          Clear Selection
        </button>
      </div>

      <div className="we-course-category-list">
        {filteredCategories.length ? (
          filteredCategories.map((category) => {
            const id = String(category._id);
            const isActive = category.status === "Active";
            const isSelected = selectedSet.has(id);

            return (
              <label
                className={`we-course-category-option ${
                  isSelected ? "selected" : ""
                } ${!isActive ? "inactive" : ""}`}
                key={id}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={!isActive}
                  onChange={() => toggleCategory(category)}
                />

                <span className="we-course-category-option-image">
                  {category.categoryIcon ? (
                    <img
                      src={getAssetUrl(category.categoryIcon)}
                      alt=""
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <FiImage />
                  )}
                </span>

                <span className="we-course-category-option-name">
                  <strong>{category.categoryName}</strong>
                  <small>
                    {category.status || "Unknown"}
                  </small>
                </span>

                <span
                  className={`we-course-category-status ${
                    isActive ? "active" : "inactive"
                  }`}
                >
                  {isActive ? "Active" : "Inactive"}
                </span>
              </label>
            );
          })
        ) : (
          <div className="we-course-category-empty">
            <FiImage />
            <strong>No categories found</strong>
            <span>
              Try another search or create a category in
              Admin → Course Categories.
            </span>
          </div>
        )}
      </div>

      <div className="we-course-category-selected">
        <div className="we-course-category-selected-heading">
          <div>
            <h4>Selected Categories</h4>
            <p>Arrange the display order on your website.</p>
          </div>

          <span>{selectedCategories.length} selected</span>
        </div>

        {selectedCategories.length ? (
          <div className="we-course-category-selected-list">
            {selectedCategories.map((category, index) => (
              <div
                className="we-course-category-selected-item"
                key={category._id}
              >
                <span className="we-course-category-order">
                  {index + 1}
                </span>

                <span className="we-course-category-option-image">
                  {category.categoryIcon ? (
                    <img
                      src={getAssetUrl(category.categoryIcon)}
                      alt=""
                    />
                  ) : (
                    <FiImage />
                  )}
                </span>

                <strong>{category.categoryName}</strong>

                <div className="we-course-category-reorder">
                  <button
                    type="button"
                    title="Move up"
                    aria-label={`Move ${category.categoryName} up`}
                    disabled={index === 0}
                    onClick={() => moveSelected(index, -1)}
                  >
                    <FiArrowUp />
                  </button>

                  <button
                    type="button"
                    title="Move down"
                    aria-label={`Move ${category.categoryName} down`}
                    disabled={index === selectedCategories.length - 1}
                    onClick={() => moveSelected(index, 1)}
                  >
                    <FiArrowDown />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="we-course-category-empty compact">
            <FiInfo />
            <span>
              Select at least one Active category to show it
              in the website preview.
            </span>
          </div>
        )}
      </div>

      <div className="we-course-category-note">
        <FiInfo />
        <span>
          Category names and icons always come from the
          existing Admin Course Categories database.
          Inactive categories cannot be selected.
        </span>
      </div>
    </div>
  );
}
