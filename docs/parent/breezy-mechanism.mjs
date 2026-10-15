// Isolated toy mechanism. None of these IDs or values belong to collection storage.
export const PARTS = Object.freeze([
  {id:'window-frame',name:'銀色窗框',kind:'window',frame:true,box:{x:148,y:135,width:278,height:214}},
  {id:'window-pane',name:'上下窗扇',kind:'window',frame:false,box:{x:169,y:155,width:236,height:174}},
  {id:'door-frame',name:'車門框',kind:'door',frame:true,box:{x:574,y:99,width:192,height:298}},
  {id:'door-pane',name:'藍色門扇',kind:'door',frame:false,box:{x:594,y:119,width:152,height:258}},
]);
export const TRAVEL = Object.freeze({window:84,door:122});
export function createMechanism() {
  const state={installed:new Set(),open:{window:0,door:0}};
  const known=id=>PARTS.some(part=>part.id===id);
  const canInstall=id=>known(id) && !state.installed.has(id) && (id.endsWith('-frame') || state.installed.has(id.replace('-pane','-frame')));
  return {
    state,canInstall,
    install(id) { if(!canInstall(id))return false;state.installed.add(id);return true; },
    removePane(kind) { if(!Object.hasOwn(state.open,kind))return false;state.open[kind]=0;return state.installed.delete(`${kind}-pane`); },
    move(kind,value) {
      if(!Object.hasOwn(state.open,kind) || !state.installed.has(`${kind}-pane`) || !Number.isFinite(value))return false;
      state.open[kind]=Math.max(0,Math.min(1,value));return true;
    },
  };
}
