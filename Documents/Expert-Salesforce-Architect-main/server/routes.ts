
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { agentService } from "./services/agentService";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Seed data on startup
  await storage.seedKnowledgeBase();

  // === AGENT ENDPOINTS ===
  app.post(api.agent.message.path, async (req, res) => {
    try {
      const { text, conversationId, user, channel } = api.agent.message.input.parse(req.body);

      // Get or Create Conversation
      let convId = conversationId;
      if (!convId) {
        const conv = await storage.createConversation(user || "anon", channel);
        convId = conv.id;
      }

      // Process with Agent Service
      const response = await agentService.processMessage(convId, text);

      res.json({
        reply: response.reply,
        conversationId: convId,
        actions: response.actions
      });
    } catch (err) {
      console.error("Agent Error:", err);
      res.status(500).json({ message: "Internal Agent Error" });
    }
  });

  app.get(api.agent.history.path, async (req, res) => {
    const convId = parseInt(req.params.conversationId);
    if (isNaN(convId)) return res.status(400).send("Invalid ID");
    const msgs = await storage.getMessages(convId);
    res.json(msgs);
  });

  app.post(api.agent.simulateSprint.path, async (req, res) => {
    // Mock simulation logic
    res.json({
      blockersPerMonth: 12,
      resolutionRate: 0.85,
      avgFrequency: 4.2,
      resolutionTime: 24, // hours
    });
  });

  // === SALESFORCE DATA ENDPOINTS ===
  app.get(api.salesforce.leads.list.path, async (req, res) => {
    const items = await storage.getLeads();
    res.json(items);
  });

  app.get(api.salesforce.cases.list.path, async (req, res) => {
    const items = await storage.getCases();
    res.json(items);
  });

  // === ADMIN ENDPOINTS ===
  app.post(api.admin.config.path, async (req, res) => {
    const { mode } = req.body;
    // Set global mode (in-memory for demo)
    process.env.SF_MODE = mode;
    res.json({ status: `Switched to ${mode} mode` });
  });

  app.get(api.admin.status.path, async (req, res) => {
    res.json({ mode: process.env.SF_MODE === 'real' ? 'real' : 'mock' });
  });

  return httpServer;
}
