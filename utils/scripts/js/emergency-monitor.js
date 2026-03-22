#!/usr/bin/env node

/**
 * Emergency Monitoring Script for ITSM Application
 * Monitors for suspicious activity and security events
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const https = require('https');

// Configuration
const CONFIG = {
  checkInterval: 30000, // 30 seconds
  logFile: 'security-monitor.log',
  alertThreshold: {
    failedLogins: 5, // Alert after 5 failed logins
    fileChanges: 10, // Alert after 10 file changes in 5 minutes
    apiErrors: 20, // Alert after 20 API errors in 5 minutes
  },
  webhookUrl: process.env.SECURITY_WEBHOOK_URL || null,
};

// State
const state = {
  failedLogins: 0,
  fileChanges: [],
  apiErrors: [],
  lastAlert: null,
};

// Logging function
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}\n`;
  
  console.log(logMessage.trim());
  
  fs.appendFileSync(CONFIG.logFile, logMessage, 'utf8');
  
  // Send alert for critical events
  if (level === 'CRITICAL' || level === 'ALERT') {
    sendAlert(`${level}: ${message}`);
  }
}

// Send alert via webhook
function sendAlert(message) {
  const now = Date.now();
  
  // Rate limiting: don't send alerts more than once per minute
  if (state.lastAlert && (now - state.lastAlert) < 60000) {
    return;
  }
  
  state.lastAlert = now;
  
  if (CONFIG.webhookUrl) {
    const payload = JSON.stringify({
      text: `🚨 ITSM Security Alert: ${message}`,
      timestamp: new Date().toISOString(),
    });
    
    const url = new URL(CONFIG.webhookUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };
    
    const req = https.request(options, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        log(`Alert sent successfully: ${message}`, 'INFO');
      } else {
        log(`Failed to send alert: HTTP ${res.statusCode}`, 'WARN');
      }
    });
    
    req.on('error', (err) => {
      log(`Error sending alert: ${err.message}`, 'ERROR');
    });
    
    req.write(payload);
    req.end();
  }
}

// Monitor log files for suspicious patterns
function monitorLogs() {
  const logPatterns = [
    { pattern: /Failed login attempt/i, type: 'failed_login' },
    { pattern: /Invalid password/i, type: 'failed_login' },
    { pattern: /SQL injection attempt/i, type: 'sql_injection' },
    { pattern: /XSS attempt/i, type: 'xss_attempt' },
    { pattern: /Unauthorized access/i, type: 'unauthorized' },
    { pattern: /Rate limit exceeded/i, type: 'rate_limit' },
  ];
  
  // Check application logs (simplified - in production, use proper log aggregation)
  try {
    if (fs.existsSync('application.log')) {
      const logs = fs.readFileSync('application.log', 'utf8').split('\n').slice(-100);
      
      logs.forEach(line => {
        logPatterns.forEach(({ pattern, type }) => {
          if (pattern.test(line)) {
            log(`Suspicious activity detected: ${type} - ${line.substring(0, 100)}`, 'WARN');
            
            if (type === 'failed_login') {
              state.failedLogins++;
              
              if (state.failedLogins >= CONFIG.alertThreshold.failedLogins) {
                log(`Multiple failed login attempts detected: ${state.failedLogins}`, 'ALERT');
                state.failedLogins = 0; // Reset after alert
              }
            }
          }
        });
      });
    }
  } catch (err) {
    log(`Error monitoring logs: ${err.message}`, 'ERROR');
  }
}

// Monitor file system for unexpected changes
function monitorFileSystem() {
  const criticalFiles = [
    '.env',
    '.env.local',
    'package.json',
    'prisma/schema.prisma',
    'next.config.ts',
  ];
  
  const now = Date.now();
  const fiveMinutesAgo = now - 5 * 60 * 1000;
  
  // Clean old file changes
  state.fileChanges = state.fileChanges.filter(change => change.timestamp > fiveMinutesAgo);
  
  // Check critical files
  criticalFiles.forEach(file => {
    try {
      if (fs.existsSync(file)) {
        const stats = fs.statSync(file);
        const mtime = stats.mtime.getTime();
        
        // If file was modified in the last 5 minutes
        if (mtime > fiveMinutesAgo) {
          state.fileChanges.push({
            file,
            timestamp: mtime,
          });
          
          log(`Critical file modified: ${file}`, 'WARN');
        }
      }
    } catch (err) {
      // File might not exist
    }
  });
  
  // Check for too many file changes
  if (state.fileChanges.length >= CONFIG.alertThreshold.fileChanges) {
    const uniqueFiles = [...new Set(state.fileChanges.map(c => c.file))];
    log(`Excessive file modifications detected: ${uniqueFiles.join(', ')}`, 'ALERT');
    state.fileChanges = []; // Reset after alert
  }
}

// Monitor for exposed secrets
function monitorSecrets() {
  const secretPatterns = [
    { pattern: /password\s*=\s*["'][^"']{3,}["']/i, type: 'hardcoded_password' },
    { pattern: /api[_-]?key\s*=\s*["'][^"']{5,}["']/i, type: 'api_key' },
    { pattern: /secret\s*=\s*["'][^"']{5,}["']/i, type: 'secret_key' },
    { pattern: /token\s*=\s*["'][^"']{5,}["']/i, type: 'token' },
    { pattern: /-----BEGIN (RSA|DSA|EC|PRIVATE) KEY-----/, type: 'private_key' },
  ];
  
  // Check source files
  const sourceFiles = [
    'app/**/*.{js,ts,tsx}',
    'components/**/*.{js,ts,tsx}',
    'lib/**/*.{js,ts}',
    'scripts/**/*.{js,ts}',
  ];
  
  // Simplified check - in production, use proper secret scanning
  secretPatterns.forEach(({ pattern, type }) => {
    try {
      const command = `find . -name "*.js" -o -name "*.ts" -o -name "*.tsx" | xargs grep -l "${pattern.source}" 2>/dev/null || true`;
      
      exec(command, (error, stdout) => {
        if (stdout.trim()) {
          const files = stdout.trim().split('\n').filter(f => f);
          if (files.length > 0) {
            log(`Potential ${type} found in files: ${files.join(', ')}`, 'CRITICAL');
          }
        }
      });
    } catch (err) {
      // Pattern might be invalid for grep
    }
  });
}

// Check system health
function checkSystemHealth() {
  // Check disk space
  exec('df -h .', (error, stdout) => {
    if (!error) {
      const lines = stdout.trim().split('\n');
      if (lines.length > 1) {
        const usage = lines[1].match(/(\d+)%/);
        if (usage && parseInt(usage[1]) > 90) {
          log(`Disk space running low: ${usage[1]}% used`, 'WARN');
        }
      }
    }
  });
  
  // Check memory usage
  exec('free -m | grep Mem:', (error, stdout) => {
    if (!error) {
      const parts = stdout.trim().split(/\s+/);
      if (parts.length >= 3) {
        const total = parseInt(parts[1]);
        const used = parseInt(parts[2]);
        const usagePercent = Math.round((used / total) * 100);
        
        if (usagePercent > 90) {
          log(`High memory usage: ${usagePercent}%`, 'WARN');
        }
      }
    }
  });
}

// Main monitoring loop
function startMonitoring() {
  log('Starting emergency security monitoring...', 'INFO');
  log(`Configuration: ${JSON.stringify(CONFIG, null, 2)}`, 'INFO');
  
  // Initial checks
  monitorSecrets();
  checkSystemHealth();
  
  // Set up periodic monitoring
  setInterval(() => {
    log('Running security checks...', 'DEBUG');
    
    monitorLogs();
    monitorFileSystem();
    monitorSecrets();
    checkSystemHealth();
    
    // Reset counters periodically
    if (state.failedLogins > 0) {
      state.failedLogins = Math.max(0, state.failedLogins - 1);
    }
    
  }, CONFIG.checkInterval);
  
  log('Emergency monitoring active. Press Ctrl+C to stop.', 'INFO');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('Emergency monitoring stopped by user.', 'INFO');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('Emergency monitoring stopped.', 'INFO');
  process.exit(0);
});

// Start monitoring
if (require.main === module) {
  startMonitoring();
}

module.exports = {
  startMonitoring,
  log,
  monitorSecrets,
  monitorFileSystem,
  monitorLogs,
  checkSystemHealth,
};