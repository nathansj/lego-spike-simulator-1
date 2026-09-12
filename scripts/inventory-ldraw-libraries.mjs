import fs from 'node:fs/promises';
import JSZip from 'jszip';

const archivePaths = process.argv.slice(2);
const archives =
    archivePaths.length > 0
        ? archivePaths
        : [
              '/Users/Sheldon/Downloads/ldraw.zip',
              '/Users/Sheldon/Downloads/ldrawunf.zip',
              '/Users/Sheldon/Downloads/complete.zip'
          ];

const normalize = (name) =>
    name
        .replace(/^ldraw\//i, '')
        .replaceAll('\\', '/')
        .toLowerCase();
const inventory = new Map();

for (const archivePath of archives) {
    const zip = await JSZip.loadAsync(await fs.readFile(archivePath));
    const archiveName = archivePath.split('/').at(-1);
    for (const entry of Object.values(zip.files)) {
        if (entry.dir || entry.name.startsWith('__MACOSX/')) continue;
        const name = normalize(entry.name);
        if (!name.endsWith('.dat') || (!name.startsWith('parts/') && !name.startsWith('p/')))
            continue;
        const records = inventory.get(name) ?? [];
        records.push(archiveName);
        inventory.set(name, records);
    }
}

const grouped = new Map();
for (const [name, records] of [...inventory.entries()].sort(([left], [right]) =>
    left.localeCompare(right)
)) {
    const group = name.startsWith('parts/') ? 'parts' : 'primitives';
    const entries = grouped.get(group) ?? [];
    entries.push(`- \`${name}\` — ${[...new Set(records)].join(', ')}`);
    grouped.set(group, entries);
}

console.log('# LDraw library inventory');
console.log('');
console.log(`Generated: ${new Date().toISOString()}`);
console.log(`Archives: ${archives.join(', ')}`);
console.log('');
for (const [group, entries] of grouped) {
    console.log(`## ${group}`);
    console.log(`Count: ${entries.length}`);
    console.log('');
    console.log(entries.join('\n'));
    console.log('');
}
