import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initLogRocket } from './lib/logrocket/init'

// Initialize LogRocket as early as possible to capture all session data
initLogRocket();

createRoot(document.getElementById("root")!).render(<App />);
