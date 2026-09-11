'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  BarChart3,
  Bot,
  Building2,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  FileSpreadsheet,
  Inbox,
  LayoutDashboard,
  Mail,
  Megaphone,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Settings,
  Sparkles,
  Upload,
  UsersRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import type { DialogListItem } from '@/db/queries';
import {
  avatarColorFor,
  CONTACT_SOURCE_LABELS,
  CONVERSATION_STATUS_LABELS,
  formatClockTime,
  formatRelativeTime,
  initialsFor,
  LEAD_STATUS_LABELS,
  needsReply,
  pluralize,
  unreadCount,
} from '@/lib/dialog-view';
import {
  importContactsAction,
  sendManagerMessageAction,
  setBotModeAction,
  updateConversationStatusAction,
  updateLeadStatusAction,
} from '@/app/actions';

const NAV_ITEMS: { icon: typeof LayoutDashboard; label: string; active?: boolean }[] = [
  { icon: LayoutDashboard, label: 'Обзор' },
  { icon: Inbox, label: 'Диалоги', active: true },
  { icon: UsersRound, label: 'Клиенты' },
  { icon: Megaphone, label: 'Рассылки' },
  { icon: BarChart3, label: 'Аналитика' },
];

type WorkspaceProps = {
  initialDialogs: DialogListItem[];
  managerName: string;
};

export function Workspace({ initialDialogs, managerName }: WorkspaceProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const dialogs = initialDialogs;
  const [selectedId, setSelectedId] = useState<number | null>(dialogs[0]?.conversation.id ?? null);
  const [draft, setDraft] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [contactsOpen, setContactsOpen] = useState(false);
  const [contactsText, setContactsText] = useState('');
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);

  // Falls back to the first dialog whenever selectedId doesn't match anything —
  // covers the initial empty-DB mount (selectedId starts null, then contacts
  // get imported and router.refresh() delivers new props to this same mounted
  // component, which does not re-run the useState initializer).
  const selected = dialogs.find((item) => item.conversation.id === selectedId) ?? dialogs[0] ?? null;

  const filteredDialogs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return dialogs;
    return dialogs.filter((item) => {
      const haystack = [
        item.contact.name,
        item.contact.company,
        item.contact.phone,
        item.contact.email,
        item.contact.telegram,
        item.messages[item.messages.length - 1]?.body,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [dialogs, searchQuery]);

  const needsReplyCount = useMemo(() => dialogs.filter((item) => needsReply(item.messages)).length, [dialogs]);
  const activeBotCount = useMemo(
    () => dialogs.filter((item) => item.conversation.botMode === 'active').length,
    [dialogs],
  );
  const botMessageCount = useMemo(
    () => dialogs.reduce((sum, item) => sum + item.messages.filter((m) => m.sender === 'bot').length, 0),
    [dialogs],
  );
  const openLeadsCount = useMemo(
    () => dialogs.filter((item) => item.lead && item.lead.status !== 'won' && item.lead.status !== 'lost').length,
    [dialogs],
  );

  function selectDialog(id: number) {
    setSelectedId(id);
    setDraft('');
  }

  function sendMessage() {
    const text = draft.trim();
    if (!text || !selected) return;
    const conversationId = selected.conversation.id;
    startTransition(async () => {
      await sendManagerMessageAction(conversationId, text);
      setDraft('');
      router.refresh();
    });
  }

  function changeConversationStatus(status: string) {
    if (!selected) return;
    const conversationId = selected.conversation.id;
    startTransition(async () => {
      await updateConversationStatusAction(conversationId, status);
      router.refresh();
    });
  }

  function changeLeadStatus(status: string) {
    if (!selected?.lead) return;
    const leadId = selected.lead.id;
    startTransition(async () => {
      await updateLeadStatusAction(leadId, status);
      router.refresh();
    });
  }

  function takeOverFromBot() {
    if (!selected) return;
    const conversationId = selected.conversation.id;
    startTransition(async () => {
      await setBotModeAction(conversationId, 'paused');
      router.refresh();
    });
  }

  function submitImport() {
    if (!contactsText.trim()) return;
    const text = contactsText;
    startTransition(async () => {
      const result = await importContactsAction(text);
      setImportResult(result);
      if (result.imported > 0) {
        setContactsText('');
        router.refresh();
        setTimeout(() => {
          setContactsOpen(false);
          setImportResult(null);
        }, 900);
      }
    });
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark" aria-label="Металлик и Ко">
          <span className="brand-symbol">М</span>
          <span className="brand-name">
            МЕТАЛЛИК <i>и Ко</i>
          </span>
        </div>
        <nav className="main-nav" aria-label="Основная навигация">
          <p className="nav-label">РАБОЧЕЕ ПРОСТРАНСТВО</p>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              onClick={() => item.label === 'Клиенты' && setContactsOpen(true)}
              className={`nav-item ${item.active ? 'active' : ''}`}
            >
              <item.icon size={19} strokeWidth={1.8} />
              <span>{item.label}</span>
              {item.label === 'Диалоги' && needsReplyCount > 0 && (
                <span className="nav-count">{needsReplyCount}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="bot-state">
          <div className="bot-state-title">
            <span className="pulse-dot" />
            Бот на связи
          </div>
          <p>
            Обрабатывает {activeBotCount} {pluralize(activeBotCount, 'диалог', 'диалога', 'диалогов')}
          </p>
          <div className="bot-progress">
            <span />
          </div>
          <div className="bot-row">
            <span>Ответов бота</span>
            <strong>{botMessageCount}</strong>
          </div>
        </div>
        <div className="sidebar-bottom">
          <button className="nav-item">
            <CircleHelp size={19} />
            <span>Помощь</span>
          </button>
          <button className="nav-item">
            <Settings size={19} />
            <span>Настройки</span>
          </button>
          <div className="manager-card">
            <Avatar className="h-9 w-9">
              <AvatarFallback>{initialsFor(managerName)}</AvatarFallback>
            </Avatar>
            <div>
              <strong>{managerName}</strong>
              <span>Менеджер</span>
            </div>
            <MoreHorizontal size={18} />
          </div>
        </div>
      </aside>
      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>Диалоги</h1>
            <p>Обращения с сайта и ответы на рассылки</p>
          </div>
          <div className="top-actions">
            <button className="icon-button" aria-label="Уведомления">
              <Mail size={19} />
              {needsReplyCount > 0 && <span className="notification-dot" />}
            </button>
            <Button className="new-campaign">
              <Plus size={17} /> Новая рассылка
            </Button>
          </div>
        </header>
        <div className="metrics-row">
          <article className="metric-card">
            <span>Диалоги</span>
            <strong>{dialogs.length}</strong>
          </article>
          <article className="metric-card">
            <span>Бот ведёт диалог</span>
            <strong>{activeBotCount}</strong>
          </article>
          <article className="metric-card">
            <span>Нужно ответить</span>
            <strong>{needsReplyCount}</strong>
          </article>
          <article className="metric-card">
            <span>Лидов в работе</span>
            <strong>{openLeadsCount}</strong>
          </article>
        </div>
        <div className="conversation-layout">
          <section className="lead-list">
            <div className="list-toolbar">
              <div className="searchbox">
                <Search size={17} />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по диалогам"
                />
              </div>
              <button className="filter-button">
                Все <ChevronDown size={15} />
              </button>
            </div>
            <div className="smart-filter">
              <Sparkles size={15} />
              <span>Нужно ответить</span>
              <Badge>{needsReplyCount}</Badge>
            </div>
            <div className="lead-scroll">
              {filteredDialogs.map((item) => {
                const lastMessage = item.messages[item.messages.length - 1];
                const unread = unreadCount(item.messages);
                return (
                  <button
                    key={item.conversation.id}
                    onClick={() => selectDialog(item.conversation.id)}
                    className={`lead-row ${selectedId === item.conversation.id ? 'selected' : ''}`}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback style={{ background: avatarColorFor(item.contact.id) }}>
                        {initialsFor(item.contact.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="lead-copy">
                      <div>
                        <strong>{item.contact.name}</strong>
                        <time>{formatRelativeTime(item.conversation.lastMessageAt)}</time>
                      </div>
                      <span>
                        {[item.contact.company, item.contact.phone].filter(Boolean).join(' · ') ||
                          CONTACT_SOURCE_LABELS[item.contact.source] ||
                          item.contact.source}
                      </span>
                      <p>{lastMessage?.body || 'Нет сообщений'}</p>
                    </div>
                    {unread > 0 && <span className="unread">{unread}</span>}
                  </button>
                );
              })}
              {filteredDialogs.length === 0 && dialogs.length > 0 && (
                <p style={{ padding: '16px', color: '#8a9095', fontSize: '12px' }}>Ничего не найдено</p>
              )}
            </div>
          </section>
          <section className="chat-panel">
            {selected ? (
              <>
                <div className="chat-header">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback style={{ background: avatarColorFor(selected.contact.id) }}>
                      {initialsFor(selected.contact.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <strong>{selected.contact.name}</strong>
                    <span>{selected.contact.company || CONTACT_SOURCE_LABELS[selected.contact.source] || selected.contact.source}</span>
                  </div>
                  <select
                    className="status"
                    value={selected.conversation.status}
                    onChange={(e) => changeConversationStatus(e.target.value)}
                    disabled={isPending}
                  >
                    {Object.entries(CONVERSATION_STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <button className="icon-button">
                    <MoreHorizontal size={20} />
                  </button>
                </div>
                {selected.conversation.botMode === 'active' && (
                  <div className="bot-banner">
                    <Bot size={17} />
                    <div>
                      <strong>Бот ведёт переговоры</strong>
                      <span>Менеджер может перехватить диалог</span>
                    </div>
                    <button onClick={takeOverFromBot} disabled={isPending}>
                      Перехватить диалог
                    </button>
                  </div>
                )}
                <div className="messages">
                  {selected.messages.length > 0 ? (
                    <div className="day-label">{selected.messages[0].createdAt.toLocaleDateString('ru-RU')}</div>
                  ) : (
                    <p style={{ textAlign: 'center', color: '#9ca1a5', fontSize: '12px', marginTop: '20px' }}>
                      Сообщений пока нет
                    </p>
                  )}
                  {selected.messages.map((message) => (
                    <div key={message.id} className={`message ${message.sender}-message`}>
                      {message.sender === 'bot' ? (
                        <>
                          <span className="mini-bot">
                            <Bot size={14} />
                          </span>
                          <div>{message.body}</div>
                        </>
                      ) : (
                        message.body
                      )}
                      <time>
                        {formatClockTime(message.createdAt)}
                        {message.sender !== 'client' && <Check size={13} />}
                      </time>
                    </div>
                  ))}
                </div>
                <div className="composer">
                  <div className="compose-row">
                    <Input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Написать сообщение от имени менеджера…"
                      disabled={isPending}
                    />
                    <Button onClick={sendMessage} size="icon" aria-label="Отправить" disabled={isPending || !draft.trim()}>
                      <Send size={18} />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <Empty style={{ margin: 'auto' }}>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Inbox />
                  </EmptyMedia>
                  <EmptyTitle>Нет диалогов</EmptyTitle>
                  <EmptyDescription>Добавьте контакты, чтобы начать переписку</EmptyDescription>
                </EmptyHeader>
                <Button onClick={() => setContactsOpen(true)}>
                  <UsersRound size={16} /> Добавить контакты
                </Button>
              </Empty>
            )}
          </section>
          <aside className="client-panel">
            {selected && (
              <>
                <div className="panel-title">
                  <span>Карточка клиента</span>
                  <button>
                    <MoreHorizontal size={19} />
                  </button>
                </div>
                <div className="client-profile">
                  <Avatar className="h-14 w-14">
                    <AvatarFallback style={{ background: avatarColorFor(selected.contact.id) }}>
                      {initialsFor(selected.contact.name)}
                    </AvatarFallback>
                  </Avatar>
                  <h2>{selected.contact.name}</h2>
                  <p>{selected.contact.company || '—'}</p>
                  <Badge className="source-badge">
                    <span />
                    {CONTACT_SOURCE_LABELS[selected.contact.source] || selected.contact.source}
                  </Badge>
                </div>
                <div className="client-data">
                  {selected.contact.phone && (
                    <>
                      <label>ТЕЛЕФОН</label>
                      <a href={`tel:${selected.contact.phone}`}>{selected.contact.phone}</a>
                    </>
                  )}
                  {selected.contact.email && (
                    <>
                      <label>E-MAIL</label>
                      <a href={`mailto:${selected.contact.email}`}>{selected.contact.email}</a>
                    </>
                  )}
                  {selected.contact.telegram && (
                    <>
                      <label>TELEGRAM</label>
                      <a
                        href={`https://t.me/${selected.contact.telegram.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {selected.contact.telegram}
                      </a>
                    </>
                  )}
                  {selected.contact.city && (
                    <>
                      <label>ГОРОД</label>
                      <span>{selected.contact.city}</span>
                    </>
                  )}
                </div>
                {selected.lead ? (
                  <div className="deal-card">
                    <div className="deal-head">
                      <span>ЛИД #{selected.lead.id}</span>
                      <select
                        value={selected.lead.status}
                        onChange={(e) => changeLeadStatus(e.target.value)}
                        disabled={isPending}
                      >
                        {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <h3>{selected.lead.product}</h3>
                    {selected.lead.nextAction && (
                      <div className="next-step">
                        <Clock3 size={17} />
                        <div>
                          <span>Следующее действие</span>
                          <strong>{selected.lead.nextAction}</strong>
                        </div>
                        <ArrowUpRight size={17} />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="deal-card">
                    <p style={{ margin: 0, color: '#8a9095', fontSize: '12px' }}>Заявка ещё не создана</p>
                  </div>
                )}
                <Button variant="outline" className="open-crm">
                  <Building2 size={17} /> Открыть в CRM
                </Button>
              </>
            )}
          </aside>
        </div>
      </section>
      <Dialog
        open={contactsOpen}
        onOpenChange={(open) => {
          setContactsOpen(open);
          if (!open) setImportResult(null);
        }}
      >
        <DialogContent className="contacts-dialog sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Добавить контакты для общения</DialogTitle>
            <DialogDescription>
              Вставьте список, один контакт — одна строка. Система распознаёт телефон, e-mail и Telegram.
            </DialogDescription>
          </DialogHeader>
          <div className="import-grid">
            <label className="file-drop" style={{ opacity: 0.6, cursor: 'not-allowed' }}>
              <FileSpreadsheet size={27} />
              <strong>Загрузка файла — скоро</strong>
              <span>Пока вставьте контакты текстом справа: имя, телефон, e-mail или Telegram</span>
              <input type="file" accept=".csv,.xlsx,.xls" disabled />
            </label>
            <div className="paste-box">
              <label htmlFor="contacts-list">Или вставьте контакты</label>
              <Textarea
                id="contacts-list"
                value={contactsText}
                onChange={(e) => setContactsText(e.target.value)}
                placeholder={'+7 999 123-45-67, Иван, СтройСервис\nclient@company.ru, Анна\nhttps://t.me/username'}
                rows={7}
              />
            </div>
          </div>
          <div className="channel-preview">
            <strong>Каналы общения</strong>
            <span>Телефон</span>
            <span>E-mail</span>
            <span>Telegram</span>
          </div>
          <label className="consent-row">
            <Checkbox defaultChecked />
            <span>
              <strong>Есть согласие на информационные рассылки</strong>
              <small>Фиксируется отдельно и не влияет на сохранение контакта в CRM.</small>
            </span>
          </label>
          {importResult && (
            <div className="import-success">
              <Check size={16} /> Добавлено: {importResult.imported}. Пропущено: {importResult.skipped}.
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setContactsOpen(false)}>
              Отмена
            </Button>
            <Button onClick={submitImport} disabled={isPending || !contactsText.trim()}>
              <Upload size={16} /> Проверить и добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
