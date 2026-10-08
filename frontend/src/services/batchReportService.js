import api from "./api";

/*
|--------------------------------------------------------------------------
| Batch Report
|--------------------------------------------------------------------------
*/

export const getBatchReport =
  (params = {}) => {
    return api.get(
      "/reports/batches",
      {
        params,
      }
    );
  };

/*
|--------------------------------------------------------------------------
| Batch Report Filters
|--------------------------------------------------------------------------
*/

export const getBatchReportFilters =
  () => {
    return api.get(
      "/reports/batch-filters"
    );
  };