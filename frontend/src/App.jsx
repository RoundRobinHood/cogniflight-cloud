import { useState, useEffect, useCallback } from 'react'
import Desktop from './components/Desktop'
import LoginScreen from './components/LoginScreen'
import { IsAuthorized } from './api/auth'
import { Connect, PipeCmdClient } from './api/socket'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(null)
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [client, setClient] = useState(null);

  useEffect(() => {
    // Check for authentication
    IsAuthorized().then(auth => {
      setIsAuthenticated(auth)
      if(!auth)
        setIsLoading(false);
    });
  }, []);

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
    setUser(null)
    setIsAuthenticated(false)
  }, []);

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
    return <LoginScreen onLogin={handleLogin} />
  }

  return <Desktop user={user} onLogout={handleLogout} />
}

export default App
