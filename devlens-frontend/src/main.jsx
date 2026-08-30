import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/variables.css';
import './styles/bootstrap-overrides.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import AppRouter from './router/AppRouter.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
