import { useState, useEffect } from 'react'
import { Eye, EyeOff, ArrowRight, ArrowLeft } from 'lucide-react'
import { Login, Signup, CheckSignupUsername } from '../api/auth'

function LoginScreen({ onLogin, isSignupMode = false, signupToken = null }) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState('username') // 'username' or 'password' or 'signup-details'
  
  // Signup-specific state
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordMatch, setPasswordMatch] = useState(true);
  const [isValidToken, setIsValidToken] = useState(null);

  useEffect(() => {
    if(isSignupMode && isValidToken === null) {
      CheckSignupUsername({ token: signupToken, username: 'test' })
      .then(result => {
        if(result.success || result.reason === 409)
          setIsValidToken(true)
        else {
          setIsValidToken(false)
          setError('signup link invalid')
        }
      });
    }
  }, [signupToken])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Password confirmation validation
  useEffect(() => {
    if (isSignupMode && confirmPassword) {
      setPasswordMatch(password === confirmPassword)
    }
  }, [password, confirmPassword, isSignupMode])

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

  const getTimeBasedGreeting = () => {
    const hour = currentTime.getHours()
    
    if (hour >= 5 && hour < 12) {
      return 'Good Morning'
    } else if (hour >= 12 && hour < 17) {
      return 'Good Afternoon'
    } else if (hour >= 17 && hour < 21) {
      return 'Good Evening'
    } else {
      return 'Good Night'
    }
  }

  const handleUsernameSubmit = (e) => {
    e.preventDefault()
    if (!username.trim()) return
    if(isSignupMode) {
      CheckSignupUsername({ token: signupToken, username: username })
        .then(result => {
          if(result.success) {
            setStep('signup-details')
            setError('')
          } else {
            setError(result.message || 'failed to validate username')
          }
        });
    } else {
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
      const login = await Login({ username: username, password: password })
      if (login.authorized) {
        // Add fade out animation before transitioning
        document.querySelector('.login-screen').style.animation = 'fadeOut 0.8s ease-out forwards'
        await new Promise(resolve => setTimeout(resolve, 800))
        
        onLogin({
          username: username,
          loginTime: new Date().toISOString()
        })
      } else {
        setError('Incorrect username/password')
        setIsLoading(false)
      }
    }
  }

  const handleSignupSubmit = async (e) => {
    e.preventDefault()
    
    // Validation
    if (!password.trim() || !confirmPassword.trim()) {
      setError('Please fill in all fields')
      return
    }
    
    if (!passwordMatch) {
      setError('Passwords do not match')
      return
    }
    
    setIsLoading(true)
    setError('')
    
    try {
      const signupResult = await Signup({
        token: signupToken,
        username: username.trim(),
        password: password
      })
      
      if (signupResult.success) {
        // Add fade out animation before transitioning
        document.querySelector('.login-screen').style.animation = 'fadeOut 0.8s ease-out forwards'
        await new Promise(resolve => setTimeout(resolve, 800))
        
        onLogin({
          username: username,
          loginTime: new Date().toISOString()
        })
      } else {
        setError(signupResult.message || 'Signup failed. Please try again.')
        setIsLoading(false)
      }
    } catch {
      setError('Network error. Please try again.')
      setIsLoading(false)
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
            <div className="login-logo">
              <img src="/logo_full.png" alt="Logo" />
            </div>
            <h2 className="login-title">{getTimeBasedGreeting()}</h2>
            <p className="login-subtitle">{isSignupMode ? 'Choose a username for your account' : 'Enter your username to continue'}</p>
            
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

            {error && <div className="login-error">{error}</div>}

            <button type="submit" className="login-button" disabled={!username.trim()}>
              <span>Next</span>
              <ArrowRight size={16} />
            </button>
          </form>
        ) : step === 'password' ? (
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
              <span>Sign in</span>
              <ArrowRight size={16} />
            </button>
            
            {isLoading && (
              <div className="login-loading-overlay">
                <div className="login-spinner"></div>
              </div>
            )}

          </form>
        ) : (
          <form onSubmit={handleSignupSubmit} className="login-form">
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
            <h2 className="login-title">{username}</h2>
            <p className="login-subtitle">Create your password</p>
            
            <div className="login-input-group">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="login-input"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="login-input-toggle"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="login-input-group">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className={`login-input ${confirmPassword && !passwordMatch ? 'login-input-error' : ''}`}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="login-input-toggle"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {confirmPassword && !passwordMatch && (
              <div className="login-error">Passwords do not match</div>
            )}

            {error && <div className="login-error">{error}</div>}

            <button 
              type="submit" 
              className="login-button" 
              disabled={!password.trim() || !confirmPassword.trim() || !passwordMatch || isLoading}
            >
              <span>Create Account</span>
              <ArrowRight size={16} />
            </button>
            
            {isLoading && (
              <div className="login-loading-overlay">
                <div className="login-spinner"></div>
              </div>
            )}

          </form>
        )}
      </div>

    </div>
  )
}

export default LoginScreen
