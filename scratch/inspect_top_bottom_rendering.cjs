const fs = require('fs');
const content = fs.readFileSync(
  'node_modules/@pdftron/webviewer/public/ui/webviewer-ui.min.js',
  'utf8',
);

let idx = 0;
while ((idx = content.indexOf('getTopHeader', idx)) !== -1) {
  console.log('Found getTopHeader at', idx);
  console.log(
    content.substring(
      Math.max(0, idx - 100),
      Math.min(content.length, idx + 300),
    ),
  );
  idx += 12;
}
idx = 0;
while ((idx = content.indexOf('getBottomHeader', idx)) !== -1) {
  console.log('Found getBottomHeader at', idx);
  console.log(
    content.substring(
      Math.max(0, idx - 100),
      Math.min(content.length, idx + 300),
    ),
  );
  idx += 15;
}
