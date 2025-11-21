import React from 'react'
import ReactDOM from 'react-dom/client'
import AppWrapper from './App' // <-- Import the new AppWrapper
import './index.css' // You can delete index.css if you want

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppWrapper /> {/* <-- Render AppWrapper */}
  </React.StrictMode>,
)