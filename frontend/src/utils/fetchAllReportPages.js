
// /**
//  * Fetch every page of a paginated report using the same filters.
//  *
//  * The backend currently accepts page sizes of 10, 25 and 50.
//  * This helper uses 50 to reduce the number of requests.
//  *
//  * It refuses to return an incomplete export if the API response
//  * does not match the pagination metadata.
//  */
// export const getResponseData = (response) =>
//   response?.data?.data ?? response?.data ?? {};

// export const fetchAllReportPages = async ({
//   fetchPage,
//   filters = {},
//   recordsKey,
// }) => {
//   if (typeof fetchPage !== "function" || !recordsKey) {
//     throw new Error("Invalid report export configuration.");
//   }

//   const limit = 50;
//   const firstResponse = await fetchPage({
//     ...filters,
//     page: 1,
//     limit,
//   });

//   const firstData = getResponseData(firstResponse);
//   const firstRows = firstData[recordsKey];

//   if (!Array.isArray(firstRows)) {
//     throw new Error("The report API returned an invalid records list.");
//   }

//   const pagination = firstData.pagination || {};
//   const expectedTotal = Number(pagination.total);
//   const totalPages = Number(pagination.totalPages);

//   if (
//     !Number.isFinite(expectedTotal) ||
//     expectedTotal < 0 ||
//     !Number.isInteger(totalPages) ||
//     totalPages < 0
//   ) {
//     throw new Error(
//       "The report API did not return valid pagination information."
//     );
//   }

//   if (firstRows.length > expectedTotal) {
//     throw new Error("The report data changed while preparing the export.");
//   }

//   const allRows = [...firstRows];

//   for (let currentPage = 2; currentPage <= totalPages; currentPage += 1) {
//     const response = await fetchPage({
//       ...filters,
//       page: currentPage,
//       limit,
//     });

//     const data = getResponseData(response);
//     const rows = data[recordsKey];

//     if (!Array.isArray(rows)) {
//       throw new Error(
//         `Unable to retrieve report records from page ${currentPage}.`
//       );
//     }

//     if (
//       Number(data.pagination?.total) !== expectedTotal ||
//       Number(data.pagination?.totalPages) !== totalPages
//     ) {
//       throw new Error(
//         "The report records changed during export. Please try again."
//       );
//     }

//     allRows.push(...rows);
//   }

//   if (allRows.length !== expectedTotal) {
//     throw new Error(
//       `Export incomplete: expected ${expectedTotal} records but received ${allRows.length}. Please try again.`
//     );
//   }

//   return {
//     rows: allRows,
//     summary: firstData.summary || {},
//     total: expectedTotal,
//   };
// };









// new code 



/**
 * Fetch all filtered report records for Excel/PDF exports.
 *
 * Uses a maximum of 3 concurrent requests to reduce export time
 * without creating excessive load on the backend.
 */

export const getResponseData = (response) =>
  response?.data?.data ?? response?.data ?? {};

const EXPORT_PAGE_SIZE = 50;
const MAX_CONCURRENT_REQUESTS = 3;

export const fetchAllReportPages = async ({
  fetchPage,
  filters = {},
  recordsKey,
}) => {
  if (typeof fetchPage !== "function" || !recordsKey) {
    throw new Error("Invalid report export configuration.");
  }

  const firstResponse = await fetchPage({
    ...filters,
    page: 1,
    limit: EXPORT_PAGE_SIZE,
  });

  const firstData = getResponseData(firstResponse);
  const firstRows = firstData[recordsKey];

  if (!Array.isArray(firstRows)) {
    throw new Error("The report API returned an invalid records list.");
  }

  const expectedTotal = Number(firstData.pagination?.total);
  const totalPages = Number(firstData.pagination?.totalPages);

  if (
    !Number.isInteger(expectedTotal) ||
    expectedTotal < 0 ||
    !Number.isInteger(totalPages) ||
    totalPages < 0
  ) {
    throw new Error("Invalid report pagination information.");
  }

  if (firstRows.length > expectedTotal) {
    throw new Error("Report records changed during export.");
  }

  const allRows = [...firstRows];

  // Fetch remaining pages in small concurrent groups.
  for (
    let startPage = 2;
    startPage <= totalPages;
    startPage += MAX_CONCURRENT_REQUESTS
  ) {
    const endPage = Math.min(
      startPage + MAX_CONCURRENT_REQUESTS - 1,
      totalPages
    );

    const pageNumbers = Array.from(
      { length: endPage - startPage + 1 },
      (_, index) => startPage + index
    );

    const pageResponses = await Promise.all(
      pageNumbers.map((page) =>
        fetchPage({
          ...filters,
          page,
          limit: EXPORT_PAGE_SIZE,
        })
      )
    );

    // Promise.all preserves page order.
    pageResponses.forEach((response, index) => {
      const data = getResponseData(response);
      const rows = data[recordsKey];

      if (!Array.isArray(rows)) {
        throw new Error(
          `Invalid report data received from page ${pageNumbers[index]}.`
        );
      }

      if (
        Number(data.pagination?.total) !== expectedTotal ||
        Number(data.pagination?.totalPages) !== totalPages
      ) {
        throw new Error(
          "Report records changed during export. Please try again."
        );
      }

      allRows.push(...rows);
    });
  }

  if (allRows.length !== expectedTotal) {
    throw new Error(
      `Export incomplete: expected ${expectedTotal} records but received ${allRows.length}.`
    );
  }

  return {
    rows: allRows,
    summary: firstData.summary || {},
    total: expectedTotal,
  };
};
