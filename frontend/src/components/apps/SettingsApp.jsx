import { useState, useEffect, useRef } from 'react'
import { useSystem } from '../useSystem'
import { usePipeClient, StringIterator } from '../../api/socket'
import YamlCRLF from '../../api/yamlCRLF'
import '../../styles/apps/settings-app.css'

function SettingsApp() {
  const { systemState, updateSystemState, addNotification } = useSystem()
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeSection, setActiveSection] = useState('general')
  const [showSidebar, setShowSidebar] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const containerRef = useRef(null)
  const saveTimeoutRef = useRef(null)
  const client = usePipeClient();

  useEffect(() => {
    if (client !== null) {
      client.whoami().then(data => {
        setUserProfile(data);
        setLoading(false);
      }).catch((err) => {
        console.error(err);
        setError('Failed to load user profile');
        setLoading(false);
      });
    }
  }, [client]);

  // Handle window resize to toggle sidebar
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        setShowSidebar(width >= 700);
      }
    };

    // Initial check
    handleResize();

    // Use ResizeObserver to watch container size changes
    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Debounced save function
  const saveUserProfile = async (updatedProfile) => {
    if (!client) return;

    try {
      setIsSaving(true);
      const yaml = YamlCRLF(updatedProfile);
      const result = await client.run_command("tee ~/user.profile", StringIterator(yaml));

      if (result.command_result === 0) {
        addNotification('Settings saved successfully', 'success');
      } else {
        addNotification('Failed to save settings', 'error');
        console.error('Save error:', result.error);
      }
    } catch (err) {
      addNotification('Failed to save settings', 'error');
      console.error('Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Debounced update handler
  const handleFieldChange = (field, value) => {
    // Update local state immediately
    setUserProfile(prev => {
      const updated = { ...prev };
      const keys = field.split('.');
      let current = updated;

      // Navigate to the nested property
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }

      // Set the value
      current[keys[keys.length - 1]] = value;

      // Create a clean copy without username and tags for saving
      const { username, tags, session, ...dataToSave } = updated;

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Set new timeout for debounced save
      saveTimeoutRef.current = setTimeout(() => {
        saveUserProfile(dataToSave);
      }, 1000);

      return updated;
    });
  };

  const handleThemeChange = (newTheme) => {
    updateSystemState('userProfile.theme', newTheme)
    addNotification('Theme updated', 'success')
  }

  const handleNotificationsChange = (enabled) => {
    updateSystemState('userProfile.notifications', enabled)
    addNotification('Notification preferences updated', 'success')
  }

  const isPilot = userProfile?.role?.toLowerCase() === 'pilot';

  if (loading) {
    return (
      <div className="settings-container" ref={containerRef}>
        <div className="settings-loading">
          Loading user information...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="settings-container" ref={containerRef}>
        <div className="settings-error">
          {error}
        </div>
      </div>
    )
  }

  const renderGeneralSection = (showDivider = false) => (
    <>
      <div className="settings-section">
        <h3 className="settings-section-title">General Information</h3>
        <p className="settings-section-subtitle">
          User information (role is read-only)
        </p>

        <div className="settings-form-vertical">
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              type="text"
              value={userProfile?.name || ''}
              onChange={(e) => handleFieldChange('name', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="surname">Surname</label>
            <input
              id="surname"
              type="text"
              value={userProfile?.surname || ''}
              onChange={(e) => handleFieldChange('surname', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={userProfile?.email || ''}
              onChange={(e) => handleFieldChange('email', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone</label>
            <input
              id="phone"
              type="text"
              value={userProfile?.phone || ''}
              onChange={(e) => handleFieldChange('phone', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="role">Role</label>
            <input
              id="role"
              type="text"
              value={userProfile?.role || ''}
              readOnly
              className="readonly-input"
            />
          </div>
        </div>
      </div>
      {showDivider && <div className="settings-divider" />}
    </>
  );

  const renderPilotSection = (showDivider = false) => {
    if (!isPilot) return null;

    return (
      <>
        <div className="settings-section">
          <h3 className="settings-section-title">Pilot Information</h3>
          <p className="settings-section-subtitle">
            License and flight experience details
          </p>

          <div className="settings-form-vertical">
            <div className="form-group">
              <label htmlFor="license_number">License Number</label>
              <input
                id="license_number"
                type="text"
                value={userProfile?.license_number || ''}
                onChange={(e) => handleFieldChange('license_number', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="license_expiry_date">License Expiry Date</label>
              <input
                id="license_expiry_date"
                type="date"
                value={userProfile?.license_expiry_date || ''}
                onChange={(e) => handleFieldChange('license_expiry_date', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="total_flight_hours">Total Flight Hours</label>
              <input
                id="total_flight_hours"
                type="number"
                value={userProfile?.total_flight_hours || ''}
                onChange={(e) => handleFieldChange('total_flight_hours', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>
        {showDivider && <div className="settings-divider" />}
      </>
    );
  };

  const renderCardiovascularSection = (showDivider = false) => {
    if (!isPilot) return null;

    return (
      <>
        <div className="settings-section">
          <h3 className="settings-section-title">Cardiovascular Baselines</h3>
          <p className="settings-section-subtitle">
            Heart rate monitoring baselines
          </p>

          <div className="settings-form-vertical">
            <div className="form-group">
              <label htmlFor="resting_heart_rate_bpm">Resting Heart Rate (BPM)</label>
              <input
                id="resting_heart_rate_bpm"
                type="number"
                value={userProfile?.cardiovascular_baselines?.resting_heart_rate_bpm || ''}
                onChange={(e) => handleFieldChange('cardiovascular_baselines.resting_heart_rate_bpm', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="resting_heart_rate_std_dev">Resting Heart Rate Std Dev</label>
              <input
                id="resting_heart_rate_std_dev"
                type="number"
                step="0.01"
                value={userProfile?.cardiovascular_baselines?.resting_heart_rate_std_dev || ''}
                onChange={(e) => handleFieldChange('cardiovascular_baselines.resting_heart_rate_std_dev', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="max_heart_rate_bpm">Max Heart Rate (BPM)</label>
              <input
                id="max_heart_rate_bpm"
                type="number"
                value={userProfile?.cardiovascular_baselines?.max_heart_rate_bpm || ''}
                onChange={(e) => handleFieldChange('cardiovascular_baselines.max_heart_rate_bpm', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>
        {showDivider && <div className="settings-divider" />}
      </>
    );
  };

  const renderOcularSection = (showDivider = false) => {
    if (!isPilot) return null;

    return (
      <>
        <div className="settings-section">
          <h3 className="settings-section-title">Ocular Baselines</h3>
          <p className="settings-section-subtitle">
            Eye tracking and blink monitoring baselines
          </p>

          <div className="settings-form-vertical">
            <div className="form-group">
              <label htmlFor="baseline_blink_rate_per_minute">Baseline Blink Rate (per minute)</label>
              <input
                id="baseline_blink_rate_per_minute"
                type="number"
                value={userProfile?.ocular_baselines?.baseline_blink_rate_per_minute || ''}
                onChange={(e) => handleFieldChange('ocular_baselines.baseline_blink_rate_per_minute', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="baseline_blink_duration_ms">Baseline Blink Duration (ms)</label>
              <input
                id="baseline_blink_duration_ms"
                type="number"
                value={userProfile?.ocular_baselines?.baseline_blink_duration_ms || ''}
                onChange={(e) => handleFieldChange('ocular_baselines.baseline_blink_duration_ms', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>
        {showDivider && <div className="settings-divider" />}
      </>
    );
  };

  const renderCabinPreferencesSection = (showDivider = false) => {
    if (!isPilot) return null;

    return (
      <>
        <div className="settings-section">
          <h3 className="settings-section-title">Cabin Preferences</h3>
          <p className="settings-section-subtitle">
            Temperature and environment preferences
          </p>

          <div className="settings-form-vertical">
            <div className="form-group">
              <label htmlFor="preferred_temperature_celsius">Preferred Temperature (°C)</label>
              <input
                id="preferred_temperature_celsius"
                type="number"
                step="0.1"
                value={userProfile?.cabin_preferences?.preferred_temperature_celsius || ''}
                onChange={(e) => handleFieldChange('cabin_preferences.preferred_temperature_celsius', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="temperature_tolerance_range_celsius">Temperature Tolerance Range (°C)</label>
              <input
                id="temperature_tolerance_range_celsius"
                type="number"
                step="0.1"
                value={userProfile?.cabin_preferences?.temperature_tolerance_range_celsius || ''}
                onChange={(e) => handleFieldChange('cabin_preferences.temperature_tolerance_range_celsius', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>
        {showDivider && <div className="settings-divider" />}
      </>
    );
  };

  const renderPreferencesSection = (showDivider = false) => (
    <>
      <div className="settings-section">
        <h3 className="settings-section-title">Preferences</h3>
        <p className="settings-section-subtitle">
          Customize your application experience
        </p>

        <div className="settings-form-vertical">
          <div className="form-group">
            <label htmlFor="theme">Theme</label>
            <select
              id="theme"
              value={systemState.userProfile?.theme || 'dark'}
              onChange={(e) => handleThemeChange(e.target.value)}
              className="settings-select"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={systemState.userProfile?.notifications ?? true}
                onChange={(e) => handleNotificationsChange(e.target.checked)}
              />
              <span>Enable notifications</span>
            </label>
          </div>
        </div>
      </div>
      {showDivider && <div className="settings-divider" />}
    </>
  );

  const navItems = [
    { id: 'general', label: 'General', icon: '👤' },
    ...(isPilot ? [
      { id: 'pilot', label: 'Pilot Info', icon: '✈️' },
      { id: 'cardiovascular', label: 'Cardiovascular', icon: '❤️' },
      { id: 'ocular', label: 'Ocular', icon: '👁️' },
      { id: 'cabin', label: 'Cabin Preferences', icon: '🌡️' },
    ] : []),
  ];

  const systemNavItem = { id: 'preferences', label: 'Preferences', icon: '⚙️' };

  const renderContent = () => {
    switch (activeSection) {
      case 'general':
        return renderGeneralSection();
      case 'pilot':
        return renderPilotSection();
      case 'cardiovascular':
        return renderCardiovascularSection();
      case 'ocular':
        return renderOcularSection();
      case 'cabin':
        return renderCabinPreferencesSection();
      case 'preferences':
        return renderPreferencesSection();
      default:
        return renderGeneralSection();
    }
  };

  return (
    <div className="settings-container" ref={containerRef}>
      {/* Sidebar Navigation (shown when width is sufficient) */}
      {showSidebar && (
        <nav className="settings-sidebar">
          <h2 className="settings-title">
            Settings
            {isSaving && <span className="saving-indicator"> • Saving...</span>}
          </h2>
          <div className="settings-nav-wrapper">
            <ul className="settings-nav">
              {navItems.map(item => (
                <li key={item.id}>
                  <button
                    className={`settings-nav-button ${activeSection === item.id ? 'active' : ''}`}
                    onClick={() => setActiveSection(item.id)}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
            <ul className="settings-nav settings-nav-bottom">
              <li>
                <button
                  className={`settings-nav-button ${activeSection === systemNavItem.id ? 'active' : ''}`}
                  onClick={() => setActiveSection(systemNavItem.id)}
                >
                  <span className="nav-icon">{systemNavItem.icon}</span>
                  <span className="nav-label">{systemNavItem.label}</span>
                </button>
              </li>
            </ul>
          </div>
        </nav>
      )}

      {/* Content Area */}
      <div className="settings-content">
        {showSidebar ? (
          // Wide layout: Show selected section
          renderContent()
        ) : (
          // Narrow layout: Show all sections with dividers
          <>
            <h2 className="settings-title">
              Settings
              {isSaving && <span className="saving-indicator"> • Saving...</span>}
            </h2>
            {renderGeneralSection(true)}
            {renderPilotSection(true)}
            {renderCardiovascularSection(true)}
            {renderOcularSection(true)}
            {renderCabinPreferencesSection(true)}
            {renderPreferencesSection(false)}
          </>
        )}
      </div>
    </div>
  )
}

export default SettingsApp
