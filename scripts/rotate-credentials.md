# Credential Rotation Instructions

## Immediate Actions Required

### 1. Database Credentials
If your database credentials were exposed:
1. Log in to your database server
2. Change passwords for all database users mentioned in the code
3. Update the DATABASE_URL in your .env.local file

### 2. API Keys
For any exposed API keys:
1. Log in to each service provider dashboard
2. Revoke the exposed keys
3. Generate new keys
4. Update your .env.local file

### 3. NextAuth Secret
Generate a new secret:
```bash
openssl rand -base64 32
```
Update NEXTAUTH_SECRET in .env.local

### 4. Demo Passwords
Change all demo passwords in your environment variables:
- DEMO_ADMIN_PASSWORD
- DEMO_AGENT_PASSWORD  
- DEMO_USER_PASSWORD
- E2E_ADMIN_PASSWORD

## Verification Steps

1. Run the application to ensure all new credentials work
2. Test authentication with new passwords
3. Verify database connectivity
4. Test API integrations with new keys

## Prevention for Future

1. Never commit .env files to version control
2. Use environment variables for all secrets
3. Implement secret rotation schedule (every 90 days)
4. Use a secrets manager (Hashicorp Vault, AWS Secrets Manager) in production