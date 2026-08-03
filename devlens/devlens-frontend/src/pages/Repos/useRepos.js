import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGithubRepos, connectRepo } from '../../services/repoService.js';
import { ROUTES } from '../../constants/index.js';

export default function useRepos() {
  const navigate = useNavigate();
  const [repos, setRepos]                   = useState([]);
  const [isLoading, setIsLoading]           = useState(true);
  const [isConnecting, setIsConnecting]     = useState(false);
  const [error, setError]                   = useState(null);
  const [selectedRepoId, setSelectedRepoId] = useState(null);
  const [searchQuery, setSearchQuery]       = useState('');
  const [languageFilter, setLanguageFilter] = useState('All');

  useEffect(() => {
    getGithubRepos()
      .then(setRepos)
      .catch(() => setError('Failed to load repositories.'))
      .finally(() => setIsLoading(false));
  }, []);

  const availableLanguages = useMemo(() => {
    const langs = repos
      .map((r) => r.language)
      .filter(Boolean);
    return ['All', ...Array.from(new Set(langs)).sort()];
  }, [repos]);

  const filteredRepos = useMemo(() => {
    return repos.filter((r) => {
      const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLang   = languageFilter === 'All' || r.language === languageFilter;
      return matchesSearch && matchesLang;
    });
  }, [repos, searchQuery, languageFilter]);

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  const handleLanguageFilter = useCallback((lang) => {
    setLanguageFilter(lang);
  }, []);

  const handleSelectRepo = useCallback((id) => {
    setSelectedRepoId((prev) => (prev === id ? null : id));
  }, []);

  const handleConnect = useCallback(async () => {
    if (!selectedRepoId) return;

    const repo = repos.find((r) => r.id === selectedRepoId);
    if (!repo) return;

    setIsConnecting(true);
    setError(null);

    try {
      const result = await connectRepo(selectedRepoId, {
        repoName: repo.name,
        repoUrl:  `https://github.com/${repo.name}`,
      });
      navigate(ROUTES.REPO_DETAIL(result.connectedRepoId));
    } catch {
      setError('Failed to connect repository. Please try again.');
      setIsConnecting(false);
    }
  }, [selectedRepoId, repos, navigate]);

  return {
    filteredRepos,
    availableLanguages,
    isLoading,
    isConnecting,
    error,
    selectedRepoId,
    searchQuery,
    languageFilter,
    handleSearch,
    handleLanguageFilter,
    handleSelectRepo,
    handleConnect,
  };
}
