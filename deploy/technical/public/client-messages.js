(function(){
  const seen=new Set(JSON.parse(sessionStorage.getItem('metallikManagerMessages')||'[]'));
  async function poll(){
    try{
      const response=await fetch('/api/messages?sessionId='+encodeURIComponent(sessionId),{cache:'no-store'});
      if(!response.ok)return;
      const data=await response.json();
      for(const message of data.messages||[]){
        if(seen.has(message.id))continue;
        seen.add(message.id); add('Менеджер: '+message.message);
      }
      sessionStorage.setItem('metallikManagerMessages',JSON.stringify([...seen].slice(-100)));
    }catch{}
  }
  poll(); setInterval(poll,4000);
})();
