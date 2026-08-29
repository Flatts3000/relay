import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, GroupKeyProvider } from './contexts';
import App from './App';
import './i18n'; // Initialize i18n
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <GroupKeyProvider>
          <App />
        </GroupKeyProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
