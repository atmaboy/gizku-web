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
  status:    text('status').notNull().default('open'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, t => ({ statusIdx: index('idx_reports_status').on(t.status) }))

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

// ── Relations ─────────────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  meals:              many(meals),
  dailyUsage:         many(dailyUsage),
  reports:            many(reports),
  telegramUsers:      many(telegramUsers),
  telegramLinkTokens: many(telegramLinkTokens),
}))
export const mealsRelations = relations(meals, ({ one }) => ({
  user: one(users, { fields: [meals.userId], references: [users.id] }),
}))
export const dailyUsageRelations = relations(dailyUsage, ({ one }) => ({
  user: one(users, { fields: [dailyUsage.userId], references: [users.id] }),
}))
export const reportsRelations = relations(reports, ({ one }) => ({
  user: one(users, { fields: [reports.userId], references: [users.id] }),
}))
export const telegramUsersRelations = relations(telegramUsers, ({ one }) => ({
  user: one(users, { fields: [telegramUsers.userId], references: [users.id] }),
}))
export const telegramLinkTokensRelations = relations(telegramLinkTokens, ({ one }) => ({
  user: one(users, { fields: [telegramLinkTokens.userId], references: [users.id] }),
}))

export type User                = typeof users.$inferSelect
export type NewUser             = typeof users.$inferInsert
export type Meal                = typeof meals.$inferSelect
export type Report              = typeof reports.$inferSelect
export type LandingContent      = typeof landingContent.$inferSelect
export type NewLandingContent   = typeof landingContent.$inferInsert
export type TelegramUser        = typeof telegramUsers.$inferSelect
export type NewTelegramUser     = typeof telegramUsers.$inferInsert
export type TelegramLinkToken   = typeof telegramLinkTokens.$inferSelect
