import { readFile } from 'node:fs/promises';
const key=(await readFile(new URL('./secrets/kie_api_key',import.meta.url),'utf8')).trim();
const response=await fetch('https://api.kie.ai/codex/v1/responses',{method:'POST',headers:{authorization:`Bearer ${key}`,'content-type':'application/json'},body:JSON.stringify({model:'gpt-5-6-sol',stream:false,input:[{role:'user',content:[{type:'input_text',text:'Ответь одним словом: работает'}]}],reasoning:{effort:'low'}})});
const body=await response.json().catch(()=>({}));
const text=body.output?.flatMap(x=>x.content||[]).find(x=>x.type==='output_text')?.text||'';
console.log(JSON.stringify({status:response.status,ok:response.ok,model:'gpt-5-6-sol',answer:text,error:body?.error?.message||body?.message||''},null,2));
