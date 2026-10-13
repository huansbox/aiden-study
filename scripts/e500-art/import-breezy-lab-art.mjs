import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';

const input=process.argv[2];
if(!input)throw Error('Pass the downloaded breezy-lab-art.json file');
const bundle=JSON.parse(await readFile(input,'utf8'));
if(bundle.version!==1||bundle.viewBox!=='0 0 900 470')throw Error('Unexpected art bundle');
const directory=new URL('../../docs/shared/breezy-art/',import.meta.url);
const manifest={source:'scripts/e500-art/model-breezy-lab.js',viewBox:bundle.viewBox,images:{}};
const images=[];
for(const name of ['body','window-frame','window-upper','window-lower','door-frame','door-pane']){
  if(typeof bundle.frames?.[name]!=='string')throw Error(`Missing ${name}`);
  const bytes=Buffer.from(bundle.frames[name],'base64'),info=await sharp(bytes).metadata();
  if(info.format!=='png'||info.width!==1800||info.height!==940||!info.hasAlpha)throw Error(`Invalid ${name} image`);
  manifest.images[name]={file:`${name}.png`,sha256:createHash('sha256').update(bytes).digest('hex')};images.push([name,bytes]);
}
await mkdir(directory,{recursive:true});
for(const [name,bytes] of images)await writeFile(new URL(`${name}.png`,directory),bytes);
await writeFile(new URL('manifest.json',directory),JSON.stringify(manifest,null,2)+'\n');
console.log('Saved six independent brick layers. Reload the formal workshop to verify assembly and opening.');
