import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const source=new URL('./source/',import.meta.url);
const output=new URL('../../docs/leisure-mind-map/',import.meta.url);
const files=['index.html','style.css','app.js','content.js','app.webmanifest'];
const check=process.argv.includes('--check');
if(!check)await mkdir(output,{recursive:true});
for(const name of files){
  const data=await readFile(new URL(name,source));
  if(check){
    const built=await readFile(new URL(name,output)).catch(()=>null);
    if(!built?.equals(data))throw new Error(`Stale output: ${name}. Run node learning-tasks/leisure-afternoon/build.mjs`);
  }else await writeFile(new URL(name,output),data);
}
console.log(`${check?'Verified':'Built'} ${fileURLToPath(output)}`);
