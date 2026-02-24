import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App' // This points to src/App.jsx
import './index.css'   // This pulls in our new full-screen CSS

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)