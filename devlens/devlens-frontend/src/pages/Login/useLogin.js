import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { fetchProfile } from '../../services/authService.js';
import { setAuthToken } from '../../services/api.js';
import { ROUTES } from '../../constants/index.js';

export default function useLogin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(ROUTES.DASHBOARD, { replace: true });
      return;
    }

    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    if (!accessToken || !refreshToken) return;

    setIsLoading(true);
    setError(null);
    setAuthToken(accessToken);

    fetchProfile()
      .then((user) => {
        login(accessToken, refreshToken, user);
        navigate(ROUTES.DASHBOARD, { replace: true });
      })
      .catch(() => {
        setError('Authentication failed. Please try again.');
        setIsLoading(false);
      });
  }, []);

  function handleGitHubLogin() {
    window.location.href = `${import.meta.env.VITE_API_BASE_URL}/oauth2/authorization/github`;
  }

  return { isLoading, error, handleGitHubLogin };
}
