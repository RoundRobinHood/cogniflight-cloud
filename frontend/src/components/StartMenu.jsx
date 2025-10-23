import { useState, useEffect } from 'react'
import { User, Power, Search, Grid3X3, Pin, Monitor } from 'lucide-react'
import { useSystem } from './useSystem'
import appRegistry from '../config/appRegistry'
import { useConfirm } from '../hooks/useConfirm.jsx'
import { usePipeClient, StringIterator } from '../api/socket'

function StartMenu({ isOpen, onClose }) {
  const { systemState, openWindow, onLogout, addToTaskbar, addToDesktop, removeFromTaskbar, removeFromDesktop, showContextMenu } = useSystem()
  const [searchQuery, setSearchQuery] = useState('')
  const [profilePictureData, setProfilePictureData] = useState(null)
  const client = usePipeClient()

  const pinnedApps = appRegistry.getAllApps(systemState)

  // Load profile picture when it changes
  useEffect(() => {
    const loadProfilePicture = async () => {
      const filename = systemState.userProfile?.profile_picture
      if (!client || !filename) {
        setProfilePictureData(null)
        return
      }

      try {
        const result = await client.run_command(
          `cat ~/Pictures/${filename} | base64`,
          StringIterator('')
        )

        if (result.command_result === 0 && result.output) {
          const base64Data = result.output.trim().replace(/[\r\n]+$/, '')

          const extension = filename.split('.').pop().toLowerCase()
          let mimeType = 'image/jpeg'
          if (extension === 'png') mimeType = 'image/png'
          else if (extension === 'gif') mimeType = 'image/gif'
          else if (extension === 'webp') mimeType = 'image/webp'
          else if (extension === 'bmp') mimeType = 'image/bmp'

          setProfilePictureData(`data:${mimeType};base64,${base64Data}`)
        }
      } catch (err) {
        console.error('Error loading profile picture:', err)
        setProfilePictureData(null)
      }
    }

    loadProfilePicture()
  }, [client, systemState.userProfile?.profile_picture])

  const handleAppClick = (appId, appLabel) => {
    openWindow(appId, appLabel)
    onClose()
  }

  const confirm = useConfirm()

  const handlePowerClick = async () => {
    const confirmed = await confirm({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out? Any unsaved work will be lost.',
      confirmText: 'Sign Out',
      cancelText: 'Cancel',
      type: 'warning'
    })
    
    if (confirmed) {
      onLogout()
    }
  }

  const handleRightClick = (e, appId) => {
    e.preventDefault()
    e.stopPropagation()
    const items = getContextMenuItems(appId)
    showContextMenu({ x: e.clientX, y: e.clientY }, items)
  }

  const getContextMenuItems = (appId) => {
    const isInTaskbar = systemState.pinnedToTaskbar.includes(appId)
    const isInDesktop = systemState.pinnedToDesktop.includes(appId)

    return [
      {
        label: isInTaskbar ? 'Unpin from taskbar' : 'Pin to taskbar',
        icon: Pin,
        action: () => {
          if (isInTaskbar) {
            removeFromTaskbar(appId)
          } else {
            addToTaskbar(appId)
          }
        },
        disabled: false
      },
      {
        label: isInDesktop ? 'Remove from desktop' : 'Pin to desktop',
        icon: Monitor,
        action: () => {
          if (isInDesktop) {
            removeFromDesktop(appId)
          } else {
            addToDesktop(appId)
          }
        },
        disabled: false
      }
    ]
  }

  const filteredApps = (pinnedApps || []).filter(app => 
    app && app.label && app.label.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="start-menu-backdrop"
        onClick={onClose}
        onContextMenu={(e) => e.preventDefault()}
      />
      
      {/* Start Menu */}
      <div className="start-menu">
        {/* Search Bar */}
        <div className="start-menu-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Type here to search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="start-menu-search-input"
          />
        </div>

        {/* Pinned Apps */}
        <div className="start-menu-section">
          <div className="start-menu-section-header">
            <span>Pinned</span>
            <Grid3X3 size={16} />
          </div>
          <div className="start-menu-apps">
            {filteredApps.map(app => {
              const Icon = app.icon
              return (
                <button
                  key={app.id}
                  className="start-menu-app"
                  onClick={() => handleAppClick(app.id, app.label)}
                  onContextMenu={(e) => handleRightClick(e, app.id)}
                >
                  <div 
                    className="start-menu-app-icon"
                    style={{ backgroundColor: app.color }}
                  >
                    <Icon size={24} color="white" />
                  </div>
                  <span className="start-menu-app-label">{app.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* User Profile & Power */}
        <div className="start-menu-footer">
          <div className="start-menu-user">
            <div className="start-menu-user-avatar">
              {profilePictureData ? (
                <img
                  src={profilePictureData}
                  alt="Profile"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: 'var(--radius-full)'
                  }}
                />
              ) : (
                <User size={20} />
              )}
            </div>
            <div className="start-menu-user-info">
              <div className="start-menu-user-name">{systemState.userProfile.username}</div>
              <div className="start-menu-user-email">{systemState.userProfile.email}</div>
            </div>
          </div>
          <button
            className="start-menu-power"
            onClick={handlePowerClick}
            title="Sign out"
          >
            <Power size={16} />
          </button>
        </div>
      </div>
    </>
  )
}

export default StartMenu
