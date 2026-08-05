import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getConnectedRepos } from '../../services/repoService.js';
import { ROUTES } from '../../constants/index.js';

export default function useDashboard() {
  const navigate = useNavigate();
  const [connectedRepos, setConnectedRepos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState(null);

  useEffect(() => {
    getConnectedRepos()
      .then(setConnectedRepos)
      .catch(() => setError('Failed to load repositories.'))
      .finally(() => setIsLoading(false));
  }, []);

  const handleConnectRepo = useCallback(() => {
    navigate(ROUTES.REPOS);
  }, [navigate]);

  const handleRepoClick = useCallback((repoId) => {
    navigate(ROUTES.REPO_DETAIL(repoId));
  }, [navigate]);

  return { connectedRepos, isLoading, error, handleConnectRepo, handleRepoClick };
}
