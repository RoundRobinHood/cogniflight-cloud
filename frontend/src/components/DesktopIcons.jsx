import { Trash2 } from 'lucide-react'
import { useSystem } from './useSystem'
import appRegistry from '../config/appRegistry'

function DesktopIcons({ onOpenApp }) {
  const { systemState, removeFromDesktop, showContextMenu } = useSystem()
  
  const allIcons = appRegistry.getAllApps(systemState)
  console.log("🧭 systemState.userProfile.role =", systemState.userProfile.role);
  console.log("🧩 all visible apps =", appRegistry.getAllApps(systemState));


  // Get icons that are pinned to desktop
  const icons = allIcons.filter(icon => systemState.pinnedToDesktop.includes(icon.id))

  const handleRightClick = (e, appId) => {
    e.preventDefault()
    e.stopPropagation()
    const items = getContextMenuItems(appId)
    showContextMenu({ x: e.clientX, y: e.clientY }, items)
  }

  const getContextMenuItems = (appId) => {
    return [
      {
        label: 'Remove from desktop',
        icon: Trash2,
        action: () => removeFromDesktop(appId),
        disabled: false
      }
    ]
  }

  return (
    <div className="desktop-icons">
      {icons.map(icon => {
        const Icon = icon.icon
        return (
          <button
            key={icon.id}
            className="desktop-icon"
            onDoubleClick={() => onOpenApp(icon.id, icon.label)}
            onContextMenu={(e) => handleRightClick(e, icon.id)}
          >
            <div 
              className="desktop-icon-image"
              style={{ backgroundColor: icon.color }}
            >
              <Icon size={24} color="white" />
            </div>
            <div className="desktop-icon-label">{icon.label}</div>
          </button>
        )
      })}
    </div>
  )
}

export default DesktopIcons