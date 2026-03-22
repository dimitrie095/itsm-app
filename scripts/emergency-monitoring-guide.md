# Emergency Monitoring Guide

## Overview
The emergency monitoring system provides real-time security monitoring for the ITSM application. It detects suspicious activities, monitors critical files, and alerts on security events.

## Quick Start

### Windows
```bash
scripts\emergency-monitor.bat
```

### Linux/macOS
```bash
node scripts/emergency-monitor.js
```

## What It Monitors

### 1. Suspicious Login Activity
- Multiple failed login attempts
- Invalid password attempts
- Unauthorized access attempts

### 2. File System Changes
- Modifications to critical files (.env, package.json, etc.)
- Excessive file changes in short periods
- Unauthorized file access patterns

### 3. Security Events
- Potential SQL injection attempts
- XSS attack patterns
- Rate limit violations
- Exposed secrets in code

### 4. System Health
- Disk space usage
- Memory consumption
- Application errors

## Alert Thresholds

| Event Type | Threshold | Action |
|------------|-----------|--------|
| Failed Logins | 5 attempts | Send alert, log event |
| File Changes | 10 changes in 5 min | Send alert, log event |
| API Errors | 20 errors in 5 min | Send alert, log event |
| Disk Space | >90% used | Warning log |
| Memory Usage | >90% used | Warning log |

## Configuration

Edit `scripts/emergency-monitor.js` to configure:

```javascript
const CONFIG = {
  checkInterval: 30000, // Check every 30 seconds
  logFile: 'security-monitor.log',
  alertThreshold: {
    failedLogins: 5,
    fileChanges: 10,
    apiErrors: 20,
  },
  webhookUrl: process.env.SECURITY_WEBHOOK_URL, // Optional
};
```

## Webhook Integration

To receive alerts via webhook:

1. Set environment variable:
```bash
export SECURITY_WEBHOOK_URL="https://hooks.slack.com/services/..."
```

2. Supported platforms:
- Slack
- Microsoft Teams
- Discord
- Any webhook-enabled service

## Log Files

- `security-monitor.log`: Main security log
- `application.log`: Application logs (monitored)
- Backup logs with timestamps

## Response Procedures

### When an Alert is Triggered

1. **Immediate Actions**:
   - Review the security-monitor.log
   - Check affected systems
   - Isolate if necessary

2. **Investigation**:
   - Identify root cause
   - Check recent changes
   - Review access logs

3. **Remediation**:
   - Apply security patches
   - Rotate credentials if compromised
   - Update monitoring rules

## Integration with CI/CD

Add to package.json:
```json
{
  "scripts": {
    "security:monitor": "node scripts/emergency-monitor.js",
    "security:scan": "node scripts/emergency-monitor.js --scan-only"
  }
}
```

## Best Practices

1. **Run continuously** in production environments
2. **Review logs daily** for patterns
3. **Update thresholds** based on your environment
4. **Test alerts** regularly
5. **Integrate with incident response** procedures

## Troubleshooting

### Monitor not starting
- Check Node.js installation
- Verify file permissions
- Check for syntax errors

### No alerts being sent
- Verify webhook URL
- Check network connectivity
- Review alert thresholds

### High false positives
- Adjust pattern matching
- Update thresholds
- Refine monitoring rules

## Support

For issues or enhancements:
1. Check the logs for error details
2. Review configuration settings
3. Contact security team