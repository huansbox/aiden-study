import fs from 'node:fs/promises';
import vm from 'node:vm';
let source = await fs.readFile(new URL('./model-source.js', import.meta.url), 'utf8');
const shapes = [];
let current;
const sink = {
  part(name, z) { current = { name, z, shapes: [] }; shapes.push(current); },
  shape(type, data) { current.shapes.push({ type, ...data }); },
};
function replaceFunction(name, code) {
  const start = source.indexOf(`  function ${name}(`);
  if(start<0)throw Error(`Missing authoring function: ${name}`);
  let cursor = source.indexOf('{', start), depth = 1;
  while (depth) { cursor++; if (source[cursor] === '{') depth++; if (source[cursor] === '}') depth--; }
  source = source.slice(0, start) + code + source.slice(cursor + 1);
}
replaceFunction('part', `function part(name,z,draw){ sink.part(name,z); art=[];bounds=[];draw();return {name,z}; }`);
replaceFunction('polygon', `function polygon(vertices,fill,stroke,width){if(fill!=='none')sink.shape('face',{vertices,fill});}`);
replaceFunction('line', `function line(vertices,color,width=1){sink.shape('line',{vertices,color,width});}`);
replaceFunction('disk', `function disk(x,y,z,radius,plane,fill,stroke,sw){if(fill!=='none')sink.shape('disk',{x,y,z,radius,plane,fill});else sink.shape('ring',{x,y,z,radius,plane,fill:stroke});}`);
replaceFunction('stud', `function stud(x,y,z,color='dark',r=4.4){sink.shape('stud',{x,y,z,r,colors:colors[color]});}`);
replaceFunction('text', `function text(x,y,z,value,size=9,fill='#fff1dc'){sink.shape('text',{x,y,z,value,size,fill});}`);
replaceFunction('brick', `function brick(x,y,z,length,width,height,color='orange',studs=false){sink.shape('brick',{x,y,z,length,width,height,colors:colors[color],color});if(studs){for(let sx=x+9;sx<x+length-5;sx+=17)for(let sy=y+width-9;sy>y+5;sy-=17)stud(sx,sy,z+height,color);}}`);
vm.runInNewContext(source, { sink });
await fs.mkdir(new URL('../../.scratch/e500-art/',import.meta.url),{recursive:true});
await fs.writeFile(new URL('../../.scratch/e500-art/geometry.json', import.meta.url), JSON.stringify(shapes));
console.log(`${shapes.length} groups; ${shapes.reduce((n,p)=>n+p.shapes.length,0)} primitives`);
