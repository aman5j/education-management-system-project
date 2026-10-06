import api from "./api";

/*
|--------------------------------------------------------------------------
| GET STUDENT REPORT FILTERS
|--------------------------------------------------------------------------
*/

export const getStudentReportFilters =
  async () => {
    return api.get(
      "/reports/student-filters"
    );
  };

/*
|--------------------------------------------------------------------------
| GET STUDENT REPORT
|--------------------------------------------------------------------------
*/

export const getStudentReport =
  async (filters = {}) => {
    const params = {};

    Object.entries(filters).forEach(
      ([key, value]) => {
        if (
          value !== undefined &&
          value !== null &&
          value !== ""
        ) {
          params[key] = value;
        }
      }
    );

    return api.get(
      "/reports/students",
      {
        params,
      }
    );
  };