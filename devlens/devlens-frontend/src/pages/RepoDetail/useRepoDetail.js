import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getRepoDetail, getRepoStatus } from '../../services/repoService.js';
import { REPO_STATUS, STATUS_POLL_INTERVAL_MS } from '../../constants/index.js';

export default function useRepoDetail() {
  const { repoId } = useParams();
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

  const handleDisconnect = useCallback(() => {
    setToast('Disconnect feature coming soon.');
    setTimeout(() => setToast(null), 3000);
  }, []);

  return { repo, status, isLoading, error, toast, handleDisconnect };
}
