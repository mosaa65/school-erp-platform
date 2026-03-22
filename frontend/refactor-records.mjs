import fs from 'fs';
import path from 'path';

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            results.push(file);
        }
    });
    return results;
}

const files = walk('src/features').filter(f => f.endsWith('.tsx'));

const recordsPattern = /const\s+records\s*=\s*([a-zA-Z0-9_]+Query\.data\?\.data)\s*\?\?\s*\[\];/g;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    let changed = false;
    let oldLen = content.length;
    
    content = content.replace(recordsPattern, 'const records = React.useMemo(() => $1 ?? [], [$1]);');
    
    if (content.length !== oldLen) changed = true;
    
    if (changed) {
        fs.writeFileSync(file, content);
        console.log("Updated records in", file);
    }
});
