// Read the actual nested SVG transforms, so geometry assertions cover A/R/A^-1
// together rather than requiring one particular matrix serialization.
export function spinPlane(scene,unit) {
  const read=name=>scene.match(new RegExp(`data-vehicle-${name}="${unit}"[^>]*transform="matrix\\(([^)]+)\\)"`))?.[1].split(' ').map(Number);
  const forward=read('plane'),inverse=read('plane-inverse');
  const angle=Number(scene.match(new RegExp(`data-vehicle-spin="${unit}"[^>]*transform="rotate\\(([^)]+)\\)"`))?.[1]);
  if(!forward || !inverse || !Number.isFinite(angle))throw Error(`Missing projected spin plane: ${unit}`);
  return {forward,inverse,angle};
}
export function spinMatrix(scene,unit,angle=spinPlane(scene,unit).angle) {
  const {forward,inverse}=spinPlane(scene,unit),radians=angle*Math.PI/180,cs=Math.cos(radians),sn=Math.sin(radians);
  const mul=(a,b)=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
  return mul(mul(forward,[cs,sn,-sn,cs,0,0]),inverse).map(n=>Math.abs(n)<1e-8?0:n);
}
