import { useEffect, useRef } from 'react'
import { Pin, PinOff, Monitor, Trash2 } from 'lucide-react'

function ContextMenu({ isOpen, position, onClose, items }) {
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose()
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleItemClick = (action) => {
    action()
    onClose()
  }

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 100000
      }}
    >
      {items.map((item, index) => (
        <button
          key={index}
          className={`context-menu-item ${item.disabled ? 'disabled' : ''}`}
          onClick={() => !item.disabled && handleItemClick(item.action)}
          disabled={item.disabled}
        >
          {item.icon && <item.icon size={16} />}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  )
}

export default ContextMenu