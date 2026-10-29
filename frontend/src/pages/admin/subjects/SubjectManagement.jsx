
import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FiPlus } from "react-icons/fi";

import { useAuth } from "../../../context/AuthContext";
import { hasPermission } from "../../../utils/permissions";

import {
  getSubjects,
  deleteSubject,
} from "../../../services/subjectService";


import SubjectFilters from "../../../components/subjects/SubjectFilters";
import SubjectTable from "../../../components/subjects/SubjectTable";

import "../../../styles/SubjectManagement.css";

const INITIAL_FILTERS = {
  search: "",
  status: "",
};

const PAGE_SIZE = 10;

export default function SubjectManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith("/staff")
    ? "/staff"
    : "/admin";
  
  const { user, loading: authLoading } = useAuth();

  const canView = hasPermission(user, "subjects.view");
  const canCreate = hasPermission(user, "subjects.create");
  const canUpdate = hasPermission(user, "subjects.update");
  const canDelete = hasPermission(user, "subjects.delete");
  const canViewQuestionBank = hasPermission(user, "question_bank.view");
  const canManageQuestionBank = hasPermission(user, "question_bank.manage");

  const [subjects, setSubjects] = useState([]);

  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [refreshKey, setRefreshKey] = useState(0);


  // Load subjects whenever the page or filters change.
  useEffect(() => {
    const controller = new AbortController();

    const loadSubjects = async () => {

      if (authLoading) {
        return;
      }

      if (!canView) {
        setSubjects([]);
        setPagination({ total: 0, totalPages: 0 });
        setLoading(false);
        setError("You do not have permission to view Subjects.");
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await getSubjects(
          {
            page,
            limit: PAGE_SIZE,
            search: filters.search.trim(),
            status: filters.status,
          },
          {
            signal: controller.signal,
          }
        );

        const payload = response.data;

        setSubjects(
          Array.isArray(payload.data) ? payload.data : []
        );

        setPagination(
          payload.pagination || {
            total: 0,
            totalPages: 0,
          }
        );
      } catch (err) {
        if (
          err.code === "ERR_CANCELED" ||
          err.name === "CanceledError"
        ) {
          return;
        }

        setError(
          err.response?.data?.message ||
            "Unable to load subjects. Please try again."
        );

        setSubjects([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadSubjects();

    return () => {
      controller.abort();
    };

 }, [filters, page, refreshKey, canView, authLoading]);

  const handleFilterChange = useCallback((name, value) => {
    setFilters((previous) => ({
      ...previous,
      [name]: value,
    }));

    setPage(1);
    setNotice("");
  }, []);

  const handleReset = useCallback(() => {
    setFilters({ ...INITIAL_FILTERS });
    setPage(1);
    setNotice("");
    setError("");
  }, []);

  const handleDelete = useCallback(
    async (subject) => {

      if (!canDelete) {
        setError("You do not have permission to delete subjects.");
        return;
      }

      const subjectId = subject?._id || subject?.id;

      if (!subjectId) {
        setError("Subject ID is missing.");
        return;
      }

      const confirmed = window.confirm(
        `Are you sure you want to delete "${subject.subjectName}"?`
      );

      if (!confirmed) {
        return;
      }

      try {
        setError("");
        setNotice("");

        await deleteSubject(subjectId);

        setNotice("Subject deleted successfully.");

        // If the last row on a page was deleted,
        // move to the previous page when possible.
        if (subjects.length === 1 && page > 1) {
          setPage((previous) => previous - 1);
        } else {
          setRefreshKey((previous) => previous + 1);
        }
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Unable to delete the subject."
        );
      }
    },
    [subjects.length, page, canDelete]
  );

  const totalPages = pagination.totalPages || 0;

  if (!canView) {
    return (
      <div className="subject-page">
        <div className="subject-alert subject-alert-error" role="alert">
          You do not have permission to view Subjects.
        </div>
      </div>
    );
  }

  return (
    <div className="subject-page">
    

      <div class="page-header"><div><h1>Subject Management {pagination.total || 0}</h1> </div>
        {canCreate && (
          <button
            type="button"
            className="themebtn"
            onClick={() => navigate(`${basePath}/subjects/add`)}
          >
            <FiPlus aria-hidden="true" />
            Add Subject
          </button>
        )}
      </div>


      {error && (
        <div className="subject-alert subject-alert-error" role="alert">
          {error}
        </div>
      )}

      {notice && (
        <div className="subject-alert subject-alert-success" role="status">
          {notice}
        </div>
      )}

     
        <SubjectFilters
          filters={filters}
          onChange={handleFilterChange}
          onReset={handleReset}
        />

    

      <div className="common-card">
        <SubjectTable
          subjects={subjects}
          loading={loading}
          canView={canView}
          canUpdate={canUpdate}
          canDelete={canDelete}
          canViewQuestionBank={canViewQuestionBank}
          canManageQuestionBank={canManageQuestionBank}
          onView={(id) =>
            navigate(`${basePath}/subjects/view/${id}`)
          }
          onEdit={(id) => {
            if (canUpdate) {
              navigate(`${basePath}/subjects/edit/${id}`);
            }
          }}
          onDelete={handleDelete}
          onQuestionBank={(id) => {
            if (canViewQuestionBank) {
              navigate(`${basePath}/subjects/${id}/question-bank`);
            }
          }}
        />

        {!loading && totalPages > 0 && (
          <div className="subject-table-footer">
            <span>
              Page {page} of {totalPages}
            </span>

            <div className="subject-pagination">
              <button
                type="button"
                className="subject-secondary-btn"
                disabled={page <= 1}
                onClick={() =>
                  setPage((previous) => previous - 1)
                }
              >
                Previous
              </button>

              <button
                type="button"
                className="subject-secondary-btn"
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((previous) => previous + 1)
                }
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
