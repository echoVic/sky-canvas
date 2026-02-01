import { HeroUIProvider } from '@heroui/react'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { CanvasProvider } from './contexts'
import './index.css'

const root = document.getElementById('root')
if (!root) {
  throw new Error('Root element not found')
}
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <HeroUIProvider>
      <CanvasProvider>
        <App />
      </CanvasProvider>
    </HeroUIProvider>
  </React.StrictMode>
)
