import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { PfProvider } from './context/Context.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PfProvider>
      <App />
    </PfProvider>
  </StrictMode>
)
