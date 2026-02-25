import { UserPlan } from './types';

// ─── Version ───────────────────────────────────────────────────────────────────

export const APP_VERSION = '2.3.0';
export const MIN_SUPPORTED_VERSION = '2.0.0';

// ─── Plan Limits ───────────────────────────────────────────────────────────────

export const PLAN_PROJECT_LIMITS: Record<UserPlan, number> = {
  FREE: 2,
  PRO: Infinity,
  ENTERPRISE: Infinity,
};

export const PLAN_SYNC_INTERVALS: Record<UserPlan, number> = {
  FREE: 60,    // minutes
  PRO: 5,
  ENTERPRISE: 1,
};

export const PLAN_FEATURES: Record<UserPlan, {
  realTimeSync: boolean;
  advancedFiltering: boolean;
  prioritySync: boolean;
  batchSize: number;
  prioritySupport: boolean;
}> = {
  FREE: {
    realTimeSync: false,
    advancedFiltering: false,
    prioritySync: false,
    batchSize: 50,
    prioritySupport: false,
  },
  PRO: {
    realTimeSync: true,
    advancedFiltering: true,
    prioritySync: true,
    batchSize: 500,
    prioritySupport: false,
  },
  ENTERPRISE: {
    realTimeSync: true,
    advancedFiltering: true,
    prioritySync: true,
    batchSize: 2000,
    prioritySupport: true,
  },
};

// ─── Agent ─────────────────────────────────────────────────────────────────────

/** Agent is considered "online" if heartbeat was within this many ms */
export const AGENT_ONLINE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

/** Expected heartbeat interval from the macOS app */
export const AGENT_HEARTBEAT_INTERVAL_MS = 60 * 1000; // 1 minute

/** App session TTL — how long a pending browser auth session stays valid */
export const APP_SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

// ─── Rate Limits ───────────────────────────────────────────────────────────────

export const RATE_LIMIT_GENERAL = { windowMs: 15 * 60 * 1000, max: 1000 };
export const RATE_LIMIT_AUTH = { windowMs: 15 * 60 * 1000, max: 50 };
export const RATE_LIMIT_APP_SESSION = { windowMs: 60 * 60 * 1000, max: 50 };

// ─── Download ──────────────────────────────────────────────────────────────────

export const DMG_FILENAME_LATEST = 'AsanaBridge-Latest.dmg';
export const DMG_FILENAME_VERSIONED = `AsanaBridge-${APP_VERSION}.dmg`;

// ─── Version Changelog ─────────────────────────────────────────────────────────

export const VERSION_CHANGELOG: Record<string, string[]> = {
  '2.3.0': [
    'Rebuilt from scratch on clean architecture',
    'Migrated to Railway + Vercel hosting',
    'bcrypt password hashing',
    'Database-backed app sessions (no more data loss on restart)',
    'Implemented agent command queue',
    'Separated frontend and backend deployments',
  ],
  '2.2.1': [
    'Fixed menu bar icon disappearing bug',
    'Added complete OmniFocus AppleScript integration',
    'Fixed string interpolation bugs in Swift app',
    'Added professional logging system',
    'Fixed database field naming inconsistencies',
  ],
  '2.2.0': [
    'Major architecture overhaul',
    'Added bidirectional sync engine',
    'JWT authentication with refresh flow',
    'Conflict resolution system',
  ],
};
