import { X, AlertTriangle, Info, HelpCircle } from 'lucide-react'

function ConfirmDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning' // 'warning', 'info', 'question'
}) {
  if (!isOpen) return null

  const getIcon = () => {
    switch (type) {
      case 'warning':
        return <AlertTriangle size={24} className="confirm-dialog-icon-warning" />
      case 'info':
        return <Info size={24} className="confirm-dialog-icon-info" />
      case 'question':
        return <HelpCircle size={24} className="confirm-dialog-icon-question" />
      default:
        return <AlertTriangle size={24} className="confirm-dialog-icon-warning" />
    }
  }

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  const handleCancel = () => {
    onClose()
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleCancel()
    }
  }

  return (
    <div className="confirm-dialog-backdrop" onClick={handleBackdropClick}>
      <div className="confirm-dialog">
        <div className="confirm-dialog-header">
          <div className="confirm-dialog-title-wrapper">
            {getIcon()}
            <h3 className="confirm-dialog-title">{title}</h3>
          </div>
          <button 
            className="confirm-dialog-close"
            onClick={handleCancel}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        
        <div className="confirm-dialog-content">
          <p className="confirm-dialog-message">{message}</p>
        </div>
        
        <div className="confirm-dialog-footer">
          <button 
            className="confirm-dialog-button confirm-dialog-button-cancel"
            onClick={handleCancel}
          >
            {cancelText}
          </button>
          <button 
            className="confirm-dialog-button confirm-dialog-button-confirm"
            onClick={handleConfirm}
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog