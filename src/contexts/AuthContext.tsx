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
import { CURRENT_TERMS_VERSION } from "../config/terms";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";
import { logInfo, logError, logWarn } from "../../utils/logger";
import * as Sentry from "@sentry/react-native";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any; needsTermsAcceptance?: boolean }>;
  signInWithGoogle: () => Promise<{ error: any; needsTermsAcceptance?: boolean }>;
  signInWithApple: () => Promise<{ error: any; needsTermsAcceptance?: boolean }>;
  acceptTerms: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
  createSessionFromUrl: (url: string) => Promise<{ error: any }>;
  resendConfirmationEmail: (email: string) => Promise<{ error: any }>;
  deleteAccount: () => Promise<{ error: any; errorCode?: string }>;
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

      // Update Sentry user context
      if (session?.user) {
        Sentry.setUser({
          id: session.user.id,
          email: session.user.email,
          username: session.user.user_metadata?.full_name || session.user.email,
        });
        logInfo("AuthProvider", "📊 Sentry user context updated", {
          userId: session.user.id,
        });
      } else {
        Sentry.setUser(null);
        logInfo("AuthProvider", "📊 Sentry user context cleared");
      }
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

    logInfo("AuthProvider", "📧 SignUp options configured", {
      emailRedirectTo: 'com.coachassistant.basketball://auth/callback',
      hasFullName: !!fullName,
      metadata: fullName ? { full_name: fullName } : undefined,
    });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'com.coachassistant.basketball://auth/callback',
        data: {
        ...(fullName ? { full_name: fullName } : {}),
        terms_accepted_at: new Date().toISOString(),
        terms_version: CURRENT_TERMS_VERSION,
      },
      },
    });

    logInfo("AuthProvider", "📦 SignUp response received", {
      hasData: !!data,
      hasError: !!error,
      hasUser: !!data?.user,
      hasSession: !!data?.session,
      userConfirmedAt: data?.user?.confirmed_at,
      userEmailConfirmedAt: data?.user?.email_confirmed_at,
      identities: data?.user?.identities?.length || 0,
    });

    if (error) {
      logError("AuthProvider", "❌ Sign up failed", {
        email,
        error: error.message,
        errorCode: error.status,
        errorName: error.name,
        fullError: JSON.stringify(error),
      });

      // Traduire les erreurs de rate limiting de Supabase
      if (error.message && error.message.toLowerCase().includes('security purposes')) {
        // Extraire le nombre de secondes si possible
        const match = error.message.match(/after (\d+) seconds?/);
        const seconds = match ? parseInt(match[1]) : 60;

        return {
          error: {
            ...error,
            message: `Pour des raisons de sécurité, vous devez attendre ${seconds} secondes avant de pouvoir vous inscrire à nouveau.`,
          }
        };
      }
    } else {
      logInfo("AuthProvider", "✅ Sign up successful", {
        email,
        fullName,
        userId: data.user?.id,
        needsEmailConfirmation: !data.session,
        userEmail: data.user?.email,
        userCreatedAt: data.user?.created_at,
        userRole: data.user?.role,
        identitiesCount: data.user?.identities?.length,
      });

      // Log détaillé si aucune session n'est créée (email de confirmation requis)
      if (!data.session) {
        logInfo("AuthProvider", "📧 Email confirmation required - email sent", {
          userId: data.user?.id,
          userEmail: data.user?.email,
          emailConfirmedAt: data.user?.email_confirmed_at,
          confirmationSentAt: data.user?.confirmation_sent_at,
        });
      } else {
        logWarn("AuthProvider", "⚠️ Session created immediately - email confirmation may be disabled", {
          userId: data.user?.id,
          sessionExpiry: data.session?.expires_at,
        });
      }
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
      return { error };
    }

    logInfo("AuthProvider", "✅ Sign in successful", {
      email,
      userId: data.user?.id,
      hasSession: !!data.session,
    });

    const needsTermsAcceptance = data.user?.user_metadata?.terms_version !== CURRENT_TERMS_VERSION;

    return { error: null, needsTermsAcceptance };
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
          return { error };
        }

        logInfo("AuthProvider", "✅ Google sign in successful", {
          email: userInfo.data.user.email,
          userId: data.user?.id,
        });

        const needsTermsAcceptance = data.user?.user_metadata?.terms_version !== CURRENT_TERMS_VERSION;
        return { error: null, needsTermsAcceptance };
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
   * Sign in with Apple
   * Uses expo-apple-authentication to get identity token, then authenticates with Supabase
   */
  const signInWithApple = async () => {
    try {
      logInfo("AuthProvider", "🍎 Initiating Apple Sign-In flow");
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (credential.identityToken) {
        logInfo("AuthProvider", "🎫 Apple identity token obtained, authenticating with Supabase");

        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: "apple",
          token: credential.identityToken,
        });

        if (error) {
          logError("AuthProvider", "❌ Apple sign in failed at Supabase", {
            error: error.message,
          });
          return { error };
        }

        logInfo("AuthProvider", "✅ Apple sign in successful", {
          userId: data.user?.id,
        });

        const needsTermsAcceptance = data.user?.user_metadata?.terms_version !== CURRENT_TERMS_VERSION;
        return { error: null, needsTermsAcceptance };
      }

      logError("AuthProvider", "❌ No identity token present in Apple Sign-In response");
      return { error: new Error("No identity token present!") };
    } catch (error: any) {
      if (error.code === "ERR_REQUEST_CANCELED") {
        logInfo("AuthProvider", "ℹ️ Apple sign in cancelled by user");
        return { error: null, needsTermsAcceptance: false };
      }
      logError("AuthProvider", "❌ Apple sign in error", { error: error.message || error });
      return { error };
    }
  };

  /**
   * Persist terms acceptance in user metadata
   * Called after Google sign-in when the user accepts the CGU modal
   */
  const acceptTerms = async () => {
    logInfo("AuthProvider", "✅ User accepted terms");
    const { error } = await supabase.auth.updateUser({
      data: { terms_accepted_at: new Date().toISOString(), terms_version: CURRENT_TERMS_VERSION },
    });
    if (error) {
      logError("AuthProvider", "❌ Failed to persist terms acceptance", { error: error.message });
    }
    return { error };
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

  /**
   * Send password reset email
   * @param email - User's email address
   * @returns Object with error if password reset failed
   */
  const resetPassword = async (email: string) => {
    logInfo("AuthProvider", "🔑 Sending password reset email", { email });

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'com.coachassistant.basketball://reset-password',
    });

    if (error) {
      logError("AuthProvider", "❌ Password reset failed", {
        email,
        error: error.message,
        errorCode: error.status,
      });
    } else {
      logInfo("AuthProvider", "✅ Password reset email sent", { email });
    }

    return { error };
  };

  /**
   * Create session from deep link URL
   * Extracts tokens from URL and creates a Supabase session
   * @param url - Deep link URL containing auth tokens
   * @returns Object with error if session creation failed
   */
  const createSessionFromUrl = async (url: string) => {
    logInfo("AuthProvider", "🔗 Creating session from deep link URL", { url });

    try {
      // Supabase puts tokens in the fragment (#) after redirect
      // e.g. com.coachassistant.basketball://auth/callback#access_token=...&refresh_token=...
      const urlObj = new URL(url);
      const fragment = urlObj.hash.startsWith('#') ? urlObj.hash.slice(1) : urlObj.search.slice(1);
      const params = new URLSearchParams(fragment);
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');

      if (!access_token || !refresh_token) {
        const error = new Error('No tokens found in URL');
        logError("AuthProvider", "❌ Missing tokens in deep link", { url });
        return { error };
      }

      logInfo("AuthProvider", "🎫 Tokens extracted, setting session");

      const { data, error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (error) {
        logError("AuthProvider", "❌ Failed to create session from URL", {
          error: error.message,
          errorCode: error.status,
        });
      } else {
        logInfo("AuthProvider", "✅ Session created successfully from deep link", {
          userId: data.user?.id,
          email: data.user?.email,
        });
      }

      return { error };
    } catch (error: any) {
      logError("AuthProvider", "❌ Error parsing deep link URL", {
        error: error.message || error,
        url,
      });
      return { error };
    }
  };

  /**
   * Updates the authenticated user's password
   * Requires an active session (obtained via password reset deep link)
   */
  const updatePassword = async (newPassword: string) => {
    logInfo("AuthProvider", "🔑 Attempting password update");

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        logError("AuthProvider", "❌ Password update failed", { error: error.message });
      } else {
        logInfo("AuthProvider", "✅ Password updated successfully");
      }

      return { error };
    } catch (err: any) {
      logError("AuthProvider", "❌ Unexpected error during password update", { error: err.message });
      return { error: err };
    }
  };

  /**
   * Resend confirmation email to an unconfirmed user
   * Uses the same signUp endpoint - Supabase will resend the email if the user exists but is unconfirmed
   * @param email - User's email address
   * @returns Object with error if resend failed
   */
  const resendConfirmationEmail = async (email: string) => {
    logInfo("AuthProvider", "📧 Attempting to resend confirmation email", { email });

    // Supabase doesn't have a dedicated "resend" endpoint, but calling signUp again
    // with an existing unconfirmed user will trigger a new confirmation email
    // We use a dummy password since it won't be used anyway (user already exists)
    const { data, error } = await supabase.auth.signUp({
      email,
      password: 'dummy-password-for-resend', // Won't be used for existing users
      options: {
        emailRedirectTo: 'com.coachassistant.basketball://auth/callback',
      },
    });

    if (error) {
      logError("AuthProvider", "❌ Failed to resend confirmation email", {
        email,
        error: error.message,
        errorCode: error.status,
      });

      // Traduire les erreurs de rate limiting de Supabase
      if (error.message && error.message.toLowerCase().includes('security purposes')) {
        // Extraire le nombre de secondes si possible
        const match = error.message.match(/after (\d+) seconds?/);
        const seconds = match ? parseInt(match[1]) : 60;

        return {
          error: {
            ...error,
            message: `Pour des raisons de sécurité, vous devez attendre ${seconds} secondes avant de pouvoir renvoyer un email.`,
          }
        };
      }
    } else {
      logInfo("AuthProvider", "✅ Confirmation email resent successfully", {
        email,
        userId: data.user?.id,
      });
    }

    return { error };
  };

  const deleteAccount = async (): Promise<{ error: any; errorCode?: string }> => {
    logInfo("AuthProvider", "🗑️ Deleting account", { userId: user?.id });

    try {
      const { data, error } = await supabase.functions.invoke("delete-account", {
        method: "POST",
      });

      if (error) {
        let errorCode: string | undefined;
        try {
          const body = await (error as any).context?.json?.();
          errorCode = body?.error;
        } catch (_) {}
        logError("AuthProvider", "❌ Delete account failed", { error: error.message, errorCode });
        return { error, errorCode };
      }

      logInfo("AuthProvider", "✅ Account deleted successfully");
      return { error: null };
    } catch (err) {
      logError("AuthProvider", "❌ Delete account error", { error: err });
      return { error: err };
    }
  };

  const value = {
    session,
    user,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithApple,
    acceptTerms,
    signOut,
    resetPassword,
    updatePassword,
    createSessionFromUrl,
    resendConfirmationEmail,
    deleteAccount,
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
