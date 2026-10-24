// 相容舊入口：執行五題、why／目標／自動回填的 localhost preview 回歸。
process.env.NUMBER_LINE_QUICK='1';
await import('./number-line-browser-check.mjs');
