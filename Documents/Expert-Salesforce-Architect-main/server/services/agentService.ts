
import { storage } from "../storage";
import { ragService } from "./ragService";
import { salesforceAdapter } from "./salesforceAdapter";
import { type AgentAction, type AgentResponse } from "@shared/schema";

class AgentService {
  async processMessage(conversationId: number, text: string): Promise<AgentResponse> {
    // 1. Log User Message
    await storage.addMessage(conversationId, "user", text);

    // 2. Reason / Intent Detection (Simple Heuristic for Demo)
    const intent = this.detectIntent(text);
    const actions: AgentAction[] = [];
    let reply = "I'm not sure how to help with that.";

    // 3. Ground & Act
    if (intent === "refund") {
        // RAG Check for policy
        const policyDocs = await ragService.query(text);
        const policyContext = policyDocs.map(d => d.snippet).join("\n");
        
        // Mock Refund Flow
        actions.push({ type: "queryKnowledge", payload: { query: text }, reasoning: "Checking refund policy" });
        
        if (text.toLowerCase().includes("please")) {
             // Simulate "Validation" pass
             reply = `Based on our policy: "${policyContext}", I can help. I've started the refund validation process.`;
             actions.push({ type: "escalate", payload: { reason: "Refund Validation Flow" }, reasoning: "Triggering Salesforce Flow: RefundValidation" });
        } else {
             reply = `I found some info on refunds: ${policyContext}. Can you provide your Order ID?`;
        }

    } else if (intent === "lead_capture") {
        // Extract entities (naive)
        const nameMatch = text.match(/name is (\w+)/i);
        const name = nameMatch ? nameMatch[1] : "Guest";
        
        // Call Adapter
        const lead = await salesforceAdapter.createLead({
            firstName: name,
            lastName: "User",
            email: "captured@example.com",
            company: "Inbound Chat",
            status: "Open - Not Contacted"
        });
        
        actions.push({ type: "createLead", payload: lead, reasoning: "Detected sales intent" });
        reply = `Thanks ${name}. I've created a lead record for you (ID: ${lead.sfId}) and notified a sales rep.`;

    } else if (intent === "support_issue") {
        // RAG Search
        const docs = await ragService.query(text);
        if (docs.length > 0 && docs[0].score > 0.5) {
            reply = `Here is what I found: ${docs[0].snippet}`;
            actions.push({ type: "queryKnowledge", payload: { topMatch: docs[0].title }, reasoning: "Found high confidence answer" });
        } else {
            // Create Case
            const newCase = await salesforceAdapter.createCase({
                subject: "Support Request from Chat",
                description: text,
                priority: "Medium"
            });
            reply = "I've opened a support case for you. An agent will review it shortly.";
            actions.push({ type: "updateCase", payload: newCase, reasoning: "Low confidence in RAG, escalating to Case" });
        }
    } else {
        // Fallback Chitchat
        reply = "I can help with Sales (create leads) or Support (refunds, issues). How can I assist?";
    }

    // 4. Verify & Respond
    await storage.addMessage(conversationId, "agent", reply, { actions });

    return {
        reply,
        actions,
        confidence: 0.9 // Mock confidence
    };
  }

  private detectIntent(text: string): "refund" | "lead_capture" | "support_issue" | "unknown" {
    const lower = text.toLowerCase();
    if (lower.includes("refund") || lower.includes("money back")) return "refund";
    if (lower.includes("buy") || lower.includes("interested") || lower.includes("demo")) return "lead_capture";
    if (lower.includes("broken") || lower.includes("help") || lower.includes("error") || lower.includes("password")) return "support_issue";
    return "unknown";
  }
}

export const agentService = new AgentService();
