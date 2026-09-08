'use strict';
// 字嗨注音黑體 v1.500 的 IVS 讀音順序，見 docs/assets/fonts/README.md。
// 只修改畫面文字；選項值、存檔與抄寫字數維持原始中文字。
const READING_PHRASES = [
  ['長大', {0:1}],
  ['典當', {1:1}],
  ['巨著', {1:1}],
  ['覺得', {1:1}],
  ['辦得', {1:1}],
  ['妻子', {1:1}],
  ['兒子', {1:1}],
  ['名字', {1:1}],
  ['不阿', {1:1}]
];
function withReadingVariants(text) {
  let result=text.replace(/[\u{E0100}-\u{E01EF}]/gu,'');
  for(const [phrase,variants] of READING_PHRASES) {
    const annotated=[...phrase].map((ch,i)=>ch+(variants[i] ? String.fromCodePoint(0xE01E0+variants[i]) : '')).join('');
    result=result.split(phrase).join(annotated);
  }
  return result;
}
function annotateReading(root) {
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{
    acceptNode(node) {
      return node.parentElement.closest('script,style,svg') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    }
  });
  let node;
  while((node=walker.nextNode())) {
    const next=withReadingVariants(node.textContent);
    if(next!==node.textContent)node.textContent=next;
  }
}
if(typeof module!=='undefined')module.exports={withReadingVariants,READING_PHRASES};
