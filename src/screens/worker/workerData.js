import { mockWorkers } from '@data/mockWorkers';

/**
 * Demo worker resolution — ported VERBATIM from web WorkerDashboard.jsx / WorkerProfile.jsx /
 * LeaveRequests.jsx. Only the explicit 'demo-worker' id maps to the Suresh Kumar mock record
 * (w1). Every real Supabase user sees ONLY their own authenticated data — no generic fallback
 * to mockWorkers. This is a deliberate anti-leak guarantee from the web app; preserved exactly.
 */
export const DEMO_WORKER_ID = 'demo-worker';
export const demoMockWorker = mockWorkers[0]; // Suresh Kumar

/** Ported verbatim from WorkerDashboard.buildWorkerData — do not change the resolution rules. */
export function buildWorkerData(user, profile, workerProfile) {
  if (user?.id === DEMO_WORKER_ID) {
    return {
      isDemo: true,
      mockWorkerId: demoMockWorker.id, // 'w1' — used to look up demo job history
      name: demoMockWorker.name,
      email: demoMockWorker.email,
      phone: demoMockWorker.phone,
      skills: demoMockWorker.skills,
      cooperative: demoMockWorker.cooperative,
      joinDate: demoMockWorker.joinDate,
      certificates: demoMockWorker.certificates,
      leaveRequests: demoMockWorker.leaveRequests,
      available: demoMockWorker.available,
      totalJobs: demoMockWorker.totalJobs,
      earnings: demoMockWorker.earnings,
      rating: demoMockWorker.rating,
      fairnessPosition: demoMockWorker.fairnessPosition,
      cibil_score: workerProfile?.cibil_score ?? 780,
      weekly_hours_worked: workerProfile?.weekly_hours_worked ?? 38,
      insurance_eligible: workerProfile?.insurance_eligible ?? true,
      tier: workerProfile?.tier ?? 'tier2',
      leave_balance: workerProfile?.leave_balance ?? 28,
      loyalty_bonus_eligible: workerProfile?.loyalty_bonus_eligible ?? true,
    };
  }

  // Real authenticated worker — ONLY use data from auth context.
  return {
    isDemo: false,
    mockWorkerId: null,
    name: profile?.full_name || user?.email || 'Worker',
    email: user?.email || '—',
    phone: profile?.phone || workerProfile?.phone || '—',
    skills: workerProfile?.skills || [],
    cooperative: workerProfile?.cooperative || 'Sahakar Seva Cooperative',
    joinDate: profile?.created_at ? new Date(profile.created_at).toISOString().split('T')[0] : '—',
    certificates: workerProfile?.certificates || [],
    leaveRequests: [],
    available: workerProfile?.available ?? true,
    totalJobs: workerProfile?.total_jobs ?? 0,
    earnings: workerProfile?.earnings ?? 0,
    rating: workerProfile?.rating ?? null,
    fairnessPosition: workerProfile?.fairness_position ?? null,
    cibil_score: workerProfile?.cibil_score ?? null,
    weekly_hours_worked: workerProfile?.weekly_hours_worked ?? 0,
    insurance_eligible: workerProfile?.insurance_eligible ?? false,
    tier: workerProfile?.tier ?? 'tier2',
    leave_balance: workerProfile?.leave_balance ?? 0,
    loyalty_bonus_eligible: workerProfile?.loyalty_bonus_eligible ?? false,
  };
}
