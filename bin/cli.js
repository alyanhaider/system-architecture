#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

const SKILLS_LIST = [
  'api-design-and-responses',
  'authentication-security',
  'backend-architecture',
  'caching-and-background-jobs',
  'cors-configuration',
  'database-design',
  'deployment-pipeline',
  'file-uploads-and-storage',
  'monorepo-vs-multirepo',
  'performance-optimization',
  'project-structure',
  'security-hardening'
];

const args = process.argv.slice(2);
const command = args[0];
const skillName = args[1];

// Helper for colored console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m'
};

function printHelp() {
  console.log(`\n${colors.cyan}🧠 AI Skills Library CLI${colors.reset}`);
  console.log(`Usage: npx @alyanhaider/system-architecture install <skill-name>\n`);
  console.log(`${colors.yellow}Available Skills:${colors.reset}`);
  SKILLS_LIST.forEach(s => console.log(`  - ${s}`));
  console.log('');
}

if (!command || command === '--help' || command === 'help') {
  printHelp();
  process.exit(0);
}

if (command === 'list') {
  console.log(`\n${colors.yellow}Available Skills:${colors.reset}`);
  SKILLS_LIST.forEach(s => console.log(`  - ${s}`));
  console.log('');
  process.exit(0);
}

if (command === 'install') {
  if (!skillName) {
    console.error(`${colors.red}❌ Error: Please specify a skill to install.${colors.reset}`);
    printHelp();
    process.exit(1);
  }

  // Handle extension mapping (e.g. API design skill uses .skill instead of .md in original files)
  const isApiSkill = skillName === 'api-design-and-responses';
  const fileExt = isApiSkill ? 'skill' : 'md';

  if (!SKILLS_LIST.includes(skillName)) {
    console.error(`${colors.red}❌ Error: Skill "${skillName}" not found.${colors.reset}`);
    printHelp();
    process.exit(1);
  }

  const targetDir = path.join(process.cwd(), '.cursor', 'rules');
  const targetFile = path.join(targetDir, `${skillName}.md`);

  console.log(`${colors.cyan}📥 Fetching skill "${skillName}"...${colors.reset}`);

  // We load directly from raw github to ensure they always get the latest version
  const url = `https://raw.githubusercontent.com/alyanhaider/system-architecture/main/skills/${skillName}/skill.${fileExt}`;

  https.get(url, (res) => {
    if (res.statusCode !== 200) {
      console.error(`${colors.red}❌ Failed to fetch skill from GitHub (Status Code: ${res.statusCode})${colors.reset}`);
      process.exit(1);
    }

    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      // Ensure target directory exists
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      fs.writeFileSync(targetFile, data, 'utf8');
      console.log(`${colors.green}✅ Successfully installed "${skillName}.md" to .cursor/rules/${colors.reset}\n`);
    });
  }).on('error', (err) => {
    console.error(`${colors.red}❌ Connection Error: ${err.message}${colors.reset}`);
    process.exit(1);
  });
} else {
  console.error(`${colors.red}❌ Unknown command: ${command}${colors.reset}`);
  printHelp();
  process.exit(1);
}
