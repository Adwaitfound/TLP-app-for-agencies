#!/usr/bin/env node

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const androidBackupPath = '/Users/adwaitparchure/TLP-app for agnecies/android.bak.1766123516';

console.log('🔍 Searching for database snapshots in Android backup...\n');

// Search for potential data files
const searchPaths = [
  'app/src/main/assets/.next/server/chunks',
  'app/src/main/assets/.next/static/chunks',
];

let foundData = {
  projects: new Set(),
  invoices: new Set(),
  clients: new Set(),
  milestones: new Set()
};

// Look for JavaScript files that might contain API responses or data snapshots
searchPaths.forEach(searchPath => {
  const fullPath = join(androidBackupPath, searchPath);
  
  if (existsSync(fullPath)) {
    console.log(`📂 Searching ${searchPath}...`);
    
    try {
      const { readdirSync } = await import('fs');
      const files = readdirSync(fullPath).filter(f => f.endsWith('.js'));
      
      files.forEach(file => {
        const content = readFileSync(join(fullPath, file), 'utf-8');
        
        // Look for project data patterns
        const projectMatches = content.match(/"project_name":"([^"]+)"/g);
        if (projectMatches) {
          projectMatches.forEach(match => {
            const name = match.match(/"project_name":"([^"]+)"/)?.[1];
            if (name) foundData.projects.add(name);
          });
        }
        
        // Look for invoice patterns
        const invoiceMatches = content.match(/"invoice_number":"?([^",}]+)"?/g);
        if (invoiceMatches) {
          invoiceMatches.forEach(match => {
            const num = match.match(/"invoice_number":"?([^",}]+)"?/)?.[1];
            if (num) foundData.invoices.add(num);
          });
        }
      });
    } catch (e) {
      // Skip if directory doesn't exist
    }
  }
});

console.log('\n📊 FOUND DATA REFERENCES:');
console.log('='.repeat(60));
console.log(`Projects found: ${foundData.projects.size}`);
if (foundData.projects.size > 0) {
  console.log('Project names:');
  Array.from(foundData.projects).forEach(p => console.log(`  - ${p}`));
}

console.log(`\nInvoices found: ${foundData.invoices.size}`);
if (foundData.invoices.size > 0) {
  console.log('Invoice numbers:');
  Array.from(foundData.invoices).forEach(i => console.log(`  - ${i}`));
}
