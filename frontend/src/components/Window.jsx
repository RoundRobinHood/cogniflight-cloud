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
  isHalfSnapped,
  children,
  onClose, 
  onMinimize, 
  onMaximize, 
  onFocus, 
  onMove, 
  onResize,
  onSnapToHalf 
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeDirection, setResizeDirection] = useState('')
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [snapZone, setSnapZone] = useState(null) // 'top', 'left', 'right', or null
  const windowRef = useRef(null)

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging && !isMaximized) {
        const deltaX = e.clientX - dragStart.x
        const deltaY = e.clientY - dragStart.y
        
        // Calculate new position with viewport constraints
        const screenWidth = window.innerWidth
        const screenHeight = window.innerHeight - 48 // Account for taskbar
        const headerHeight = 32 // Window header height
        const minHeaderVisible = 100 // Minimum pixels of header to keep visible
        
        const minX = -width + minHeaderVisible // Allow window to go off-screen but keep header buttons visible
        const minY = 0 // Don't allow window to go above screen
        const maxX = screenWidth - minHeaderVisible // Keep at least part of header visible on right
        const maxY = screenHeight - headerHeight // Keep header visible at bottom
        
        let newX = Math.max(minX, Math.min(maxX, x + deltaX))
        let newY = Math.max(minY, Math.min(maxY, y + deltaY))
        
        onMove(newX, newY)
        setDragStart({ x: e.clientX, y: e.clientY })
        
        // Check for snap zones
        const snapThreshold = 50
        
        if (e.clientY <= snapThreshold) {
          setSnapZone('top')
        } else if (e.clientX <= snapThreshold) {
          setSnapZone('left')
        } else if (e.clientX >= screenWidth - snapThreshold) {
          setSnapZone('right')
        } else {
          setSnapZone(null)
        }
      }

      if (isResizing && !isMaximized && !isHalfSnapped) {
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
      if (isDragging && snapZone) {
        if (snapZone === 'top') {
          onMaximize()
        } else if (snapZone === 'left' && onSnapToHalf) {
          onSnapToHalf('left')
        } else if (snapZone === 'right' && onSnapToHalf) {
          onSnapToHalf('right')
        }
      }
      
      setIsDragging(false)
      setIsResizing(false)
      setResizeDirection('')
      setSnapZone(null)
    }

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, isResizing, dragStart, resizeStart, resizeDirection, x, y, width, height, isMaximized, isHalfSnapped, onMove, onResize, onMaximize, onSnapToHalf, snapZone])

  const handleDragStart = (e) => {
    if (isMaximized) return
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
    onFocus()
  }

  const handleResizeStart = (direction) => (e) => {
    if (isMaximized || isHalfSnapped) return
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    setResizeDirection(direction)
    setResizeStart({ x: e.clientX, y: e.clientY, width, height })
    onFocus()
  }

  return (
    <>
      {/* Snap zone indicators */}
      {snapZone && (
        <div 
          className="snap-indicator"
          style={{
            position: 'fixed',
            backgroundColor: 'rgba(0, 120, 212, 0.3)',
            border: '2px solid rgba(0, 120, 212, 0.8)',
            zIndex: 9999,
            pointerEvents: 'none',
            ...(snapZone === 'top' ? {
              top: 0,
              left: 0,
              width: '100vw',
              height: 'calc(100vh - 48px)'
            } : snapZone === 'left' ? {
              top: 0,
              left: 0,
              width: '50vw',
              height: 'calc(100vh - 48px)'
            } : {
              top: 0,
              right: 0,
              width: '50vw',
              height: 'calc(100vh - 48px)'
            })
          }}
        />
      )}
      
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

      {!isMaximized && !isHalfSnapped && (
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
    </>
  )
}

export default Window