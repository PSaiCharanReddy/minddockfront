import { useState, useEffect } from 'react';
import AppWrapper from './App';
import Login from './Components/Login';
import apiClient from './api';

export default function AuthWrapper() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user has a valid token on mount
    const checkAuth = async () => {
      const token = localStorage.getItem('minddock_token');
      
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        // Verify token is still valid
        await apiClient.get('/auth/me');
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Token verification failed:', error);
        localStorage.removeItem('minddock_token');
        localStorage.removeItem('minddock_user');
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = async (email, password, isRegister) => {
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      
      let response;
      if (isRegister) {
        response = await apiClient.post(endpoint, { email, password });
      } else {
        // Login uses OAuth2PasswordRequestForm format
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);
        
        response = await apiClient.post(endpoint, formData, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });
      }

      const { access_token } = response.data;
      
      // Store token
      localStorage.setItem('minddock_token', access_token);
      localStorage.setItem('minddock_user', email);
      
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Authentication error:', error);
      const message = error.response?.data?.detail || 'Authentication failed';
      throw new Error(message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('minddock_token');
    localStorage.removeItem('minddock_user');
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#1a1a1a',
        color: '#fff',
        fontSize: '18px'
      }}>
        Loading MindDock...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return <AppWrapper onLogout={handleLogout} />;
}
