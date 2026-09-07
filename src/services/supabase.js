import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';
import { createClient } from '@supabase/supabase-js';

// Ported from e:\sahakar-seva-progress\src\services\supabase.js.
//
// Behavioural differences from the web version, both deliberate:
//
// 1. Web reads `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` and THROWS at
//    import time if either is missing ("Missing Supabase environment variables"). On web
//    that produces a blank page; in RN, throwing at module-import time kills the JS bundle
//    before anything can render, including error boundaries. This port makes that path
//    graceful: `supabase` stays null and every exported helper below short-circuits with an
//    `{ data: null, error }` shape (matching what supabase-js itself returns on failure), so
//    callers that already handle `{ error }` — which is all of them, see AuthContext — don't
//    need special-casing for "not configured" vs "network/auth error".
//
// 2. `createClient` on web is called with NO options, so it defaults to `localStorage` for
//    session persistence (browser-only). That default does not exist in RN. Per the Supabase
//    RN docs, AsyncStorage is passed explicitly, `detectSessionInUrl: false` (there is no URL
//    to inspect on native), and `persistSession: true` so a login survives an app restart —
//    without this, every relaunch would silently lose the session and drop back to the
//    login screen despite a real Supabase account being signed in.
//
// `import 'react-native-url-polyfill/auto'` above must run before `createClient` — supabase-js
// depends on a spec-compliant global URL, which RN's JS engine (Hermes) does not provide.

const SUPABASE_URL = Config.SUPABASE_URL;
const SUPABASE_ANON_KEY = Config.SUPABASE_ANON_KEY;

const isConfigured = Boolean(SUPABASE_URL) && Boolean(SUPABASE_ANON_KEY) && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY';

if (!isConfigured) {
  console.warn(
    '[supabase] SUPABASE_URL / SUPABASE_ANON_KEY are not set (check .env). ' +
      'Real auth and the admin worker list will not work until these are configured. ' +
      'Demo accounts (demo.customer@sahakar.in / demo.worker@sahakar.in) still work — ' +
      'they bypass Supabase entirely, see AuthContext.'
  );
}

export const supabase = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        persistSession: true,
        detectSessionInUrl: false,
        autoRefreshToken: true,
      },
    })
  : null;

const NOT_CONFIGURED_ERROR = { message: 'Supabase is not configured (missing SUPABASE_URL/SUPABASE_ANON_KEY in .env)' };

// Auth helpers — identical surface and behaviour to the web version.

export async function signUp({ email, password, role, fullName, phone, city, state, skills, wantsTraining }) {
  if (!supabase) return { data: null, error: NOT_CONFIGURED_ERROR };
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role,
        full_name: fullName,
        phone,
        city: city || '',
        state: state || '',
        // skills is kept as a raw comma-separated string here; the handle_new_user DB
        // trigger splits it into text[] on insert. Preserved unchanged from web.
        skills: skills || '',
        wants_training: Boolean(wantsTraining),
      },
    },
  });
  return { data, error };
}

export async function signIn({ email, password }) {
  if (!supabase) return { data: null, error: NOT_CONFIGURED_ERROR };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function signOut() {
  if (!supabase) return { error: NOT_CONFIGURED_ERROR };
  return await supabase.auth.signOut();
}

export async function getSession() {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getProfile(userId) {
  if (!supabase) return { data: null, error: NOT_CONFIGURED_ERROR };
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return { data, error };
}

export async function getWorkerProfile(userId) {
  if (!supabase) return { data: null, error: NOT_CONFIGURED_ERROR };
  const { data, error } = await supabase
    .from('worker_profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return { data, error };
}

export async function updateProfile(userId, updates) {
  if (!supabase) return { data: null, error: NOT_CONFIGURED_ERROR };
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId);
  return { data, error };
}

// Maintenance reminders — defined but never called from any component, same as web.
// Preserved for parity; do not wire these up unless the web app does first.

export async function getMaintenanceReminders(customerId) {
  if (!supabase) return { data: null, error: NOT_CONFIGURED_ERROR };
  const { data, error } = await supabase
    .from('maintenance_reminders')
    .select('*')
    .eq('customer_id', customerId)
    .eq('is_dismissed', false)
    .lte('next_due_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .order('next_due_date', { ascending: true });
  return { data, error };
}

export async function createMaintenanceReminder(reminder) {
  if (!supabase) return { data: null, error: NOT_CONFIGURED_ERROR };
  const { data, error } = await supabase.from('maintenance_reminders').insert(reminder);
  return { data, error };
}

export async function dismissReminder(id) {
  if (!supabase) return { data: null, error: NOT_CONFIGURED_ERROR };
  return await supabase
    .from('maintenance_reminders')
    .update({ is_dismissed: true })
    .eq('id', id);
}

// Notifications — same "defined but unused" status as web.

export async function getNotifications(userId) {
  if (!supabase) return { data: null, error: NOT_CONFIGURED_ERROR };
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
  return { data, error };
}

export async function markNotificationRead(id) {
  if (!supabase) return { data: null, error: NOT_CONFIGURED_ERROR };
  return await supabase.from('notifications').update({ is_read: true }).eq('id', id);
}

export async function createNotification(notification) {
  if (!supabase) return { data: null, error: NOT_CONFIGURED_ERROR };
  return await supabase.from('notifications').insert(notification);
}

// ---------------------------------------------------------------------------
// Worker list for Admin — queries the profiles table only. Ported unchanged from web,
// including the warning: do NOT add columns to the select() below without verifying they
// exist in the live schema first. One missing column 400s the entire query.
// ---------------------------------------------------------------------------
export async function getWorkerList() {
  if (!supabase) return { data: null, error: NOT_CONFIGURED_ERROR };
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone, role, created_at')
    .eq('role', 'worker')
    .order('created_at', { ascending: false });
  return { data, error };
}
