import { useEffect, useRef, useState } from 'react'
import { Pin, PinOff, Monitor, Trash2 } from 'lucide-react'

function ContextMenu({ isOpen, position, onClose, items }) {
  const menuRef = useRef(null)
  const [adjustedPosition, setAdjustedPosition] = useState(position)

  useEffect(() => {
    if (isOpen && menuRef.current) {
      const menu = menuRef.current
      const menuRect = menu.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      
      let newX = position.x
      let newY = position.y

      // Adjust horizontal position if menu goes off-screen
      if (position.x + menuRect.width > viewportWidth) {
        newX = viewportWidth - menuRect.width - 10 // 10px padding from edge
      }
      if (newX < 10) {
        newX = 10 // Minimum 10px from left edge
      }

      // Adjust vertical position if menu goes off-screen
      if (position.y + menuRect.height > viewportHeight) {
        newY = position.y - menuRect.height // Show above cursor instead
      }
      if (newY < 10) {
        newY = 10 // Minimum 10px from top
      }

      setAdjustedPosition({ x: newX, y: newY })
    }
  }, [isOpen, position])

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
        left: adjustedPosition.x,
        top: adjustedPosition.y,
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