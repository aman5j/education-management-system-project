
// const API_BASE_URL =
//   import.meta.env.VITE_API_URL ||
//   import.meta.env.VITE_API_BASE_URL ||
//   "http://localhost:5000/api";

// const SERVER_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "");

// export const getAssetUrl = (filePath) => {
//   if (!filePath) return "";

//   if (
//     /^(https?:\/\/|blob:|data:)/i.test(filePath)
//   ) {
//     return filePath;
//   }

//   return `${SERVER_BASE_URL}/${String(filePath).replace(/^\/+/, "")}`;
// };



const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5000/api"
).replace(/\/+$/, "");

export const API_SERVER_URL = API_BASE_URL.replace(/\/api$/i, "");

export const getAssetUrl = (filePath) => {
  if (!filePath || typeof filePath !== "string") return "";

  const path = filePath.trim();

  if (/^(https?:\/\/|blob:|data:)/i.test(path)) {
    return path;
  }

  // Handles both /uploads/... and /api/... paths.
  return `${API_SERVER_URL}/${path.replace(/^\/+/, "")}`;
};
