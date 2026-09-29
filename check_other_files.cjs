const fs = require('fs');
const files = [
  'c:/laragon/www/portal_kolab/api/lib/repoCdnSync.js',
  'c:/laragon/www/portal_kolab/api/routes/assets.js'
];
for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (content.match(/cdn_file_id\s*=\s*([a-z]\.)?cdn_asset_id/)) {
      console.log(`Found match in ${file}`);
    }
  }
}
