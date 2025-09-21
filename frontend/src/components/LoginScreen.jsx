import { useState, useEffect } from 'react'
import { Eye, EyeOff, ArrowRight, User } from 'lucide-react'
import { Login } from '../api/login'

function LoginScreen({ onLogin }) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState('username') // 'username' or 'password'

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    })
  }

  const handleUsernameSubmit = (e) => {
    e.preventDefault()
    if (username.trim()) {
      setStep('password')
      setError('')
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    if (password.trim()) {
      setIsLoading(true)
      setError('')
      
      // Simulate authentication delay
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Simple authentication - in real app, this would be secure
      const login = await Login({ email: username, pwd: password })
      if (login.authorized) {
        // Add fade out animation before transitioning
        document.querySelector('.login-screen').style.animation = 'fadeOut 0.8s ease-out forwards'
        await new Promise(resolve => setTimeout(resolve, 800))
        
        onLogin({
          username: username || 'User',
          loginTime: new Date().toISOString()
        })
      } else {
        setError('Incorrect username/password')
        setIsLoading(false)
      }
    }
  }

  const handleBack = () => {
    setStep('username')
    setPassword('')
    setError('')
  }

  return (
    <div className="login-screen">
      {/* Background with time/date */}
      <div className="login-background">
        <div className="login-time-display">
          <div className="login-time">{formatTime(currentTime)}</div>
          <div className="login-date">{formatDate(currentTime)}</div>
        </div>
      </div>

      {/* Login card */}
      <div className="login-card">
        {step === 'username' ? (
          <form onSubmit={handleUsernameSubmit} className="login-form">
            <div className="login-avatar">
              <User size={48} />
            </div>
            <h2 className="login-title">Welcome</h2>
            <p className="login-subtitle">Enter your username to continue</p>
            
            <div className="login-input-group">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="login-input"
                autoFocus
                autoComplete="username"
              />
            </div>

            <button type="submit" className="login-button" disabled={!username.trim()}>
              <span>Next</span>
              <ArrowRight size={16} />
            </button>

            <div className="login-options">
              <button type="button" className="login-link">
                Sign-in options
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handlePasswordSubmit} className="login-form">
            <div className="login-avatar">
              <User size={48} />
            </div>
            <h2 className="login-title">{username}</h2>
            <p className="login-subtitle">Enter your password</p>
            
            <div className="login-input-group">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="login-input"
                autoFocus
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="login-input-toggle"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error && <div className="login-error">{error}</div>}

            <button 
              type="submit" 
              className="login-button" 
              disabled={!password.trim() || isLoading}
            >
              {isLoading ? (
                <div className="login-spinner"></div>
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <div className="login-options">
              <button type="button" onClick={handleBack} className="login-link">
                Back
              </button>
              <button type="button" className="login-link">
                I forgot my password
              </button>
            </div>
          </form>
        )}
      </div>

    </div>
  )
}

export default LoginScreen
