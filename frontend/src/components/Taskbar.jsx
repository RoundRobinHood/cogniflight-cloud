import { useState } from 'react'
import { Bell, PinOff } from 'lucide-react'
import { useSystem } from './useSystem'
import FatconWidget from './FatconWidget'
import StartMenu from './StartMenu'
import appRegistry from '../config/appRegistry'

function Taskbar({ windows, onWindowClick, onOpenApp }) {
  const { systemState, showNotifications, setShowNotifications, removeFromTaskbar, showContextMenu, showFatconAlert } = useSystem()
  const [showStartMenu, setShowStartMenu] = useState(false)
  
  const allApps = appRegistry.getAllApps(systemState)

  // Get apps that are pinned to taskbar
  const pinnedApps = allApps.filter(app => systemState.pinnedToTaskbar.includes(app.id))
  
  // Get unique opened app types from windows (both minimized and active)
  const openedAppTypes = [...new Set(windows.map(w => w.appType))]
  
  // Combine pinned apps with opened non-pinned apps
  const taskbarApps = [
    ...pinnedApps,
    ...openedAppTypes
      .filter(appType => !systemState.pinnedToTaskbar.includes(appType))
      .map(appType => allApps.find(app => app.id === appType))
      .filter(Boolean)
  ]

  const handleRightClick = (e, appId) => {
    e.preventDefault()
    e.stopPropagation()
    const items = getContextMenuItems(appId)
    showContextMenu({ x: e.clientX, y: e.clientY }, items)
  }

  const getContextMenuItems = (appId) => {
    return [
      {
        label: 'Unpin from taskbar',
        icon: PinOff,
        action: () => removeFromTaskbar(appId),
        disabled: false
      }
    ]
  }

  const handleFatconLevelChange = (newLevel, previousLevel, levelData) => {
    showFatconAlert(levelData, previousLevel, newLevel)
  }

  return (
    <div className="taskbar">
      {/* Left side - FATCON Widget */}
      <div className="taskbar-left">
        <FatconWidget onLevelChange={handleFatconLevelChange} />
      </div>

      {/* Center - Start Button + Apps */}
      <div className="taskbar-center">
        {/* Start Button */}
        <button 
          className="taskbar-logo-button"
          onClick={() => {
            setShowStartMenu(!showStartMenu)
            setShowNotifications(false)
          }}
          title="Start"
        >
          <img 
            src="/logo.png" 
            alt="Start" 
            className="taskbar-logo"
            onError={(e) => {
              // Fallback if logo.png doesn't exist
              e.target.style.display = 'none'
              e.target.nextSibling.style.display = 'flex'
            }}
          />
          <div className="taskbar-logo-fallback" style={{ display: 'none' }}>
            ⊞
          </div>
        </button>
        
        {/* Apps section */}
        <div className="taskbar-apps">
          {taskbarApps.map(app => {
            if (!app || !app.icon) return null
            const Icon = app.icon
            const appWindows = windows.filter(w => w.appType === app.id)
            const hasOpenWindow = appWindows.length > 0
            const isActive = appWindows.some(w => !w.isMinimized)
            const isPinned = systemState.pinnedToTaskbar.includes(app.id)
            
            return (
              <button
                key={app.id}
                className={`taskbar-app ${isActive ? 'active' : ''} ${hasOpenWindow ? 'has-window' : ''}`}
                style={{ backgroundColor: app.color }}
                onClick={() => {
                  // If there are windows for this app
                  if (appWindows.length > 0) {
                    // Find the most recent window (highest ID) or first minimized one
                    const targetWindow = appWindows.find(w => w.isMinimized) || 
                                       appWindows[appWindows.length - 1]
                    onWindowClick(targetWindow.id)
                  } else {
                    // Open new window
                    onOpenApp(app.id, app.label)
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault()
                  if (isPinned) {
                    handleRightClick(e, app.id)
                  }
                }}
                title={app.label}
              >
                <Icon size={16} color="white" />
                {/* Show indicator for multiple windows */}
                {appWindows.length > 1 && (
                  <span className="taskbar-app-indicator">{appWindows.length}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Right side - Notifications and clock */}
      <div className="taskbar-right">
        <div className="taskbar-clock">
          {new Date().toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true 
          })}
        </div>
        
        <div className="taskbar-notifications">
          <button 
            className={`taskbar-notification-button ${systemState.notifications?.length > 0 ? 'has-notifications' : ''}`}
            onClick={() => {
              setShowNotifications(!showNotifications)
            }}
            title={`${systemState.notifications?.length || 0} notifications`}
          >
            <Bell size={16} />
            {systemState.notifications?.length > 0 && (
              <div className="notification-badge">
                {systemState.notifications.length > 99 ? '99+' : systemState.notifications.length}
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Start Menu */}
      <StartMenu 
        isOpen={showStartMenu}
        onClose={() => setShowStartMenu(false)}
      />
    </div>
  )
}

export default Taskbar
