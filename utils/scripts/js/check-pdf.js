const fs = require('fs');
const data = fs.readFileSync('./test-output.pdf', { encoding: 'latin1' });
console.log('First 20 chars:', data.substring(0, 20));
console.log('First 5 hex:', Buffer.from(data.substring(0, 5), 'latin1').toString('hex'));