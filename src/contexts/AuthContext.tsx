/**
 * AuthContext
 *
 * Provides authentication state and methods throughout the app.
 * Manages user sessions, sign in/up, and Google authentication.
 * All Supabase auth operations are logged for debugging purposes.
 */

import React, { createContext, useState, useEffect, useContext } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "../config/supabase";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { logInfo, logError, logWarn } from "../../utils/logger";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider component
 * Wraps the app to provide authentication context to all child components
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    logInfo("AuthProvider", "🔐 Initializing authentication");

    // Configure Google Sign-In
    try {
      GoogleSignin.configure({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
        offlineAccess: true, // nécessary for android
      });
      logInfo("AuthProvider", "✅ Google Sign-In configured");
    } catch (error) {
      logError("AuthProvider", "❌ Failed to configure Google Sign-In", {
        error,
      });
    }

    // Get initial session from Supabase
    logInfo("AuthProvider", "📡 Fetching initial session from Supabase");
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        logError("AuthProvider", "❌ Failed to fetch initial session", {
          error: error.message,
        });
      } else {
        logInfo("AuthProvider", "✅ Initial session fetched", {
          hasSession: !!session,
          userId: session?.user?.id,
          email: session?.user?.email,
        });
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth state changes (login, logout, token refresh, etc.)
    logInfo("AuthProvider", "👂 Setting up auth state change listener");
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      logInfo("AuthProvider", `🔄 Auth state changed: ${event}`, {
        event,
        hasSession: !!session,
        userId: session?.user?.id,
        email: session?.user?.email,
      });
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      logInfo("AuthProvider", "🧹 Cleaning up auth state listener");
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Sign up a new user with email and password
   * @param email - User's email address
   * @param password - User's password
   * @param fullName - User's full name (optional)
   * @returns Object with error if sign up failed
   */
  const signUp = async (email: string, password: string, fullName?: string) => {
    logInfo("AuthProvider", "📝 Attempting to sign up user", {
      email,
      fullName,
    });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: fullName
        ? {
            data: {
              full_name: fullName,
            },
          }
        : undefined,
    });

    if (error) {
      logError("AuthProvider", "❌ Sign up failed", {
        email,
        error: error.message,
        errorCode: error.status,
      });
    } else {
      logInfo("AuthProvider", "✅ Sign up successful", {
        email,
        fullName,
        userId: data.user?.id,
        needsEmailConfirmation: !data.session,
      });
    }

    return { error };
  };

  /**
   * Sign in an existing user with email and password
   * @param email - User's email address
   * @param password - User's password
   * @returns Object with error if sign in failed
   */
  const signIn = async (email: string, password: string) => {
    logInfo("AuthProvider", "🔑 Attempting to sign in user", { email });

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      logError("AuthProvider", "❌ Sign in failed", {
        email,
        error: error.message,
        errorCode: error.status,
      });
    } else {
      logInfo("AuthProvider", "✅ Sign in successful", {
        email,
        userId: data.user?.id,
        hasSession: !!data.session,
      });
    }

    return { error };
  };

  /**
   * Sign in with Google OAuth
   * Uses Google Sign-In SDK to get ID token, then authenticates with Supabase
   * @returns Object with error if sign in failed
   */
  const signInWithGoogle = async () => {
    try {
      logInfo("AuthProvider", "🔍 Checking Google Play Services");
      await GoogleSignin.hasPlayServices();

      logInfo("AuthProvider", "📲 Initiating Google Sign-In flow");
      const userInfo = await GoogleSignin.signIn();

      if (userInfo.data?.idToken) {
        logInfo(
          "AuthProvider",
          "🎫 ID token obtained, authenticating with Supabase",
          {
            email: userInfo.data.user.email,
          }
        );

        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: userInfo.data.idToken,
        });

        if (error) {
          logError("AuthProvider", "❌ Google sign in failed at Supabase", {
            error: error.message,
            errorCode: error.status,
          });
        } else {
          logInfo("AuthProvider", "✅ Google sign in successful", {
            email: userInfo.data.user.email,
            userId: data.user?.id,
          });
        }

        return { error };
      }

      logError(
        "AuthProvider",
        "❌ No ID token present in Google Sign-In response"
      );
      return { error: new Error("No ID token present!") };
    } catch (error: any) {
      logError("AuthProvider", "❌ Google sign in error", {
        error: error.message || error,
      });
      return { error };
    }
  };

  /**
   * Sign out the current user
   * Clears both Google and Supabase sessions
   */
  const signOut = async () => {
    logInfo("AuthProvider", "🚪 Signing out user", {
      userId: user?.id,
      email: user?.email,
    });

    try {
      // Sign out from Google
      await GoogleSignin.signOut();
      logInfo("AuthProvider", "✅ Google sign out successful");
    } catch (error) {
      logWarn(
        "AuthProvider",
        "⚠️ Google sign out failed (may not be signed in)",
        { error }
      );
    }

    try {
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        logError("AuthProvider", "❌ Supabase sign out failed", {
          error: error.message,
        });
      } else {
        logInfo("AuthProvider", "✅ Supabase sign out successful");
      }
    } catch (error) {
      logError("AuthProvider", "❌ Sign out error", { error });
    }
  };

  const value = {
    session,
    user,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Custom hook to access authentication context
 * Must be used within an AuthProvider component
 * @throws Error if used outside of AuthProvider
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
