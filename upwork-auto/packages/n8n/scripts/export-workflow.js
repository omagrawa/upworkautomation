import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

const N8N_BASE_URL = process.env.N8N_WEBHOOK_URL?.replace('/webhook', '') || 'http://localhost:5678';
const N8N_API_KEY = process.env.N8N_API_KEY;

async function exportWorkflow() {
  try {
    console.log('Exporting workflows from n8n...');
    
    // Prepare headers
    const headers = {};
    
    if (N8N_API_KEY) {
      headers['X-N8N-API-KEY'] = N8N_API_KEY;
    }
    
    // Get all workflows
    const response = await axios.get(
      `${N8N_BASE_URL}/api/v1/workflows`,
      { headers }
    );
    
    const workflows = response.data.data || response.data;
    
    console.log(`Found ${workflows.length} workflows`);
    
    // Create exports directory
    const exportsDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }
    
    // Export each workflow
    for (const workflow of workflows) {
      const filename = `${workflow.name.toLowerCase().replace(/\s+/g, '-')}.json`;
      const filepath = path.join(exportsDir, filename);
      
      fs.writeFileSync(filepath, JSON.stringify(workflow, null, 2));
      console.log(`📄 Exported: ${filename}`);
    }
    
    // Create summary file
    const summary = {
      exportedAt: new Date().toISOString(),
      count: workflows.length,
      workflows: workflows.map(w => ({
        id: w.id,
        name: w.name,
        active: w.active,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt
      }))
    };
    
    fs.writeFileSync(
      path.join(exportsDir, 'export-summary.json'),
      JSON.stringify(summary, null, 2)
    );
    
    console.log('✅ Export completed successfully!');
    console.log(`📁 Exports saved to: ${exportsDir}`);
    
  } catch (error) {
    console.error('❌ Failed to export workflows:', error.message);
    
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    
    process.exit(1);
  }
}

// Run export
exportWorkflow();
