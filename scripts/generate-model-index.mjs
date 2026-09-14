import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const demoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataRoot = path.join(demoRoot, 'public', 'assets');
const indexRoot = path.join(demoRoot, 'src', 'assets');
const outputPath = path.join(indexRoot, 'model-index.json');
const characterOutputPath = path.join(indexRoot, 'character-index.json');

async function findModelFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return findModelFiles(entryPath);
    return /^st_.*\.skel\.bytes$/i.test(entry.name) ? [entryPath] : [];
    }));
    return files.flat();
}

async function findCharacterIcons(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return findCharacterIcons(entryPath);
    return /^chara_\d+.*\.png$/i.test(entry.name) ? [entryPath] : [];
  }));
  return files.flat();
}

const modelPaths = (await findModelFiles(dataRoot))
  .map((filePath) => `/${path.relative(dataRoot, filePath).replaceAll(path.sep, '/')}`)
  .sort();

await mkdir(indexRoot, { recursive: true });
await writeFile(outputPath, `${JSON.stringify(modelPaths, null, 2)}\n`);

const characterIcons = (await findCharacterIcons(dataRoot))
  .map((filePath) => {
    const relativePath = `/${path.relative(dataRoot, filePath).replaceAll(path.sep, '/')}`;
    const fileName = path.basename(filePath);
    const characterId = fileName.match(/^chara_(\d+)/i)?.[1] ?? '';
    const modelPath = modelPaths.find((candidate) => candidate.includes(`/st_${characterId}.skel.bytes`));
    const folderParts = path.dirname(relativePath).split('/').filter(Boolean);
    return {
      id: characterId,
      icon: relativePath,
      model: modelPath ?? null,
      label: folderParts.at(-1) ?? characterId,
    };
  })
  .filter((character) => character.id && character.model)
  .sort((a, b) => a.label.localeCompare(b.label, 'ja'));

await writeFile(characterOutputPath, `${JSON.stringify(characterIcons, null, 2)}\n`);