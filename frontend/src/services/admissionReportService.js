import api from "./api";

export const getAdmissionReport = async (
  params = {}
) => {
  return api.get(
    "/reports/admissions",
    {
      params,
    }
  );
};

export const getAdmissionReportFilters =
  async () => {
    return api.get(
      "/reports/admission-filters"
    );
  };