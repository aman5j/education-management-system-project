import api from "./api";

export const getAdmissions = async (
  params = {}
) => {
  const response = await api.get(
    "/admissions",
    {
      params,
    }
  );

  return response.data;
};

export const getAdmission = async (id) => {
  const response = await api.get(
    `/admissions/${id}`
  );

  return response.data;
};

export const createAdmission = async (
  data
) => {
  const response = await api.post(
    "/admissions",
    data
  );

  return response.data;
};

export const updateAdmission = async (
  id,
  data
) => {
  const response = await api.put(
    `/admissions/${id}`,
    data
  );

  return response.data;
};

export const deleteAdmission = async (
  id
) => {
  const response = await api.delete(
    `/admissions/${id}`
  );

  return response.data;
};

export const updateAdmissionStatus =
  async (id, status) => {
    const response = await api.patch(
      `/admissions/${id}/status`,
      {
        status,
      }
    );

    return response.data;
  };

export const addAdmissionRemark =
  async (id, remark) => {
    const response = await api.patch(
      `/admissions/${id}/remark`,
      {
        remark,
      }
    );

    return response.data;
  };