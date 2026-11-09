import fs from 'fs';
import { TOOLS_CATALOG } from './src/constants/webviewerCatalog.js';
import { getComponentSvg } from './src/constants/webviewerIcons.js';

console.log(`Auditing all ${TOOLS_CATALOG.length} tools in TOOLS_CATALOG...`);

let issues = 0;
for (const tool of TOOLS_CATALOG) {
  const comp = {
    type: 'toolButton',
    toolName: tool.toolName,
    dataElement: tool.defaultId || tool.key,
    img: tool.icon,
  };
  const svg = getComponentSvg(comp);
  if (!svg) {
    console.log(
      `[NO SVG] ${tool.label} (${tool.toolName}) -> icon: ${tool.icon}`,
    );
    issues++;
    continue;
  }
  // Check if svg has path or rect or circle or polygon or g
  if (!/<(path|rect|circle|polygon|line|polyline|g)/i.test(svg)) {
    console.log(
      `[EMPTY/INVALID SVG] ${tool.label} (${tool.toolName}) -> icon: ${tool.icon}`,
    );
    issues++;
    continue;
  }
  // Check if it's one of the icons with fill="black" inside <svg fill="none">
  const hasSvgFillNone = /<svg[^>]*fill="none"/i.test(svg);
  const hasPathFillBlack = /fill="black"/i.test(svg);
  if (hasSvgFillNone && hasPathFillBlack) {
    console.log(
      `[AFFECTED BY CSS BUG] ${tool.label} (${tool.toolName}) -> icon: ${tool.icon}`,
    );
  }
}

console.log(`Audit complete. Issues without SVG: ${issues}`);
