const fs = require('fs');
const file = 'c:/laragon/www/portal_kolab/api/lib/repository.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'SELECT 1 FROM cdn_assets a WHERE a.cdn_file_id=r.cdn_asset_id',
  'SELECT 1 FROM cdn_assets a WHERE a.cdn_file_id COLLATE utf8mb4_unicode_ci = r.cdn_asset_id COLLATE utf8mb4_unicode_ci'
);

content = content.replace(
  'SELECT 1 FROM cdn_assets a WHERE a.cdn_file_id=r.cdn_asset_id',
  'SELECT 1 FROM cdn_assets a WHERE a.cdn_file_id COLLATE utf8mb4_unicode_ci = r.cdn_asset_id COLLATE utf8mb4_unicode_ci'
);

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully patched repository.js');
