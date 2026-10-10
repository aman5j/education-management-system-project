import {
  useEffect,
  useState,
} from "react";

import {
  FiBell,
} from "react-icons/fi";

import {
  useNavigate,
} from "react-router-dom";

import {
  getUnreadNotificationCount,
} from "../../services/notificationService";

import "../../styles/NotificationBell.css";

const NotificationBell = () => {
  const navigate =
    useNavigate();

  const [
    unreadCount,
    setUnreadCount,
  ] = useState(0);

  const loadUnreadCount =
    async () => {
      try {
        const response =
          await getUnreadNotificationCount();

        setUnreadCount(
          Number(
            response?.data?.data
              ?.unreadCount || 0
          )
        );
      } catch (error) {
        console.error(
          "Notification count error:",
          error
        );
      }
    };

  useEffect(() => {
    loadUnreadCount();

    const interval =
      setInterval(
        loadUnreadCount,
        30000
      );

    return () =>
      clearInterval(interval);
  }, []);

  return (
    <button
      type="button"
      className="notification-bell"
      title="Notifications"
      onClick={() =>
        navigate(
          "/admin/notifications"
        )
      }
    >
      <FiBell />

      {unreadCount > 0 && (
        <span className="notification-badge">
          {unreadCount > 99
            ? "99+"
            : unreadCount}
        </span>
      )}
    </button>
  );
};

export default NotificationBell;