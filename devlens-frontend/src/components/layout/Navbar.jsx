import React from 'react';
import ThemeToggle from '../ThemeToggle.jsx';
import ProfileMenu from './ProfileMenu.jsx';
import './Navbar.css';

export default function Navbar({ user }) {
  return (
    <header className="dl-navbar d-flex align-items-center justify-content-between px-4">
      <div className="dl-navbar__logo d-flex align-items-center gap-2">
        <span className="dl-navbar__logo-icon" aria-hidden="true">◎</span>
        <span className="dl-navbar__logo-text">DevLens</span>
      </div>

      <div className="dl-navbar__right d-flex align-items-center gap-3">
        <ThemeToggle />
        {user && <ProfileMenu user={user} />}
      </div>
    </header>
  );
}
