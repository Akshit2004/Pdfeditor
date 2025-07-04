import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Get theme from localStorage or default to 'rich' (current theme)
    const savedTheme = localStorage.getItem('pdfeditor-theme');
    return savedTheme || 'rich';
  });

  useEffect(() => {
    // Save theme to localStorage
    localStorage.setItem('pdfeditor-theme', theme);
    
    // Apply theme to document body
    document.body.className = theme === 'minimal' ? 'theme-minimal' : 'theme-rich';
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'rich' ? 'minimal' : 'rich');
  };

  const value = {
    theme,
    setTheme,
    toggleTheme,
    isMinimal: theme === 'minimal',
    isRich: theme === 'rich'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};