const fs = require("fs");
const content = fs.readFileSync(
  "public/lib/webviewer/ui/chunks/34TLX5MJ.js",
  "utf8",
);

const matches = [...content.matchAll(/\bdg\b/g)];
console.log("Matches count:", matches.length);
for (const m of matches) {
  console.log(content.slice(Math.max(0, m.index - 50), m.index + 50));
  console.log("---");
}
