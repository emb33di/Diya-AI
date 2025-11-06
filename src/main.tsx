import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// LogRocket is now initialized only for authenticated users via LogRocketUserTracker
// This prevents recording interactions on public pages like landing page and sign-in

createRoot(document.getElementById("root")!).render(<App />);
