
# Traceability Matrix

| Requirement | Description | Implementation File / Component |
|---|---|---|
| **FR1** | Lead Qualification Flow | `server/services/agentService.ts` (Intent detection & `lead_capture` logic) |
| **FR2** | RAG-based Case Resolution | `server/services/ragService.ts` (Lunr indexing), `server/services/agentService.ts` (Grounding) |
| **FR3** | Complex Action Triggering | `server/services/agentService.ts` (Action Planning), `salesforce/apex/AgentApexActions.cls` (Refund Logic) |
| **FR4** | Human Handoff | `server/services/agentService.ts` (`escalate` action type), `server/storage.ts` (Case creation) |
| **FR5** | Proactive Scanning | `server/services/agentService.ts` (Simulated via `simulateSprint` endpoint logic for dashboard) |
| **NFR1** | Runnable Local Demo | `npm run dev`, `server/routes.ts` |
| **NFR2** | Salesforce Artifacts | `salesforce/` folder (Apex, XML) |
| **NFR3** | CI/CD Ready | `.github/workflows/ci.yml` (Stub), `scripts/prepare_salesforce_deploy.sh` |
