import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Agent, Permission } from '../types';
import { permissionAPI } from '../services/api';

interface AuthContextType {
  agent: Agent | null;
  token: string | null;
  permissions: Permission['permissions'] | null;
  login: (token: string, agent: Agent) => void;
  logout: () => void;
  updateAgent: (agent: Agent) => void;
  checkPermission: (permission: string) => boolean;
  isAuthenticated: boolean;
  isApproved: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Permission['permissions'] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('token');
      const savedAgent = localStorage.getItem('agent');

      if (savedToken && savedAgent) {
        try {
          const parsedAgent = JSON.parse(savedAgent);
          setToken(savedToken);
          setAgent(parsedAgent);

          // Fetch permissions if we have an agent
          if (parsedAgent.role) {
            try {
              const res = await permissionAPI.getByRole(parsedAgent.role);
              // Handle response structure depending on API - assuming data returns the Permission doc
              const permData = res.data?.data || res.data;
              if (permData?.permissions) {
                setPermissions(permData.permissions);
              }
            } catch (e) {
              console.error('Failed to fetch permissions', e);
            }
          }
        } catch {
          localStorage.removeItem('token');
          localStorage.removeItem('agent');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (newToken: string, newAgent: Agent) => {
    setToken(newToken);
    setAgent(newAgent);
    localStorage.setItem('token', newToken);
    localStorage.setItem('agent', JSON.stringify(newAgent));

    // Fetch permissions on login
    if (newAgent.role) {
      try {
        const res = await permissionAPI.getByRole(newAgent.role);
        const permData = res.data?.data || res.data;
        if (permData?.permissions) {
          setPermissions(permData.permissions);
        }
      } catch (e) {
        console.error('Failed to fetch permissions', e);
      }
    }
  };

  const logout = () => {
    setToken(null);
    setAgent(null);
    setPermissions(null);
    localStorage.removeItem('token');
    localStorage.removeItem('agent');
  };

  const updateAgent = (updatedAgent: Agent) => {
    setAgent(updatedAgent);
    localStorage.setItem('agent', JSON.stringify(updatedAgent));
    // Optionally refetch permissions if role changed, though typically role change requires re-login or explicit refresh
  };

  const checkPermission = (permission: string): boolean => {
    if (!agent) return false;
    if (agent.role === 'super_admin') return true; // Super admin usually has all
    if (!permissions) return false;
    return !!permissions[permission];
  };

  const isApproved = agent?.isActive === true;

  return (
    <AuthContext.Provider value={{
      agent,
      token,
      permissions,
      login,
      logout,
      updateAgent,
      checkPermission,
      isAuthenticated: !!token,
      isApproved,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
