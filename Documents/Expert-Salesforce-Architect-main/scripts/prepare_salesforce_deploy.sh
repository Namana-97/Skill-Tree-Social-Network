
#!/bin/bash
# prepare_salesforce_deploy.sh

echo "Preparing Salesforce Deployment Artifacts..."

# Zip the salesforce folder
zip -r salesforce_deploy.zip salesforce/

echo "Artifact created: salesforce_deploy.zip"
echo "To deploy, run:"
echo "sfdx force:source:deploy -f salesforce_deploy.zip -u YOUR_ORG_ALIAS"
