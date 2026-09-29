import React, {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import CategoryForm from "../../../components/categories/CategoryForm";

import {
  getCategory,
  updateCategory,
} from "../../../services/categoryService";

const EditCategory = () => {
  const {
    id,
  } = useParams();

  const navigate =
    useNavigate();

  const [
    category,
    setCategory,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    const loadCategory =
      async () => {
        try {
          setLoading(true);
          setError("");

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

  const handleSubmit =
    async (formData) => {
      setSaving(true);

      try {
        await updateCategory(
          id,
          formData
        );

        navigate(
          "/admin/categories"
        );
      } catch (requestError) {
        throw requestError;
      } finally {
        setSaving(false);
      }
    };

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

  return (
    <div className="category-page">
      <div className="category-page-header">
        <div>
          <h1>
            Edit Category
          </h1>

          <p>
            Update course category.
          </p>
        </div>
      </div>

      <div className="category-card">
        <CategoryForm
          initialData={
            category
          }
          loading={saving}
          submitLabel="Update Category"
          onSubmit={
            handleSubmit
          }
        />
      </div>
    </div>
  );
};

export default EditCategory;