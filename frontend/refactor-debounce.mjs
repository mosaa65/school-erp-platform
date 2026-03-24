import fs from 'fs';
import path from 'path';

const hookCode = `import * as React from "react";

export function useDebounceEffect(callback: () => void, delay: number, deps: React.DependencyList) {
  const timer = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    if (timer.current) clearTimeout(timer.current);

    timer.current = setTimeout(() => {
      callback();
    }, delay);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
`;

fs.mkdirSync('src/hooks', { recursive: true });
fs.writeFileSync('src/hooks/use-debounce-effect.ts', hookCode);

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

const useStatePattern1 = /\s*const\s+\[debounceTimer,\s*setDebounceTimer\]\s*=\s*React\.useState(?:<[^>]+>)?\(null\);\n?/g;
const useStatePattern2 = /\s*const\s+\[debounceTimer,\s*setDebounceTimer\]\s*=\s*useState(?:<[^>]+>)?\(null\);\n?/g;

const useEffectPattern1 = /\s*React\.useEffect\(\(\)\s*=>\s*\{\s*if\s*\(debounceTimer\)\s*\{\s*clearTimeout\(debounceTimer\);\s*\}\n*\s*const\s+timer\s*=\s*setTimeout\(\(\)\s*=>\s*\{([\s\S]*?)\},\s*(\d+)\);\n*\s*setDebounceTimer\(timer\);\n*\s*return\s*\(\)\s*=>\s*\{\s*clearTimeout\(timer\);\s*\};\s*\},\s*(\[[^\]]+\])\);/g;
const useEffectPattern2 = /\s*useEffect\(\(\)\s*=>\s*\{\s*if\s*\(debounceTimer\)\s*\{\s*clearTimeout\(debounceTimer\);\s*\}\n*\s*const\s+timer\s*=\s*setTimeout\(\(\)\s*=>\s*\{([\s\S]*?)\},\s*(\d+)\);\n*\s*setDebounceTimer\(timer\);?\n*\s*return\s*\(\)\s*=>\s*\{\s*clearTimeout\(timer\);\s*\};\s*\},\s*(\[[^\]]+\])\);/g;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    if (content.includes('debounceTimer')) {
        let changed = false;
        
        if (!content.includes('useDebounceEffect')) {
            if (content.includes('import * as React from "react";')) {
                content = content.replace('import * as React from "react";', 'import * as React from "react";\nimport { useDebounceEffect } from "@/hooks/use-debounce-effect";');
            } else {
                content = 'import { useDebounceEffect } from "@/hooks/use-debounce-effect";\n' + content;
            }
        }
        
        let oldLen = content.length;
        content = content.replace(useStatePattern1, '');
        content = content.replace(useStatePattern2, '');
        if (content.length !== oldLen) changed = true;
        
        oldLen = content.length;
        content = content.replace(useEffectPattern1, `\n\n  useDebounceEffect(() => {$1}, $2, $3);`);
        content = content.replace(useEffectPattern2, `\n\n  useDebounceEffect(() => {$1}, $2, $3);`);
        if (content.length !== oldLen) changed = true;
        
        if (changed) {
            fs.writeFileSync(file, content);
            console.log("Updated", file);
        } else {
            console.log("Skipping", file, "no match");
        }
    }
});
