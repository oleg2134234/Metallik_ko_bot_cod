'use client';

import { useState } from 'react';
import { ArrowUpRight, BarChart3, Bot, Building2, Check, ChevronDown, CircleHelp, Clock3, FileSpreadsheet, Inbox, LayoutDashboard, Mail, Megaphone, MoreHorizontal, Plus, Search, Send, Settings, Sparkles, Upload, UsersRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const leads = [
  { initials: 'АК', name: 'Алексей Ковалёв', company: 'СтройПрофи', topic: 'Профнастил С21', time: '2 мин', unread: 2, status: 'Горячий', color: '#ec6a2c' },
  { initials: 'МС', name: 'Мария Соколова', company: 'Частный клиент', topic: 'Дымоход Premium', time: '18 мин', unread: 0, status: 'Расчёт', color: '#3d6f88' },
  { initials: 'ДВ', name: 'Дмитрий Волков', company: 'Кровля-Сервис', topic: 'Водосточная система', time: '42 мин', unread: 1, status: 'Новый', color: '#77805f' },
  { initials: 'ЕН', name: 'Елена Новикова', company: 'Архитектура дома', topic: 'Металлочерепица', time: '1 ч', unread: 0, status: 'Уточнение', color: '#8d654d' },
  { initials: 'РБ', name: 'Роман Белов', company: 'Фасад Групп', topic: 'Сайдинг и софиты', time: '3 ч', unread: 0, status: 'Предложение', color: '#655c82' },
];
const nav = [
  { icon: LayoutDashboard, label: 'Обзор' }, { icon: Inbox, label: 'Диалоги', count: 4, active: true },
  { icon: UsersRound, label: 'Клиенты' }, { icon: Megaphone, label: 'Рассылки' }, { icon: BarChart3, label: 'Аналитика' },
];

export default function Home() {
  const [selected, setSelected] = useState(0);
  const [draft, setDraft] = useState('');
  const [sent, setSent] = useState<string[]>([]);
  const [contactsOpen, setContactsOpen] = useState(false);
  const [contactsText, setContactsText] = useState('');
  const [importedCount, setImportedCount] = useState(0);
  const lead = leads[selected];
  const sendMessage = () => { if (draft.trim()) { setSent((items) => [...items, draft.trim()]); setDraft(''); } };

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand-mark" aria-label="Металлик и Ко"><span className="brand-symbol">М</span><span className="brand-name">МЕТАЛЛИК <i>и Ко</i></span></div>
      <nav className="main-nav" aria-label="Основная навигация"><p className="nav-label">РАБОЧЕЕ ПРОСТРАНСТВО</p>{nav.map((item) => <button onClick={()=>item.label==='Клиенты'&&setContactsOpen(true)} className={`nav-item ${item.active ? 'active' : ''}`} key={item.label}><item.icon size={19} strokeWidth={1.8}/><span>{item.label}</span>{item.count && <span className="nav-count">{item.count}</span>}</button>)}</nav>
      <div className="bot-state"><div className="bot-state-title"><span className="pulse-dot"/> Бот на связи</div><p>Обрабатывает 3 диалога</p><div className="bot-progress"><span/></div><div className="bot-row"><span>Автоответы</span><strong>27 сегодня</strong></div></div>
      <div className="sidebar-bottom"><button className="nav-item"><CircleHelp size={19}/><span>Помощь</span></button><button className="nav-item"><Settings size={19}/><span>Настройки</span></button><div className="manager-card"><Avatar className="h-9 w-9"><AvatarFallback>АИ</AvatarFallback></Avatar><div><strong>Анна Иванова</strong><span>Менеджер</span></div><MoreHorizontal size={18}/></div></div>
    </aside>
    <section className="workspace">
      <header className="topbar"><div><h1>Диалоги</h1><p>Обращения с сайта и ответы на рассылки</p></div><div className="top-actions"><button className="icon-button" aria-label="Уведомления"><Mail size={19}/><span className="notification-dot"/></button><Button className="new-campaign"><Plus size={17}/> Новая рассылка</Button></div></header>
      <div className="metrics-row"><article className="metric-card"><span>Новые обращения</span><strong>18</strong><em className="up">+12% <small>за неделю</small></em></article><article className="metric-card"><span>Бот ведёт диалог</span><strong>7</strong><em>3 требуют внимания</em></article><article className="metric-card"><span>Ответили на рассылку</span><strong>24</strong><em className="up">+8 <small>за сегодня</small></em></article><article className="metric-card"><span>Конверсия в заявку</span><strong>31%</strong><em className="up">+4,2% <small>за месяц</small></em></article></div>
      <div className="conversation-layout">
        <section className="lead-list"><div className="list-toolbar"><div className="searchbox"><Search size={17}/><Input placeholder="Поиск по диалогам"/></div><button className="filter-button">Все <ChevronDown size={15}/></button></div><div className="smart-filter"><Sparkles size={15}/><span>Нужно ответить</span><Badge>4</Badge></div><div className="lead-scroll">{leads.map((item,index)=><button key={item.name} onClick={()=>setSelected(index)} className={`lead-row ${selected===index?'selected':''}`}><Avatar className="h-10 w-10"><AvatarFallback style={{background:item.color}}>{item.initials}</AvatarFallback></Avatar><div className="lead-copy"><div><strong>{item.name}</strong><time>{item.time}</time></div><span>{item.company} · {item.topic}</span><p>{index===0?'Нужен расчёт на 450 м², цвет графит…':index===1?'Спасибо, жду итоговое предложение':'Бот уточняет параметры заказа…'}</p></div>{item.unread>0&&<span className="unread">{item.unread}</span>}</button>)}</div></section>
        <section className="chat-panel"><div className="chat-header"><Avatar className="h-10 w-10"><AvatarFallback style={{background:lead.color}}>{lead.initials}</AvatarFallback></Avatar><div><strong>{lead.name}</strong><span>{lead.company} · <i className="online"/> на сайте</span></div><Badge className="hot-badge">{lead.status}</Badge><button className="icon-button"><MoreHorizontal size={20}/></button></div>
          <div className="bot-banner"><Bot size={17}/><div><strong>Бот ведёт переговоры</strong><span>Следует сценарию «Оптовая заявка»</span></div><button>Перехватить диалог</button></div>
          <div className="messages"><div className="day-label">Сегодня, 10:42</div><div className="message client-message">Добрый день! Нужен профнастил С21 для кровли склада. Площадь около 450 квадратов.<time>10:42</time></div><div className="message bot-message"><span className="mini-bot"><Bot size={14}/></span><div>Здравствуйте, Алексей! Помогу подготовить расчёт. Подскажите, пожалуйста, длину ската, желаемый цвет и нужна ли доставка?</div><time>10:42 <Check size={13}/></time></div><div className="message client-message">Длина ската 12 метров, цвет графит RAL 7024. Доставка нужна в Чехов.<time>10:44</time></div><div className="message bot-message"><span className="mini-bot"><Bot size={14}/></span><div>Принято. Для точного предложения уточню ещё два момента: толщина металла и желаемая дата поставки. Если не определились с толщиной — наш специалист подберёт вариант под нагрузку.</div><time>10:45 <Check size={13}/></time></div>{sent.map((text,index)=><div className="message manager-message" key={index}>{text}<time>сейчас <Check size={13}/></time></div>)}<div className="typing"><span/><span/><span/> Бот формирует ответ</div></div>
          <div className="composer"><div className="ai-hint"><Sparkles size={14}/> Бот собрал 5 из 7 параметров заявки</div><div className="compose-row"><Input value={draft} onChange={(e)=>setDraft(e.target.value)} onKeyDown={(e)=>e.key==='Enter'&&sendMessage()} placeholder="Написать сообщение от имени менеджера…"/><Button onClick={sendMessage} size="icon" aria-label="Отправить"><Send size={18}/></Button></div></div>
        </section>
        <aside className="client-panel"><div className="panel-title"><span>Карточка клиента</span><button><MoreHorizontal size={19}/></button></div><div className="client-profile"><Avatar className="h-14 w-14"><AvatarFallback style={{background:lead.color}}>{lead.initials}</AvatarFallback></Avatar><h2>{lead.name}</h2><p>{lead.company}</p><Badge className="source-badge"><span/> Сайт metallik.ru</Badge></div><div className="client-data"><label>ТЕЛЕФОН</label><a href="tel:+79261234567">+7 926 123-45-67</a><label>E-MAIL</label><a href="mailto:alexey@stroyprofi.ru">alexey@stroyprofi.ru</a><label>ГОРОД</label><span>Чехов, Московская область</span></div><div className="deal-card"><div className="deal-head"><span>ЗАЯВКА #1842</span><Badge>Черновик</Badge></div><h3>{lead.topic}</h3><div className="deal-row"><span>Объём</span><strong>450 м²</strong></div><div className="deal-row"><span>Цвет</span><strong>RAL 7024</strong></div><div className="deal-row"><span>Доставка</span><strong>Чехов</strong></div><Progress value={71}/><p>Заполнено 5 из 7 параметров</p></div><div className="next-step"><Clock3 size={17}/><div><span>Следующее действие</span><strong>Подготовить расчёт</strong><small>Сегодня до 14:00</small></div><ArrowUpRight size={17}/></div><Button variant="outline" className="open-crm"><Building2 size={17}/> Открыть в CRM</Button></aside>
      </div>
    </section>
    <Dialog open={contactsOpen} onOpenChange={setContactsOpen}>
      <DialogContent className="contacts-dialog sm:max-w-2xl">
        <DialogHeader><DialogTitle>Добавить контакты для общения</DialogTitle><DialogDescription>Загрузите таблицу или вставьте список. Один контакт — одна строка. Система распознает телефон, e-mail и ссылки на мессенджеры.</DialogDescription></DialogHeader>
        <div className="import-grid">
          <label className="file-drop"><FileSpreadsheet size={27}/><strong>Загрузить CSV или XLSX</strong><span>Имя, компания, телефон, e-mail, Telegram, WhatsApp, MAX</span><input type="file" accept=".csv,.xlsx,.xls" onChange={(e)=>{if(e.target.files?.length)setImportedCount(1)}}/></label>
          <div className="paste-box"><label htmlFor="contacts-list">Или вставьте контакты</label><Textarea id="contacts-list" value={contactsText} onChange={(e)=>setContactsText(e.target.value)} placeholder={'+7 999 123-45-67, Иван, СтройСервис\nclient@company.ru, Анна\nhttps://t.me/username'} rows={7}/></div>
        </div>
        <div className="channel-preview"><strong>Каналы общения</strong><span>Телефон</span><span>E-mail</span><span>Telegram</span><span>WhatsApp</span><span>MAX</span></div>
        <label className="consent-row"><Checkbox defaultChecked/><span><strong>Есть согласие на информационные рассылки</strong><small>Без отметки контакт сохранится в CRM, но не попадёт в массовую рассылку.</small></span></label>
        {importedCount>0&&<div className="import-success"><Check size={16}/> Файл выбран и готов к проверке</div>}
        <DialogFooter><Button variant="outline" onClick={()=>setContactsOpen(false)}>Отмена</Button><Button onClick={()=>{const count=contactsText.split(/\n/).filter(Boolean).length+(importedCount?1:0);setImportedCount(count);if(count)setTimeout(()=>setContactsOpen(false),500)}}><Upload size={16}/> Проверить и добавить</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </main>;
}
