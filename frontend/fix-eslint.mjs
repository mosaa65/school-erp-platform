import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, 'src');

function walkDir(dir, callback) {
  for (const item of readdirSync(dir)) {
    const full = join(dir, item);
    if (statSync(full).isDirectory()) walkDir(full, callback);
    else if (item.endsWith('.tsx') || item.endsWith('.ts')) callback(full);
  }
}

let total = 0;

walkDir(srcDir, (filePath) => {
  let content = readFileSync(filePath, 'utf8');
  const original = content;

  // 1. Remove: function normalizeCode(value: string): string { ... }
  content = content.replace(
    /\r?\nfunction normalizeCode\(value: string\): string \{\r?\n  return [^\n\r]+\r?\n\}\r?\n/g,
    '\n'
  );

  // 2. Remove: function normalizeRoleCode(value: string): string { ... }
  content = content.replace(
    /\r?\nfunction normalizeRoleCode\(value: string\): string \{\r?\n  return [^\n\r]+\r?\n\}\r?\n/g,
    '\n'
  );

  // 3. Remove unused LayoutGrid import from lucide-react line
  content = content.replace(/,\s*LayoutGrid/g, '');
  content = content.replace(/LayoutGrid,\s*/g, '');

  // 4. Remove: const createNewTalentFormState = ... (if unused - single line const)
  content = content.replace(
    /\r?\n  const createNewTalentFormState[^\n\r]+\r?\n/g,
    '\n'
  );

  if (content !== original) {
    writeFileSync(filePath, content, 'utf8');
    console.log(`✔ Fixed: ${basename(filePath)}`);
    total++;
  }
});

console.log(`\nDone! Fixed ${total} file(s).`);
