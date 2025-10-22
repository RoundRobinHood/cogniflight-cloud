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
  const [availablePictures, setAvailablePictures] = useState([])
  const [loadingPictures, setLoadingPictures] = useState(false)
  const [showImageSelector, setShowImageSelector] = useState(false)
  const [profilePictureData, setProfilePictureData] = useState(null)
  const [picturePreviewsLoading, setPicturePreviewsLoading] = useState(false)
  const [picturePreviews, setPicturePreviews] = useState({})
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const containerRef = useRef(null)
  const saveTimeoutRef = useRef(null)
  const client = usePipeClient();

  useEffect(() => {
    if (client !== null) {
      client.whoami().then(async (data) => {
        setUserProfile(data);
        setLoading(false);
        // Load available pictures after profile loads
        await loadAvailablePictures();
        // Load current profile picture if exists
        if (data?.profile_picture) {
          loadProfilePicture(data.profile_picture);
        }
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

  // Load profile picture data
  const loadProfilePicture = async (filename) => {
    if (!client || !filename) return;

    try {
      const result = await client.run_command(
        `cat ~/Pictures/${filename} | base64`,
        StringIterator('')
      );

      if (result.command_result === 0 && result.output) {
        // Remove the \r\n that cat adds at the end
        const base64Data = result.output.trim().replace(/[\r\n]+$/, '');

        const extension = filename.split('.').pop().toLowerCase();
        let mimeType = 'image/jpeg';
        if (extension === 'png') mimeType = 'image/png';
        else if (extension === 'gif') mimeType = 'image/gif';
        else if (extension === 'webp') mimeType = 'image/webp';
        else if (extension === 'bmp') mimeType = 'image/bmp';

        setProfilePictureData(`data:${mimeType};base64,${base64Data}`);
      }
    } catch (err) {
      console.error('Error loading profile picture:', err);
    }
  };

  // Load available pictures from Pictures directory
  const loadAvailablePictures = async () => {
    if (!client) return;

    try {
      setLoadingPictures(true);

      // Create Pictures directory if it doesn't exist
      await client.run_command(
        `mkdir -p ~/Pictures`,
        StringIterator('')
      );

      // List all files in Pictures directory
      const fileList = await client.ls('~/Pictures');

      // Filter for image files based on common image extensions
      const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
      const imageFiles = fileList.filter(file => {
        if (file.type !== 'file') return false;
        const extension = file.name.split('.').pop().toLowerCase();
        return imageExtensions.includes(extension);
      });

      // Map to just filenames for the select dropdown
      const pictureNames = imageFiles.map(file => file.name);
      setAvailablePictures(pictureNames);
    } catch (err) {
      console.error('Error loading pictures:', err);
    } finally {
      setLoadingPictures(false);
    }
  };

  // Load previews for image selector
  const loadPicturePreviews = async () => {
    if (!client || availablePictures.length === 0) return;

    try {
      setPicturePreviewsLoading(true);
      const previews = {};

      for (const filename of availablePictures) {
        const result = await client.run_command(
          `cat ~/Pictures/${filename} | base64`,
          StringIterator('')
        );

        if (result.command_result === 0 && result.output) {
          // Remove the \r\n that cat adds at the end
          const base64Data = result.output.trim().replace(/[\r\n]+$/, '');

          const extension = filename.split('.').pop().toLowerCase();
          let mimeType = 'image/jpeg';
          if (extension === 'png') mimeType = 'image/png';
          else if (extension === 'gif') mimeType = 'image/gif';
          else if (extension === 'webp') mimeType = 'image/webp';
          else if (extension === 'bmp') mimeType = 'image/bmp';

          previews[filename] = `data:${mimeType};base64,${base64Data}`;
        }
      }

      setPicturePreviews(previews);
    } catch (err) {
      console.error('Error loading picture previews:', err);
    } finally {
      setPicturePreviewsLoading(false);
    }
  };

  // Handle profile picture selection
  const handleProfilePictureSelect = async (filename) => {
    handleFieldChange('profile_picture', filename);

    if (filename) {
      // Load the profile picture for display
      loadProfilePicture(filename);

      // Generate and save embeddings for the selected image
      try {
        const embedResult = await client.run_command(
          `embed ~/Pictures/${filename} | tee ~/user.embedding`,
          StringIterator('')
        );

        if (embedResult.command_result === 0) {
          console.log('Profile picture embeddings generated and saved');
        } else {
          console.error('Failed to generate embeddings:', embedResult.error);
        }
      } catch (err) {
        console.error('Error generating embeddings:', err);
      }
    } else {
      // Clear profile picture
      setProfilePictureData(null);

      // Clear embeddings file when removing profile picture
      try {
        await client.run_command(
          `echo "" | tee ~/user.embedding`,
          StringIterator('')
        );
      } catch (err) {
        console.error('Error clearing embeddings:', err);
      }
    }

    setShowImageSelector(false);
    addNotification(filename ? 'Profile picture updated' : 'Profile picture removed', 'success');
  };

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

  const handlePasswordChange = async () => {
    // Validate input fields
    if (!currentPassword || !newPassword || !confirmPassword) {
      addNotification('Please fill in all password fields', 'error')
      return
    }

    if (newPassword !== confirmPassword) {
      addNotification('New passwords do not match', 'error')
      return
    }

    if (newPassword.length < 4) {
      addNotification('New password must be at least 4 characters long', 'error')
      return
    }

    try {
      setChangingPassword(true)

      // Use the change-password command
      const result = await client.run_command(
        `change-password '${currentPassword}' '${newPassword}'`,
        StringIterator('')
      )

      if (result.command_result === 0) {
        addNotification('Password changed successfully', 'success')
        // Clear password fields
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        // Check if error indicates wrong current password
        if (result.error && result.error.includes('incorrect')) {
          addNotification('Current password is incorrect', 'error')
        } else {
          addNotification('Failed to change password', 'error')
        }
        console.error('Password change error:', result.error)
      }
    } catch (err) {
      addNotification('Failed to change password', 'error')
      console.error('Password change error:', err)
    } finally {
      setChangingPassword(false)
    }
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

        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
          {/* Profile Picture */}
          <div
            onClick={() => {
              setShowImageSelector(true);
              if (availablePictures.length > 0 && Object.keys(picturePreviews).length === 0) {
                loadPicturePreviews();
              }
            }}
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '8px',
              overflow: 'hidden',
              background: profilePictureData ? 'transparent' : 'var(--glass-bg-lighter)',
              border: '2px solid var(--glass-border)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-primary)';
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--glass-border)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {profilePictureData ? (
              <img
                src={profilePictureData}
                alt="Profile"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            ) : (
              <div style={{
                textAlign: 'center',
                color: 'var(--text-tertiary)',
                fontSize: '12px',
                padding: '8px'
              }}>
                Click to select profile picture
              </div>
            )}
          </div>

          {/* Name and Surname Fields */}
          <div className="settings-form-vertical" style={{ flex: 1 }}>
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
          </div>
        </div>

        <div className="settings-form-vertical" style={{ marginTop: '20px' }}>

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

  const renderPasswordSection = (showDivider = false) => (
    <>
      <div className="settings-section">
        <h3 className="settings-section-title">Password</h3>
        <p className="settings-section-subtitle">
          Change your account password
        </p>

        <div className="settings-form-vertical">
          <div className="form-group">
            <label htmlFor="current_password">Current Password</label>
            <input
              id="current_password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              disabled={changingPassword}
            />
          </div>

          <div className="form-group">
            <label htmlFor="new_password">New Password</label>
            <input
              id="new_password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              disabled={changingPassword}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirm_password">Confirm New Password</label>
            <input
              id="confirm_password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              disabled={changingPassword}
            />
          </div>

          <button
            onClick={handlePasswordChange}
            disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
            style={{
              marginTop: '16px',
              padding: '10px 20px',
              background: changingPassword || !currentPassword || !newPassword || !confirmPassword ?
                'var(--glass-bg-lighter)' : 'var(--color-primary)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-sm)',
              color: 'white',
              cursor: changingPassword || !currentPassword || !newPassword || !confirmPassword ?
                'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'var(--font-medium)',
              opacity: changingPassword || !currentPassword || !newPassword || !confirmPassword ? 0.6 : 1,
              transition: 'all var(--transition-fast)'
            }}
          >
            {changingPassword ? 'Changing Password...' : 'Change Password'}
          </button>
        </div>
      </div>
      {showDivider && <div className="settings-divider" />}
    </>
  );

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

  const systemNavItems = [
    { id: 'password', label: 'Password', icon: '🔒' },
    { id: 'preferences', label: 'Preferences', icon: '⚙️' }
  ];

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
      case 'password':
        return renderPasswordSection();
      case 'preferences':
        return renderPreferencesSection();
      default:
        return renderGeneralSection();
    }
  };

  return (
    <>
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
              {systemNavItems.map(item => (
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
            {renderPasswordSection(true)}
            {renderPreferencesSection(false)}
          </>
        )}
      </div>
    </div>

    {/* Image Selector Popup */}
    {showImageSelector && (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}
        onClick={() => setShowImageSelector(false)}
      >
        <div
          style={{
            background: 'var(--glass-bg-dark)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            maxWidth: '800px',
            maxHeight: '600px',
            width: '90%',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h3 style={{
              margin: 0,
              color: 'var(--text-primary)',
              fontSize: '1.25rem'
            }}>
              Select Profile Picture
            </h3>
            <button
              onClick={() => setShowImageSelector(false)}
              style={{
                background: 'var(--glass-bg-light)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 16px',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Close
            </button>
          </div>

          {picturePreviewsLoading ? (
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-tertiary)'
            }}>
              Loading pictures...
            </div>
          ) : availablePictures.length === 0 ? (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-tertiary)'
            }}>
              <p>No pictures found in Pictures folder</p>
              <p style={{ fontSize: '12px', marginTop: '8px' }}>
                Use the Camera app to take photos
              </p>
            </div>
          ) : (
            <div style={{
              flex: 1,
              overflow: 'auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: '16px',
              padding: '4px'
            }}>
              {/* Option to remove profile picture */}
              <div
                onClick={() => handleProfilePictureSelect('')}
                style={{
                  aspectRatio: '1',
                  background: 'var(--glass-bg-lighter)',
                  border: '2px solid var(--glass-border)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  flexDirection: 'column',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-primary)';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--glass-border)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <div style={{
                  fontSize: '32px',
                  color: 'var(--text-tertiary)'
                }}>
                  ✕
                </div>
                <div style={{
                  fontSize: '12px',
                  color: 'var(--text-tertiary)',
                  textAlign: 'center'
                }}>
                  Remove Picture
                </div>
              </div>

              {/* Picture options */}
              {availablePictures.map(filename => (
                <div
                  key={filename}
                  onClick={() => handleProfilePictureSelect(filename)}
                  style={{
                    aspectRatio: '1',
                    background: 'var(--glass-bg-lighter)',
                    border: '2px solid',
                    borderColor: userProfile?.profile_picture === filename ?
                      'var(--color-primary)' : 'var(--glass-border)',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    if (userProfile?.profile_picture !== filename) {
                      e.currentTarget.style.borderColor = 'var(--color-primary)';
                    }
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    if (userProfile?.profile_picture !== filename) {
                      e.currentTarget.style.borderColor = 'var(--glass-border)';
                    }
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  {picturePreviews[filename] ? (
                    <img
                      src={picturePreviews[filename]}
                      alt={filename}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-tertiary)',
                      fontSize: '12px'
                    }}>
                      Loading...
                    </div>
                  )}

                  {userProfile?.profile_picture === filename && (
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: 'var(--color-primary)',
                      color: 'white',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px'
                    }}>
                      ✓
                    </div>
                  )}

                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '4px 8px',
                    background: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    fontSize: '11px',
                    textAlign: 'center',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {filename}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )}
    </>
  )
}

export default SettingsApp
