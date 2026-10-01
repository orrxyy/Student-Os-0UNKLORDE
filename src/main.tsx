import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { StoreProvider } from './lib/store'
import { ThemeProvider } from './lib/theme'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StoreProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </StoreProvider>
  </React.StrictMode>,
)
