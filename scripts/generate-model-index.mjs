import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const demoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataRoot = path.join(demoRoot, 'assets');
const outputPath = path.join(dataRoot, 'model-index.json');

async function findModelFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return findModelFiles(entryPath);
    return entry.name.toLocaleLowerCase().endsWith('.skel.bytes') ? [entryPath] : [];
    }));
    return files.flat();
}

const modelPaths = (await findModelFiles(dataRoot))
  .map((filePath) => `/${path.relative(path.join(demoRoot, 'assets'), filePath).replaceAll(path.sep, '/')}`)
  .sort();

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(modelPaths, null, 2)}\n`);