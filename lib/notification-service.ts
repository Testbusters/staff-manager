// Unified re-export facade for notification builders + helpers.
// Reduces import verbosity in API route handlers (6+ imports → 1 import).

// ── Builders (notification-utils.ts) ─────────────────────────────────────────
export {
  buildCompensationNotification,
  buildExpenseNotification,
  buildTicketReplyNotification,
  buildCompensationSubmitNotification,
  buildExpenseSubmitNotification,
  buildContentNotification,
  buildLiquidazioneRequestNotification,
  COMPENSATION_NOTIFIED_ACTIONS,
  EXPENSE_NOTIFIED_ACTIONS,
  NOTIFICATION_TYPE_BADGE,
  type NotificationEntityType,
  type NotificationPayload,
} from '@/lib/notification-utils';

// ── Helpers (notification-helpers.ts) ────────────────────────────────────────
export {
  getNotificationSettings,
  getCollaboratorInfo,
  getResponsabiliForCommunity,
  getResponsabiliForCollaborator,
  getResponsabiliForUser,
  getCollaboratoriForCommunities,
  getCollaboratoriForCity,
  getAllActiveCollaboratori,
} from '@/lib/notification-helpers';
