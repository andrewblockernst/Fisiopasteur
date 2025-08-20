'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AuthState } from '@/lib/actions/perfil.action';

export function useAuth(): AuthState {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null
  });

  useEffect(() => {
    const supabase = createClient();

    // Verificar estado inicial
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      setAuthState({
        isAuthenticated: !!user,
        user: user ? { id: user.id, email: user.email || '' } : null
      });
    };

    checkAuth();

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setAuthState({
          isAuthenticated: !!session?.user,
          user: session?.user 
            ? { id: session.user.id, email: session.user.email || '' }
            : null
        });
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return authState;
}