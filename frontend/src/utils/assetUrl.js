
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5000/api";

const SERVER_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "");

export const getAssetUrl = (filePath) => {
  if (!filePath) return "";

  if (
    /^(https?:\/\/|blob:|data:)/i.test(filePath)
  ) {
    return filePath;
  }

  return `${SERVER_BASE_URL}/${String(filePath).replace(/^\/+/, "")}`;
};
