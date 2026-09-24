const fs = require('fs');
const file = 'c:/laragon/www/portal_kolab/index.html';
let content = fs.readFileSync(file, 'utf8');

const oldLink = `<link rel="icon" type="image/svg+xml" href="/favicon.svg">`;
const newLink = `<link rel="icon" type="image/png" href="/favicon.png">`;

content = content.replace(oldLink, newLink);

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully patched index.html');
