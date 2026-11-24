import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { disconnectRepo, getRepoDetail, getRepoStatus } from '../../services/repoService.js';
import { REPO_STATUS, ROUTES, STATUS_POLL_INTERVAL_MS } from '../../constants/index.js';

export default function useRepoDetail() {
  const { repoId } = useParams();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [repo, setRepo]         = useState(null);
  const [status, setStatus]     = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]       = useState(null);
  const [toast, setToast]       = useState(null);

  useEffect(() => {
    getRepoDetail(repoId)
      .then(setRepo)
      .catch(() => setError('Failed to load repository details.'))
      .finally(() => setIsLoading(false));
  }, [repoId]);

  useEffect(() => {
    if (!repoId) return;

    function fetchStatus() {
      getRepoStatus(repoId)
        .then(setStatus)
        .catch(() => {});
    }

    fetchStatus();

    const interval = setInterval(() => {
      setStatus((prev) => {
        if (
          prev?.status === REPO_STATUS.READY ||
          prev?.status === REPO_STATUS.FAILED
        ) {
          clearInterval(interval);
          return prev;
        }
        return prev;
      });
      fetchStatus();
    }, STATUS_POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [repoId]);

  useEffect(() => {
    if (
      status?.status === REPO_STATUS.READY ||
      status?.status === REPO_STATUS.FAILED
    ) {
      // polling will be stopped on next interval tick
    }
  }, [status]);

  const showToast = useCallback((message) => {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  }, []);

  const requestDisconnect = useCallback(() => setConfirmOpen(true), []);

  const cancelDisconnect = useCallback(() => {
    if (!isDisconnecting) setConfirmOpen(false);
  }, [isDisconnecting]);

  const handleDisconnect = useCallback(async () => {
    setIsDisconnecting(true);
    try {
      await disconnectRepo(repoId);
      navigate(ROUTES.DASHBOARD, { replace: true });
    } catch (err) {
      const message = typeof err.response?.data === 'string' && err.response.data
        ? err.response.data
        : 'Failed to disconnect the repository. Please try again.';
      setIsDisconnecting(false);
      setConfirmOpen(false);
      showToast(message);
    }
  }, [repoId, navigate, showToast]);

  return {
    repo, status, isLoading, error, toast,
    confirmOpen, isDisconnecting, requestDisconnect, cancelDisconnect, handleDisconnect,
  };
}
