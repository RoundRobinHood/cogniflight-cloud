import { createContext, useContext, useState, useCallback } from 'react'
import ConfirmDialog from '../components/ConfirmDialog'

const ConfirmContext = createContext()

export function ConfirmProvider({ children }) {
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'warning',
    onConfirm: () => {},
    onCancel: () => {}
  })

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        title: options.title || 'Confirm Action',
        message: options.message || 'Are you sure you want to proceed?',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        type: options.type || 'warning',
        onConfirm: () => {
          resolve(true)
          setDialogState(prev => ({ ...prev, isOpen: false }))
        },
        onCancel: () => {
          resolve(false)
          setDialogState(prev => ({ ...prev, isOpen: false }))
        }
      })
    })
  }, [])

  const handleClose = () => {
    dialogState.onCancel()
  }

  const handleConfirm = () => {
    dialogState.onConfirm()
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmDialog
        isOpen={dialogState.isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={dialogState.title}
        message={dialogState.message}
        confirmText={dialogState.confirmText}
        cancelText={dialogState.cancelText}
        type={dialogState.type}
      />
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return context.confirm
}