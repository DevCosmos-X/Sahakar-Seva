import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { supabase, signIn, signUp, signOut, getProfile, getWorkerProfile } from '@services/supabase';

// Ported from e:\sahakar-seva-progress\src\context\AuthContext.jsx.
//
// Behaviour preserved exactly, including:
//   - the full reducer and its action set
//   - DEMO_ACCOUNTS bypassing Supabase entirely and synthesising a fake user/profile
//   - `isDemo` derived from user.id.startsWith('demo-')
//   - logout skipping Supabase signOut for demo users
//
// ONE structural change, forced by Phase 2's graceful-missing-env handling in
// services/supabase.js: `supabase` can now be null when SUPABASE_URL/ANON_KEY are unset.
// The web version could always assume a client existed (it threw at import time otherwise).
// The mount effect below therefore guards on `supabase` before touching supabase.auth.
//
// Why that matters: it keeps the DEMO path fully functional with no Supabase config at all.
// Without the guard, launching the app before real keys are in .env would crash on
// `supabase.auth.getSession()` and the demo accounts — the whole point of the demo path —
// would be unreachable.

const AuthContext = createContext(null);

const initialState = {
  user: null,
  profile: null,
  workerProfile: null,
  isAuthenticated: false,
  loading: true,
  error: null
};

function authReducer(state, action) {
  switch (action.type) {
    case 'AUTH_START':
      return { ...state, loading: true, error: null };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        profile: action.payload.profile,
        workerProfile: action.payload.workerProfile || null,
        isAuthenticated: true,
        loading: false,
        error: null
      };
    case 'AUTH_ERROR':
      return { ...state, loading: false, error: action.payload, isAuthenticated: false, user: null, profile: null };
    case 'LOGOUT':
      return { ...initialState, loading: false };
    case 'UPDATE_PROFILE':
      return { ...state, profile: { ...state.profile, ...action.payload } };
    case 'UPDATE_WORKER_PROFILE':
      return { ...state, workerProfile: { ...state.workerProfile, ...action.payload } };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    default:
      return state;
  }
}

// DEMO accounts (bypass Supabase for quick demo access)
// NOTE: admin@sahakar.in is intentionally NOT in this list.
// Admin login uses real Supabase authentication so it receives a genuine JWT
// and can make authenticated queries (e.g. reading worker profiles via RLS).
// Create the admin account manually in the Supabase Dashboard.
const DEMO_ACCOUNTS = {
  'demo.customer@sahakar.in': { password: 'demo123', role: 'customer', full_name: 'Rahul Sharma', phone: '+91 98765 43210', city: 'Gurugram' },
  'demo.worker@sahakar.in': { password: 'demo123', role: 'worker', full_name: 'Suresh Kumar', phone: '+91 76543 21098', city: 'Delhi' },
};

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Helper: load full profile after auth
  const loadProfile = useCallback(async (userId) => {
    const { data: profile } = await getProfile(userId);
    let workerProfile = null;
    if (profile?.role === 'worker') {
      const { data } = await getWorkerProfile(userId);
      workerProfile = data;
    }
    return { profile, workerProfile };
  }, []);

  // On mount: check existing session
  useEffect(() => {
    // Guard added for mobile: supabase is null when env vars are unset (see services/supabase.js).
    // Skip straight to "not loading" so the login screen renders and demo accounts still work.
    if (!supabase) {
      dispatch({ type: 'SET_LOADING', payload: false });
      return;
    }

    let mounted = true;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        const { profile, workerProfile } = await loadProfile(session.user.id);
        dispatch({ type: 'AUTH_SUCCESS', payload: { user: session.user, profile, workerProfile } });
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_IN' && session?.user) {
        const { profile, workerProfile } = await loadProfile(session.user.id);
        dispatch({ type: 'AUTH_SUCCESS', payload: { user: session.user, profile, workerProfile } });
      } else if (event === 'SIGNED_OUT') {
        dispatch({ type: 'LOGOUT' });
      }
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, [loadProfile]);

  const login = useCallback(async (email, password) => {
    dispatch({ type: 'AUTH_START' });

    // Demo account bypass
    const demo = DEMO_ACCOUNTS[email.toLowerCase()];
    if (demo && demo.password === password) {
      const mockUser = { id: `demo-${demo.role}`, email };
      const mockProfile = { id: mockUser.id, role: demo.role, full_name: demo.full_name, phone: demo.phone, city: demo.city };
      const mockWorkerProfile = demo.role === 'worker' ? {
        id: mockUser.id, skills: ['Plumbing', 'Pipe Fitting'], rating: 4.8, total_jobs: 245,
        earnings: 73500, cibil_score: 780, weekly_hours_worked: 38, insurance_eligible: true,
        tier: 'tier2', leave_balance: 28, loyalty_bonus_eligible: true, available: true, verified: true
      } : null;
      dispatch({ type: 'AUTH_SUCCESS', payload: { user: mockUser, profile: mockProfile, workerProfile: mockWorkerProfile } });
      return { success: true };
    }

    // Real Supabase login
    const { error } = await signIn({ email, password });
    if (error) {
      dispatch({ type: 'AUTH_ERROR', payload: error.message });
      return { success: false, error: error.message };
    }
    return { success: true };
  }, []);

  const register = useCallback(async ({ email, password, role, fullName, phone, city, state, skills, wantsTraining }) => {
    dispatch({ type: 'AUTH_START' });
    const { data, error } = await signUp({ email, password, role, fullName, phone, city, state, skills, wantsTraining });
    if (error) {
      dispatch({ type: 'AUTH_ERROR', payload: error.message });
      return { success: false, error: error.message };
    }
    // Profile auto-created via DB trigger; confirm email may be needed
    dispatch({ type: 'SET_LOADING', payload: false });
    return { success: true, needsEmailConfirm: !data.session };
  }, []);

  const logout = useCallback(async () => {
    // Don't call Supabase signOut for demo accounts
    if (state.user?.id?.startsWith('demo-')) {
      dispatch({ type: 'LOGOUT' });
      return;
    }
    await signOut();
    dispatch({ type: 'LOGOUT' });
  }, [state.user]);

  const updateProfileData = useCallback((updates) => {
    dispatch({ type: 'UPDATE_PROFILE', payload: updates });
  }, []);

  const updateWorkerProfileData = useCallback((updates) => {
    dispatch({ type: 'UPDATE_WORKER_PROFILE', payload: updates });
  }, []);

  // Shorthand helpers
  const isDemo = state.user?.id?.startsWith('demo-');
  const role = state.profile?.role;

  return (
    <AuthContext.Provider value={{
      ...state,
      role,
      isDemo,
      login,
      register,
      logout,
      updateProfileData,
      updateWorkerProfileData,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
