import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import '@fontsource/poppins/800.css';
import './styles/global.css';

const root = document.getElementById('root');
if (!root) throw new Error('Application root is missing.');
createRoot(root).render(<StrictMode><App /></StrictMode>);
