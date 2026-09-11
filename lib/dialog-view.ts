const AVATAR_PALETTE = ['#ec6a2c', '#3d6f88', '#77805f', '#8d654d', '#655c82', '#4b8a72', '#a2555c'];

export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'КЛ';
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function avatarColorFor(id: number): string {
  return AVATAR_PALETTE[id % AVATAR_PALETTE.length];
}

export function pluralize(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

export const CONVERSATION_STATUS_LABELS: Record<string, string> = {
  open: 'В работе',
  closed: 'Завершён',
};

export const LEAD_STATUS_LABELS: Record<string, string> = {
  new: 'Новый',
  qualified: 'Квалификация',
  proposal: 'Предложение',
  won: 'Успешно',
  lost: 'Отказ',
};

export const CONTACT_SOURCE_LABELS: Record<string, string> = {
  website: 'Сайт',
  manual_import: 'Добавлен вручную',
  telegram: 'Telegram',
};

type MessageLike = { sender: string };

// How many trailing messages from the client have gone unanswered — used for
// the "needs reply" badge/filter instead of a real read-tracking column,
// which the schema doesn't have.
export function unreadCount(messages: MessageLike[]): number {
  let count = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].sender !== 'client') break;
    count++;
  }
  return count;
}

export function needsReply(messages: MessageLike[]): boolean {
  return unreadCount(messages) > 0;
}

export function formatRelativeTime(date: Date): string {
  const diffMinutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (diffMinutes < 1) return 'сейчас';
  if (diffMinutes < 60) return `${diffMinutes} мин`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} ч`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} дн`;
}

export function formatClockTime(date: Date): string {
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}
