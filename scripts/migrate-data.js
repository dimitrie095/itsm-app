const Database = require('better-sqlite3');
const { Client } = require('pg');
const path = require('path');

// Database connections
const sqliteDb = new Database(path.join(__dirname, '..', 'itsm.db'), { readonly: true });
const pgClient = new Client({
  connectionString: 'postgresql://postgres:D090799t@localhost:5432/itsm?schema=public',
});

// Table mapping: Prisma model names to actual table names (following @@map)
const tableMapping = {
  customRole: 'custom_roles',
  permissionCategory: 'permission_categories',
  permission: 'permissions',
  user: 'users',
  rolePermission: 'role_permissions',
  userPermission: 'user_permissions',
  asset: 'assets',
  sla: 'slas',
  ticket: 'tickets',
  comment: 'comments',
  knowledgeBaseArticle: 'knowledge_base_articles',
  automationRule: 'automation_rules',
  automationExecution: 'automation_executions',
  account: 'accounts',
  session: 'sessions',
  verificationToken: 'verification_tokens',
  integrationConfig: 'integration_configs',
  auditLog: 'audit_logs',
  roleHierarchy: 'role_hierarchies',
};

// Order respecting foreign key constraints
const migrationOrder = [
  'customRole',
  'permissionCategory',
  'permission',
  'user',
  'rolePermission',
  'userPermission',
  'asset',
  'sla',
  'ticket',
  'comment',
  'knowledgeBaseArticle',
  'automationRule',
  'automationExecution',
  'account',
  'session',
  'verificationToken',
  'integrationConfig',
  'auditLog',
  'roleHierarchy',
];

async function migrateTable(modelName, order) {
  const tableName = tableMapping[modelName];
  console.log(`\n[${order}] Migrating ${modelName} (table: ${tableName})...`);
  
  // Get all rows from SQLite
  const rows = sqliteDb.prepare(`SELECT * FROM ${tableName}`).all();
  console.log(`  Found ${rows.length} rows`);
  
  if (rows.length === 0) {
    console.log(`  Skipping empty table`);
    return;
  }
  
  // Determine columns
  const firstRow = rows[0];
  const columns = Object.keys(firstRow);
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
  const columnList = columns.map(col => `"${col}"`).join(', ');
  
  const insertQuery = `
    INSERT INTO "${tableName}" (${columnList})
    VALUES (${placeholders})
    ON CONFLICT DO NOTHING
  `;
  
  let successCount = 0;
  for (const row of rows) {
    const values = columns.map(col => row[col]);
    try {
      await pgClient.query(insertQuery, values);
      successCount++;
    } catch (err) {
      console.error(`    Failed to insert row ${row.id || 'unknown'}: ${err.message}`);
      console.error(`    Error details:`, err);
    }
  }
  
  console.log(`  Successfully inserted ${successCount}/${rows.length} rows`);
}

async function migrateData() {
  console.log('Starting raw SQL data migration from SQLite to PostgreSQL...');
  
  try {
    // Connect to PostgreSQL
    await pgClient.connect();
    console.log('Connected to PostgreSQL database');
    
    // Test SQLite connection
    const test = sqliteDb.prepare('SELECT 1 as test').get();
    console.log('Connected to SQLite database');
    
    // Migrate tables in order
    for (let i = 0; i < migrationOrder.length; i++) {
      await migrateTable(migrationOrder[i], i + 1);
    }
    
    console.log('\n✅ Data migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pgClient.end();
    sqliteDb.close();
    console.log('Database connections closed');
  }
}

// Run migration
migrateData().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});