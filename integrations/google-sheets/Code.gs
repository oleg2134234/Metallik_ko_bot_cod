const SPREADSHEET_ID = '1zHtQBu0FQWRAAC4-t8wIegEesE5uCzlpU2ZMnuHvNT0';
const SHEET_NAME = 'Клиенты';

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ok:true, service:'metallik-crm-google-sheets'})).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || '{}');
    const expected = PropertiesService.getScriptProperties().getProperty('WEBHOOK_TOKEN');
    if (!expected || data.token !== expected) throw new Error('Unauthorized');
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error('Лист «Клиенты» не найден');
    const headers = sheet.getRange(4, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
    const col = name => headers.indexOf(name) + 1;
    if (!col('ID клиента')) throw new Error('В строке 4 не найден заголовок «ID клиента»');
    const ids = sheet.getRange(5, col('ID клиента'), Math.max(sheet.getLastRow() - 4, 1), 1).getDisplayValues().flat();
    const found = ids.indexOf(data.clientId);
    const row = found >= 0 ? found + 5 : Math.max(sheet.getLastRow() + 1, 5);
    const values = {
      'ID клиента': data.clientId,
      'Дата добавления': data.dateAdded ? new Date(data.dateAdded) : new Date(),
      'Имя': data.name || '',
      'Телефон': data.phone || (/^\+?[\d ()-]{7,}$/.test(data.contact || '') ? data.contact : ''),
      'E-mail': data.email || (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contact || '') ? data.contact : ''),
      'Telegram': data.telegram || (String(data.contact || '').startsWith('tg:') ? data.contact : ''),
      'Источник': data.source || '',
      'Статус': data.status || 'Новый',
      'Последний контакт': data.lastContact ? new Date(data.lastContact) : new Date(),
      'Следующее действие': data.funnelStage || '',
      'Комментарий': [data.summary || '', data.preferredContact ? 'Удобная связь: ' + data.preferredContact : ''].filter(Boolean).join(' | ')
    };
    Object.keys(values).forEach(name => { const column = col(name); if (column) sheet.getRange(row, column).setValue(values[name]); });
    appendDialogRows_(data);
    return ContentService.createTextOutput(JSON.stringify({ok:true,row,clientId:data.clientId})).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ok:false,error:error.message})).setMimeType(ContentService.MimeType.JSON);
  }
}

function appendDialogRows_(data) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Диалоги');
  if (!sheet || !data.messageId) return;
  const headers = sheet.getRange(4, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  const col = name => headers.indexOf(name) + 1;
  const idColumn = col('ID сообщения');
  if (!idColumn) return;
  const existing = sheet.getRange(5, idColumn, Math.max(sheet.getLastRow() - 4, 1), 1).getDisplayValues().flat();
  const add = (id, sender, text, status) => {
    if (!text || existing.includes(id)) return;
    const row = Math.max(sheet.getLastRow() + 1, 5);
    const values = {
      'ID сообщения': id,
      'Дата и время': data.lastContact ? new Date(data.lastContact) : new Date(),
      'ID клиента': data.clientId,
      'Канал': data.channel || 'Сайт',
      'Отправитель': sender,
      'Сообщение': text,
      'Намерение клиента': data.funnelStage || '',
      'Требуется менеджер': data.status === 'В работе' ? 'Да' : 'Нет',
      'Статус': status,
      'Ссылка на диалог': data.channel === 'Telegram' && data.telegram ? `https://t.me/${String(data.telegram).replace('@','')}` : ''
    };
    Object.keys(values).forEach(name => { const column = col(name); if (column) sheet.getRange(row, column).setValue(values[name]); });
    existing.push(id);
  };
  add(data.messageId, 'Клиент', data.message, 'Получено');
  add(`${data.messageId}-BOT`, 'Бот', data.botReply, 'Отправлено');
  add(`${data.messageId}-MANAGER`, 'Менеджер', data.managerReply, 'Отправлено');
}
