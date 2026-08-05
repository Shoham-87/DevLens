import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';
import LoginPage from '../pages/Login/LoginPage.jsx';
import DashboardPage from '../pages/Dashboard/DashboardPage.jsx';
import ReposPage from '../pages/Repos/ReposPage.jsx';
import RepoDetailPage from '../pages/RepoDetail/RepoDetailPage.jsx';
import { ROUTES } from '../constants/index.js';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to={ROUTES.LOGIN} replace />,
  },
  {
    path: ROUTES.LOGIN,
    element: <LoginPage />,
  },
  {
    path: ROUTES.DASHBOARD,
    element: (
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: ROUTES.REPOS,
    element: (
      <ProtectedRoute>
        <ReposPage />
      </ProtectedRoute>
    ),
  },
  {
    path: ROUTES.REPO_DETAIL(':repoId'),
    element: (
      <ProtectedRoute>
        <RepoDetailPage />
      </ProtectedRoute>
    ),
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
