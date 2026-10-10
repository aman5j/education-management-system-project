import {
  useEffect,
  useState,
} from "react";

import {
  FiBell,
  FiCheck,
  FiTrash2,
} from "react-icons/fi";

import {
  useNavigate,
} from "react-router-dom";

import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "../../../services/notificationService";

import "../../../styles/Notifications.css";

const formatDate = (date) => {
  if (!date) {
    return "-";
  }

  return new Date(
    date
  ).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const Notifications = () => {
  const navigate =
    useNavigate();

  const [
    notifications,
    setNotifications,
  ] = useState([]);

  const [
    unreadCount,
    setUnreadCount,
  ] = useState(0);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const loadNotifications =
    async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await getNotifications({
            page: 1,
            limit: 50,
          });

        const data =
          response?.data?.data;

        setNotifications(
          Array.isArray(
            data?.notifications
          )
            ? data.notifications
            : []
        );

        setUnreadCount(
          Number(
            data?.unreadCount || 0
          )
        );
      } catch (loadError) {
        console.error(
          "Load notifications error:",
          loadError
        );

        setError(
          loadError?.response?.data
            ?.message ||
            "Unable to load notifications."
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleRead =
    async (notification) => {
      try {
        if (
          !notification.isRead
        ) {
          await markNotificationAsRead(
            notification._id
          );
        }

        if (notification.link) {
          navigate(
            notification.link
          );
        }

        await loadNotifications();
      } catch (readError) {
        console.error(
          "Mark notification read error:",
          readError
        );
      }
    };

  const handleMarkAllRead =
    async () => {
      try {
        await markAllNotificationsAsRead();

        await loadNotifications();
      } catch (markError) {
        console.error(
          "Mark all notifications error:",
          markError
        );
      }
    };

  const handleDelete =
    async (id) => {
      try {
        await deleteNotification(
          id
        );

        await loadNotifications();
      } catch (deleteError) {
        console.error(
          "Delete notification error:",
          deleteError
        );
      }
    };

  return (
    <div className="notifications-page">
      <div className="notifications-page-header">
        <div>
          <span className="page-eyebrow">
            COMMUNICATION
          </span>

          <h1>
            Notifications
          </h1>

          <p>
            View system notifications
            and important updates.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            className="notifications-read-all"
            onClick={
              handleMarkAllRead
            }
          >
            <FiCheck />

            Mark all as read
          </button>
        )}
      </div>

      <div className="notifications-card">
        {loading && (
          <div className="notifications-state">
            Loading notifications...
          </div>
        )}

        {!loading && error && (
          <div className="notifications-state error">
            {error}
          </div>
        )}

        {!loading &&
          !error &&
          notifications.length === 0 && (
            <div className="notifications-state">
              <FiBell />

              <h3>
                No notifications
              </h3>

              <p>
                You are all caught up.
              </p>
            </div>
          )}

        {!loading &&
          !error &&
          notifications.length > 0 && (
            <div className="notifications-list">
              {notifications.map(
                (notification) => (
                  <div
                    key={
                      notification._id
                    }
                    className={`notification-item ${
                      notification.isRead
                        ? "read"
                        : "unread"
                    }`}
                  >
                    <button
                      type="button"
                      className="notification-main"
                      onClick={() =>
                        handleRead(
                          notification
                        )
                      }
                    >
                      <div className="notification-icon">
                        <FiBell />
                      </div>

                      <div className="notification-content">
                        <div className="notification-title-row">
                          <h3>
                            {
                              notification.title
                            }
                          </h3>

                          {!notification.isRead && (
                            <span className="notification-unread-dot" />
                          )}
                        </div>

                        <p>
                          {
                            notification.message
                          }
                        </p>

                        <span className="notification-date">
                          {formatDate(
                            notification.createdAt
                          )}
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className="notification-delete"
                      title="Delete notification"
                      onClick={() =>
                        handleDelete(
                          notification._id
                        )
                      }
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                )
              )}
            </div>
          )}
      </div>
    </div>
  );
};

export default Notifications;