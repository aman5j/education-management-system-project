
import React, { useState } from "react";
import { Link, useLocation, useNavigate, Navigate } from "react-router-dom";

import CategoryForm from "../../../components/categories/CategoryForm";
import { useAuth } from "../../../context/AuthContext";
import { createCategory } from "../../../services/categoryService";
import { IoChevronBack } from "react-icons/io5";

import { hasPermission } from "../../../utils/permissions";

const AddCategory = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  const basePath = location.pathname.startsWith("/staff")
    ? "/staff/categories"
    : "/admin/categories";

  const canCreate = hasPermission(user, "courses.create");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (authLoading) {
    return <div className="category-loading">Checking permissions...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!canCreate) {
    return (
      <div className="category-list-error" role="alert">
        You do not have permission to create categories.
        <p><Link to={basePath}>Back to Categories</Link></p>
      </div>
    );
  }

  const handleSubmit = async (formData) => {
    setLoading(true);
    setError("");

    try {
      await createCategory(formData);
      navigate(basePath, { replace: true });
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          "Failed to create category."
      );
      throw requestError;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="category-page">
      <div className="page-header">
        <div>
          {/* <Link to={basePath} className="backbutton">
           <IoChevronBack/> Back
        </Link> */}
        <h1>  Add Category</h1>
        </div>
        
      </div>

      {error && (
        <div className="category-list-error" role="alert">
          {error}
        </div>
      )}

      <div className="common-card">
        <CategoryForm
          loading={loading}
          submitLabel="Create Category"
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
};

export default AddCategory;
