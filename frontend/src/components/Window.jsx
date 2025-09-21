import { useState, useRef, useEffect } from 'react'
import { Minus, Maximize2, X } from 'lucide-react'

function Window({ 
  title, 
  x, 
  y, 
  width, 
  height, 
  zIndex, 
  isMaximized,
  children,
  onClose, 
  onMinimize, 
  onMaximize, 
  onFocus, 
  onMove, 
  onResize 
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeDirection, setResizeDirection] = useState('')
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const windowRef = useRef(null)

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging && !isMaximized) {
        const deltaX = e.clientX - dragStart.x
        const deltaY = e.clientY - dragStart.y
        onMove(x + deltaX, y + deltaY)
        setDragStart({ x: e.clientX, y: e.clientY })
      }

      if (isResizing && !isMaximized) {
        const deltaX = e.clientX - resizeStart.x
        const deltaY = e.clientY - resizeStart.y

        let newWidth = resizeStart.width
        let newHeight = resizeStart.height
        let newX = x
        let newY = y

        if (resizeDirection.includes('right')) {
          newWidth = Math.max(300, resizeStart.width + deltaX)
        }
        if (resizeDirection.includes('bottom')) {
          newHeight = Math.max(200, resizeStart.height + deltaY)
        }
        if (resizeDirection.includes('left')) {
          const widthChange = resizeStart.width - deltaX
          if (widthChange >= 300) {
            newWidth = widthChange
            newX = x + deltaX
          }
        }
        if (resizeDirection.includes('top')) {
          const heightChange = resizeStart.height - deltaY
          if (heightChange >= 200) {
            newHeight = heightChange
            newY = y + deltaY
          }
        }

        onResize(newWidth, newHeight)
        if (newX !== x || newY !== y) {
          onMove(newX, newY)
        }
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setIsResizing(false)
      setResizeDirection('')
    }

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, isResizing, dragStart, resizeStart, resizeDirection, x, y, width, height, isMaximized, onMove, onResize])

  const handleDragStart = (e) => {
    if (isMaximized) return
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
    onFocus()
  }

  const handleResizeStart = (direction) => (e) => {
    if (isMaximized) return
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    setResizeDirection(direction)
    setResizeStart({ x: e.clientX, y: e.clientY, width, height })
    onFocus()
  }

  return (
    <div
      ref={windowRef}
      className="window"
      style={{
        width: isMaximized ? '100vw' : width,
        height: isMaximized ? 'calc(100vh - 48px)' : height,
        zIndex,
        left: isMaximized ? 0 : x,
        top: isMaximized ? 0 : y,
        position: isMaximized ? 'fixed' : 'absolute'
      }}
      onMouseDown={() => onFocus()}
    >
      <div 
        className="window-header"
        onMouseDown={handleDragStart}
        style={{ cursor: isMaximized ? 'default' : 'move' }}
      >
        <div className="window-title">{title}</div>
        <div className="window-controls">
          <button className="window-control minimize" onClick={onMinimize}>
            <Minus size={10} />
          </button>
          <button className="window-control maximize" onClick={onMaximize}>
            <Maximize2 size={10} />
          </button>
          <button className="window-control close" onClick={onClose}>
            <X size={10} />
          </button>
        </div>
      </div>
      
      <div className="window-content">
        {children}
      </div>

      {!isMaximized && (
        <>
          {/* Resize handles */}
          <div
            onMouseDown={handleResizeStart('right')}
            style={{
              position: 'absolute',
              right: 0,
              top: '32px',
              width: '4px',
              height: 'calc(100% - 32px)',
              cursor: 'ew-resize',
              background: 'transparent'
            }}
          />
          <div
            onMouseDown={handleResizeStart('bottom')}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '100%',
              height: '4px',
              cursor: 'ns-resize',
              background: 'transparent'
            }}
          />
          <div
            onMouseDown={handleResizeStart('bottom-right')}
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: '8px',
              height: '8px',
              cursor: 'nw-resize',
              background: 'transparent'
            }}
          />
        </>
      )}
    </div>
  )
}

export default Window