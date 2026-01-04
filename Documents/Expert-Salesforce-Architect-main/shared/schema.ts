
import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === MOCK SALESFORCE OBJECTS ===
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  sfId: text("sf_id"), // Mock Salesforce ID
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  company: text("company"),
  status: text("status").default("New"),
  score: integer("score").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const cases = pgTable("cases", {
  id: serial("id").primaryKey(),
  sfId: text("sf_id"), // Mock Salesforce ID
  subject: text("subject").notNull(),
  description: text("description"),
  status: text("status").default("New"),
  priority: text("priority").default("Medium"),
  createdAt: timestamp("created_at").defaultNow(),
});

// === KNOWLEDGE BASE (Local RAG) ===
export const articles = pgTable("articles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  tags: text("tags").array(),
});

// === CHAT & AGENT ===
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  channel: text("channel").default("web"), // web, slack
  userId: text("user_id"), // user identifier
  status: text("status").default("active"), // active, closed, escalated
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  role: text("role").notNull(), // user, agent, system
  content: text("content").notNull(),
  metadata: jsonb("metadata"), // Store reasoning, confidence, actions taken
  createdAt: timestamp("created_at").defaultNow(),
});

// === SCHEMAS ===
export const insertLeadSchema = createInsertSchema(leads).omit({ id: true, createdAt: true });
export const insertCaseSchema = createInsertSchema(cases).omit({ id: true, createdAt: true });
export const insertArticleSchema = createInsertSchema(articles).omit({ id: true });
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });

// === TYPES ===
export type Lead = typeof leads.$inferSelect;
export type Case = typeof cases.$inferSelect;
export type Article = typeof articles.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;

export type AgentAction = {
  type: "createLead" | "updateCase" | "queryKnowledge" | "escalate" | "none";
  payload: any;
  reasoning: string;
};

export type AgentResponse = {
  reply: string;
  actions: AgentAction[];
  confidence: number;
};
