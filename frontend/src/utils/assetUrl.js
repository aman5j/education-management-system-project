const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const SERVER_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "");

export const getAssetUrl = (filePath) => {
  if (!filePath) {
    return "";
  }

  // Already an absolute URL
  if (
    filePath.startsWith("http://") ||
    filePath.startsWith("https://") ||
    filePath.startsWith("blob:") ||
    filePath.startsWith("data:")
  ) {
    return filePath;
  }

  // Convert relative path to backend URL
  return `${SERVER_BASE_URL}/${filePath.replace(/^\/+/, "")}`;
};