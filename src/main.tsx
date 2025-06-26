import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import "./main.css"
import "./styles/theme.css"
import "./index.css"
import "@github/spark/spark"

createRoot(document.getElementById('root')!).render(
    <App />
)
