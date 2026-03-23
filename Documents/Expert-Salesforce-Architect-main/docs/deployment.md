
# Deployment Guide

## 1. Local Setup
1. Run `npm install`
2. Run `npm run dev` to start the local simulator.
3. Access the web UI at `http://0.0.0.0:5000`.

## 2. Salesforce Deployment
The `salesforce/` directory contains artifacts ready for deployment.

### Prerequisites
- Salesforce CLI (`sfdx`) installed.
- Authenticated Org (`sfdx auth:web:login`).

### Deploy Apex & Metadata
```bash
sfdx force:source:deploy -p salesforce/ -u YOUR_ORG_ALIAS
```

### Run Tests
```bash
sfdx force:apex:test:run -n AgentApexActionsTest -r human -u YOUR_ORG_ALIAS
```

## 3. Switching to Real Mode
1. Set Environment Variables in Replit or `.env`:
   - `SF_MODE=real`
   - `SF_USERNAME=...`
   - `SF_PASSWORD=...`
   - `SF_LOGIN_URL=https://login.salesforce.com`
2. Restart the server.
3. The `SalesforceAdapter` class will now attempt to use `jsforce` to connect.
