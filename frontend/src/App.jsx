import { useState, useEffect } from 'react'
import Desktop from './components/Desktop'
import LoginScreen from './components/LoginScreen'
import { IsAuthorized } from './api/auth'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for existing session
    const savedUser = localStorage.getItem('windowsUser')
    const sessionExpiry = localStorage.getItem('sessionExpiry')

    IsAuthorized().then(authorized => {
      if (authorized) {
        const now = new Date().getTime()
        const expiry = parseInt(sessionExpiry)

        if (now < expiry) {
          // Session is still valid
          setUser(JSON.parse(savedUser))
          setIsAuthenticated(true)
        } else {
          // Session expired
          localStorage.removeItem('windowsUser')
          localStorage.removeItem('sessionExpiry')
        }
      }

      setIsLoading(false)
    })
  }, [])

  const handleLogin = (userData) => {
    const user = {
      email: userData.email,
      loginTime: userData.loginTime,
      avatar: null // Could be added later
    }
    
    // Set session to expire in 2 hours
    const expiryTime = new Date(userData.loginTime).getTime() + (2 * 60 * 60 * 1000) - 3000
    
    localStorage.setItem('windowsUser', JSON.stringify(user))
    localStorage.setItem('sessionExpiry', expiryTime.toString())
    
    setUser(user)
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('windowsUser')
    localStorage.removeItem('sessionExpiry')
    setUser(null)
    setIsAuthenticated(false)
  }

  if (isLoading) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(135deg, #0078d4 0%, #106ebe 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '18px'
      }}>
        Loading...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />
  }

  return <Desktop user={user} onLogout={handleLogout} />
}

export default App
