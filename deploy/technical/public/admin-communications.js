(function(){
  const contactText=x=>{
    const nickname=x.telegram||(x.telegramUsername?`@${x.telegramUsername}`:'');
    const directContact=String(x.contact||'');
    const publicContact=/^tg:\d+$/.test(directContact)?'':directContact;
    const values=[nickname,x.phone,x.email,publicContact].filter((v,i,a)=>v&&a.indexOf(v)===i);
    return values.join(' · ')||(/^tg:\d+$/.test(directContact)?`Telegram ID ${directContact.slice(3)}`:'');
  };
  const identity=x=>x.sessionId||x.contact||x.id;
  const sameClient=(a,b)=>identity(a)===identity(b)||(a.contact&&a.contact===b.contact);
  const groupedClients=()=>{
    const groups=new Map();
    for(const item of items){const key=identity(item);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(item);}
    return [...groups.values()].map(records=>{
      const latest=records[0]; const merged={...latest,_records:records};
      for(const field of ['name','phone','email','telegram','telegramUsername','contact','sessionId','preferredContact']){
        const found=records.find(row=>row[field]); if(found)merged[field]=found[field];
      }
      return merged;
    }).sort((a,b)=>new Date(b.at)-new Date(a.at));
  };
  const telegramName=x=>String(x.telegram||x.telegramUsername||'').replace(/^@/,'');
  const phone=x=>x.phone||(/^\+?[\d ()-]{7,}$/.test(x.contact||'')?x.contact:'');
  const time=at=>new Date(at).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
  const actionLinks=x=>{
    const links=[]; const tg=telegramName(x); const tel=phone(x);
    if(tg)links.push('<a class="contact-action" target="_blank" rel="noopener" href="https://t.me/'+esc(tg)+'">Открыть Telegram</a>');
    if(tel)links.push('<a class="contact-action" href="tel:'+esc(tel.replace(/[^+\d]/g,''))+'">Позвонить</a>');
    return links.join('');
  };

  renderList=function(){
    const q=document.querySelector('#search').value.toLowerCase(),f=document.querySelector('#filter').value;
    const list=groupedClients().filter(x=>(f==='Все'||x.status===f)&&x._records.map(row=>[row.name,contactText(row),row.contact,row.message,row.source].join(' ')).join(' ').toLowerCase().includes(q));
    document.querySelector('#list').innerHTML=list.map(x=>`<button class="dialog ${selected&&sameClient(selected,x)?'active':''}" data-id="${esc(x.id)}"><span class="avatar">${esc(initials(x.name))}</span><span><time>${tm(x)}</time><strong>${esc(x.name||'Без имени')}</strong><small>${esc(contactText(x)||x.source)}</small><small>${esc(x.message||'Нет сообщения')}</small></span></button>`).join('');
    document.querySelectorAll('.dialog').forEach(b=>b.onclick=()=>show(groupedClients().find(x=>x.id===b.dataset.id)));
  };

  renderAll=function(){
    const clients=groupedClients(),n=clients.filter(x=>x.status==='Новый').length,w=clients.filter(x=>x.status==='В работе').length,d=clients.filter(x=>x.status==='Завершён').length;
    const responses=clients.filter(x=>x._records.some(row=>/рассыл/i.test(row.source||''))).length,conversion=clients.length?Math.round(d/clients.length*100):0;
    document.querySelector('#ctotal').textContent=document.querySelector('#atotal').textContent=clients.length;
    document.querySelector('#new').textContent=document.querySelector('#cnew').textContent=n;
    document.querySelector('#work').textContent=document.querySelector('#cwork').textContent=document.querySelector('#awork').textContent=w;
    document.querySelector('#responses').textContent=responses;
    document.querySelector('#conversion').textContent=document.querySelector('#aconv').textContent=conversion+'%';
    document.querySelector('#cdone').textContent=document.querySelector('#adone').textContent=d;
    document.querySelector('#navcount').textContent=document.querySelector('#attention').textContent=n;
    document.querySelector('#bottext').textContent='Обрабатывает '+w+' диалогов';
    renderList();renderTable();
    if(!selected&&clients[0])show(clients[0]);
  };

  renderTable=function(){
    const q=String(document.querySelector('#clientSearch')?.value||'').toLowerCase();
    const list=groupedClients().filter(x=>x._records.map(row=>[row.name,contactText(row),row.contact,row.message,row.source].join(' ')).join(' ').toLowerCase().includes(q));
    document.querySelector('#rows').innerHTML=list.map(x=>`<tr><td><b>${esc(x.name||'Без имени')}</b><br><small>${new Date(x.at).toLocaleString('ru-RU')}</small></td><td>${esc(contactText(x)||'—')}</td><td>${esc(x.message||'—')}</td><td>${esc(x.source)}</td><td><select onchange="patch('${esc(x.id)}',{status:this.value})">${['Новый','В работе','Ожидает','Завершён','Отказ'].map(s=>`<option ${s===x.status?'selected':''}>${s}</option>`).join('')}</select></td><td><input value="${esc(x.note||'')}" onchange="patch('${esc(x.id)}',{note:this.value})"></td></tr>`).join('');
  };

  show=function(x){
    const client=groupedClients().find(y=>sameClient(x,y))||x;
    selected=client; renderList();
    const conversation=(client._records||items.filter(y=>sameClient(client,y))).slice().sort((a,b)=>new Date(a.at)-new Date(b.at));
    const bubbles=conversation.map(row=>{
      const inbound=row.message?`<div class="bubble client">${esc(row.message)}<time>${time(row.at)}</time></div>`:'';
      const bot=row.botReply?`<div class="bubble"><b class="sender-label">Бот</b>${esc(row.botReply)}<time>${time(row.at)} ✓</time></div>`:'';
      const manager=(row.managerReplies||[]).map(m=>`<div class="bubble manager"><b class="sender-label">Менеджер</b>${esc(m.message)}<time>${time(m.at)} ✓</time></div>`).join('');
      return inbound+bot+manager;
    }).join('');
    const canMessage=String(client.sessionId||client.contact||'').startsWith('tg:')||Boolean(client.sessionId);
    document.querySelector('#chat').innerHTML=`<div class="chathead"><div class="avatar">${esc(initials(client.name))}</div><div><strong>${esc(client.name||'Без имени')}</strong><small>${esc(contactText(client)||'Контакт не указан')} · ${esc(client.source)}</small></div><div class="contact-actions">${actionLinks(client)}</div><select class="status" id="chatstatus">${['Новый','В работе','Ожидает','Завершён','Отказ'].map(s=>`<option ${s===client.status?'selected':''}>${s}</option>`).join('')}</select></div><div class="conversation"><div class="notice"><b>🤖 Бот ведёт переговоры</b><span>Менеджер может подключиться к диалогу</span></div><div class="day">История переговоров · ${conversation.length} сообщений клиента</div>${bubbles||'<div class="placeholder">Сообщений пока нет</div>'}</div><div class="message-result" id="messageResult"></div><div class="manager-composer"><input id="managerMessage" maxlength="2000" placeholder="${canMessage?'Написать клиенту от имени менеджера…':'Для сообщения по телефону подключите WhatsApp или SMS'}" ${canMessage?'':'disabled'}><button class="send" id="sendManager" ${canMessage?'':'disabled'}>➤</button></div><div class="notearea">Заметка менеджера: ${esc(client.note||'не добавлена')}</div><div class="composer"><input id="noteinput" value="${esc(client.note||'')}" placeholder="Добавить внутреннюю заметку…"><button class="send" id="savenote">✓</button></div>`;
    document.querySelector('#chatstatus').onchange=e=>patch(client.id,{status:e.target.value});
    document.querySelector('#savenote').onclick=()=>patch(client.id,{note:document.querySelector('#noteinput').value});
    if(canMessage){
      const send=async()=>{const input=document.querySelector('#managerMessage'),result=document.querySelector('#messageResult'),message=input.value.trim();if(!message)return;result.textContent='Отправляю…';const r=await fetch('/api/admin/leads/'+encodeURIComponent(client.id)+'/message',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message})});const data=await r.json();if(!r.ok){result.textContent=data.error||'Не удалось отправить';return}input.value='';result.textContent='Сообщение отправлено через '+data.sent.channel;await load();const updated=groupedClients().find(y=>sameClient(client,y));if(updated)show(updated)};
      document.querySelector('#sendManager').onclick=send;
      document.querySelector('#managerMessage').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();send()}};
    }
  };
  const stats=document.querySelector('#clients .stats');
  if(stats){stats.insertAdjacentHTML('afterend','<div class="client-search"><input id="clientSearch" placeholder="Найти по имени, телефону, e-mail или Telegram"></div>');document.querySelector('#clientSearch').oninput=renderTable;}
  const dialogSearch=document.querySelector('#search'); if(dialogSearch)dialogSearch.placeholder='Поиск по имени, телефону или Telegram';
  load();
})();
