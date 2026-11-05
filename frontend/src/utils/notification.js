
import toast from "react-hot-toast";
import Swal from "sweetalert2";

const notification = {
  success(message, options = {}) {
    return toast.success(message || "Operation completed successfully.", {
      duration: 3500,
      ...options,
    });
  },

  error(message, options = {}) {
    return toast.error(message || "Something went wrong. Please try again.", {
      duration: 5000,
      ...options,
    });
  },

  warning(message, options = {}) {
    return toast(message || "Please check the information and try again.", {
      icon: "⚠️",
      duration: 4500,
      ...options,
    });
  },

  info(message, options = {}) {
    return toast(message || "Information", {
      icon: "ℹ️",
      duration: 3500,
      ...options,
    });
  },

  loading(message = "Please wait...") {
    return toast.loading(message);
  },

  dismiss(toastId) {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  },

  async confirm({
    title = "Are you sure?",
    text = "Please confirm this action.",
    confirmText = "Yes, continue",
    cancelText = "Cancel",
    icon = "question",
    confirmButtonColor = "#2563eb",
    reverseButtons = true,
  } = {}) {
    const result = await Swal.fire({
      title,
      text,
      icon,
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      confirmButtonColor,
      cancelButtonColor: "#64748b",
      reverseButtons,
      focusCancel: true,
      allowOutsideClick: false,
    });

    return result.isConfirmed;
  },

  async confirmDelete(itemName = "this record") {
    return this.confirm({
      title: "Delete permanently?",
      text: `Are you sure you want to delete ${itemName}? This action cannot be undone.`,
      icon: "warning",
      confirmText: "Yes, delete",
      confirmButtonColor: "#dc2626",
    });
  },

  async confirmPublish(itemName = "this item") {
    return this.confirm({
      title: "Publish now?",
      text: `${itemName} will become available to its intended users.`,
      icon: "question",
      confirmText: "Yes, publish",
      confirmButtonColor: "#2563eb",
    });
  },

  async confirmArchive(itemName = "this item") {
    return this.confirm({
      title: "Archive this item?",
      text: `${itemName} will be archived and will no longer be active.`,
      icon: "warning",
      confirmText: "Yes, archive",
      confirmButtonColor: "#d97706",
    });
  },

  async alert({
    title = "Information",
    text = "",
    icon = "info",
    confirmText = "OK",
  } = {}) {
    return Swal.fire({
      title,
      text,
      icon,
      confirmButtonText: confirmText,
      confirmButtonColor: "#2563eb",
    });
  },
};

export const getApiErrorMessage = (error) => {
  if (!error) {
    return "Something went wrong. Please try again.";
  }

  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error.response?.data?.error) {
    return error.response.data.error;
  }

  if (error.response?.status === 401) {
    return "Your session has expired. Please log in again.";
  }

  if (error.response?.status === 403) {
    return "You do not have permission to perform this action.";
  }

  if (error.response?.status === 404) {
    return "The requested record could not be found.";
  }

  if (error.response?.status === 413) {
    return "The uploaded file is too large.";
  }

  if (error.response?.status >= 500) {
    return "Server error. Please try again later.";
  }

  if (error.message === "Network Error") {
    return "Unable to connect to the server. Check your internet connection.";
  }

  return error.message || "Something went wrong. Please try again.";
};

export const showApiError = (error) => {
  return notification.error(getApiErrorMessage(error));
};

export default notification;
