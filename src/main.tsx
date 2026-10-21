// Sentry först, så att fel redan under uppstarten kommer med.
import { reactErrorHandler } from './sentry'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Egna hanterare ersätter Reacts loggning, så felet skrivs ut även här.
const logged = (error: unknown) => console.error(error)

createRoot(document.getElementById('root')!, {
  onUncaughtError: reactErrorHandler(logged),
  onCaughtError: reactErrorHandler(logged),
  onRecoverableError: reactErrorHandler(logged),
}).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
