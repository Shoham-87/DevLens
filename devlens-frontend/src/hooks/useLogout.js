import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { logout as logoutRequest } from '../services/authService.js';
import { ROUTES } from '../constants/index.js';

export default function useLogout() {
  const { refreshToken, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logoutRequest(refreshToken);
    } catch {
      // Session is cleared client-side regardless of API failure.
    } finally {
      logout();
      setIsLoggingOut(false);
      navigate(ROUTES.LOGIN, { replace: true });
    }
  }

  return { handleLogout, isLoggingOut };
}
