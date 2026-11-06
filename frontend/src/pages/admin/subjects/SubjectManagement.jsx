
import { useCallback, useEffect, useState } from "react";
import {
  useLocation,
  useNavigate,
  Navigate,
} from "react-router-dom";
import { FiPlus } from "react-icons/fi";

import { useAuth } from "../../../context/AuthContext";
import { hasPermission } from "../../../utils/permissions";

import {
  getSubjects,
  deleteSubject,
} from "../../../services/subjectService";

import SubjectFilters from "../../../components/subjects/SubjectFilters";
import SubjectTable from "../../../components/subjects/SubjectTable";
import Pagination from "../../../components/common/Pagination";

import notification, {
  getApiErrorMessage,
} from "../../../utils/notification";

import "../../../styles/SubjectManagement.css";

const INITIAL_FILTERS = {
  search: "",
  status: "",
};

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
  const canViewQuestionBank = hasPermission(
    user,
    "question_bank.view"
  );
  const canManageQuestionBank = hasPermission(
    user,
    "question_bank.manage"
  );

  const [subjects, setSubjects] = useState([]);
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (authLoading) return undefined;

    if (!user || !canView) {
      setSubjects([]);
      setPagination({ total: 0, totalPages: 0 });
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();

    const loadSubjects = async () => {
      try {
        setLoading(true);

        const response = await getSubjects(
          {
            page,
            limit,
            search: filters.search.trim(),
            status: filters.status,
            sortBy: "subjectName",
            sortOrder: "asc",
          },
          {
            signal: controller.signal,
          }
        );

        const payload = response?.data;

        setSubjects(
          Array.isArray(payload?.data) ? payload.data : []
        );

        setPagination({
          total: Number(payload?.pagination?.total) || 0,
          totalPages:
            Number(payload?.pagination?.totalPages) || 0,
        });
      } catch (error) {
        if (
          error.code === "ERR_CANCELED" ||
          error.name === "CanceledError"
        ) {
          return;
        }

        setSubjects([]);
        notification.error(getApiErrorMessage(error));
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
  }, [
    authLoading,
    user,
    canView,
    filters,
    page,
    limit,
    refreshKey,
  ]);

  const handleFilterChange = useCallback((name, value) => {
    setFilters((previous) => ({
      ...previous,
      [name]: value,
    }));

    setPage(1);
  }, []);

  const handleReset = useCallback(() => {
    setFilters({ ...INITIAL_FILTERS });
    setPage(1);
  }, []);

  const handleLimitChange = useCallback((nextLimit) => {
    setLimit(nextLimit);
    setPage(1);
  }, []);

  const handleDelete = useCallback(
    async (subject) => {
      if (!canDelete) {
        notification.error(
          "You do not have permission to delete subjects."
        );
        return;
      }

      const subjectId = subject?._id || subject?.id;

      if (!subjectId) {
        notification.error("Subject ID is missing.");
        return;
      }

      const subjectName = subject?.subjectName || "this subject";

      const confirmed = await notification.confirmDelete(
        `"${subjectName}"`
      );

      if (!confirmed) return;

      try {
        await deleteSubject(subjectId);

        notification.success("Subject deleted successfully.");

        if (subjects.length === 1 && page > 1) {
          setPage((previous) => previous - 1);
        } else {
          setRefreshKey((previous) => previous + 1);
        }
      } catch (error) {
        notification.error(getApiErrorMessage(error));
      }
    },
    [subjects.length, page, canDelete]
  );

  if (authLoading) {
    return (
      <div className="subject-page">
        <p>Checking permissions...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

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
      <div className="page-header">
        <div>
          <h1>Subject Management</h1>
        </div>

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

        {!loading && (
          <Pagination
            page={page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            itemCount={subjects.length}
            itemLabel="subjects"
            limit={limit}
            loading={loading}
            onPageChange={setPage}
            onLimitChange={handleLimitChange}
          />
        )}
      </div>
    </div>
  );
}
