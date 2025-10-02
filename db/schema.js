import { pgTable, serial, text, timestamp, boolean, json, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').unique().notNull(),
  username: text('username').unique().notNull(),
  password: text('password'),
  avatarId: text('avatar').default('1'),
  preferences: json('preferences').default({
    language: 'EN',
    autoPlay: false,
    autoNext: false,
    autoSkipIntro: false,
    theme: 'dark'
  }),
  isVerified: boolean('is_verified').default(false),
  discordId: text('discord_id').unique(),
  discordUsername: text('discord_username'),
  discordAvatar: text('discord_avatar'),
  discordAccessToken: text('discord_access_token'),
  discordRefreshToken: text('discord_refresh_token'),
  discordTokenExpiry: timestamp('discord_token_expiry'),
  authProvider: text('auth_provider').default('local'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const watchHistory = pgTable('watch_history', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  animeId: text('anime_id').notNull(),
  episodeId: text('episode_id').notNull(),
  episodeNumber: integer('episode_number').notNull(),
  watchedAt: timestamp('watched_at').defaultNow(),
  progress: integer('progress').default(0),
  completed: boolean('completed').default(false)
});

export const favorites = pgTable('favorites', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  animeId: text('anime_id').notNull(),
  title: text('title').notNull(),
  poster: text('poster'),
  addedAt: timestamp('added_at').defaultNow()
});

export const watchlist = pgTable('watchlist', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  animeId: text('anime_id').notNull(),
  title: text('title').notNull(),
  poster: text('poster'),
  status: text('status').default('plan_to_watch'),
  addedAt: timestamp('added_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  token: text('token').unique().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  used: boolean('used').default(false),
  createdAt: timestamp('created_at').defaultNow()
});

export const emailVerificationTokens = pgTable('email_verification_tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  token: text('token').unique().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  used: boolean('used').default(false),
  createdAt: timestamp('created_at').defaultNow()
});

// Reviews and Ratings tables
export const animeReviews = pgTable('anime_reviews', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  animeId: text('anime_id').notNull(),
  animeTitle: text('anime_title').notNull(),
  rating: integer('rating').notNull(),
  reviewText: text('review_text'),
  spoilerWarning: boolean('spoiler_warning').default(false),
  helpful: integer('helpful').default(0),
  reported: boolean('reported').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const reviewVotes = pgTable('review_votes', {
  id: serial('id').primaryKey(),
  reviewId: integer('review_id').references(() => animeReviews.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  helpful: boolean('helpful').notNull(),
  createdAt: timestamp('created_at').defaultNow()
});

// Watch party tables
export const watchParties = pgTable('watch_parties', {
  id: serial('id').primaryKey(),
  hostId: integer('host_id').references(() => users.id).notNull(),
  roomCode: text('room_code').unique().notNull(),
  animeId: text('anime_id').notNull(),
  animeTitle: text('anime_title').notNull(),
  episodeId: text('episode_id').notNull(),
  episodeNumber: integer('episode_number').notNull(),
  isActive: boolean('is_active').default(true),
  maxParticipants: integer('max_participants').default(10),
  isPublic: boolean('is_public').default(true),
  currentTime: integer('current_time').default(0),
  isPlaying: boolean('is_playing').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const watchPartyParticipants = pgTable('watch_party_participants', {
  id: serial('id').primaryKey(),
  partyId: integer('party_id').references(() => watchParties.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  joinedAt: timestamp('joined_at').defaultNow(),
  leftAt: timestamp('left_at')
});
