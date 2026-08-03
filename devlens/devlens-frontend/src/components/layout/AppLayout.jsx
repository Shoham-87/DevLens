import React from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import Sidebar from './Sidebar.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import './AppLayout.css';

export default function AppLayout({ children, connectedRepos }) {
  const { user } = useAuth();
  const { pathname } = useLocation();

  return (
    <div className="dl-layout">
      <Navbar user={user} />
      <div className="dl-layout__body d-flex">
        <Sidebar connectedRepos={connectedRepos} activeRoute={pathname} />
        <main className="dl-layout__main flex-grow-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
