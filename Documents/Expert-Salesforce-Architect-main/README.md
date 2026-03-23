
# Agentic Customer Support & Sales Orchestrator

## Overview
A developer-quality demonstrator of an autonomous agent that integrates with Salesforce. It features a dual-mode adapter (Mock vs Real) to simulate enterprise workflows locally.

## Features
- **Agent Chat**: Intelligent handling of Refunds, Lead Capture, and Support Issues.
- **RAG Engine**: Local knowledge base retrieval.
- **Salesforce Integration**: Mock CRM persistence locally; swappable for real Salesforce API.
- **Admin Dashboard**: View mock data and run simulations.

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Setup Database**
   ```bash
   npm run db:push
   ```

3. **Run Application**
   ```bash
   npm run dev
   ```
   Access the UI at `http://0.0.0.0:5000`.

## Configuration
- **Mock Mode**: Default. All data persisted to local PostgreSQL.
- **Real Mode**: Set `SF_MODE=real` and provide Salesforce credentials in `.env`.

## Salesforce Deployment
See `docs/deployment.md` for instructions on deploying Apex and Metadata to a Salesforce Org.
