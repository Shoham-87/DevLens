export const REPO_STATUS = {
  PENDING:  'PENDING',
  INDEXING: 'INDEXING',
  READY:    'READY',
  FAILED:   'FAILED',
};

export const STATUS_POLL_INTERVAL_MS = 3000;

export const ROUTES = {
  LOGIN:      '/devlens/login',
  DASHBOARD:  '/devlens/dashboard',
  REPOS:      '/devlens/repos',
  REPO_DETAIL: (id) => `/devlens/repos/${id}`,
};

export const PAGINATION = {
  DEFAULT_PAGE:     1,
  DEFAULT_PER_PAGE: 20,
};
