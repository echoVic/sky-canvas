import React from 'react'
import ReactDOM from 'react-dom/client'
import { HeroUIProvider } from '@heroui/react'
import { CanvasProvider } from './contexts'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HeroUIProvider>
      <CanvasProvider>
        <App />
      </CanvasProvider>
    </HeroUIProvider>
  </React.StrictMode>,
)