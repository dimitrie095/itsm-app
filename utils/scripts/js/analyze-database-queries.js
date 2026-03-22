#!/usr/bin/env node

/**
 * Database Query Analysis Script
 * Analyzes and optimizes database queries for the ITSM application
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function colorize(color, text) {
  return `${colors[color]}${text}${colors.reset}`
}

function printHeader(title) {
  console.log(colorize('cyan', `\n${title}`))
  console.log(colorize('cyan', '='.repeat(50)))
}

function printStatus(status, message) {
  const symbols = {
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ℹ',
  }
  
  const colorMap = {
    success: 'green',
    error: 'red',
    warning: 'yellow',
    info: 'blue',
  }
  
  const symbol = symbols[status] || symbols.info
  const color = colorMap[status] || 'blue'
  
  console.log(colorize(color, `${symbol} ${message}`))
}

// Analyze Prisma schema for missing indexes
function analyzePrismaSchema() {
  printHeader('Analyzing Prisma Schema')
  
  try {
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma')
    const schemaContent = fs.readFileSync(schemaPath, 'utf8')
    
    const models = schemaContent.split('model ').slice(1)
    const missingIndexes = []
    
    models.forEach(model => {
      const modelName = model.split(' ')[0].trim()
      const modelContent = model.split('\n')
      
      // Check for common query patterns that need indexes
      const hasIdField = modelContent.some(line => line.includes('@id') || line.includes('@unique'))
      const hasCreatedAt = modelContent.some(line => line.includes('createdAt') && line.includes('DateTime'))
      const hasUpdatedAt = modelContent.some(line => line.includes('updatedAt') && line.includes('DateTime'))
      const hasStatusField = modelContent.some(line => line.includes('status') && line.includes('String'))
      const hasUserIdField = modelContent.some(line => line.includes('userId') && line.includes('String'))
      
      const recommendations = []
      
      if (hasCreatedAt) {
        recommendations.push(`Index on createdAt for sorting and filtering`)
      }
      
      if (hasStatusField) {
        recommendations.push(`Index on status for status-based queries`)
      }
      
      if (hasUserIdField) {
        recommendations.push(`Index on userId for user-specific queries`)
      }
      
      if (recommendations.length > 0) {
        missingIndexes.push({
          model: modelName,
          recommendations,
        })
      }
    })
    
    if (missingIndexes.length > 0) {
      printStatus('warning', 'Missing indexes detected:')
      missingIndexes.forEach(({ model, recommendations }) => {
        console.log(colorize('yellow', `  ${model}:`))
        recommendations.forEach(rec => {
          console.log(colorize('yellow', `    - ${rec}`))
        })
      })
    } else {
      printStatus('success', 'No missing indexes detected in schema.')
    }
    
    return missingIndexes
  } catch (error) {
    printStatus('error', `Failed to analyze Prisma schema: ${error.message}`)
    return []
  }
}

// Analyze API routes for query patterns
function analyzeApiRoutes() {
  printHeader('Analyzing API Routes for Query Patterns')
  
  try {
    const apiDir = path.join(process.cwd(), 'app', 'api')
    const routes = []
    
    function scanDirectory(dir) {
      const files = fs.readdirSync(dir, { withFileTypes: true })
      
      files.forEach(file => {
        const fullPath = path.join(dir, file.name)
        
        if (file.isDirectory()) {
          scanDirectory(fullPath)
        } else if (file.name === 'route.ts' || file.name === 'route.js') {
          routes.push(fullPath)
        }
      })
    }
    
    scanDirectory(apiDir)
    
    const queryPatterns = []
    
    routes.forEach(routePath => {
      try {
        const content = fs.readFileSync(routePath, 'utf8')
        const relativePath = path.relative(process.cwd(), routePath)
        
        // Look for Prisma queries
        const prismaQueries = content.match(/prisma\.\w+\.(findMany|findUnique|count|aggregate|groupBy)/g) || []
        
        if (prismaQueries.length > 0) {
          queryPatterns.push({
            route: relativePath,
            queries: prismaQueries,
            count: prismaQueries.length,
          })
        }
      } catch (error) {
        // Skip files that can't be read
      }
    })
    
    if (queryPatterns.length > 0) {
      printStatus('info', `Found ${queryPatterns.length} API routes with database queries:`)
      
      queryPatterns.forEach(({ route, queries, count }) => {
        console.log(colorize('blue', `  ${route}:`))
        console.log(colorize('blue', `    ${count} database queries`))
        
        // Count query types
        const queryTypes = {}
        queries.forEach(query => {
          const type = query.split('.')[2] // prisma.model.method
          queryTypes[type] = (queryTypes[type] || 0) + 1
        })
        
        Object.entries(queryTypes).forEach(([type, typeCount]) => {
          console.log(colorize('blue', `    - ${type}: ${typeCount}`))
        })
      })
    } else {
      printStatus('warning', 'No database queries found in API routes.')
    }
    
    return queryPatterns
  } catch (error) {
    printStatus('error', `Failed to analyze API routes: ${error.message}`)
    return []
  }
}

// Generate optimization recommendations
function generateOptimizations(missingIndexes, queryPatterns) {
  printHeader('Generating Optimization Recommendations')
  
  const optimizations = []
  
  // Index recommendations
  if (missingIndexes.length > 0) {
    optimizations.push({
      type: 'index',
      title: 'Add Missing Indexes',
      description: 'Create indexes to improve query performance',
      details: missingIndexes.map(({ model, recommendations }) => 
        `Model ${model}: ${recommendations.join(', ')}`
      ),
      sql: missingIndexes.map(({ model, recommendations }) => {
        const tableName = model.toLowerCase() + 's'
        return recommendations.map(rec => {
          if (rec.includes('createdAt')) {
            return `CREATE INDEX idx_${tableName}_created_at ON ${tableName}(created_at);`
          }
          if (rec.includes('status')) {
            return `CREATE INDEX idx_${tableName}_status ON ${tableName}(status);`
          }
          if (rec.includes('userId')) {
            return `CREATE INDEX idx_${tableName}_user_id ON ${tableName}(user_id);`
          }
          return ''
        }).filter(sql => sql).join('\n')
      }).join('\n'),
    })
  }
  
  // Query optimization recommendations
  if (queryPatterns.length > 0) {
    const highQueryRoutes = queryPatterns.filter(p => p.count > 5)
    
    if (highQueryRoutes.length > 0) {
      optimizations.push({
        type: 'query',
        title: 'Optimize High-Query Routes',
        description: 'Routes with excessive database queries',
        details: highQueryRoutes.map(({ route, count }) => 
          `${route}: ${count} queries (consider batching or caching)`
        ),
        actions: [
          'Implement query batching for related data',
          'Add caching for frequently accessed data',
          'Use Prisma includes instead of multiple queries',
          'Implement pagination for large result sets',
        ],
      })
    }
  }
  
  // General optimizations
  optimizations.push({
    type: 'general',
    title: 'General Database Optimizations',
    description: 'Best practices for database performance',
    actions: [
      'Enable connection pooling in Prisma',
      'Set query timeouts to prevent long-running queries',
      'Implement database connection health checks',
      'Add query logging for performance monitoring',
      'Regularly analyze and update table statistics',
    ],
    prismaConfig: `// In prisma/schema.prisma or environment variables
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["connectionPooling"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  connectionLimit = 10  // Adjust based on your needs
}`,
  })
  
  // Display optimizations
  optimizations.forEach((opt, index) => {
    console.log(colorize('cyan', `\n${index + 1}. ${opt.title}`))
    console.log(colorize('cyan', `   ${opt.description}`))
    
    if (opt.details) {
      console.log(colorize('yellow', '   Details:'))
      if (Array.isArray(opt.details)) {
        opt.details.forEach(detail => {
          console.log(colorize('yellow', `     - ${detail}`))
        })
      } else {
        console.log(colorize('yellow', `     ${opt.details}`))
      }
    }
    
    if (opt.actions) {
      console.log(colorize('green', '   Recommended Actions:'))
      opt.actions.forEach(action => {
        console.log(colorize('green', `     - ${action}`))
      })
    }
    
    if (opt.sql) {
      console.log(colorize('blue', '   SQL Statements:'))
      console.log(colorize('blue', `     ${opt.sql.replace(/\n/g, '\n     ')}`))
    }
    
    if (opt.prismaConfig) {
      console.log(colorize('magenta', '   Prisma Configuration:'))
      console.log(colorize('magenta', `     ${opt.prismaConfig.replace(/\n/g, '\n     ')}`))
    }
  })
  
  return optimizations
}

// Generate optimization report
function generateReport(missingIndexes, queryPatterns, optimizations) {
  printHeader('Generating Optimization Report')
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      missingIndexes: missingIndexes.length,
      apiRoutesWithQueries: queryPatterns.length,
      totalQueries: queryPatterns.reduce((sum, p) => sum + p.count, 0),
      optimizations: optimizations.length,
    },
    missingIndexes,
    queryPatterns,
    optimizations,
  }
  
  const reportPath = path.join(process.cwd(), 'reports', 'database-optimization.json')
  const reportDir = path.dirname(reportPath)
  
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true })
  }
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  printStatus('success', `Report saved to: ${reportPath}`)
  
  // Generate SQL file for indexes
  const sqlOptimizations = optimizations.filter(o => o.sql).map(o => o.sql).join('\n\n')
  if (sqlOptimizations) {
    const sqlPath = path.join(process.cwd(), 'scripts', 'database-optimizations.sql')
    fs.writeFileSync(sqlPath, `-- Database Optimization Script\n-- Generated: ${new Date().toISOString()}\n\n${sqlOptimizations}`)
    printStatus('success', `SQL script saved to: ${sqlPath}`)
  }
  
  return report
}

// Main function
async function main() {
  console.log(colorize('cyan', '🔍 Database Query Analysis Tool'))
  console.log(colorize('cyan', '='.repeat(50)))
  
  try {
    // Step 1: Analyze Prisma schema
    const missingIndexes = analyzePrismaSchema()
    
    // Step 2: Analyze API routes
    const queryPatterns = analyzeApiRoutes()
    
    // Step 3: Generate optimizations
    const optimizations = generateOptimizations(missingIndexes, queryPatterns)
    
    // Step 4: Generate report
    const report = generateReport(missingIndexes, queryPatterns, optimizations)
    
    // Summary
    printHeader('Analysis Complete')
    console.log(colorize('green', 'Summary:'))
    console.log(colorize('green', `  Missing indexes: ${report.summary.missingIndexes}`))
    console.log(colorize('green', `  API routes with queries: ${report.summary.apiRoutesWithQueries}`))
    console.log(colorize('green', `  Total database queries: ${report.summary.totalQueries}`))
    console.log(colorize('green', `  Optimization recommendations: ${report.summary.optimizations}`))
    
    printStatus('success', 'Database analysis completed successfully!')
    
    console.log(colorize('cyan', '\nNext Steps:'))
    console.log('  1. Review the optimization report')
    console.log('  2. Apply missing indexes (see SQL script)')
    console.log('  3. Optimize high-query API routes')
    console.log('  4. Implement general database optimizations')
    console.log('  5. Monitor performance after changes')
    
  } catch (error) {
    printStatus('error', `Analysis failed: ${error.message}`)
    console.error(error.stack)
    process.exit(1)
  }
}

// Run main function
if (require.main === module) {
  main()
}

module.exports = {
  analyzePrismaSchema,
  analyzeApiRoutes,
  generateOptimizations,
  generateReport,
}