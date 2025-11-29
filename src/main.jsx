import React from 'react'
import ReactDOM from 'react-dom/client'
import AuthWrapper from './AuthWrapper' // Use AuthWrapper instead of AppWrapper
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthWrapper />
  </React.StrictMode>,
)
