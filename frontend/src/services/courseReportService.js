import api from "./api";

/*
|--------------------------------------------------------------------------
| Course Report
|--------------------------------------------------------------------------
*/

export const getCourseReport =
  (params = {}) =>
    api.get(
      "/reports/courses",
      {
        params,
      }
    );