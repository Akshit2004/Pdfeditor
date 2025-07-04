import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { FaPalette, FaDesktop } from 'react-icons/fa';

const ThemeSwitcher = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="theme-switcher"
      title={`Switch to ${theme === 'rich' ? 'Minimal' : 'Rich'} Theme`}
    >
      {theme === 'rich' ? (
        <>
          <FaDesktop className="theme-icon" />
          <span>Minimal</span>
        </>
      ) : (
        <>
          <FaPalette className="theme-icon" />
          <span>Rich</span>
        </>
      )}
    </button>
  );
};

export default ThemeSwitcher;