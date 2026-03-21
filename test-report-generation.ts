import { generateReport } from './app/reports/actions'

async function test() {
  try {
    console.log('Generating a new PDF report...')
    const report = await generateReport({
      type: 'weekly',
      name: 'Test PDF Report',
      format: 'pdf',
      emailRecipients: [],
      dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString()
      }
    })
    console.log('Report generated successfully:', report.id)
    console.log('Name:', report.name)
    console.log('Format:', report.format)
    console.log('Status:', report.status)
    
    // Now try to download it
    const { downloadReport } = await import('./app/reports/actions')
    const result = await downloadReport(report.id)
    console.log('Download successful')
    console.log('Content type:', result.contentType)
    console.log('Filename:', result.filename)
    console.log('Buffer length:', result.content instanceof Buffer ? result.content.length : 'not buffer')
    
    // Save to file for inspection
    if (result.content instanceof Buffer) {
      const fs = await import('fs/promises')
      await fs.writeFile('./test-new-report.pdf', result.content)
      console.log('Saved PDF to test-new-report.pdf')
    }
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

test()