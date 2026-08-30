#!/usr/bin/env node

/**
 * Environment Validation Script
 * 
 * Usage: node scripts/validate-env.js
 * 
 * Validates all required environment variables before deployment
 * Checks for common configuration errors
 * Provides helpful error messages
 */

const path = require('path');
const fs = require('fs');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'blue');
  console.log('='.repeat(60));
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'gray');
}

// Validation schema - matches src/config/env.ts
const schema = {
  required: [
    { key: 'NODE_ENV', description: 'Node environment (development/production)' },
    { key: 'DATABASE_URL', description: 'PostgreSQL connection string', validate: (v) => v.includes('postgresql://') },
    { key: 'REDIS_HOST', description: 'Redis hostname' },
    { key: 'REDIS_PORT', description: 'Redis port number' },
    { key: 'SMTP_HOST', description: 'SMTP server hostname' },
    { key: 'SMTP_PORT', description: 'SMTP port number' },
    { key: 'SMTP_USER', description: 'SMTP authentication username' },
    { key: 'SMTP_PASSWORD', description: 'SMTP authentication password' },
    { key: 'SMTP_FROM', description: 'SMTP sender email address', validate: (v) => v.includes('@') },
    { key: 'GOOGLE_CLIENT_ID', description: 'Google OAuth Client ID' },
    { key: 'GOOGLE_CLIENT_SECRET', description: 'Google OAuth Client Secret' },
    { key: 'GOOGLE_CALLBACK_URL', description: 'Google OAuth callback URL', validate: (v) => v.includes('/api/auth/google/callback') },
    { key: 'FRONTEND_URL', description: 'Frontend domain URL' },
    { key: 'SESSION_SECRET', description: 'Express session encryption secret', validate: (v) => v.length >= 32 },
    { key: 'SLACK_CLIENT_ID', description: 'Slack OAuth Client ID' },
    { key: 'SLACK_CLIENT_SECRET', description: 'Slack OAuth Client Secret' },
    { key: 'SLACK_CALLBACK_URL', description: 'Slack OAuth callback URL' },
    { key: 'SLACK_TOKEN_ENCRYPTION_KEY', description: 'Slack token encryption key', validate: (v) => v.length === 64 },
  ],
  optional: [
    { key: 'PORT', description: 'Server port (auto-assigned on Render)' },
    { key: 'REDIS_PASSWORD', description: 'Redis password (optional)' },
    { key: 'WORKER_CONCURRENCY', description: 'Concurrent email workers' },
    { key: 'MIN_EMAIL_DELAY_MS', description: 'Minimum delay between emails' },
    { key: 'MAX_EMAILS_PER_HOUR_PER_SENDER', description: 'Hourly email limit per sender' },
    { key: 'ELASTICSEARCH_URL', description: 'Elasticsearch URL (optional - search disabled if omitted)' },
    { key: 'ELASTICSEARCH_API_KEY', description: 'Elasticsearch API key (optional)' },
  ]
};

// Load environment
function loadEnv() {
  require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
  return process.env;
}

// Validate individual variable
function validateVariable(key, description, validator) {
  const value = process.env[key];
  
  if (!value) {
    logError(`${key}: Not set`);
    logInfo(`  Description: ${description}`);
    return false;
  }
  
  // Check if value looks like a placeholder
  if (value.includes('YOUR_VALUE') || value.includes('your-') || value === 'mock_value') {
    logWarning(`${key}: Placeholder value detected`);
    logInfo(`  Current: ${value.substring(0, 50)}...`);
    logInfo(`  Description: ${description}`);
    return false;
  }
  
  // Run custom validator if provided
  if (validator && !validator(value)) {
    logWarning(`${key}: Invalid format`);
    logInfo(`  Current: ${value.substring(0, 50)}...`);
    logInfo(`  Description: ${description}`);
    return false;
  }
  
  logSuccess(`${key}: Set`);
  return true;
}

// Check for common errors
function checkCommonErrors() {
  logSection('Checking for Common Configuration Errors');
  
  let hasErrors = false;
  
  // 1. Check for localhost in production
  if (process.env.NODE_ENV === 'production') {
    if (process.env.DATABASE_URL?.includes('localhost')) {
      logError('DATABASE_URL contains localhost (will fail on Render)');
      logInfo('  Use Render PostgreSQL add-on or external service');
      hasErrors = true;
    }
    
    if (process.env.REDIS_HOST?.includes('localhost') || process.env.REDIS_HOST === 'localhost') {
      logError('REDIS_HOST is localhost (will fail on Render)');
      logInfo('  Use Render Redis add-on or Upstash service');
      hasErrors = true;
    }
    
    if (process.env.FRONTEND_URL?.includes('localhost')) {
      logError('FRONTEND_URL contains localhost (will break OAuth redirects)');
      logInfo('  Set to your Vercel production domain: https://yourdomain.vercel.app');
      hasErrors = true;
    }
    
    if (process.env.GOOGLE_CALLBACK_URL?.includes('localhost')) {
      logError('GOOGLE_CALLBACK_URL contains localhost (will fail on Render)');
      logInfo('  Update to: https://your-render-domain.onrender.com/api/auth/google/callback');
      hasErrors = true;
    }
    
    if (process.env.SLACK_CALLBACK_URL?.includes('localhost')) {
      logWarning('SLACK_CALLBACK_URL contains localhost (will fail if using Slack)');
      logInfo('  Update to: https://your-render-domain.onrender.com/api/integrations/slack/callback');
    }
  }
  
  // 2. Check for Ethereal SMTP in production
  if (process.env.NODE_ENV === 'production' && process.env.SMTP_HOST === 'smtp.ethereal.email') {
    logError('Ethereal SMTP configured in production (testing service only)');
    logInfo('  Use SendGrid, AWS SES, Mailgun, or similar production email service');
    hasErrors = true;
  }
  
  // 3. Check session secret strength
  const sessionSecret = process.env.SESSION_SECRET;
  if (sessionSecret && sessionSecret.length < 32) {
    logWarning('SESSION_SECRET is too short (less than 32 characters)');
    logInfo('  Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  }
  
  // 4. Check SLACK_TOKEN_ENCRYPTION_KEY format
  const slackKey = process.env.SLACK_TOKEN_ENCRYPTION_KEY;
  if (slackKey && slackKey.length !== 64) {
    logWarning('SLACK_TOKEN_ENCRYPTION_KEY is not 64 characters');
    logInfo('  Must be exactly 64-char hex string (32 bytes)');
    logInfo('  Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  }
  
  // 5. Check for weak/test credentials
  if (process.env.NODE_ENV === 'production') {
    if (process.env.SESSION_SECRET === 'super-secret-key-for-local-testing') {
      logError('SESSION_SECRET is development placeholder');
      logInfo('  Generate new production secret immediately');
      hasErrors = true;
    }
    
    if (process.env.SLACK_TOKEN_ENCRYPTION_KEY === '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef') {
      logError('SLACK_TOKEN_ENCRYPTION_KEY is development placeholder');
      logInfo('  Generate new production key immediately');
      hasErrors = true;
    }
  }
  
  // 6. Check .env file exists
  const envPath = path.resolve(__dirname, '../../.env');
  if (!fs.existsSync(envPath)) {
    logWarning('.env file not found');
    logInfo(`  Expected at: ${envPath}`);
    logInfo('  Create from .env.example: cp .env.example .env');
  }
  
  return !hasErrors;
}

// Main validation
function validateEnvironment() {
  logSection('ENVIRONMENT VARIABLE VALIDATION');
  
  const env = loadEnv();
  let requiredValid = 0;
  let requiredTotal = schema.required.length;
  let optionalValid = 0;
  let optionalTotal = schema.optional.length;
  
  logSection('Required Variables');
  schema.required.forEach(({ key, description, validate }) => {
    if (validateVariable(key, description, validate)) {
      requiredValid++;
    }
  });
  
  logSection('Optional Variables');
  schema.optional.forEach(({ key, description, validate }) => {
    const value = process.env[key];
    if (!value) {
      logInfo(`${key}: Not set (optional)`);
    } else if (validate && !validate(value)) {
      logWarning(`${key}: Invalid format (but optional)`);
    } else {
      logSuccess(`${key}: Set`);
      optionalValid++;
    }
  });
  
  checkCommonErrors();
  
  // Summary
  logSection('VALIDATION SUMMARY');
  
  const requiredPass = requiredValid === requiredTotal;
  const requiredColor = requiredPass ? 'green' : 'red';
  log(`Required Variables: ${requiredValid}/${requiredTotal}`, requiredColor);
  
  const optionalColor = optionalValid > 0 ? 'green' : 'yellow';
  log(`Optional Variables: ${optionalValid}/${optionalTotal}`, optionalColor);
  
  // Overall status
  console.log('\n');
  if (requiredPass) {
    logSuccess('✓ All required variables are set');
    logSuccess('✓ Environment configuration is valid');
    logSuccess('\nYou can proceed with deployment to Render');
    return true;
  } else {
    logError('✗ Some required variables are missing or invalid');
    logError('✗ Please fix the errors above before deploying');
    logInfo('\nFor help, see:');
    logInfo('  - BACKEND_PRODUCTION_ENV_GUIDE.md');
    logInfo('  - RENDER_DEPLOYMENT_MATRIX.md');
    logInfo('  - .env.example (for local development template)');
    return false;
  }
}

// Run validation
const isValid = validateEnvironment();
process.exit(isValid ? 0 : 1);
