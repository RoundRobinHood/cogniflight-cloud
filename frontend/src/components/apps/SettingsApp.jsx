import { useState, useEffect } from 'react'
import { useSystem } from '../useSystem'
import { usePipeClient } from '../../api/socket'

function SettingsApp() {
  const { systemState, updateSystemState, addNotification } = useSystem()
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const client = usePipeClient();

  useEffect(() => {
    if (client !== null) {
      client.whoami().then(data => {
        setUserProfile(data);
        setLoading(false);
      }).catch((err) => console.error(err));
    }
  }, [client]);

  const handleThemeChange = (newTheme) => {
    updateSystemState('userProfile.theme', newTheme)
    addNotification('Theme updated', 'success')
  }

  const handleNotificationsChange = (enabled) => {
    updateSystemState('userProfile.notifications', enabled)
    addNotification('Notification preferences updated', 'success')
  }

  if (loading) {
    return (
      <div className="settings-form">
        <h2>User Settings</h2>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '200px',
          color: '#ccc'
        }}>
          Loading user information...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="settings-form">
        <h2>User Settings</h2>
        <div style={{
          color: '#ff6b6b',
          textAlign: 'center',
          padding: '20px'
        }}>
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="settings-form">
      <h2>User Settings</h2>
      <p style={{ fontSize: '12px', color: '#ccc', marginBottom: '16px' }}>
        User information is managed by the server and displayed here for reference
      </p>

      <div className="form-group">
        <label htmlFor="id">User ID</label>
        <input
          id="id"
          type="text"
          value={userProfile?.id || ''}
          readOnly
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            color: '#ccc',
            cursor: 'not-allowed'
          }}
        />
      </div>

      <div className="form-group">
        <label htmlFor="name">Name</label>
        <input
          id="name"
          type="text"
          value={userProfile?.name || ''}
          readOnly
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            color: '#ccc',
            cursor: 'not-allowed'
          }}
        />
      </div>

      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={userProfile?.email || ''}
          readOnly
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            color: '#ccc',
            cursor: 'not-allowed'
          }}
        />
      </div>

      <div className="form-group">
        <label htmlFor="phone">Phone</label>
        <input
          id="phone"
          type="text"
          value={userProfile?.phone || ''}
          readOnly
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            color: '#ccc',
            cursor: 'not-allowed'
          }}
        />
      </div>

      <div className="form-group">
        <label htmlFor="role">Role</label>
        <input
          id="role"
          type="text"
          value={userProfile?.role || ''}
          readOnly
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            color: '#ccc',
            cursor: 'not-allowed'
          }}
        />
      </div>

      <hr style={{
        border: 'none',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        margin: '20px 0'
      }} />

      <p style={{ fontSize: '12px', color: '#ccc', marginBottom: '16px' }}>
        Application preferences (can be modified)
      </p>

      <div className="form-group">
        <label htmlFor="theme">Theme</label>
        <select
          id="theme"
          value={systemState.userProfile?.theme || 'dark'}
          onChange={(e) => handleThemeChange(e.target.value)}
          style={{
            padding: '8px 12px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '4px',
            color: 'white',
            fontSize: '14px'
          }}
        >
          <option value="dark" style={{ background: '#333', color: 'white' }}>Dark</option>
          <option value="light" style={{ background: '#333', color: 'white' }}>Light</option>
        </select>
      </div>

      <div className="form-group">
        <label>
          <input
            type="checkbox"
            checked={systemState.userProfile?.notifications ?? true}
            onChange={(e) => handleNotificationsChange(e.target.checked)}
            style={{ marginRight: '8px' }}
          />
          Enable notifications
        </label>
      </div>
    </div>
  )
}

export default SettingsApp
