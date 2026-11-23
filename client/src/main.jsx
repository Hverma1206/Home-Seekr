import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        {/* Short default animations everywhere; visitors who ask the OS for reduced motion get none */}
        <MotionConfig reducedMotion="user" transition={{ duration: 0.2, ease: 'easeOut' }}>
          <App />
        </MotionConfig>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
