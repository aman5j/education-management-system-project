
/**
 * Fetch every page of a paginated report using the same filters.
 *
 * The backend currently accepts page sizes of 10, 25 and 50.
 * This helper uses 50 to reduce the number of requests.
 *
 * It refuses to return an incomplete export if the API response
 * does not match the pagination metadata.
 */
export const getResponseData = (response) =>
  response?.data?.data ?? response?.data ?? {};

export const fetchAllReportPages = async ({
  fetchPage,
  filters = {},
  recordsKey,
}) => {
  if (typeof fetchPage !== "function" || !recordsKey) {
    throw new Error("Invalid report export configuration.");
  }

  const limit = 50;
  const firstResponse = await fetchPage({
    ...filters,
    page: 1,
    limit,
  });

  const firstData = getResponseData(firstResponse);
  const firstRows = firstData[recordsKey];

  if (!Array.isArray(firstRows)) {
    throw new Error("The report API returned an invalid records list.");
  }

  const pagination = firstData.pagination || {};
  const expectedTotal = Number(pagination.total);
  const totalPages = Number(pagination.totalPages);

  if (
    !Number.isFinite(expectedTotal) ||
    expectedTotal < 0 ||
    !Number.isInteger(totalPages) ||
    totalPages < 0
  ) {
    throw new Error(
      "The report API did not return valid pagination information."
    );
  }

  if (firstRows.length > expectedTotal) {
    throw new Error("The report data changed while preparing the export.");
  }

  const allRows = [...firstRows];

  for (let currentPage = 2; currentPage <= totalPages; currentPage += 1) {
    const response = await fetchPage({
      ...filters,
      page: currentPage,
      limit,
    });

    const data = getResponseData(response);
    const rows = data[recordsKey];

    if (!Array.isArray(rows)) {
      throw new Error(
        `Unable to retrieve report records from page ${currentPage}.`
      );
    }

    if (
      Number(data.pagination?.total) !== expectedTotal ||
      Number(data.pagination?.totalPages) !== totalPages
    ) {
      throw new Error(
        "The report records changed during export. Please try again."
      );
    }

    allRows.push(...rows);
  }

  if (allRows.length !== expectedTotal) {
    throw new Error(
      `Export incomplete: expected ${expectedTotal} records but received ${allRows.length}. Please try again.`
    );
  }

  return {
    rows: allRows,
    summary: firstData.summary || {},
    total: expectedTotal,
  };
};
