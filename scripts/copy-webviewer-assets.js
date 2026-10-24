import { copyFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { stat, readdir } from "fs/promises";

async function copyDir(srcDir, destDir) {
  await mkdir(destDir, { recursive: true });
  const entries = await readdir(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(srcDir, entry.name);
    const destPath = join(destDir, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await copyFile(srcPath, destPath);
    }
  }
}

async function main() {
  const packageRoot = process.cwd();
  const webviewerPublic = join(
    packageRoot,
    "node_modules",
    "@pdftron",
    "webviewer",
    "public"
  );
  const dest = join(packageRoot, "public", "lib", "webviewer");

  try {
    // clear dest if exists
    await rm(dest, { recursive: true, force: true });
  } catch (e) {
    // ignore
  }

  try {
    // copy core and ui
    await copyDir(join(webviewerPublic, "core"), join(dest, "core"));
    await copyDir(join(webviewerPublic, "ui"), join(dest, "ui"));
    console.log("WebViewer static assets copied to", dest);
  } catch (err) {
    console.error(
      "Failed to copy WebViewer assets. Have you installed @pdftron/webviewer?"
    );
    console.error(err);
    process.exitCode = 1;
  }
}

main();
