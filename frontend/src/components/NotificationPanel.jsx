import { useState, useEffect } from 'react'
import { Bell, X, Trash2, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { useSystem } from './useSystem'

function NotificationPanel({ isOpen, onClose }) {
  const { systemState, updateSystemState } = useSystem()
  const [notifications, setNotifications] = useState(systemState.notifications || [])

  useEffect(() => {
    setNotifications(systemState.notifications || [])
  }, [systemState.notifications])

  const clearNotification = (id) => {
    const updatedNotifications = notifications.filter(n => n.id !== id)
    updateSystemState('notifications', updatedNotifications)
  }

  const clearAllNotifications = () => {
    updateSystemState('notifications', [])
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} color="#28ca42" />
      case 'error':
        return <AlertCircle size={20} color="#ff5f57" />
      case 'info':
      default:
        return <Info size={20} color="#0078d4" />
    }
  }

  const getNotificationColor = (type) => {
    switch (type) {
      case 'success':
        return '#28ca42'
      case 'error':
        return '#ff5f57'
      case 'info':
      default:
        return '#0078d4'
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="notification-panel-backdrop"
        onClick={onClose}
      />
      
      {/* Notification Panel */}
      <div className="notification-panel">
        <div className="notification-panel-header">
          <div className="notification-panel-title">
            <Bell size={20} />
            <span>Notifications</span>
            <div className="notification-count">
              {notifications.length}
            </div>
          </div>
          <div className="notification-panel-actions">
            {notifications.length > 0 && (
              <button 
                className="notification-action-btn"
                onClick={clearAllNotifications}
                title="Clear all"
              >
                <Trash2 size={16} />
              </button>
            )}
            <button 
              className="notification-action-btn"
              onClick={onClose}
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="notification-panel-content">
          {notifications.length === 0 ? (
            <div className="notification-empty">
              <Bell size={48} opacity={0.3} />
              <h3>No new notifications</h3>
              <p>When you get notifications, they'll show up here</p>
            </div>
          ) : (
            <div className="notification-list">
              {notifications.map(notification => (
                <div 
                  key={notification.id} 
                  className="notification-item"
                  style={{ borderLeftColor: getNotificationColor(notification.type) }}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="notification-content">
                    <div className="notification-message">
                      {notification.message}
                    </div>
                    <div className="notification-time">
                      {notification.timestamp}
                    </div>
                  </div>
                  <button 
                    className="notification-close"
                    onClick={() => clearNotification(notification.id)}
                    title="Dismiss"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {notifications.length > 0 && (
          <div className="notification-panel-footer">
            <button 
              className="notification-footer-btn"
              onClick={clearAllNotifications}
            >
              Clear all notifications
            </button>
          </div>
        )}
      </div>
    </>
  )
}

export default NotificationPanel