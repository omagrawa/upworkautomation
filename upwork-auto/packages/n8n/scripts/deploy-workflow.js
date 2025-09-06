import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

const N8N_BASE_URL = process.env.N8N_WEBHOOK_URL?.replace('/webhook', '') || 'http://localhost:5678';
const N8N_API_KEY = process.env.N8N_API_KEY;

async function deployWorkflow() {
  try {
    console.log('Deploying Upwork automation workflow to n8n...');
    
    // Read workflow JSON
    const workflowPath = path.join(process.cwd(), 'workflows', 'upwork-automation.json');
    const workflowData = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
    
    // Prepare headers
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (N8N_API_KEY) {
      headers['X-N8N-API-KEY'] = N8N_API_KEY;
    }
    
    // Deploy workflow
    const response = await axios.post(
      `${N8N_BASE_URL}/api/v1/workflows`,
      workflowData,
      { headers }
    );
    
    console.log('✅ Workflow deployed successfully!');
    console.log(`Workflow ID: ${response.data.id}`);
    console.log(`Webhook URL: ${N8N_BASE_URL}/webhook/upwork-jobs`);
    
    // Save workflow ID for future reference
    const configPath = path.join(process.cwd(), 'config', 'deployed-workflows.json');
    const configDir = path.dirname(configPath);
    
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    const config = {
      workflows: {
        'upwork-automation': {
          id: response.data.id,
          name: response.data.name,
          webhookUrl: `${N8N_BASE_URL}/webhook/upwork-jobs`,
          deployedAt: new Date().toISOString()
        }
      }
    };
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('📝 Configuration saved to config/deployed-workflows.json');
    
  } catch (error) {
    console.error('❌ Failed to deploy workflow:', error.message);
    
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    
    process.exit(1);
  }
}

// Run deployment
deployWorkflow();
