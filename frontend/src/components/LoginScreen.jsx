import { useState, useEffect } from 'react'
import { Eye, EyeOff, ArrowRight, ArrowLeft } from 'lucide-react'
import { Login } from '../api/auth'

function LoginScreen({ onLogin }) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState('email') // 'email' or 'password'

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

  const handleEmailSubmit = (e) => {
    e.preventDefault()
    if (email.trim()) {
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
      const login = await Login({ email: email, pwd: password })
      if (login.authorized) {
        // Add fade out animation before transitioning
        document.querySelector('.login-screen').style.animation = 'fadeOut 0.8s ease-out forwards'
        await new Promise(resolve => setTimeout(resolve, 800))
        
        onLogin({
          username: email || 'User',
          loginTime: new Date().toISOString()
        })
      } else {
        setError('Incorrect email/password')
        setIsLoading(false)
      }
    }
  }

  const handleBack = () => {
    setStep('email')
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
        {step === 'email' ? (
          <form onSubmit={handleEmailSubmit} className="login-form">
            <div className="login-logo">
              <img src="/logo_full.png" alt="Logo" />
            </div>
            <h2 className="login-title">Welcome</h2>
            <p className="login-subtitle">Enter your email to continue</p>
            
            <div className="login-input-group">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="login-input"
                autoFocus
                autoComplete="email"
              />
            </div>

            <button type="submit" className="login-button" disabled={!email.trim()}>
              <span>Next</span>
              <ArrowRight size={16} />
            </button>
          </form>
        ) : (
          <form onSubmit={handlePasswordSubmit} className="login-form">
            <button 
              type="button" 
              onClick={handleBack} 
              className="login-back-arrow"
              aria-label="Go back"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="login-logo">
              <img src="/logo_full.png" alt="Logo" />
            </div>
            <h2 className="login-title">{email}</h2>
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

          </form>
        )}
      </div>

    </div>
  )
}

export default LoginScreen
