const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const serverRoot = path.resolve(__dirname, '..');
const ignoredDirectories = new Set(['node_modules', 'public']);

const collectJavaScriptFiles = directory =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.isDirectory()) {
      return ignoredDirectories.has(entry.name)
        ? []
        : collectJavaScriptFiles(path.join(directory, entry.name));
    }

    return entry.isFile() && entry.name.endsWith('.js')
      ? [path.join(directory, entry.name)]
      : [];
  });

const files = collectJavaScriptFiles(serverRoot);

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], {
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    process.exit(result.status || 1);
  }
}

console.log(`Syntax check passed for ${files.length} server JavaScript files.`);
