import fs from 'fs';
const avx = fs.readFileSync(
  'public/lib/webviewer/ui/chunks/AVXU6TMA.js',
  'utf8',
);
const wyl = fs.readFileSync(
  'public/lib/webviewer/ui/chunks/WYL5LIQZ.js',
  'utf8',
);

// 1. Map imports in AVX from WYL
const impMatch = /import\s*\{([^}]+)\}\s*from\s*["']\.\/WYL5LIQZ\.js["']/.exec(
  avx,
);
const importMap = {};
if (impMatch) {
  for (const spec of impMatch[1].split(',')) {
    const parts = spec.trim().split(/\s+as\s+/);
    if (parts.length === 2) {
      importMap[parts[1].trim()] = parts[0].trim();
    } else if (parts.length === 1 && parts[0].trim()) {
      importMap[parts[0].trim()] = parts[0].trim();
    }
  }
}

// 2. Map exports from WYL: internalVar as exportName
const exportMap = {};
const expMatch = /export\s*\{([^}]+)\}/.exec(wyl);
if (expMatch) {
  for (const spec of expMatch[1].split(',')) {
    const parts = spec.trim().split(/\s+as\s+/);
    if (parts.length === 2) {
      exportMap[parts[1].trim()] = parts[0].trim();
    } else if (parts.length === 1 && parts[0].trim()) {
      exportMap[parts[0].trim()] = parts[0].trim();
    }
  }
}

// 3. In WYL, find all s(moduleObj, { default: () => svgVar })
const modToSvgVar = {};
const sRegex =
  /s\(([a-zA-Z0-9_$]+),\s*\{\s*default:\s*\(\)\s*=>\s*([a-zA-Z0-9_$]+)\s*\}\)/g;
let sMatch;
while ((sMatch = sRegex.exec(wyl)) !== null) {
  modToSvgVar[sMatch[1]] = sMatch[2];
}
console.log('Modules registered with s():', Object.keys(modToSvgVar).length);

// 4. In WYL, extract the SVG string assigned to each svgVar.
// Each assignment is of the form: svgVar = `...` or svgVar = '...'
// where the content contains <svg ... </svg> (possibly with <?xml...?> at the start).
const varToSvg = {};
for (const [mod, svgVar] of Object.entries(modToSvgVar)) {
  // Find where svgVar is assigned
  const assignRegex = new RegExp(
    '(?:' +
      svgVar.replace('$', '\\$') +
      "\\s*=\\s*)([`'])([\\s\\S]*?<\\/svg>)\\1",
  );
  const m = assignRegex.exec(wyl);
  if (m) {
    let svgContent = m[2];
    // Strip leading <?xml ... ?> if present
    const xmlIdx = svgContent.indexOf('<svg');
    if (xmlIdx > 0) {
      svgContent = svgContent.slice(xmlIdx);
    }
    varToSvg[svgVar] = svgContent
      .replace(/\r?\n|\r/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  } else {
    // console.log('Could not find assignment for:', svgVar);
  }
}
console.log('SVG contents extracted for vars:', Object.keys(varToSvg).length);

// 5. Match each icon in AVX
const iconRegex =
  /["']\.\.\/\.\.\/assets\/icons\/([^"']+)\.svg["']\s*:\s*\(\)\s*=>\s*\([^,]+,\s*i\(([^)]+)\)\)/g;
let icMatch;
const iconSvgMap = {};
let matched = 0;

while ((icMatch = iconRegex.exec(avx)) !== null) {
  const iconName = icMatch[1];
  const localMod = icMatch[2];
  const exportMod = importMap[localMod] || localMod;
  const internalMod = exportMap[exportMod] || exportMod;

  const svgVar = modToSvgVar[internalMod];
  if (svgVar && varToSvg[svgVar]) {
    iconSvgMap[iconName] = varToSvg[svgVar];
    matched++;
  } else {
    console.log('Missing icon:', iconName);
  }
}

console.log('Total icons matched perfectly:', matched);
fs.writeFileSync(
  'src/constants/webviewerIconMap.json',
  JSON.stringify(iconSvgMap, null, 2),
  'utf8',
);
console.log('Saved to src/constants/webviewerIconMap.json');
