import { pgTable, uuid, text, numeric, date, timestamp, boolean, integer, pgEnum } from "drizzle-orm/pg-core";

export const accountTypeEnum = pgEnum("account_type", ["depository", "credit", "investment", "loan", "other"]);
export const syncStatusEnum = pgEnum("sync_status", ["success", "error", "pending"]);

export const enrollments = pgTable("enrollments", {
  id: uuid("id").defaultRandom().primaryKey(),
  enrollmentId: text("enrollment_id").notNull().unique(),
  accessToken: text("access_token").notNull(),
  institutionName: text("institution_name"),
  status: text("status").default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  enrollmentId: text("enrollment_id"),
  tellerAccountId: text("teller_account_id").unique(),
  name: text("name").notNull(),
  type: accountTypeEnum("type").notNull(),
  subtype: text("subtype"),
  mask: text("mask"),
  balanceCurrent: numeric("balance_current"),
  balanceAvailable: numeric("balance_available"),
  institution: text("institution"),
  source: text("source").default("teller").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id").references(() => accounts.id).notNull(),
  tellerTransactionId: text("teller_transaction_id").unique(),
  amount: numeric("amount").notNull(),
  date: date("date").notNull(),
  name: text("name").notNull(),
  merchantName: text("merchant_name"),
  category: text("category"),
  subcategory: text("subcategory"),
  pending: boolean("pending").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const investmentHoldings = pgTable("investment_holdings", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountName: text("account_name"),
  ticker: text("ticker"),
  name: text("name").notNull(),
  quantity: numeric("quantity").notNull(),
  costBasis: numeric("cost_basis"),
  currentValue: numeric("current_value").notNull(),
  closePrice: numeric("close_price"),
  source: text("source").default("csv").notNull(),
  importedAt: timestamp("imported_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const budgets = pgTable("budgets", {
  id: uuid("id").defaultRandom().primaryKey(),
  category: text("category").notNull(),
  monthlyLimit: numeric("monthly_limit").notNull(),
  effectiveFrom: date("effective_from").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const netWorthSnapshots = pgTable("net_worth_snapshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  date: date("date").notNull().unique(),
  totalAssets: numeric("total_assets").notNull(),
  totalLiabilities: numeric("total_liabilities").notNull(),
  netWorth: numeric("net_worth").notNull(),
  breakdown: text("breakdown"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const syncLogs = pgTable("sync_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: text("type").notNull(),
  status: syncStatusEnum("status").notNull(),
  itemsSynced: integer("items_synced").default(0),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
