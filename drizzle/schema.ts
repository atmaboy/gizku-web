import {
  pgTable, uuid, text, integer, numeric, boolean,
  serial, date, jsonb, timestamp, index, primaryKey,
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

  // ── Password audit trail ──────────────────────────────────────────────────
  passwordChangedAt:  timestamp('password_changed_at', { withTimezone: true }),
  passwordChangedBy:  text('password_changed_by'),    // 'user' | 'admin'
  mustChangePassword: boolean('must_change_password').default(false).notNull(),
  adminResetBy:       text('admin_reset_by'),         // username admin yg reset
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
  loggedAt:      timestamp('logged_at', { withTimezone: true }).defaultNow().notNull(),
}, t => ({
  userIdx:   index('idx_meals_user_id').on(t.userId),
  loggedIdx: index('idx_meals_logged_at').on(t.loggedAt),
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

// ── CMS: Landing Page & Blog Content ─────────────────────────────────────────
export const landingContent = pgTable('landing_content', {
  id:         serial('id').primaryKey(),
  section:    text('section').notNull(),       // 'hero' | 'how_it_works' | 'features' | 'stats' | 'cta' | 'blog_post'
  slug:       text('slug').unique().notNull(), // URL-friendly identifier
  title:      text('title').notNull().default(''),
  subtitle:   text('subtitle'),
  body:       text('body'),                    // long-form content / blog body
  meta:       jsonb('meta'),                   // icon, cta_label, cta_url, image_url, step, dsb
  isActive:   boolean('is_active').notNull().default(true),
  sortOrder:  integer('sort_order').notNull().default(0),
  createdAt:  timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:  timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, t => ({
  sectionIdx: index('idx_landing_section').on(t.section),
  activeIdx:  index('idx_landing_active').on(t.isActive, t.section, t.sortOrder),
}))

export const usersRelations = relations(users, ({ many }) => ({
  meals: many(meals), dailyUsage: many(dailyUsage), reports: many(reports),
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

export type User            = typeof users.$inferSelect
export type NewUser         = typeof users.$inferInsert
export type Meal            = typeof meals.$inferSelect
export type Report          = typeof reports.$inferSelect
export type LandingContent  = typeof landingContent.$inferSelect
export type NewLandingContent = typeof landingContent.$inferInsert
