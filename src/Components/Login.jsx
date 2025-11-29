import { useState } from 'react';
import { AiOutlineLogin, AiOutlineUserAdd } from 'react-icons/ai';
import './Login.css';

export default function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onLogin(email, password, isRegister);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Left Side - Branding */}
      <div className="login-left">
        <div className="login-logo-large">🧠</div>
        <h1 className="login-brand-title">MindDock</h1>
        <p className="login-brand-subtitle">
          Your AI-Powered Personal Organizer
        </p>

        <div className="login-features">
          <div className="feature-item">
            <span className="feature-icon">🗺️</span>
            <span className="feature-text">AI Mind Mapping</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">✅</span>
            <span className="feature-text">Smart Tasks</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🎯</span>
            <span className="feature-text">Goal Tracking</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🎙️</span>
            <span className="feature-text">Voice Control</span>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="login-right">
        <div className="login-card">
          <div className="login-header">
            <h2>{isRegister ? 'Create Account' : 'Welcome Back'}</h2>
            <p>{isRegister ? 'Join MindDock today' : 'Sign in to continue'}</p>
          </div>

          <div className="auth-tabs">
            <button 
              className={!isRegister ? 'active' : ''} 
              onClick={() => setIsRegister(false)}
              type="button"
            >
              <AiOutlineLogin /> Login
            </button>
            <button 
              className={isRegister ? 'active' : ''} 
              onClick={() => setIsRegister(true)}
              type="button"
            >
              <AiOutlineUserAdd /> Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isRegister ? 'Choose a strong password' : 'Your password'}
                required
                minLength={6}
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? '⏳ Please wait...' : (isRegister ? '🚀 Create Account' : '🔓 Sign In')}
            </button>
          </form>

          <div className="features-preview">
            <h3>🌟 What you'll get:</h3>
            <ul>
              <li>🗺️ AI-powered mind mapping</li>
              <li>✅ Smart task management</li>
              <li>🎯 Goal tracking</li>
              <li>🎙️ Voice assistant</li>
              <li>📖 Personal journal</li>
              <li>🔔 Smart reminders</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
