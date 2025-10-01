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
    // Get initial session with error handling
    const initializeSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        // Handle refresh token errors
        if (error && error.message?.includes('refresh_token_not_found')) {
          console.warn('Refresh token not found, clearing session');
          await signOut();
          return;
        }
        
        if (error) {
          console.error('Session initialization error:', error);
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Ensure profile exists after setting user state
        if (session?.user) {
          ensureProfileExists(session.user);
        }
      } catch (error) {
        console.error('Failed to initialize session:', error);
        setSession(null);
        setUser(null);
        setLoading(false);
      }
    };
    
    initializeSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Handle signed out or invalid session
        if (event === 'SIGNED_OUT' || !session) {
          setSession(null);
          setUser(null);
          setLoading(false);
          // Clear any remaining Supabase authentication tokens
          localStorage.removeItem('supabase.auth.token');
          localStorage.removeItem('sb-xtvmshymjewtfrtydtmc-auth-token');
          return;
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
      
      // Handle specific refresh token and session errors - these are not critical
      if (error && (error.message?.includes('session_not_found') || error.message?.includes('refresh_token_not_found'))) {
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
      setLoading(false);
      // Clear any remaining Supabase session data from localStorage
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('sb-xtvmshymjewtfrtydtmc-auth-token');
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
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