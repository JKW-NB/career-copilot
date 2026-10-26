import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import WorkspaceApp from './app/WorkspaceApp';
import { isTauri } from '@tauri-apps/api/core';
import './app/styles.css';
import './app/readability.css';

const personal = isTauri() || window.location.pathname === '/workspace';
createRoot(document.getElementById('root')!).render(<StrictMode>{personal ? <WorkspaceApp /> : <App />}</StrictMode>);
