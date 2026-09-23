import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceDir=path.dirname(fileURLToPath(import.meta.url));
const repository=path.resolve(sourceDir,'../..');
const outputDir=path.join(repository,'.scratch/e500-art');
const port=Number(process.argv[2]||8877);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Use a local port between 1024 and 65535');

http.createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  let base=sourceDir,relative=pathname;
  if(pathname==='/prototype-reference.png'){base=path.join(repository,'docs-dev');relative='/e500-approved-concept.png';}
  else if(pathname.startsWith('/candidates/'))base=outputDir;
  else if(pathname.startsWith('/node_modules/three/')){base=path.join(repository,'node_modules/three');relative=pathname.slice('/node_modules/three'.length);}
  const file=path.resolve(base,'.'+relative);
  if(!file.startsWith(base+path.sep))throw Error('Outside preview files');
  const type={'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json','.png':'image/png'}[path.extname(file)];
  res.setHeader('Content-Type',type||'application/octet-stream');
  res.setHeader('Cache-Control','no-store');
  res.end(await fs.readFile(file));
 }catch{res.statusCode=404;res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`http://127.0.0.1:${port}/index.html`));
