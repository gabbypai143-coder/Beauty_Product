import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('jammailavskin_token') || '');
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('isAdminLoggedIn') === 'true');

  useEffect(() => {
    if (token && isAdmin) {
      localStorage.setItem('jammailavskin_token', token);
      localStorage.setItem('isAdminLoggedIn', 'true');
    } else {
      localStorage.removeItem('jammailavskin_token');
      localStorage.removeItem('isAdminLoggedIn');
    }
  }, [token, isAdmin]);

  const login = (authToken) => {
    setToken(authToken);
    setIsAdmin(true);
    localStorage.setItem('jammailavskin_token', authToken);
    localStorage.setItem('isAdminLoggedIn', 'true');
    window.name = `jammailavskin_basic:${authToken}`;
  };

  const logout = () => {
    setToken('');
    setIsAdmin(false);
    localStorage.removeItem('jammailavskin_token');
    localStorage.removeItem('isAdminLoggedIn');
  };

  const getAuthHeaders = () => {
    if (!token) return {};
    return {
      Authorization: `Basic ${token}`,
    };
  };

  return (
    <AuthContext.Provider value={{ token, isAdmin, login, logout, getAuthHeaders }}>
      {children}
    </AuthContext.Provider>
  );
};
