import React, {
  useEffect,
  useState,
} from "react";

import {
  getAssetUrl,
} from "../../utils/assetUrl";

const initialState = {
  categoryName: "",
  displayOrder: 0,
  status: "Active",
};

const CategoryForm = ({
  initialData = null,
  loading = false,
  submitLabel = "Create Category",
  onSubmit,
}) => {
  const [form, setForm] =
    useState(initialState);

  const [image, setImage] =
    useState(null);

  const [
    imagePreview,
    setImagePreview,
  ] = useState("");

  const [errors, setErrors] =
    useState({});

  const [
    serverError,
    setServerError,
  ] = useState("");

  useEffect(() => {
    if (!initialData) {
      setForm(initialState);
      setImage(null);
      setImagePreview("");
      setErrors({});
      setServerError("");
      return;
    }

    setForm({
      categoryName:
        initialData.categoryName ||
        "",

      displayOrder:
        initialData.displayOrder ??
        0,

      status:
        initialData.status ||
        "Active",
    });

    setImage(null);

    if (
      initialData.categoryIcon
    ) {
      setImagePreview(
        getAssetUrl(
          initialData.categoryIcon
        )
      );
    } else {
      setImagePreview("");
    }

    setErrors({});
    setServerError("");
  }, [initialData]);

  useEffect(() => {
    return () => {
      if (
        imagePreview &&
        imagePreview.startsWith(
          "blob:"
        )
      ) {
        URL.revokeObjectURL(
          imagePreview
        );
      }
    };
  }, [imagePreview]);

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setForm(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );

    setErrors(
      (previous) => ({
        ...previous,
        [name]: "",
      })
    );

    setServerError("");
  };

  const handleImageChange = (
    event
  ) => {
    const selectedFile =
      event.target.files?.[0] ||
      null;

    if (!selectedFile) {
      return;
    }

    setImage(
      selectedFile
    );

    const previewUrl =
      URL.createObjectURL(
        selectedFile
      );

    setImagePreview(
      previewUrl
    );

    setErrors(
      (previous) => ({
        ...previous,
        categoryIcon: "",
      })
    );
  };

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    setErrors({});
    setServerError("");

    const formData =
      new FormData();

    formData.append(
      "categoryName",
      form.categoryName
    );

    formData.append(
      "displayOrder",
      String(
        form.displayOrder
      )
    );

    formData.append(
      "status",
      form.status
    );

    if (image) {
      formData.append(
        "categoryIcon",
        image
      );
    }

    try {
      await onSubmit(
        formData
      );
    } catch (error) {
      const response =
        error?.response?.data;

      const validationErrors =
        response?.errors || [];

      const fieldErrors = {};

      if (
        Array.isArray(
          validationErrors
        )
      ) {
        validationErrors.forEach(
          (item) => {
            const field =
              item.field ||
              item.path ||
              item.param;

            const message =
              item.message ||
              item.msg;

            if (
              field &&
              message &&
              !fieldErrors[field]
            ) {
              fieldErrors[field] =
                message;
            }
          }
        );
      }

      setErrors(
        fieldErrors
      );

      setServerError(
        response?.message ||
          "Please check the form and correct the errors."
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  const fieldError = (
    field
  ) => {
    if (!errors[field]) {
      return null;
    }

    return (
      <div className="category-field-error">
        {errors[field]}
      </div>
    );
  };

  return (
    <form
      className="category-form"
      onSubmit={
        handleSubmit
      }
      noValidate
    >
      {serverError && (
        <div className="category-form-error">
          {serverError}
        </div>
      )}

      <div className="category-form-section">
        <h2>
          Category Information
        </h2>

        <div className="category-form-grid">
          <div className="category-field">
            <label>
              Category Name *
            </label>

            <input
              type="text"
              name="categoryName"
              value={
                form.categoryName
              }
              onChange={
                handleChange
              }
              placeholder="Enter category name"
            />

            {fieldError(
              "categoryName"
            )}
          </div>

          <div className="category-field">
            <label>
              Display Order *
            </label>

            <input
              type="number"
              min="0"
              name="displayOrder"
              value={
                form.displayOrder
              }
              onChange={
                handleChange
              }
            />

            {fieldError(
              "displayOrder"
            )}
          </div>

          <div className="category-field">
            <label>
              Status *
            </label>

            <select
              name="status"
              value={
                form.status
              }
              onChange={
                handleChange
              }
            >
              <option value="Active">
                Active
              </option>

              <option value="Inactive">
                Inactive
              </option>
            </select>

            {fieldError(
              "status"
            )}
          </div>

          <div className="category-field">
            <label>
              Category Icon
            </label>

            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              onChange={
                handleImageChange
              }
            />

            {fieldError(
              "categoryIcon"
            )}

            {imagePreview && (
              <div className="category-image-preview">
                <img
                  src={
                    imagePreview
                  }
                  alt="Category preview"
                  onError={(
                    event
                  ) => {
                    event.currentTarget.style.display =
                      "none";
                  }}
                />

                <span>
                  {image
                    ? "New icon selected"
                    : "Current category icon"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="category-form-footer">
        <button
          type="submit"
          className="category-submit-button"
          disabled={loading}
        >
          {loading
            ? "Saving..."
            : submitLabel}
        </button>
      </div>
    </form>
  );
};

export default CategoryForm;