const fs=require("fs");
const s=fs.readFileSync('./src/crm/openapi/crm.openapi.json','utf8');
let stack=[];
let inStr=false; let escaped=false;
for(let i=0;i<s.length;i++){
  const c=s[i];
  if(inStr){
    if(escaped){ escaped=false; }
    else if(c==='\\') escaped=true;
    else if(c==='"') inStr=false;
    continue;
  }
  if(c==='"') { inStr=true; }
  else if(c==='{'||c==='[') stack.push({c,i});
  else if(c==='}'||c===']'){
    if(stack.length===0){ console.log('unmatched close',c,i); process.exit(1); }
    const last=stack.pop(); const match=(last.c==='{'&&c==='}')||(last.c==='['&&c===']');
    if(!match){ console.log('mismatch',last.c,c,last.i,i); process.exit(1); }
  }
}
if(inStr) console.log('unfinished string');
else if(stack.length) console.log('unmatched open',stack.length, JSON.stringify(stack));
else console.log('braces balanced');
