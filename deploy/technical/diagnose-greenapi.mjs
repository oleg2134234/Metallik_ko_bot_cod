import { readFile } from 'node:fs/promises';
const url=(await readFile(new URL('./secrets/green_api_url',import.meta.url),'utf8')).trim().replace(/\/+$/,'');
const idInstance=(await readFile(new URL('./secrets/green_api_id_instance',import.meta.url),'utf8')).trim();
const tokenInstance=(await readFile(new URL('./secrets/green_api_token_instance',import.meta.url),'utf8')).trim();
const response=await fetch(`${url}/waInstance${idInstance}/getStateInstance/${tokenInstance}`);
const body=await response.json().catch(()=>({}));
console.log(JSON.stringify({status:response.status,ok:response.ok,stateInstance:body?.stateInstance,error:body?.message||''},null,2));
if(body?.stateInstance&&body.stateInstance!=='authorized'){
  console.log(`Инстанс не авторизован (статус: ${body.stateInstance}). Отсканируйте QR-код: ${url.includes('green-api.com')?`https://qr.green-api.com/waInstance${idInstance}/${tokenInstance}`:'см. личный кабинет Green API'}`);
}
