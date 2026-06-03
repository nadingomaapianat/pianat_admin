import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { getToken } from '../services/apiClient';

/**
 * Lightweight tenant context for the admin app. Unlike the customer app it
 * does not fetch /tenant/me or support view-as — the admin's identity comes
 * straight from the JWT (the operator's own platform_operator tenant).
 */
interface JwtClaims {
  id?: string;
  name?: string;
  username?: string;
  tenantId?: string;
  archetype?: string;
}

export interface CurrentTenant {
  id: string | null;
  name: string | null;
  archetype: string | null;
  username: string | null;
}

interface TenantContextValue {
  currentTenant: CurrentTenant | null;
  isLoading: boolean;
  refresh: () => void;
}

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

function decode(): CurrentTenant | null {
  const token = getToken();
  if (!token) return null;
  try {
    const c = jwtDecode<JwtClaims>(token);
    return {
      id: c.tenantId ?? null,
      name: c.name ?? c.username ?? null,
      archetype: c.archetype ?? null,
      username: c.username ?? null,
    };
  } catch {
    return null;
  }
}

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [version, setVersion] = useState(0);
  const currentTenant = useMemo(() => decode(), [version]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(false);
    const onAuth = () => setVersion((v) => v + 1);
    window.addEventListener('pa:auth-changed', onAuth);
    window.addEventListener('storage', onAuth);
    return () => {
      window.removeEventListener('pa:auth-changed', onAuth);
      window.removeEventListener('storage', onAuth);
    };
  }, []);

  return (
    <TenantContext.Provider value={{ currentTenant, isLoading, refresh: () => setVersion((v) => v + 1) }}>
      {children}
    </TenantContext.Provider>
  );
};

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be used inside <TenantProvider>');
  return ctx;
}
