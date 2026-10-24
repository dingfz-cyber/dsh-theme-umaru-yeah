import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve, dirname} from 'node:path';
import {Script} from 'node:vm';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = {};
for (const [key, file] of Object.entries({source:'design-source.png', room:'room-clean.png'})) {
  const bytes = await readFile(resolve(root,'assets',file));
  if(bytes.subarray(0,8).toString('hex') !== '89504e470d0a1a0a') throw new Error(`Invalid PNG: ${file}`);
  assets[key] = `data:image/png;base64,${bytes.toString('base64')}`;
}
const css = await readFile(resolve(root,'src/theme.css'),'utf8');
const source = await readFile(resolve(root,'src/client.js'),'utf8');
const output = source.replace('/*__UMARU_ASSETS__*/ {}',()=>JSON.stringify(assets)).replace('/*__UMARU_CSS__*/ ""',()=>JSON.stringify(css));
if(output.includes('/*__UMARU_')) throw new Error('Unreplaced build marker');
new Script(output,{filename:'client.js'});
await mkdir(resolve(root,'lib'),{recursive:true});
await writeFile(resolve(root,'lib/client.js'),output);
console.log(`Built 小埋耶: ${(Buffer.byteLength(output)/1024/1024).toFixed(2)} MiB. Artwork embedded; no runtime network requests.`);
