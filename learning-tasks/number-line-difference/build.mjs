import {mkdir,readFile,writeFile} from 'node:fs/promises';
const source=new URL('./source/',import.meta.url), output=new URL('../../docs/number-line-difference/',import.meta.url);
const check=process.argv.includes('--check'), files=['index.html','style.css','app.js','lesson-core.js','platform.js','diagram-layout.js','problems.json'];
if(!check)await mkdir(output,{recursive:true});
for(const name of files){const data=await readFile(new URL(name,source));if(check){const built=await readFile(new URL(name,output)).catch(()=>null);if(!built?.equals(data))throw Error(`Stale output: ${name}`);}else await writeFile(new URL(name,output),data);}
for(const [name,sourceName] of [['transition.pdf','number-line-transition.pdf'],['independent.pdf','number-line-independent.pdf'],['answers.pdf','number-line-parent-answers.pdf']]){
  const data=await readFile(new URL('output/pdf/'+sourceName,import.meta.url)).catch(()=>null);
  if(!data){if(check)throw Error(`Missing printable output: ${name}`);console.log(`PDF 尚未產生：${name}`);continue;}
  if(check){const built=await readFile(new URL('print/'+name,output)).catch(()=>null);if(!built?.equals(data))throw Error(`Stale PDF: ${name}`);}
  else{await mkdir(new URL('print/',output),{recursive:true});await writeFile(new URL('print/'+name,output),data);}
}
console.log(check?'數線教學來源與產物一致。':'數線教學已重建。');
