import {
  pgTable, uuid, text, integer, numeric, boolean,
  serial, date, jsonb, timestamp, bigint, index, primaryKey, char,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const adminConfig = pgTable('admin_config', {
  id:        serial('id').primaryKey(),
  key:       text('key').unique().notNull(),
  value:     text('value'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const users = pgTable('users', {
  id:           uuid('id').primaryKey().defaultRandom(),
  username:     text('username').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  email:        text('email').unique(),
  dailyLimit:   integer('daily_limit'),
  isActive:     boolean('is_active').default(true).notNull(),
  lastLoginAt:  timestamp('last_login_at', { withTimezone: true }),
  createdAt:    timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:    timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),

  passwordChangedAt:  timestamp('password_changed_at', { withTimezone: true }),
  passwordChangedBy:  text('password_changed_by'),
  mustChangePassword: boolean('must_change_password').default(false).notNull(),
  adminResetBy:       text('admin_reset_by'),

  emailVerifiedAt:    timestamp('email_verified_at', { withTimezone: true }),

  betaOptinAndroid:   boolean('beta_optin_android').default(false).notNull(),
  betaOptinAndroidAt: timestamp('beta_optin_android_at', { withTimezone: true }),
}, t => ({ usernameIdx: index('idx_users_username').on(t.username) }))

export const meals = pgTable('meals', {
  id:            uuid('id').primaryKey().defaultRandom(),
  userId:        uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  dishNames:     text('dish_names').array().notNull().default([]),
  totalCalories: integer('total_calories').notNull().default(0),
  totalProtein:  numeric('total_protein', { precision: 7, scale: 2 }).notNull().default('0'),
  totalCarbs:    numeric('total_carbs',   { precision: 7, scale: 2 }).notNull().default('0'),
  totalFat:      numeric('total_fat',     { precision: 7, scale: 2 }).notNull().default('0'),
  imageUrl:      text('image_url'),
  rawAnalysis:   jsonb('raw_analysis'),
  source:        text('source').notNull().default('web'), // 'web' | 'telegram' | 'app-ios' | 'app-android'
  loggedAt:      timestamp('logged_at', { withTimezone: true }).defaultNow().notNull(),
}, t => ({
  userIdx:   index('idx_meals_user_id').on(t.userId),
  loggedIdx: index('idx_meals_logged_at').on(t.loggedAt),
  sourceIdx: index('idx_meals_source').on(t.source),
}))

export const dailyUsage = pgTable('daily_usage', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date:   date('date').notNull(),
  count:  integer('count').notNull().default(0),
}, t => ({ pk: primaryKey({ columns: [t.userId, t.date] }) }))

export const reports = pgTable('reports', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userId:    uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  username:  text('username'),
  message:   text('message').notNull(),
  // 'open' | 'replied' | 'waiting' (menunggu user) | 'done' — 'replied'/
  // 'waiting' only apply to source: 'email' (helpdesk reply pipeline).
  status:    text('status').notNull().default('open'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),

  // Origin of the report — 'app' (in-app feedback form, default) or 'email'
  // (inbound to support@..., see app/api/webhooks/resend-inbound). Only
  // 'email' reports carry the fields below — used to reply in-thread
  // (In-Reply-To/References headers on the outbound reply, see
  // lib/reportReplyEmail.ts).
  source:         text('source').notNull().default('app'),
  fromEmail:      text('from_email'),
  emailMessageId: text('email_message_id'),
  emailSubject:   text('email_subject'),

  // Sequential, human-facing reference (every report, both sources — DB
  // auto-assigns via a sequence). Embedded as `[GZK-{n}]` in outbound reply
  // subjects (see lib/reportTicket.ts) and parsed back out of inbound
  // replies to match them to the right thread — far more reliable than
  // depending on mail providers to round-trip In-Reply-To/References intact.
  ticketNumber: serial('ticket_number').notNull().unique(),
}, t => ({
  statusIdx: index('idx_reports_status').on(t.status),
  sourceIdx: index('idx_reports_source').on(t.source),
}))

// ── Report Messages ──────────────────────────────────────────────────────────
// Reply thread for a report. The report's own `message`/`createdAt` are the
// thread's first entry (sender 'user') and are NOT duplicated here — rows in
// this table are every message AFTER that (admin replies, and in future,
// inbound follow-up emails).
export const reportMessages = pgTable('report_messages', {
  id:             uuid('id').primaryKey().defaultRandom(),
  reportId:       uuid('report_id').notNull().references(() => reports.id, { onDelete: 'cascade' }),
  sender:         text('sender').notNull(), // 'admin' | 'user'
  body:           text('body').notNull(),
  // Message-ID of the outbound email this row represents (set on admin
  // sends) — chained into the NEXT reply's In-Reply-To/References headers.
  emailMessageId: text('email_message_id'),
  createdAt:      timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, t => ({ reportIdx: index('idx_report_messages_report_id').on(t.reportId) }))

// ── Report Attachments ───────────────────────────────────────────────────────
export const reportAttachments = pgTable('report_attachments', {
  id:        uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('message_id').notNull().references(() => reportMessages.id, { onDelete: 'cascade' }),
  kind:      text('kind').notNull(), // 'image' | 'video'
  url:       text('url').notNull(),
  sizeBytes: integer('size_bytes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, t => ({ messageIdx: index('idx_report_attachments_message_id').on(t.messageId) }))

export const maintenanceConfig = pgTable('maintenance_config', {
  id:          serial('id').primaryKey(),
  enabled:     boolean('enabled').notNull().default(false),
  title:       text('title').notNull().default('NutriLog sedang dalam perbaikan'),
  description: text('description').notNull().default('Kami sedang melakukan peningkatan sistem.'),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const landingContent = pgTable('landing_content', {
  id:         serial('id').primaryKey(),
  section:    text('section').notNull(),
  slug:       text('slug').unique().notNull(),
  title:      text('title').notNull().default(''),
  subtitle:   text('subtitle'),
  body:       text('body'),
  meta:       jsonb('meta'),
  isActive:   boolean('is_active').notNull().default(true),
  sortOrder:  integer('sort_order').notNull().default(0),
  createdAt:  timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:  timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, t => ({
  sectionIdx: index('idx_landing_section').on(t.section),
  activeIdx:  index('idx_landing_active').on(t.isActive, t.section, t.sortOrder),
}))

// ── Email Verification Tokens ────────────────────────────────────────────────
// Single-use tokens sent via email on register / email change, consumed by
// GET /verify?token=XXX. Only the sha256 hash is stored (mirrors passwordHash
// pattern) — the raw token lives only in the emailed link. Old tokens are not
// deleted when a new one is issued; they stay valid until they expire or are
// consumed, so a resend never silently breaks a link already in someone's inbox.
export const emailVerificationTokens = pgTable('email_verification_tokens', {
  id:         uuid('id').primaryKey().defaultRandom(),
  userId:     uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash:  text('token_hash').unique().notNull(),
  email:      text('email').notNull(),
  expiresAt:  timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  createdAt:  timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, t => ({
  userIdx:      index('idx_email_verification_tokens_user_id').on(t.userId),
  tokenHashIdx: index('idx_email_verification_tokens_token_hash').on(t.tokenHash),
  userCreatedIdx: index('idx_email_verification_tokens_user_created').on(t.userId, t.createdAt),
}))

// ── Telegram Users ────────────────────────────────────────────────────────────
export const telegramUsers = pgTable('telegram_users', {
  telegramId:   bigint('telegram_id', { mode: 'bigint' }).primaryKey(),
  userId:       uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  username:     text('username'),
  firstName:    text('first_name'),
  dailyCount:   integer('daily_count').notNull().default(0),
  lastUsedDate: date('last_used_date'),
  createdAt:    timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:    timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, t => ({
  userIdx: index('idx_telegram_users_user_id').on(t.userId),
}))

// ── Telegram Link Tokens ──────────────────────────────────────────────────────
// Short-lived OTP tokens used to link a Telegram account to a Gizku web account.
// Flow: web POST /api/telegram/link → generates token → user sends to bot
//       bot GET /api/telegram/verify?token=XXX&tgId=YYY → links and deletes token
export const telegramLinkTokens = pgTable('telegram_link_tokens', {
  token:     char('token', { length: 6 }).primaryKey(),
  userId:    uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, t => ({
  userIdx:    index('idx_tg_link_tokens_user').on(t.userId),
  expiresIdx: index('idx_tg_link_tokens_expires').on(t.expiresAt),
}))

// ── Push Tokens ───────────────────────────────────────────────────────────────
// Expo push tokens registered by the mobile app, one row per device.
export const pushTokens = pgTable('push_tokens', {
  id:         uuid('id').primaryKey().defaultRandom(),
  userId:     uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token:      text('token').unique().notNull(),
  platform:   text('platform').notNull(), // 'ios' | 'android'
  isActive:   boolean('is_active').notNull().default(true),
  createdAt:  timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:  timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
}, t => ({
  userIdx:   index('idx_push_tokens_user_id').on(t.userId),
  activeIdx: index('idx_push_tokens_active').on(t.isActive),
}))

// ── Notification Blasts ──────────────────────────────────────────────────────
// A blast notification batch composed and sent from the admin backoffice,
// over one of three channels: push notification, Telegram (Bot Gizku), or email (Resend).
export const notificationBlasts = pgTable('notification_blasts', {
  id:              uuid('id').primaryKey().defaultRandom(),
  batchName:       text('batch_name').notNull(),
  channel:         text('channel').notNull().default('push'), // 'push' | 'telegram' | 'email'
  title:           text('title').notNull().default(''), // push: notification title; email: subject; empty string for telegram
  body:            text('body').notNull(),
  targetType:      text('target_type').notNull(), // 'all' | 'specific'
  // push/telegram: up to 10 usernames. email: up to 100 raw email addresses. null when targetType = 'all'.
  targetUsernames: text('target_usernames').array(),
  // Sender identity for the 'email' channel only — 'support' | 'marketing' (see lib/email.ts BLAST_SENDERS). Null for push/telegram.
  fromAddress:     text('from_address'),
  status:          text('status').notNull().default('scheduled'), // scheduled|sending|completed|cancelled|failed
  scheduledAt:     timestamp('scheduled_at', { withTimezone: true }),
  sentAt:          timestamp('sent_at', { withTimezone: true }),
  createdBy:       text('created_by'),
  targetedCount:   integer('targeted_count').notNull().default(0),
  sentCount:       integer('sent_count').notNull().default(0),
  clickedCount:    integer('clicked_count').notNull().default(0),
  readCount:       integer('read_count').notNull().default(0),
  failedCount:     integer('failed_count').notNull().default(0),
  createdAt:       timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:       timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, t => ({
  statusIdx:      index('idx_notification_blasts_status').on(t.status),
  scheduledIdx:   index('idx_notification_blasts_scheduled_at').on(t.scheduledAt),
  channelIdx:     index('idx_notification_blasts_channel').on(t.channel),
}))

// ── Notification Blast Recipients ────────────────────────────────────────────
// Per-recipient delivery status for a notification blast.
export const notificationBlastRecipients = pgTable('notification_blast_recipients', {
  id:          uuid('id').primaryKey().defaultRandom(),
  blastId:     uuid('blast_id').notNull().references(() => notificationBlasts.id, { onDelete: 'cascade' }),
  // Nullable: a Telegram recipient may never have linked a Gizku account, and an
  // email recipient may be an arbitrary address not tied to any Gizku account.
  userId:      uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  // Set for telegram-channel recipients (linked or not) — null for push, which is always app-account-based.
  telegramUserId: bigint('telegram_user_id', { mode: 'bigint' }).references(() => telegramUsers.telegramId, { onDelete: 'set null' }),
  // Set for email-channel recipients — the literal address targeted (may not match any users.email).
  email:       text('email'),
  pushTokenId: uuid('push_token_id').references(() => pushTokens.id, { onDelete: 'set null' }),
  provider:    text('provider'), // 'fcm' | 'apns' | 'telegram' | 'resend' — set once dispatch resolves a delivery path
  status:      text('status').notNull().default('pending'), // pending|sent|failed|clicked|read
  errorMessage: text('error_message'),
  // Ticket/message id from the provider (Expo push ticket id for push,
  // Telegram message_id for telegram) — needed to look up delivery receipts
  // later, since a provider "accepting" a send isn't the same as it actually
  // being delivered to the device.
  providerMessageId: text('provider_message_id'),
  // Raw response payload from the provider (send ticket, later overwritten
  // by the delivery receipt once checked, or the raw error) — surfaced as-is
  // in the admin detail page for debugging.
  providerResponse: jsonb('provider_response'),
  receiptCheckedAt: timestamp('receipt_checked_at', { withTimezone: true }),
  sentAt:      timestamp('sent_at', { withTimezone: true }),
  clickedAt:   timestamp('clicked_at', { withTimezone: true }),
  readAt:      timestamp('read_at', { withTimezone: true }),
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, t => ({
  blastIdx:    index('idx_blast_recipients_blast_id').on(t.blastId),
  userIdx:     index('idx_blast_recipients_user_id').on(t.userId),
  telegramIdx: index('idx_blast_recipients_telegram_user_id').on(t.telegramUserId),
  statusIdx:   index('idx_blast_recipients_status').on(t.blastId, t.status),
}))

// ── Limit Tiers ───────────────────────────────────────────────────────────────
// Admin-configurable add-on packages for "Request Kenaikan Limit Analisa".
// Max 10 rows, enforced in the admin API — not a DB constraint.
export const limitTiers = pgTable('limit_tiers', {
  id:         uuid('id').primaryKey().defaultRandom(),
  label:      text('label').notNull(),
  addPerDay:  integer('add_per_day').notNull(),
  price:      integer('price').notNull(),
  sortOrder:  integer('sort_order').notNull().default(0),
  createdAt:  timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:  timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ── Limit Requests ────────────────────────────────────────────────────────────
// A user's request to raise their daily food-analysis quota via manual bank
// transfer. Tier fields are snapshotted at submission time so historical
// requests/ledger stay correct even if the tier is later edited or deleted.
export const limitRequests = pgTable('limit_requests', {
  id:            uuid('id').primaryKey().defaultRandom(),
  userId:        uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tierId:        uuid('tier_id').references(() => limitTiers.id, { onDelete: 'set null' }),
  // Snapshot of the tier at submission time
  tierLabel:     text('tier_label').notNull(),
  addPerDay:     integer('add_per_day').notNull(),
  totalPerDay:   integer('total_per_day').notNull(),
  price:         integer('price').notNull(),
  uniqueCode:    integer('unique_code').notNull(),
  totalTransfer: integer('total_transfer').notNull(),
  status:        text('status').notNull().default('pending'), // 'pending' | 'approved' | 'rejected'
  submittedAt:   timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
  decidedAt:     timestamp('decided_at', { withTimezone: true }),
  proofImageUrl: text('proof_image_url').notNull(),
  // Sender's declared bank account for the transfer (who it came FROM),
  // used by admins to reconcile incoming transfers alongside the proof
  // image. Nullable — legacy requests submitted before this field shipped
  // won't have it; required-ness for new submissions is enforced in the API.
  senderAccountHolder: text('sender_account_holder'),
  senderAccountNumber: text('sender_account_number'),
  senderBankName: text('sender_bank_name'),
  note:          text('note'),
  rejectReason:  text('reject_reason'),
  rejectNote:    text('reject_note'),
}, t => ({
  userIdx:   index('idx_limit_requests_user_id').on(t.userId),
  statusIdx: index('idx_limit_requests_status').on(t.status),
  codeIdx:   index('idx_limit_requests_unique_code').on(t.uniqueCode, t.status),
}))

// ── Legal Documents ───────────────────────────────────────────────────────────
// Admin-extensible document types (Syarat & Ketentuan, Kebijakan Privasi, ...).
// "terms" and "privacy" ship pre-seeded and builtin=true (cannot be deleted).
export const legalDocumentTypes = pgTable('legal_document_types', {
  id:        uuid('id').primaryKey().defaultRandom(),
  key:       text('key').unique().notNull(),
  label:     text('label').notNull(),
  builtin:   boolean('builtin').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// Bilingual legal document (Terms, Privacy, or a custom type). Every saved
// row is immediately live — no draft/published status, no revision history.
// `slug` is the identifier the app/backend uses to fetch content by URL.
export const legalDocuments = pgTable('legal_documents', {
  id:         uuid('id').primaryKey().defaultRandom(),
  typeKey:    text('type_key').notNull().references(() => legalDocumentTypes.key, { onDelete: 'restrict' }),
  slug:       text('slug').unique().notNull(),
  titleId:    text('title_id').notNull().default(''),
  bodyHtmlId: text('body_html_id').notNull().default(''),
  titleEn:    text('title_en').notNull().default(''),
  bodyHtmlEn: text('body_html_en').notNull().default(''),
  createdAt:  timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:  timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, t => ({
  typeIdx: index('idx_legal_documents_type_key').on(t.typeKey),
  slugIdx: index('idx_legal_documents_slug').on(t.slug),
}))

// Singleton — one description + one disclaimer per language, powering the
// app's "Tentang Aplikasi" (About) screen hero text and disclaimer callout.
export const aboutContent = pgTable('about_content', {
  id:            serial('id').primaryKey(),
  descriptionId: text('description_id').notNull().default(''),
  disclaimerId:  text('disclaimer_id').notNull().default(''),
  descriptionEn: text('description_en').notNull().default(''),
  disclaimerEn:  text('disclaimer_en').notNull().default(''),
  updatedAt:     timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// Singleton — Closed Beta Tester Android opt-in feature flag + bilingual
// explainer popup content (title, numbered terms, callout) shown to users
// on the registration page before they opt in.
export const betaOptinConfig = pgTable('beta_optin_config', {
  id:        serial('id').primaryKey(),
  enabled:   boolean('enabled').notNull().default(false),
  titleId:   text('title_id').notNull().default(''),
  pointsId:  text('points_id').array().notNull().default([]),
  calloutId: text('callout_id').notNull().default(''),
  titleEn:   text('title_en').notNull().default(''),
  pointsEn:  text('points_en').array().notNull().default([]),
  calloutEn: text('callout_en').notNull().default(''),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ── Relations ─────────────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  meals:                  many(meals),
  dailyUsage:             many(dailyUsage),
  reports:                many(reports),
  telegramUsers:          many(telegramUsers),
  telegramLinkTokens:     many(telegramLinkTokens),
  pushTokens:             many(pushTokens),
  blastRecipients:        many(notificationBlastRecipients),
  limitRequests:          many(limitRequests),
  emailVerificationTokens: many(emailVerificationTokens),
}))
export const emailVerificationTokensRelations = relations(emailVerificationTokens, ({ one }) => ({
  user: one(users, { fields: [emailVerificationTokens.userId], references: [users.id] }),
}))
export const limitTiersRelations = relations(limitTiers, ({ many }) => ({
  requests: many(limitRequests),
}))
export const limitRequestsRelations = relations(limitRequests, ({ one }) => ({
  user: one(users, { fields: [limitRequests.userId], references: [users.id] }),
  tier: one(limitTiers, { fields: [limitRequests.tierId], references: [limitTiers.id] }),
}))
export const mealsRelations = relations(meals, ({ one }) => ({
  user: one(users, { fields: [meals.userId], references: [users.id] }),
}))
export const dailyUsageRelations = relations(dailyUsage, ({ one }) => ({
  user: one(users, { fields: [dailyUsage.userId], references: [users.id] }),
}))
export const reportsRelations = relations(reports, ({ one, many }) => ({
  user:     one(users, { fields: [reports.userId], references: [users.id] }),
  messages: many(reportMessages),
}))
export const reportMessagesRelations = relations(reportMessages, ({ one, many }) => ({
  report:      one(reports, { fields: [reportMessages.reportId], references: [reports.id] }),
  attachments: many(reportAttachments),
}))
export const reportAttachmentsRelations = relations(reportAttachments, ({ one }) => ({
  message: one(reportMessages, { fields: [reportAttachments.messageId], references: [reportMessages.id] }),
}))
export const telegramUsersRelations = relations(telegramUsers, ({ one }) => ({
  user: one(users, { fields: [telegramUsers.userId], references: [users.id] }),
}))
export const telegramLinkTokensRelations = relations(telegramLinkTokens, ({ one }) => ({
  user: one(users, { fields: [telegramLinkTokens.userId], references: [users.id] }),
}))
export const pushTokensRelations = relations(pushTokens, ({ one, many }) => ({
  user:       one(users, { fields: [pushTokens.userId], references: [users.id] }),
  recipients: many(notificationBlastRecipients),
}))
export const notificationBlastsRelations = relations(notificationBlasts, ({ many }) => ({
  recipients: many(notificationBlastRecipients),
}))
export const notificationBlastRecipientsRelations = relations(notificationBlastRecipients, ({ one }) => ({
  blast:        one(notificationBlasts, { fields: [notificationBlastRecipients.blastId], references: [notificationBlasts.id] }),
  user:         one(users, { fields: [notificationBlastRecipients.userId], references: [users.id] }),
  telegramUser: one(telegramUsers, { fields: [notificationBlastRecipients.telegramUserId], references: [telegramUsers.telegramId] }),
  pushToken:    one(pushTokens, { fields: [notificationBlastRecipients.pushTokenId], references: [pushTokens.id] }),
}))

export type User                       = typeof users.$inferSelect
export type NewUser                    = typeof users.$inferInsert
export type Meal                       = typeof meals.$inferSelect
export type Report                     = typeof reports.$inferSelect
export type ReportMessage              = typeof reportMessages.$inferSelect
export type NewReportMessage           = typeof reportMessages.$inferInsert
export type ReportAttachment           = typeof reportAttachments.$inferSelect
export type NewReportAttachment        = typeof reportAttachments.$inferInsert
export type LandingContent             = typeof landingContent.$inferSelect
export type NewLandingContent          = typeof landingContent.$inferInsert
export type TelegramUser               = typeof telegramUsers.$inferSelect
export type NewTelegramUser            = typeof telegramUsers.$inferInsert
export type TelegramLinkToken          = typeof telegramLinkTokens.$inferSelect
export type PushToken                  = typeof pushTokens.$inferSelect
export type NewPushToken               = typeof pushTokens.$inferInsert
export type NotificationBlast          = typeof notificationBlasts.$inferSelect
export type NewNotificationBlast       = typeof notificationBlasts.$inferInsert
export type NotificationBlastRecipient = typeof notificationBlastRecipients.$inferSelect
export type NewNotificationBlastRecipient = typeof notificationBlastRecipients.$inferInsert
export type LimitTier                  = typeof limitTiers.$inferSelect
export type NewLimitTier               = typeof limitTiers.$inferInsert
export type LimitRequest               = typeof limitRequests.$inferSelect
export type NewLimitRequest            = typeof limitRequests.$inferInsert
export type LegalDocumentType          = typeof legalDocumentTypes.$inferSelect
export type NewLegalDocumentType       = typeof legalDocumentTypes.$inferInsert
export type LegalDocument              = typeof legalDocuments.$inferSelect
export type NewLegalDocument           = typeof legalDocuments.$inferInsert
export type AboutContent               = typeof aboutContent.$inferSelect
export type BetaOptinConfig            = typeof betaOptinConfig.$inferSelect
export type EmailVerificationToken     = typeof emailVerificationTokens.$inferSelect
export type NewEmailVerificationToken  = typeof emailVerificationTokens.$inferInsert
