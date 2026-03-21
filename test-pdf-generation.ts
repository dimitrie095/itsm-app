import { downloadReport } from './app/reports/actions'

async function test() {
  try {
    // Use an existing report ID from reports.json
    const result = await downloadReport('sample-report-1')
    console.log('PDF generation successful')
    console.log('Content type:', result.contentType)
    console.log('Filename:', result.filename)
    console.log('Content is Buffer?', result.content instanceof Buffer)
    if (result.content instanceof Buffer) {
      console.log('Buffer length:', result.content.length)
      // Optionally save to file for inspection
      const fs = await import('fs/promises')
      await fs.writeFile('./test-output.pdf', result.content)
      console.log('Saved PDF to test-output.pdf')
    }
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

test()