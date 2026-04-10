const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('-workspace.tsx')) {
            processFile(fullPath);
        }
    }
}

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    const regexPattern = /<div\s+className="flex\s+flex-wrap\s+items-center\s+justify-between\s+gap-2"[^>]*>\s*<div\s+className="flex([^>]+)?"[^>]*>\s*<SearchField\s+containerClassName="[^"]*"\s+value=\{([^}]+)\}\s+onChange=\{([^}]+)\}\s+placeholder="([^"]+)"\s*(?:data-testid="[^"]*"\s*)?\/>\s*<\/div>(?:\s*<div\s+className="flex\s+flex-wrap\s+items-center\s+gap-2"[^>]*>\s*<FilterTriggerButton\s+count=\{([^}]+)\}\s+onClick=\{([^}]+)\}\s*(?:className="[^"]*"\s*)?\/>\s*<\/div>)?\s*<\/div>/g;

    let replaced = false;

    content = content.replace(regexPattern, (match, classParams, searchValue, onChange, placeholder, count, filterOnClick) => {
        replaced = true;
        let result = `          <ManagementToolbar\n` +
                     `            searchValue={${searchValue}}\n` +
                     `            onSearchChange={${onChange}}\n` +
                     `            searchPlaceholder="${placeholder}"`;
        if (count && filterOnClick) {
            result += `\n` +
                      `            filterCount={${count}}\n` +
                      `            onFilterClick={${filterOnClick}}\n` +
                      `            showFilterButton={true}\n` +
                      `          />`;
        } else {
            result += `\n` +
                      `            showFilterButton={false}\n` +
                      `            onFilterClick={() => undefined}\n` +
                      `          />`;
        }
        return result;
    });

    if (replaced && content !== original) {
        if (!content.includes('import { ManagementToolbar }')) {
             if (content.includes('import { SearchField }')) {
                 content = content.replace('import { SearchField } from "@/components/ui/search-field";', 'import { SearchField } from "@/components/ui/search-field";\nimport { ManagementToolbar } from "@/components/ui/management-toolbar";');
             } else {
                 content = content.replace('import { FilterTriggerButton }', 'import { ManagementToolbar } from "@/components/ui/management-toolbar";\nimport { FilterTriggerButton }');
             }
        }
        
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Updated:', path.basename(filePath));
    }
}

processDir('./');
