import React, { useEffect, useRef, useState } from 'react';
import useLogout from '../../hooks/useLogout.js';
import './ProfileMenu.css';

export default function ProfileMenu({ user }) {
  const { handleLogout, isLoggingOut } = useLogout();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    function onPointerDown(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="dl-profile-menu" ref={menuRef}>
      <button
        type="button"
        className="dl-profile-menu__trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <img
          src={user.avatarUrl}
          alt={`${user.displayName} avatar`}
          className="dl-navbar__avatar"
        />
        <span className="dl-navbar__username">{user.displayName || user.githubUsername}</span>
        <span className="dl-profile-menu__caret" aria-hidden="true">▾</span>
      </button>

      {isOpen && (
        <div className="dl-profile-menu__panel" role="menu">
          <div className="dl-profile-menu__meta">
            <div className="dl-profile-menu__name">{user.displayName || user.githubUsername}</div>
            {user.githubUsername && (
              <div className="dl-profile-menu__handle">@{user.githubUsername}</div>
            )}
          </div>
          <div className="dl-profile-menu__divider" />
          <button
            type="button"
            role="menuitem"
            className="dl-profile-menu__item dl-profile-menu__item--danger"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? 'Signing out…' : 'Log out'}
          </button>
        </div>
      )}
    </div>
  );
}
