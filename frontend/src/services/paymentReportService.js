import api from "./api";

/*
|--------------------------------------------------------------------------
| Get Payment Report
|--------------------------------------------------------------------------
*/

export const getPaymentReport =
  async (params = {}) => {
    const response =
      await api.get(
        "/reports/payments",
        {
          params,
        }
      );

    return response;
  };