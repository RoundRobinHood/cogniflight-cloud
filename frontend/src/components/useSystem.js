import { createContext, useContext } from 'react'

const SystemContext = createContext()

export const useSystem = () => {
  const context = useContext(SystemContext)
  if (!context) {
    throw new Error('useSystem must be used within a SystemContext provider')
  }
  return context
}

export default SystemContext