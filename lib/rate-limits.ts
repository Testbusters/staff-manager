/**
 * Application-level rate limiting constants.
 * Used by API route guards to cap resource creation.
 */

/** Max compensations in IN_ATTESA per collaborator */
export const MAX_PENDING_COMPENSATIONS = 30;

/** Max expense reimbursements in IN_ATTESA or INVIATO per collaborator */
export const MAX_PENDING_EXPENSES = 20;

/** Max new collaborators created globally per hour */
export const MAX_USERS_PER_HOUR = 20;

/** Cooldown (ms) between resend-invite calls for the same target user */
export const RESEND_INVITE_COOLDOWN_MS = 5 * 60 * 1000;
