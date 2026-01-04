
import { db } from "./db";
import {
  leads, cases, conversations, messages, articles,
  type Lead, type Case, type Conversation, type Message, type Article,
  type AgentAction
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // CRM Operations
  getLeads(): Promise<Lead[]>;
  createLead(lead: Partial<Lead>): Promise<Lead>;
  getCases(): Promise<Case[]>;
  createCase(c: Partial<Case>): Promise<Case>;
  updateCase(id: number, updates: Partial<Case>): Promise<Case>;

  // Chat Operations
  createConversation(userId?: string, channel?: string): Promise<Conversation>;
  getConversation(id: number): Promise<Conversation | undefined>;
  addMessage(conversationId: number, role: string, content: string, metadata?: any): Promise<Message>;
  getMessages(conversationId: number): Promise<Message[]>;

  // Knowledge Base
  getArticles(): Promise<Article[]>;
  searchArticles(query: string): Promise<Article[]>; // Naive implementation, service layer does better
  seedKnowledgeBase(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getLeads(): Promise<Lead[]> {
    return await db.select().from(leads).orderBy(desc(leads.createdAt));
  }

  async createLead(lead: Partial<Lead>): Promise<Lead> {
    const [newLead] = await db.insert(leads).values({
        firstName: lead.firstName ?? "Unknown",
        lastName: lead.lastName ?? "Unknown",
        email: lead.email ?? "unknown@example.com",
        company: lead.company,
        status: lead.status ?? "New",
        score: lead.score ?? 0,
        sfId: `MOCK-${Math.floor(Math.random() * 10000)}`
    }).returning();
    return newLead;
  }

  async getCases(): Promise<Case[]> {
    return await db.select().from(cases).orderBy(desc(cases.createdAt));
  }

  async createCase(c: Partial<Case>): Promise<Case> {
    const [newCase] = await db.insert(cases).values({
        subject: c.subject ?? "No Subject",
        description: c.description,
        status: c.status ?? "New",
        priority: c.priority ?? "Medium",
        sfId: `CASE-${Math.floor(Math.random() * 10000)}`
    }).returning();
    return newCase;
  }

  async updateCase(id: number, updates: Partial<Case>): Promise<Case> {
    const [updated] = await db.update(cases)
        .set(updates)
        .where(eq(cases.id, id))
        .returning();
    return updated;
  }

  async createConversation(userId: string = "anon", channel: string = "web"): Promise<Conversation> {
    const [conv] = await db.insert(conversations).values({ userId, channel }).returning();
    return conv;
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conv;
  }

  async addMessage(conversationId: number, role: string, content: string, metadata?: any): Promise<Message> {
    const [msg] = await db.insert(messages).values({
        conversationId,
        role,
        content,
        metadata
    }).returning();
    return msg;
  }

  async getMessages(conversationId: number): Promise<Message[]> {
    return await db.select().from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(messages.createdAt);
  }

  async getArticles(): Promise<Article[]> {
    return await db.select().from(articles);
  }

  async searchArticles(query: string): Promise<Article[]> {
    // Simple db-side generic search or return all for in-memory lunr filtering
    return await db.select().from(articles);
  }

  async seedKnowledgeBase(): Promise<void> {
    const existing = await this.getArticles();
    if (existing.length > 0) return;

    await db.insert(articles).values([
        { title: "Refund Policy", content: "Refunds are available within 30 days of purchase. Use the Refund Validation Flow.", tags: ["refund", "policy"] },
        { title: "Reset Password", content: "Go to settings > security > reset password. An email will be sent.", tags: ["password", "account"] },
        { title: "Pricing Tiers", content: "We have Free, Pro ($29/mo), and Enterprise plans.", tags: ["pricing", "sales"] }
    ]);

    // Seed Leads
    const leadsCount = await this.getLeads();
    if (leadsCount.length === 0) {
        await db.insert(leads).values([
            { firstName: "Alice", lastName: "Johnson", email: "alice@techcorp.com", company: "TechCorp", status: "New", score: 85, sfId: "LEAD-001" },
            { firstName: "Bob", lastName: "Smith", email: "bob@startup.io", company: "StartupIO", status: "Contacted", score: 60, sfId: "LEAD-002" },
            { firstName: "Carol", lastName: "Danvers", email: "carol@marvel.com", company: "Avengers Inc", status: "Qualified", score: 95, sfId: "LEAD-003" }
        ]);
    }

    // Seed Cases
    const casesCount = await this.getCases();
    if (casesCount.length === 0) {
        await db.insert(cases).values([
            { subject: "Login Issue", description: "User cannot login to dashboard", status: "New", priority: "High", sfId: "CASE-001" },
            { subject: "Billing Question", description: "Clarification on invoice #1234", status: "In Progress", priority: "Medium", sfId: "CASE-002" }
        ]);
    }
  }
}

export const storage = new DatabaseStorage();
