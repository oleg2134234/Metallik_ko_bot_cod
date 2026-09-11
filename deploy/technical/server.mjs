import http from 'node:http';
import { randomBytes, createHash } from 'node:crypto';
import { readFile, appendFile, mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const port = Number(process.env.PORT || 8080);
const root = fileURLToPath(new URL('./public/', import.meta.url));
const dataDir = fileURLToPath(new URL('./data/', import.meta.url));
await mkdir(dataDir, { recursive: true });
let openaiKey = '';
try { openaiKey = (await readFile(new URL('./secrets/openai_api_key', import.meta.url), 'utf8')).trim(); } catch {}
let kieKey = '';
try { kieKey = (await readFile(new URL('./secrets/kie_api_key', import.meta.url), 'utf8')).trim(); } catch {}
let telegramToken = '';
try { telegramToken = (await readFile(new URL('./secrets/telegram_bot_token', import.meta.url), 'utf8')).trim(); } catch {}
let companyKnowledge = '';
try { companyKnowledge = (await readFile(new URL('./knowledge.md', import.meta.url), 'utf8')).trim(); } catch {}
let googleSheetsWebhook = '';
try { googleSheetsWebhook = (await readFile(new URL('./secrets/google_sheets_webhook_url', import.meta.url), 'utf8')).trim(); } catch {}
let googleSheetsToken = '';
try { googleSheetsToken = (await readFile(new URL('./secrets/google_sheets_token', import.meta.url), 'utf8')).trim(); } catch {}
let adminPassword = '';
try { adminPassword = (await readFile(new URL('./secrets/admin_password', import.meta.url), 'utf8')).trim(); } catch {}
const adminSession = randomBytes(32).toString('hex');
const leadsFile = join(dataDir, 'leads.json');
const campaignsFile = join(dataDir, 'campaigns.json');
async function getLeads() { try { return JSON.parse(await readFile(leadsFile, 'utf8')); } catch { return []; } }
async function saveLeads(items) { await writeFile(leadsFile, JSON.stringify(items, null, 2)); }
async function getCampaigns() { try { return JSON.parse(await readFile(campaignsFile, 'utf8')); } catch { return []; } }
async function saveCampaigns(items) { await writeFile(campaignsFile, JSON.stringify(items, null, 2)); }
function isAdmin(req) { const cookie=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('metallik_admin=')); return cookie?.slice(15)===adminSession; }
function requireAdmin(req, res) { if (isAdmin(req)) return true; res.writeHead(302, { location: '/admin/login' }); res.end(); return false; }

const botInstructions = `Ты опытный менеджер по продажам российского завода «Металлик и Ко», а не справочный автоответчик. Веди естественные переговоры по-русски, вежливо и по делу.

Правила диалога:
1. Всегда учитывай всю переданную историю и карточку клиента. Не спрашивай повторно то, что клиент уже сообщил.
2. Определи товар и постепенно собери параметры заявки. За один ответ задавай не более двух наиболее важных вопросов.
3. Если клиент отвечает числом или короткой фразой, трактуй ответ в контексте предыдущего вопроса и продолжай сбор недостающих параметров.
4. Кратко объясняй, зачем нужен запрашиваемый параметр. Не перегружай клиента длинным списком.
5. Когда данных достаточно, подведи итог заявки и сообщи, что менеджер подготовит точный расчёт.
6. Не выдумывай цены, остатки, сроки, скидки, сертификаты и технические характеристики. Используй только базу знаний ниже. Для изменяемых условий предлагай уточнение менеджером.
7. Для дымоходов не давай окончательных инженерных заключений без проверки специалистом; уточняй тип прибора, топливо, диаметр выхода, высоту и трассу.
8. Не проси паспортные данные, платёжные реквизиты, пароли или коды подтверждения.
9. Отвечай обычно в 2–6 предложениях. Маркированный список используй только когда клиент сам просит перечень.

Минимальная воронка продаж:
- Этап 1 «Потребность»: выясни, что клиент строит или ремонтирует и какой товар ему нужен. Сначала ответь на его вопрос, затем задай один уточняющий вопрос.
- Этап 2 «Квалификация»: собери 3–5 ключевых параметров товара по базе знаний. Не выдавай сразу длинную анкету.
- Этап 3 «Условия»: уточни объём или размеры, город, доставку и желаемый срок покупки.
- Этап 4 «Контакт»: после выяснения основной потребности попроси имя и телефон для расчёта и связи с менеджером. Затем при необходимости уточни удобный способ связи и дополнительный контакт: e-mail или Telegram. Собирай данные постепенно, не требуй всё одним сообщением.
- Телефон является приоритетным контактом для заявки. Технический Telegram chat_id вида tg:123 не является номером телефона. Если клиент общается в Telegram, но телефон ещё не сообщил, мягко попроси его номер; известный username не спрашивай повторно.
- Если клиент не хочет сообщать телефон, не дави: предложи продолжить переписку в текущем канале или оставить e-mail/Telegram.
- Этап 5 «Заявка»: кратко повтори собранные данные, отметь недостающее и предложи передать заявку менеджеру для расчёта.
- На любом этапе сначала дай прямой ответ на вопрос или возражение клиента и только потом мягко веди к следующему шагу.
- Не дави, не обещай звонок в конкретное время без подтверждения и не называй заявку готовой, если неизвестны товар, объём/размеры, город и контакт.

БАЗА ЗНАНИЙ КОМПАНИИ:
${companyKnowledge}`;

async function askAI(message, history=[], profile={}) {
  if (!kieKey && !openaiKey) return { text:'', provider:'none' };
  const useKie=Boolean(kieKey);
  const missing=[!profile.name&&'имя',!profile.phone&&'телефон',!profile.email&&'e-mail',!profile.telegram&&'Telegram'].filter(Boolean).join(', ')||'нет';
  const profileText=`Карточка клиента CRM: канал — ${profile.channel||'не указан'}; имя — ${profile.name||'не указано'}; телефон — ${profile.phone||'не указан'}; e-mail — ${profile.email||'не указан'}; Telegram — ${profile.telegram||'не указан'}; предпочитаемый способ связи — ${profile.preferredContact||'не указан'}. Пока отсутствуют: ${missing}. Не проси повторно уже известные данные. Приоритет — получить имя и телефон, но только после ответа по существу и без давления.`;
  const input=[{role:'developer',content:[{type:'input_text',text:botInstructions}]},{role:'developer',content:[{type:'input_text',text:profileText}]},...history,{role:'user',content:[{type:'input_text',text:message}]}];
  const response = await fetch(useKie?'https://api.kie.ai/codex/v1/responses':'https://api.openai.com/v1/responses', { method: 'POST', headers: { authorization: `Bearer ${useKie?kieKey:openaiKey}`, 'content-type': 'application/json' }, body: JSON.stringify(useKie?{model:'gpt-5-6-sol',stream:false,input,reasoning:{effort:'low'}}:{model:process.env.OPENAI_MODEL||'gpt-5.6-luna',instructions:botInstructions,input:message,max_output_tokens:280,store:false}) });
  if (!response.ok) { const error=await response.text(); throw new Error(`${useKie?'Kie':'OpenAI'} ${response.status}: ${error.slice(0,240)}`); }
  const data = await response.json();
  const text=data.output?.flatMap((item)=>item.content||[]).find((item)=>item.type==='output_text')?.text?.trim()||'';
  return { text, provider:useKie?'kie':'openai' };
}

function extractPhone(value='') {
  const matches=String(value).match(/(?:\+?\d[\d\s().-]{8,}\d)/g)||[];
  for(const match of matches){
    const digits=match.replace(/\D/g,'');
    if(digits.length<10||digits.length>15)continue;
    if(digits.length===11&&digits.startsWith('8'))return `+7${digits.slice(1)}`;
    if(digits.length===10)return `+7${digits}`;
    return match.trim().replace(/^00/,'+');
  }
  return '';
}
function extractEmail(value='') { return String(value).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]||''; }
function extractTelegram(value='') {
  const text=String(value);
  const link=text.match(/t\.me\/([A-Za-z0-9_]{5,32})/i);
  if(link)return `@${link[1]}`;
  const mention=text.match(/(?:^|\s)@([A-Za-z0-9_]{5,32})(?=\s|$|[.,!?;:])/);
  return mention?`@${mention[1]}`:'';
}
function extractName(value='') {
  return String(value).match(/(?:меня\s+зовут|мо[её]\s+имя)\s+([А-ЯЁA-Z][А-ЯЁа-яёA-Za-z-]+(?:\s+[А-ЯЁA-Z][А-ЯЁа-яёA-Za-z-]+){0,2})/i)?.[1]?.trim()||'';
}
function preferredContact(value='') {
  const text=String(value).toLowerCase();
  if(/(?:пиши|напиши|связаться|удобн).{0,24}(?:telegram|телеграм|телега)/i.test(text))return 'Telegram';
  if(/(?:пиши|напиши|связаться|удобн).{0,24}(?:e-?mail|почт)/i.test(text))return 'E-mail';
  if(/(?:звон|телефон|по номеру)/i.test(text))return 'Телефон';
  return '';
}
function buildClientProfile(records=[], incoming={}) {
  const profile={name:'',phone:'',email:'',telegram:'',preferredContact:'',channel:incoming.channel||''};
  for(const item of [...records].reverse().concat(incoming)){
    const text=[item.message,item.contact].filter(Boolean).join(' ');
    profile.name=item.name||profile.name||extractName(text);
    profile.phone=item.phone||extractPhone(text)||profile.phone;
    profile.email=item.email||extractEmail(text)||profile.email;
    profile.telegram=item.telegram||(item.telegramUsername?`@${item.telegramUsername}`:'')||extractTelegram(text)||profile.telegram;
    profile.preferredContact=item.preferredContact||preferredContact(text)||profile.preferredContact;
    profile.channel=item.channel||profile.channel;
  }
  return profile;
}
function applyClientProfile(record, profile) {
  record.name=profile.name||record.name||'';
  record.phone=profile.phone||'';
  record.email=profile.email||'';
  record.telegram=profile.telegram||'';
  record.preferredContact=profile.preferredContact||'';
  return record;
}

function funnelStage(historyCount, contact) {
  if(contact && historyCount>=3)return 'Заявка формируется';
  if(contact)return 'Контакт получен';
  if(historyCount>=2)return 'Условия заказа';
  if(historyCount>=1)return 'Квалификация';
  return 'Новая потребность';
}

function clientIdFor(record){const key=record.sessionId||record.contact||record.telegramUsername||record.id;return `CL-${createHash('sha256').update(String(key)).digest('hex').slice(0,10).toUpperCase()}`}
async function syncGoogleSheet(record, allItems){
  if(!googleSheetsWebhook||!googleSheetsToken)return;
  const key=record.contact||record.sessionId;
  const history=allItems.filter(x=>(key&&x.contact===key)||(record.sessionId&&x.sessionId===record.sessionId)).slice(0,8).reverse();
  const summary=history.map(x=>`Клиент: ${x.message}${x.botReply?` | Бот: ${x.botReply}`:''}`).join(' • ').slice(-1400);
  const payload={token:googleSheetsToken,clientId:clientIdFor(record),messageId:record.id,dateAdded:history[0]?.at||record.at,lastContact:record.at,name:record.name||'',contact:record.contact||'',phone:record.phone||'',email:record.email||'',telegram:record.telegram||(record.telegramUsername?`@${record.telegramUsername}`:''),preferredContact:record.preferredContact||'',source:record.source||'',channel:String(record.source||'').startsWith('Telegram')||String(record.source||'').startsWith('Ответ на рассылку')?'Telegram':'Сайт',status:record.status||'Новый',funnelStage:record.funnelStage||'',summary,message:record.message||'',botReply:record.botReply||'',managerReply:record.managerReply||''};
  const response=await fetch(googleSheetsWebhook,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
  if(!response.ok)throw new Error(`Google Sheets ${response.status}`);
}

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
async function telegramCall(method, body={}) {
  const response=await fetch(`https://api.telegram.org/bot${telegramToken}/${method}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  const data=await response.json();
  if(!data.ok)throw new Error(`Telegram ${method}: ${data.description||response.status}`);
  return data.result;
}
async function startTelegramBot() {
  if(!telegramToken)return;
  let offset=0;
  try { await telegramCall('deleteWebhook',{drop_pending_updates:false}); const me=await telegramCall('getMe'); console.log(`Telegram bot @${me.username} connected`); } catch(error) { console.error(error.message); }
  while(true){
    try{
      const updates=await telegramCall('getUpdates',{offset,timeout:25,allowed_updates:['message']});
      for(const update of updates){
        offset=update.update_id+1;
        const message=update.message;
        if((!message?.text&&!message?.contact)||message.from?.is_bot)continue;
        const contact=`tg:${message.chat.id}`;
        const messageText=message.text||`Мой телефон: ${message.contact.phone_number}`;
        const name=[message.from?.first_name,message.from?.last_name].filter(Boolean).join(' ')||message.from?.username||'Клиент Telegram';
        const items=await getLeads();
        let source='Telegram';
        if(!messageText.startsWith('/start')){
          const campaigns=await getCampaigns();
          const campaign=campaigns.find(c=>c.channel==='Telegram'&&c.recipients?.some(r=>r.contact===contact&&r.sentAt&&!r.repliedAt));
          if(campaign){const recipient=campaign.recipients.find(r=>r.contact===contact&&r.sentAt&&!r.repliedAt);recipient.status='Ответил';recipient.repliedAt=new Date().toISOString();recipient.reply=messageText;campaign.status='Есть ответы';source=`Ответ на рассылку: ${campaign.title}`;await saveCampaigns(campaigns)}
        }
        const history=items.filter(x=>x.contact===contact).slice(0,8).reverse().flatMap(x=>[{role:'user',content:[{type:'input_text',text:x.message}]},...(x.botReply?[{role:'assistant',content:[{type:'output_text',text:x.botReply}]}]:[])]);
        const priorRecords=items.filter(x=>x.contact===contact);
        const profile=buildClientProfile(priorRecords,{name,phone:message.contact?.phone_number||'',telegramUsername:message.from?.username||'',message:messageText,contact,channel:'Telegram'});
        let reply=messageText.startsWith('/start')?'Здравствуйте! Я онлайн-консультант компании «Металлик и Ко». Расскажите, какая продукция вас интересует?':'Спасибо! Уточните, пожалуйста, товар, количество или размеры и город доставки.';
        let provider='fallback';
        try{const answer=await askAI(messageText,history,profile);reply=answer.text||reply;provider=answer.text?answer.provider:'fallback'}catch(error){console.error(new Date().toISOString(),error.message)}
        const record=applyClientProfile({id:`CL-${Date.now()}`,at:new Date().toISOString(),sessionId:contact,name,contact,message:messageText,botReply:reply,aiProvider:provider,source,funnelStage:funnelStage(history.length/2,profile.phone||profile.email||profile.telegram),telegramUsername:message.from?.username||'',status:history.length?'В работе':'Новый',note:''},profile);
        items.unshift(record);
        await saveLeads(items); void syncGoogleSheet(items[0],items).catch(error=>console.error(new Date().toISOString(),error.message));
        const asksForPhone=!profile.phone&&/(?:телефон|номер)/i.test(reply);
        const replyMarkup=asksForPhone?{keyboard:[[{text:'📱 Отправить номер телефона',request_contact:true}]],resize_keyboard:true,one_time_keyboard:true}:message.contact?{remove_keyboard:true}:undefined;
        await telegramCall('sendMessage',{chat_id:message.chat.id,text:reply,...(replyMarkup?{reply_markup:replyMarkup}:{})});
      }
    }catch(error){console.error(new Date().toISOString(),error.message);await wait(3000)}
  }
}

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
const json = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' }); res.end(JSON.stringify(body)); };
const readBody = async (req) => { const parts=[]; for await (const part of req) parts.push(part); return JSON.parse(Buffer.concat(parts).toString('utf8') || '{}'); };
const readTextBody = async (req) => { const parts=[]; for await (const part of req) parts.push(part); return Buffer.concat(parts).toString('utf8'); };

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') return json(res, 200, { status: 'ok', service: 'metallik-bot-technical', aiProvider:kieKey?'kie':openaiKey?'openai':'none',googleSheets:Boolean(googleSheetsWebhook&&googleSheetsToken) });
    if (req.method === 'GET' && req.url?.startsWith('/admin/login')) { const file=await readFile(join(root,'login.html')); res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}); return res.end(file); }
    if (req.method === 'POST' && req.url === '/admin/login') { const body=new URLSearchParams(await readTextBody(req)); if(body.get('username')==='admin'&&body.get('password')===adminPassword&&adminPassword){res.writeHead(302,{location:'/admin','set-cookie':`metallik_admin=${adminSession}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800`});return res.end();}res.writeHead(302,{location:'/admin/login?error=1'});return res.end(); }
    if (req.method === 'GET' && req.url === '/admin/logout') { res.writeHead(302,{location:'/admin/login','set-cookie':'metallik_admin=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'}); return res.end(); }
    if (req.url === '/admin' || req.url === '/admin/') { if (!requireAdmin(req,res)) return; let file=await readFile(join(root,'admin.html'),'utf8'); file=file.replace('</head>','<link rel="stylesheet" href="/admin-mailings.css"></head>').replace('</body>','<script src="/admin-mailings.js"></script><script src="/admin-communications.js"></script></body>'); res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}); return res.end(file); }
    if (req.url === '/api/admin/leads' && req.method === 'GET') { if (!requireAdmin(req,res)) return; return json(res,200,{items:await getLeads()}); }
    if (req.url === '/api/admin/leads' && req.method === 'POST') { if (!requireAdmin(req,res)) return; const body=await readBody(req); const items=await getLeads(); const item={id:`CL-${Date.now()}`,at:new Date().toISOString(),name:String(body.name||''),contact:String(body.contact||''),message:String(body.message||''),source:String(body.source||'Добавлен вручную'),status:'Новый',note:''}; items.unshift(item); await saveLeads(items); return json(res,201,{item}); }
    if (req.url === '/api/admin/leads/import' && req.method === 'POST') {
      if (!requireAdmin(req,res)) return;
      const body=await readBody(req);
      const lines=String(body.text||'').split('\n').map(line=>line.trim()).filter(Boolean);
      if(!lines.length)return json(res,400,{error:'Вставьте хотя бы одну строку'});
      const items=await getLeads();
      let imported=0,skipped=0;
      for(const line of lines){
        const phone=extractPhone(line),email=extractEmail(line),telegram=extractTelegram(line);
        if(!phone&&!email&&!telegram){skipped++;continue}
        const dupe=items.find(x=>(phone&&(x.phone===phone||x.contact===phone))||(email&&(x.email===email||x.contact===email))||(telegram&&(x.telegram===telegram||x.contact===telegram||(x.telegramUsername&&`@${x.telegramUsername}`===telegram))));
        if(dupe){skipped++;continue}
        const rest=line.split(',').map(part=>part.trim()).filter(Boolean).filter(part=>!extractPhone(part)&&!extractEmail(part)&&!extractTelegram(part));
        const name=rest[0]||'Без имени';
        const item={id:`CL-${Date.now()}-${imported}`,at:new Date().toISOString(),name,contact:phone||email||telegram||'',phone,email,telegram,source:'Добавлен вручную (импорт)',status:'Новый',note:''};
        items.unshift(item);
        imported++;
      }
      await saveLeads(items);
      return json(res,200,{imported,skipped});
    }
    if (req.url?.match(/^\/api\/admin\/leads\/[^/]+\/message$/) && req.method === 'POST') {
      if (!requireAdmin(req,res)) return;
      const id=decodeURIComponent(req.url.split('/')[4]); const body=await readBody(req); const message=String(body.message||'').trim();
      if(!message||message.length>2000)return json(res,400,{error:'Введите сообщение длиной до 2000 символов'});
      const items=await getLeads(); const index=items.findIndex(x=>x.id===id); if(index<0)return json(res,404,{error:'Клиент не найден'});
      const lead=items[index]; const telegramId=[lead.sessionId,lead.contact].find(x=>String(x||'').startsWith('tg:'));
      let channel='';
      if(telegramId){
        if(!telegramToken)return json(res,409,{error:'Telegram-бот не подключён'});
        await telegramCall('sendMessage',{chat_id:String(telegramId).slice(3),text:message}); channel='Telegram';
      }else if(lead.sessionId){ channel='Чат на сайте'; }
      else return json(res,409,{error:'Для отправки по номеру подключите WhatsApp или SMS. Сейчас можно позвонить клиенту по кнопке в карточке.',phone:lead.phone||lead.contact||''});
      const sent={id:`MSG-${Date.now()}`,at:new Date().toISOString(),message,channel};
      lead.managerReplies=[...(lead.managerReplies||[]),sent]; lead.status='В работе'; await saveLeads(items);
      const syncRecord={...lead,id:sent.id,at:sent.at,message:'',botReply:'',managerReply:message};
      void syncGoogleSheet(syncRecord,items).catch(error=>console.error(new Date().toISOString(),error.message));
      return json(res,200,{sent,lead});
    }
    if (req.url?.startsWith('/api/admin/leads/') && req.method === 'PATCH') {
      if (!requireAdmin(req,res)) return;
      const id=decodeURIComponent(req.url.split('/').pop());
      const body=await readBody(req);
      const items=await getLeads();
      const index=items.findIndex(x=>x.id===id);
      if(index<0)return json(res,404,{error:'Клиент не найден'});
      const current=items[index];
      const next={...current,status:String(body.status||current.status),note:String(body.note??current.note)};
      if(body.name!==undefined)next.name=String(body.name).trim();
      if(body.phone!==undefined)next.phone=String(body.phone).trim();
      if(body.email!==undefined)next.email=String(body.email).trim();
      if(body.telegram!==undefined)next.telegram=String(body.telegram).trim();
      if(body.phone!==undefined||body.email!==undefined||body.telegram!==undefined){
        next.contact=next.phone||next.email||next.telegram||current.contact;
      }
      items[index]=next;
      await saveLeads(items);
      return json(res,200,{item:items[index]});
    }
    if (req.url === '/api/admin/export.csv' && req.method === 'GET') { if (!requireAdmin(req,res)) return; const items=await getLeads(); const esc=v=>`"${String(v??'').replaceAll('"','""')}"`; const csv='Дата,Имя,Контакт,Источник,Статус,Сообщение,Заметка\n'+items.map(x=>[x.at,x.name,x.contact,x.source,x.status,x.message,x.note].map(esc).join(',')).join('\n'); res.writeHead(200,{'content-type':'text/csv; charset=utf-8','content-disposition':'attachment; filename="metallik-clients.csv"'}); return res.end('\uFEFF'+csv); }
    if (req.url === '/api/admin/campaigns' && req.method === 'GET') { if (!requireAdmin(req,res)) return; return json(res,200,{items:await getCampaigns()}); }
    if (req.url === '/api/admin/campaigns' && req.method === 'POST') { if (!requireAdmin(req,res)) return; const body=await readBody(req); const recipients=String(body.recipients||'').split(/[\n,;]+/).map(x=>x.trim()).filter(Boolean); if(!body.title||!body.message||!recipients.length)return json(res,400,{error:'Заполните название, текст и получателей'}); const items=await getCampaigns(); const item={id:`CMP-${Date.now()}`,createdAt:new Date().toISOString(),title:String(body.title),channel:String(body.channel||'Telegram'),message:String(body.message),recipients:recipients.map(contact=>({contact,status:'В очереди',sentAt:null,repliedAt:null,reply:''})),status:'Черновик'}; items.unshift(item); await saveCampaigns(items); return json(res,201,{item}); }
    if (req.url?.match(/^\/api\/admin\/campaigns\/[^/]+\/send$/) && req.method === 'POST') {
      if (!requireAdmin(req,res)) return;
      const id=decodeURIComponent(req.url.split('/')[4]); const items=await getCampaigns(); const item=items.find(x=>x.id===id);
      if(!item)return json(res,404,{error:'Рассылка не найдена'});
      if(item.channel!=='Telegram')return json(res,409,{error:`Канал ${item.channel} ещё не подключён`,needsCredentials:true});
      if(!telegramToken)return json(res,409,{error:'Telegram-токен не установлен',needsCredentials:true});
      let sent=0,failed=0;
      for(const recipient of item.recipients){
        const raw=String(recipient.contact); const chatId=raw.startsWith('tg:')?raw.slice(3):/^\d+$/.test(raw)?raw:'';
        if(!chatId){recipient.status='Ошибка: нужен chat_id';failed++;continue}
        try{await telegramCall('sendMessage',{chat_id:chatId,text:item.message});recipient.status='Отправлено';recipient.sentAt=new Date().toISOString();sent++}catch(error){recipient.status='Ошибка отправки';recipient.error=error.message;failed++}
      }
      item.status=sent&&failed?'Отправлена частично':sent?'Отправлена':'Ошибка'; item.lastAttemptAt=new Date().toISOString(); await saveCampaigns(items);
      return json(res,200,{item,sent,failed,message:`Отправлено: ${sent}. Ошибок: ${failed}.`});
    }
    if (req.url?.match(/^\/api\/admin\/campaigns\/[^/]+\/reply$/) && req.method === 'POST') { if (!requireAdmin(req,res)) return; const id=decodeURIComponent(req.url.split('/')[4]); const body=await readBody(req); const campaigns=await getCampaigns(); const campaign=campaigns.find(x=>x.id===id); if(!campaign)return json(res,404,{error:'Рассылка не найдена'}); const recipient=campaign.recipients.find(x=>x.contact===String(body.contact)); if(!recipient)return json(res,404,{error:'Получатель не найден'}); recipient.status='Ответил'; recipient.repliedAt=new Date().toISOString(); recipient.reply=String(body.reply||''); campaign.status='Есть ответы'; await saveCampaigns(campaigns); const leads=await getLeads(); leads.unshift({id:`CL-${Date.now()}`,at:new Date().toISOString(),name:String(body.name||''),contact:recipient.contact,message:recipient.reply,source:`Ответ на рассылку: ${campaign.title}`,campaignId:campaign.id,status:'Новый',note:''}); await saveLeads(leads); return json(res,200,{campaign,recipient}); }
    if (req.method === 'POST' && req.url === '/api/message') {
      const body = await readBody(req);
      if (!body.message || String(body.message).length > 2000) return json(res, 400, { error: 'Некорректное сообщение' });
      const record = { id:`CL-${Date.now()}`, at: new Date().toISOString(), sessionId:String(body.sessionId||''), name: String(body.name || ''), contact: String(body.contact || ''), message: String(body.message), source: 'Чат на сайте', status:'Новый', note:'' };
      const items=await getLeads();
      const text = String(body.message).toLowerCase();
      let reply = 'Спасибо! Я записал ваше обращение. Укажите, пожалуйста, имя и телефон или e-mail — менеджер подготовит ответ.';
      if (text.includes('профнаст')) reply = 'Уточните марку профнастила, площадь, цвет RAL, толщину металла и город доставки.';
      else if (text.includes('дымоход')) reply = 'Для расчёта дымохода укажите тип оборудования, диаметр выхода, высоту и конфигурацию трассы.';
      else if (text.includes('водост')) reply = 'Для расчёта водостока нужны площадь и форма кровли, длина карнизов, высота здания и желаемый цвет.';
      else if (body.contact) reply = 'Контакт сохранён. Менеджер свяжется с вами в рабочее время: пн–пт, 09:00–18:00.';
      let provider='fallback';
      try { const previousRecords=items.filter(x=>(body.sessionId&&x.sessionId===String(body.sessionId))||(body.contact&&x.contact===String(body.contact)));const previous=previousRecords.slice(0,8).reverse().flatMap(x=>[{role:'user',content:[{type:'input_text',text:x.message}]},...(x.botReply?[{role:'assistant',content:[{type:'output_text',text:x.botReply}]}]:[])]);const profile=buildClientProfile(previousRecords,{name:String(body.name||''),contact:String(body.contact||''),message:String(body.message),channel:'Сайт'});applyClientProfile(record,profile);record.funnelStage=funnelStage(previous.length/2,profile.phone||profile.email||profile.telegram);record.status=previous.length?'В работе':'Новый';const answer=await askAI(String(body.message),previous,profile); reply=answer.text||reply; provider=answer.text?answer.provider:'fallback'; } catch (error) { console.error(new Date().toISOString(), error.message); }
      record.botReply=reply; record.aiProvider=provider; items.unshift(record); await saveLeads(items); void syncGoogleSheet(record,items).catch(error=>console.error(new Date().toISOString(),error.message));
      return json(res, 200, { reply, saved: true, ai: provider!=='fallback', provider });
    }
    if (req.method === 'GET' && req.url?.startsWith('/api/messages?')) {
      const requestUrl=new URL(req.url,'http://localhost'); const sessionId=String(requestUrl.searchParams.get('sessionId')||'');
      if(sessionId.length<10||sessionId.length>200)return json(res,400,{error:'Некорректная сессия'});
      const items=await getLeads();
      const messages=items.filter(x=>x.sessionId===sessionId).flatMap(x=>x.managerReplies||[]).sort((a,b)=>new Date(a.at)-new Date(b.at));
      return json(res,200,{messages});
    }
    if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
    const safePath = req.url === '/' ? 'index.html' : req.url.replace(/^\//, '').replace(/\.\./g, '');
    let file = await readFile(join(root, safePath));
    if(safePath==='index.html')file=String(file).replace('</body>','<script src="/client-messages.js"></script></body>');
    const dynamicAsset=['index.html','admin-communications.js','client-messages.js','admin-mailings.css'].includes(safePath);
    res.writeHead(200, { 'content-type': types[extname(safePath)] || 'application/octet-stream', 'cache-control': dynamicAsset ? 'no-cache' : 'public, max-age=3600' });
    res.end(file);
  } catch (error) { if (error?.code === 'ENOENT') return json(res, 404, { error: 'Not found' }); json(res, 500, { error: 'Server error' }); }
});
server.listen(port, '0.0.0.0', () => console.log(`Metallik technical bot listening on ${port}`));
void startTelegramBot();
