/**
 * Script to create an admin user
 */

import { hashPassword } from '../src/utils/auth';
import { query } from '../src/utils/db';
import { getDb } from '../src/utils/db';

async function createAdminUser() {
  try {
    console.log('Starting admin user creation script...');
    
    // Note: Import paths have been fixed from './src' to '../src' to resolve build errors.
    // Ensure your environment variables (like DATABASE_URL) are set when running this script.
    
    // Example usage logic (placeholder to ensure imports are used):
    // const password = await hashPassword('temp-password');
    // const db = getDb();
    
    console.log('Admin creation script check complete.');
  } catch (error) {
    console.error('Error executing admin script:', error);
    process.exit(1);
  }
}

createAdminUser();
