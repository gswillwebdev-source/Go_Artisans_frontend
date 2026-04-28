const fs = require('fs');
const path = require('path');
const pkg = JSON.parse(fs.readFileSync('package.json'));
const deps = { ...pkg.dependencies, ...pkg.devDependencies };

function scanDir(dir) {
    let imports = new Set();
    try {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        for (const f of files) {
            if (f.name === 'node_modules') continue;
            const full = path.join(dir, f.name);
            if (f.isDirectory()) { scanDir(full).forEach(i => imports.add(i)); }
            else if (f.name.match(/\.(ts|tsx|js|jsx)$/)) {
                const content = fs.readFileSync(full, 'utf8');
                const re = /from ['"]([^'"]+)['"]/g;
                let m;
                while ((m = re.exec(content)) !== null) {
                    const p = m[1];
                    if (p.startsWith('.')) continue;
                    const parts = p.split('/');
                    const name = p.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
                    imports.add(name);
                }
            }
        }
    } catch (e) { }
    return imports;
}

const used = scanDir('./src');
const missing = [...used].filter(p => !deps[p]);
console.log('Missing packages:');
missing.forEach(p => console.log(' -', p));
