import React, {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import BatchForm from "../../../components/batches/BatchForm";

import {
  getBatch,
  updateBatch,
} from "../../../services/batchService";

import {
  getCourses,
} from "../../../services/courseService";

const EditBatch = () => {
  const {
    id,
  } = useParams();

  const navigate =
    useNavigate();

  const [
    batch,
    setBatch,
  ] = useState(null);

  const [
    courses,
    setCourses,
  ] = useState([]);

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

  const [loadingCourses, setLoadingCourses] = useState(false);

  // In AddBatch.jsx and EditBatch.jsx
  // const courseList = 
  //   coursesResponse?.data?.courses || 
  //   coursesResponse?.data?.data?.courses || 
  //   coursesResponse?.data || [];

  // setCourses(Array.isArray(courseList) ? courseList : []);

  

  // useEffect(() => {
  //   const loadData =
  //     async () => {
  //       try {
  //         setLoading(true);

  //         const [
  //           batchResponse,
  //           coursesResponse,
  //         ] = await Promise.all([
  //           getBatch(id),
  //           getCourses({
  //             page: 1,
  //             limit: 100,
  //           }),
  //         ]);

  //         setBatch(batchResponse?.data?.data);

  //         const courseList =
  //           coursesResponse?.data?.courses ||
  //           coursesResponse?.data?.data?.courses ||
  //           coursesResponse?.data ||
  //           [];

  //         setCourses(Array.isArray(courseList) ? courseList : []);
  //       } catch (requestError) {
  //         console.error(
  //           "Failed to load batch:",
  //           requestError
  //         );

  //         setError(
  //           requestError?.response
  //             ?.data?.message ||
  //             "Failed to load batch."
  //         );
  //       } finally {
  //         setLoading(false);
  //       }
  //     };

  //   loadData();
  // }, [id]);

  useEffect(() => {
  const loadData = async () => {
    try {
      setLoading(true);
      setLoadingCourses(true);
      setError("");

    const [batchResponse, coursesResponse] = await Promise.all([
      getBatch(id),
      getCourses({
        page: 1,
        limit: 100,
      }),
    ]);

    setBatch(batchResponse?.data?.data);

    const courseList = coursesResponse?.data?.data ?? [];

    setCourses(
      Array.isArray(courseList) ? courseList : []
    );

      console.log(
        "Edit Batch courses:",
        courseList
      );
    } catch (requestError) {
      console.error(
        "Failed to load batch:",
        requestError
      );

      setError(
        requestError?.response?.data
          ?.message ||
          "Failed to load batch."
      );
    } finally {
      setLoading(false);
      setLoadingCourses(false);
    }
  };

  loadData();
}, [id]);

  const handleSubmit =
    async (data) => {
      setSaving(true);

      try {
        await updateBatch(
          id,
          data
        );

        navigate(
          "/admin/batches"
        );
      } catch (error) {
        throw error;
      } finally {
        setSaving(false);
      }
    };

  if (loading) {
    return (
      <div className="batch-loading">
        Loading batch...
      </div>
    );
  }

  if (error) {
    return (
      <div className="batch-list-error">
        {error}
      </div>
    );
  }

  return (
    <div className="batch-page">
      <div className="batch-page-header">
        <div>
          <h1>
            Edit Batch
          </h1>

          <p>
            Update batch information.
          </p>
        </div>
      </div>

      <div className="batch-card">
        {/* <BatchForm
          initialData={batch}
          courses={courses}
          loading={saving}
          submitLabel="Update Batch"
          onSubmit={
            handleSubmit
          }
        /> */}

        <BatchForm
          initialData={batch}
          courses={courses}
          loadingCourses={loadingCourses}
          loading={saving}
          submitLabel="Update Batch"
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
};

export default EditBatch;