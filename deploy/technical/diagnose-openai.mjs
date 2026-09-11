import { readFile } from 'node:fs/promises';
const key=(await readFile(new URL('./secrets/openai_api_key',import.meta.url),'utf8')).trim();
const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{authorization:`Bearer ${key}`,'content-type':'application/json'},body:JSON.stringify({model:'gpt-5.6-luna',input:'Ответь: ОК',max_output_tokens:16,store:false})});
const body=await response.json().catch(()=>({}));
console.log(JSON.stringify({status:response.status,type:body?.error?.type,code:body?.error?.code,message:body?.error?.message},null,2));
