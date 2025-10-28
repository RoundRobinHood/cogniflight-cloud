import { useState, useEffect, useCallback } from 'react'
import Desktop from './components/Desktop'
import LoginScreen from './components/LoginScreen'
import { IsAuthorized } from './api/auth'
import { Connect, PipeCmdClient } from './api/socket'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(null)
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [client, setClient] = useState(null)
  const [signupToken, setSignupToken] = useState(null)
  const [isSignupMode, setIsSignupMode] = useState(false)

  useEffect(() => {
    const checkUrlToken = () => {
      const urlParams = new URLSearchParams(window.location.search)
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const token = urlParams.get('token') || hashParams.get('token')
      
      if (token) {
        setSignupToken(token)
        setIsSignupMode(true)
        setIsLoading(false)
        return true
      } else {
        // No token found, reset signup mode
        setSignupToken(null)
        setIsSignupMode(false)
        return false
      }
    }

    // Check for signup token in URL
    const hasToken = checkUrlToken()
    
    if (!hasToken) {
      // Only check authentication if no signup token
      IsAuthorized().then(auth => {
        setIsAuthenticated(auth)
        if(!auth)
          setIsLoading(false);
      });
    }

    // Listen for URL changes (for SPA navigation, though this app doesn't use routing)
    const handlePopState = () => {
      const hasToken = checkUrlToken()
      if (!hasToken && !isAuthenticated) {
        IsAuthorized().then(auth => {
          setIsAuthenticated(auth)
          if(!auth)
            setIsLoading(false);
        });
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      const client_instance = new PipeCmdClient();

      client_instance.connect();
      setClient(client_instance);

      return () => client_instance.disconnect().catch(err => console.error(err));
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (client !== null) {
      client.whoami().then(data => {
        setUser(data);
        setIsLoading(false);
      })
    }
  }, [client]);

  const handleLogin = useCallback(() => setIsAuthenticated(true),[]);

  const handleLogout = useCallback(() => {
    if(client !== null) {
      client.run_command("logout").then(cmd => {
        if(cmd.command_result != 0) {
          throw new Error(cmd.error);
        }
        location.reload();
      });
    }
  }, [client]);

  if (isLoading) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        background: 'radial-gradient(ellipse at center, #1a1a3e 0%, #0a0a2e 40%, #000000 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: '18px',
        textShadow: '0 0 20px rgba(255, 255, 255, 0.5)'
      }}>
        Loading...
      </div>
    )
  }

  if (!isAuthenticated || user === null) {
    return <LoginScreen onLogin={handleLogin} isSignupMode={isSignupMode} signupToken={signupToken} />
  }

  return <Desktop user={user} onLogout={handleLogout} />
}

export default App
