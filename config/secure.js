import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

// Load environment variables
dotenv.config();

const CONFIG_FILE = path.join(process.cwd(), 'config', '.secure-keys');

// Initialize secure configuration
const initializeSecureConfig = () => {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify({
        supabase: {
          serviceRole: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
        }
      }), { mode: 0o600 }); // Read/write for owner only
    }
    
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    
    if (!config.supabase.serviceRole) {
      throw new Error('Supabase service role key is missing');
    }
    
    return config;
  } catch (error) {
    console.error('Failed to initialize secure configuration:', error);
    process.exit(1);
  }
};

export const secureConfig = initializeSecureConfig();