const fs = require('fs');

let content = fs.readFileSync('src/main.ts', 'utf8');
let changed = false;

if (!content.includes('enableCors')) {
  content = content.replace('const configService = app.get(ConfigService);', 'app.enableCors({ origin: true, methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS", credentials: true });\n\n  const configService = app.get(ConfigService);');
  changed = true;
}

if (!content.includes("'0.0.0.0'")) {
  content = content.replace('await app.listen(port);', "await app.listen(port, '0.0.0.0');");
  changed = true;
}

if (changed) {
  fs.writeFileSync('src/main.ts', content);
  console.log('Successfully patched src/main.ts');
} else {
  console.log('No changes needed or could not find targets.');
}
