/**
 * AuthContext — Supabase oturum durumunu tüm uygulamaya sağlar.
 * onAuthStateChange ile otomatik güncellenir.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabase';

interface AuthContextValue {
  session:  Session | null;
  user:     User    | null;
  loading:  boolean;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user:    null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession]   = useState<Session | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    // İlk açılışta mevcut session'ı al
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Session değişikliklerini dinle (login / logout / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
