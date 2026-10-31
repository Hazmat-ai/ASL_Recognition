import {readFile,access} from 'node:fs/promises';
const catalog=JSON.parse(await readFile('content/catalog.json','utf8'));
const signoff=JSON.parse(await readFile('docs/release-signoff.json','utf8'));
const blockers=[];
const source=await readFile('src/models/signClassifier.ts','utf8');
const ids=[...source.matchAll(/sign: '([^']+)',\s*displayLabel:/g)].map(match=>match[1]).sort();
if(JSON.stringify(ids)!==JSON.stringify(catalog.map(item=>item.sign).sort()))blockers.push('Catalog IDs must exactly match classifier definitions');
for(const item of catalog){
 if(item.reviewStatus!=='approved'||!item.reviewedBy||!Number.isFinite(Date.parse(item.reviewedAt??'')))blockers.push(`${item.sign}: ASL educator review missing`);
 for(const key of ['demoPath','captionPath']){
  const path=item[key];
  if(typeof path!=='string'||!/^\/lessons\/[a-zA-Z0-9_./-]+$/.test(path)||path.includes('..')){blockers.push(`${item.sign}: valid ${key} required`);continue;}
  try{await access('dist'+path);}catch{blockers.push(`${item.sign}: ${path} not included in build`);}
 }
}
for(const key of ['uat','securityReview','deploymentSmoke','restoreDrill','recognitionEvaluation'])if(!signoff[key]?.approved||!signoff[key]?.reviewer||!Number.isFinite(Date.parse(signoff[key]?.date??''))||!signoff[key]?.evidence)blockers.push(`${key}: signed evidence required`);
if(blockers.length){console.error('RELEASE BLOCKED\n'+blockers.join('\n'));process.exitCode=1;}else console.log('Recorded release gates satisfied. Deploy the exact tested commit.');
