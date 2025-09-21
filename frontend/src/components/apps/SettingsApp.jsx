import { useSystem } from '../useSystem'

function SettingsApp() {
  const { systemState, updateSystemState, addNotification } = useSystem()
  const userProfile = systemState.userProfile

  const handleInputChange = (field, value) => {
    updateSystemState(`userProfile.${field}`, value)
  }

  const handleSave = () => {
    localStorage.setItem('userProfile', JSON.stringify(userProfile))
    addNotification('Settings saved successfully!', 'success')
  }

  return (
    <div className="settings-form">
      <h2>User Settings</h2>
      <p style={{ fontSize: '12px', color: '#ccc', marginBottom: '16px' }}>
        Changes here affect the entire system
      </p>
      
      <div className="form-group">
        <label htmlFor="name">Name</label>
        <input
          id="name"
          type="text"
          value={userProfile.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={userProfile.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="theme">Theme</label>
        <select
          id="theme"
          value={userProfile.theme}
          onChange={(e) => handleInputChange('theme', e.target.value)}
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
            checked={userProfile.notifications}
            onChange={(e) => handleInputChange('notifications', e.target.checked)}
            style={{ marginRight: '8px' }}
          />
          Enable notifications
        </label>
      </div>

      <button className="btn" onClick={handleSave}>
        Save Settings
      </button>
    </div>
  )
}

export default SettingsApp