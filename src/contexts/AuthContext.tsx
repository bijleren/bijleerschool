import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const ensureProfileExists = async (user: User) => {
    try {
      // Check if profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!existingProfile) {
        // Profile doesn't exist, create it
        const { error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email!,
            first_name: user.user_metadata?.first_name || '',
            last_name: user.user_metadata?.last_name || '',
          });

        if (createError) {
          console.error('Error creating profile:', createError);
          // Don't throw error, just log it to prevent infinite loop
          return;
        }
      }
    } catch (error) {
      console.error('Error ensuring profile exists:', error);
      // Don't throw error, just log it to prevent infinite loop
    }
  };

  useEffect(() => {
    // Check for recovery/reset password tokens in URL
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const type = hashParams.get('type');

    if (type === 'recovery' && accessToken) {
      console.log('Recovery token detected in URL, Supabase will handle session establishment');
    }

    // Get initial session (will automatically detect and process URL tokens)
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting session:', error);
      }

      console.log('Initial session check:', {
        hasSession: !!session,
        hasError: !!error,
        userId: session?.user?.id
      });

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Ensure profile exists after setting user state
      if (session?.user) {
        ensureProfileExists(session.user);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);

        // Handle password recovery
        if (event === 'PASSWORD_RECOVERY') {
          console.log('Password recovery event detected');
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
          return;
        }

        // Handle signed out or invalid session
        if (event === 'SIGNED_OUT' || !session) {
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }

        // Handle token refresh
        if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed successfully');
        }

        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Ensure profile exists after setting user state
        if (session?.user) {
          ensureProfileExists(session.user);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });

    // If signup was successful, create the user profile
    if (data.user && !error) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email: data.user.email!,
          first_name: firstName,
          last_name: lastName,
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
        return { error: profileError };
      }
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      // Handle specific session_not_found error - this is not critical
      if (error && error.message?.includes('session_not_found')) {
        console.warn('Session was already invalidated on server, proceeding with client-side cleanup');
      } else if (error) {
        throw error;
      }
    } catch (error) {
      // For other errors, log warning but don't block logout
      console.warn('Server-side logout failed, clearing client session:', error);
    } finally {
      // Force clear client-side session data
      setUser(null);
      setSession(null);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      console.log('Sending reset password email with redirect:', redirectUrl);

      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        console.error('Reset password error:', error);
        return { error };
      }

      console.log('Reset password email sent successfully');
      return { error: null };
    } catch (err: any) {
      console.error('Reset password exception:', err);
      return { error: err };
    }
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    return { error };
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}