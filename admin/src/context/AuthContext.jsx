import { createContext, useEffect, useReducer } from 'react';
import { loginRequest } from '../services/authService.js';

// eslint-disable-next-line react-refresh/only-export-components -- context and provider are intentionally co-located
export const AuthContext = createContext(null);

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, ...action.payload, isLoading: false };
    case 'LOGIN':
      return { ...state, user: action.payload.user, token: action.payload.token, isAuthenticated: true };
    case 'LOGOUT':
      return { ...state, user: null, token: null, isAuthenticated: false };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      try {
        dispatch({
          type: 'HYDRATE',
          payload: { token, user: JSON.parse(storedUser), isAuthenticated: true },
        });
        return;
      } catch {
        // Corrupted session — fall through and reset to anonymous below.
      }
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    dispatch({ type: 'HYDRATE', payload: {} });
  }, []);

  async function login(username, password) {
    const data = await loginRequest(username, password);
    const user = { username: data.username, fullName: data.fullName, role: data.role };
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(user));
    dispatch({ type: 'LOGIN', payload: { user, token: data.token } });
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    dispatch({ type: 'LOGOUT' });
  }

  return <AuthContext.Provider value={{ ...state, login, logout }}>{children}</AuthContext.Provider>;
}
