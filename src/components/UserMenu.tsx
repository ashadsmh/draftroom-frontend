import React, { useState, useRef, useEffect } from 'react';
import { User } from 'firebase/auth';
import { LogOut, X } from 'lucide-react';

interface UserMenuProps {
  user: User;
  onSignOut: () => void;
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-purple-600',
    'bg-indigo-600',
    'bg-emerald-600',
    'bg-amber-600',
    'bg-rose-600',
    'bg-sky-600',
    'bg-teal-600',
    'bg-orange-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function UserMenu({ user, onSignOut }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const displayName = user.displayName || user.email || 'User';
  const initials = getInitials(displayName);
  const avatarColor = getAvatarColor(displayName);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSignOutClick = () => {
    setIsOpen(false);
    setShowConfirm(true);
  };

  const handleConfirmSignOut = () => {
    setShowConfirm(false);
    onSignOut();
  };

  return (
    <>
      {/* Avatar button */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen(prev => !prev)}
          className={`w-8 h-8 rounded-full ${avatarColor} flex items-center justify-center text-white text-xs font-bold transition-opacity hover:opacity-80`}
        >
          {initials}
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute left-1/2 transform -translate-x-1/2 top-full mt-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800">
              <div className="text-sm font-semibold text-slate-100 truncate">{displayName}</div>
              <div className="text-xs text-slate-500 truncate mt-0.5">{user.email}</div>
            </div>
            <button
              onClick={handleSignOutClick}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-rose-400 hover:bg-rose-400/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        )}
      </div>

      {/* Sign out confirmation modal */}
      {showConfirm && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 p-4">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-base font-bold text-slate-100">Sign out of DraftRoom?</h3>
              <button
                onClick={() => setShowConfirm(false)}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-slate-400 mb-6">
              Your watchlist and saved teams are synced to your account and will be here when you return.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSignOut}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors"
              >
                Sign out
              </button>
            </div>
        </div>
      )}
    </>
  );
}