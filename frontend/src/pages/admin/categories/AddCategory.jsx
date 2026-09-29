import React, {
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import CategoryForm from "../../../components/categories/CategoryForm";

import {
  createCategory,
} from "../../../services/categoryService";

const AddCategory = () => {
  const navigate =
    useNavigate();

  const [
    loading,
    setLoading,
  ] = useState(false);

  const handleSubmit =
    async (formData) => {
      setLoading(true);

      try {
        await createCategory(
          formData
        );

        navigate(
          "/admin/categories"
        );
      } catch (error) {
        throw error;
      } finally {
        setLoading(false);
      }
    };

  return (
    <div className="category-page">
      <div className="category-page-header">
        <div>
          <h1>
            Add Category
          </h1>

          <p>
            Create a new course category.
          </p>
        </div>
      </div>

      <div className="category-card">
        <CategoryForm
          loading={loading}
          submitLabel="Create Category"
          onSubmit={
            handleSubmit
          }
        />
      </div>
    </div>
  );
};

export default AddCategory;