const fs = require('fs');
const content = fs.readFileSync(
  'node_modules/@pdftron/webviewer/public/ui/webviewer-ui.min.js',
  'utf8',
);
console.log(content.substring(317000, 319800));
