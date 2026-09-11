import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool';

const outDir = fileURLToPath(new URL('../outputs/google-sheets-template/', import.meta.url)) + '\\';
const wb = Workbook.create();
const orange = '#E86127', dark = '#282D31', light = '#F4F5F6', border = '#DDE1E4', green = '#DDF2E5', red = '#FBE2DF';

function setup(sheet, title, subtitle, headers, widths) {
  sheet.showGridLines = false;
  sheet.getRange(`A1:${String.fromCharCode(64 + Math.min(headers.length, 26))}1`).merge();
  sheet.getRange('A1').values = [[title]];
  sheet.getRange('A1').format.font = { name: 'Arial', size: 16, bold: true, color: dark };
  sheet.getRange('A2').values = [[subtitle]];
  sheet.getRange('A2').format.font = { name: 'Arial', size: 10, italic: true, color: '#6F767B' };
  const end = String.fromCharCode(64 + headers.length);
  sheet.getRange(`A4:${end}4`).values = [headers];
  sheet.getRange(`A4:${end}4`).format = { fill: dark, font: { name: 'Arial', size: 10, bold: true, color: '#FFFFFF' }, wrapText: true, verticalAlignment: 'center', horizontalAlignment: 'center' };
  sheet.getRange(`A4:${end}4`).format.rowHeight = 34;
  widths.forEach((w, i) => sheet.getRangeByIndexes(0, i, 200, 1).format.columnWidth = w);
  sheet.getRange(`A5:${end}200`).format.font = { name: 'Arial', size: 10, color: dark };
  sheet.getRange(`A5:${end}200`).format.borders = { insideHorizontal: { style: 'thin', color: border } };
  sheet.freezePanes.freezeRows(4);
  sheet.getRange(`A4:${end}20`).format.wrapText = true;
  sheet.tabColor = orange;
}

const clients = wb.worksheets.add('Клиенты');
setup(clients, 'Клиенты', 'Основная база контактов. Один клиент — одна строка.', ['ID клиента','Дата добавления','Имя','Компания','Телефон','E-mail','Telegram','WhatsApp','MAX','Город','Источник','Теги','Согласие на обработку','Согласие на рассылку','Статус','Ответственный','Последний контакт','Следующее действие','Комментарий'], [12,15,20,22,18,25,20,18,18,20,16,20,18,18,16,18,18,20,34]);
clients.getRange('A5:S5').values = [['CL-0001', new Date('2026-09-09'), 'Алексей Ковалёв', 'СтройПрофи', '+7 926 123-45-67', 'alexey@example.ru', '@alexey', '', '', 'Чехов', 'Чат на сайте', 'опт, кровля', 'Да', 'Да', 'Новый', 'Анна Иванова', new Date('2026-09-09T10:45:00'), new Date('2026-09-09T14:00:00'), 'Тестовая строка — удалите перед работой']];
clients.getRange('B5:B200').setNumberFormat('yyyy-mm-dd'); clients.getRange('Q5:R200').setNumberFormat('yyyy-mm-dd hh:mm');
clients.getRange('M5:N200').dataValidation = { rule: { type: 'list', values: ['Да','Нет'] } };
clients.getRange('O5:O200').dataValidation = { rule: { type: 'list', values: ['Новый','В работе','Клиент','Неактивен','Отказ'] } };
clients.getRange('M5:N200').conditionalFormats.add('containsText',{text:'Да',format:{fill:green,font:{color:'#22663D'}}});
clients.getRange('M5:N200').conditionalFormats.add('containsText',{text:'Нет',format:{fill:red,font:{color:'#8A3029'}}});
clients.tables.add('A4:S200', true, 'ClientsTable').style = 'TableStyleMedium2';

const leads = wb.worksheets.add('Заявки');
setup(leads, 'Заявки', 'Параметры заказа, этап сделки и следующее действие менеджера.', ['ID заявки','Дата','ID клиента','Имя клиента','Товар','Описание и параметры','Количество/объём','Город доставки','Бюджет, ₽','Этап','Приоритет','Ответственный','Следующее действие','Срок','Результат','Причина отказа'], [13,15,13,20,22,40,18,20,16,18,14,18,24,18,24,28]);
leads.getRange('A5:P5').values = [['LD-0001',new Date('2026-09-09'),'CL-0001','Алексей Ковалёв','Профнастил С21','RAL 7024, длина ската 12 м','450 м²','Чехов',null,'Уточнение','Высокий','Анна Иванова','Подготовить расчёт',new Date('2026-09-09T14:00:00'),'','']];
leads.getRange('B5:B200').setNumberFormat('yyyy-mm-dd'); leads.getRange('I5:I200').setNumberFormat('#,##0'); leads.getRange('N5:N200').setNumberFormat('yyyy-mm-dd hh:mm');
leads.getRange('J5:J200').dataValidation={rule:{type:'list',values:['Новая','Уточнение','Расчёт','Предложение','Переговоры','Успешно','Отказ']}}; leads.getRange('K5:K200').dataValidation={rule:{type:'list',values:['Высокий','Средний','Низкий']}};
leads.tables.add('A4:P200',true,'LeadsTable').style='TableStyleMedium2';

const dialogs = wb.worksheets.add('Диалоги');
setup(dialogs, 'Диалоги', 'Журнал сообщений из сайта и подключённых мессенджеров.', ['ID сообщения','Дата и время','ID клиента','ID заявки','Канал','Отправитель','Сообщение','Намерение клиента','Требуется менеджер','Статус','Ссылка на диалог'], [16,19,13,13,16,18,55,24,20,16,34]);
dialogs.getRange('A5:K6').values = [['MSG-0001',new Date('2026-09-09T10:42:00'),'CL-0001','LD-0001','Сайт','Клиент','Нужен профнастил С21 для кровли склада, около 450 м²','Запрос расчёта','Нет','Обработано',''],['MSG-0002',new Date('2026-09-09T10:42:30'),'CL-0001','LD-0001','Сайт','Бот','Уточните длину ската, цвет и город доставки','Сбор параметров','Нет','Отправлено','']];
dialogs.getRange('B5:B500').setNumberFormat('yyyy-mm-dd hh:mm'); dialogs.getRange('E5:E500').dataValidation={rule:{type:'list',values:['Сайт','Telegram','WhatsApp','MAX','E-mail','Телефон']}}; dialogs.getRange('I5:I500').dataValidation={rule:{type:'list',values:['Да','Нет']}};
dialogs.tables.add('A4:K500',true,'DialogsTable').style='TableStyleMedium2';

const replies = wb.worksheets.add('Ответы на рассылки');
setup(replies, 'Ответы на рассылки', 'В этот лист попадают только контакты, которые ответили на отправленное сообщение.', ['ID ответа','Дата ответа','ID клиента','Имя','Компания','Канал','Название рассылки','Ответ клиента','Тональность','Интерес','Статус обработки','Ответственный','Следующее действие','Срок'], [14,18,13,20,22,16,26,48,16,22,20,18,24,18]);
replies.getRange('A5:N5').values=[['RP-0001',new Date('2026-09-09T11:20:00'),'CL-0001','Алексей Ковалёв','СтройПрофи','E-mail','Осенние условия для дилеров','Пришлите, пожалуйста, актуальный прайс на профнастил','Положительная','Запрос прайса','Новый','Анна Иванова','Отправить прайс',new Date('2026-09-09T14:00:00')]];
replies.getRange('B5:B200').setNumberFormat('yyyy-mm-dd hh:mm'); replies.getRange('N5:N200').setNumberFormat('yyyy-mm-dd hh:mm'); replies.getRange('K5:K200').dataValidation={rule:{type:'list',values:['Новый','В работе','Обработан','Не требует ответа']}};
replies.tables.add('A4:N200',true,'RepliesTable').style='TableStyleMedium2';

const dash = wb.worksheets.add('Аналитика'); dash.showGridLines=false; dash.tabColor=dark;
dash.getRange('A1:H1').merge(); dash.getRange('A1').values=[['Аналитика обращений и продаж']]; dash.getRange('A1').format.font={name:'Arial',size:16,bold:true,color:dark}; dash.getRange('A2').values=[['Показатели рассчитываются по заполненным рабочим листам.']]; dash.getRange('A2').format.font={name:'Arial',size:10,italic:true,color:'#6F767B'};
dash.getRange('A4:B4').values=[['Показатель','Значение']]; dash.getRange('A4:B4').format={fill:dark,font:{name:'Arial',size:10,bold:true,color:'#FFFFFF'}};
dash.getRange('A5:A11').values=[['Всего клиентов'],['Новых заявок'],['Заявок в работе'],['Успешных заявок'],['Ответов на рассылки'],['Требуют обработки'],['Конверсия заявок в успех']];
dash.getRange('B5:B11').formulas=[["=COUNTA('Клиенты'!A5:A200)"],["=COUNTIF('Заявки'!J5:J200,\"Новая\")"],["=COUNTIF('Заявки'!J5:J200,\"Уточнение\")+COUNTIF('Заявки'!J5:J200,\"Расчёт\")+COUNTIF('Заявки'!J5:J200,\"Предложение\")+COUNTIF('Заявки'!J5:J200,\"Переговоры\")"],["=COUNTIF('Заявки'!J5:J200,\"Успешно\")"],["=COUNTA('Ответы на рассылки'!A5:A200)"],["=COUNTIF('Ответы на рассылки'!K5:K200,\"Новый\")"],["=IF(COUNTA('Заявки'!A5:A200)=0,\"\",COUNTIF('Заявки'!J5:J200,\"Успешно\")/COUNTA('Заявки'!A5:A200))"]];
dash.getRange('B11').setNumberFormat('0.0%'); dash.getRange('A5:B11').format.borders={insideHorizontal:{style:'thin',color:border}}; dash.getRange('A5:A11').format.font={name:'Arial',size:11,color:dark}; dash.getRange('B5:B11').format.font={name:'Arial',size:12,bold:true,color:orange}; dash.getRange('A:A').format.columnWidth=34; dash.getRange('B:B').format.columnWidth=18;
dash.getRange('D4:E4').values=[['Правило','Значение']]; dash.getRange('D4:E4').format={fill:dark,font:{name:'Arial',size:10,bold:true,color:'#FFFFFF'}}; dash.getRange('D5:E8').values=[['Рассылки','Только при значении «Да» в поле согласия на рассылку'],['Обращения','Согласие на обработку хранится отдельно'],['Дата и время','Часовой пояс Europe/Moscow'],['Обновление','Бот добавляет новые строки через Google Sheets API']]; dash.getRange('D5:E8').format.wrapText=true; dash.getRange('D:D').format.columnWidth=20; dash.getRange('E:E').format.columnWidth=54;

await fs.mkdir(outDir,{recursive:true});
for (const name of ['Клиенты','Заявки','Диалоги','Ответы на рассылки','Аналитика']) {
  const image = await wb.render({sheetName:name,autoCrop:'all',scale:1,format:'png'});
  await fs.writeFile(`${outDir}${name.replaceAll(' ','_')}.png`,new Uint8Array(await image.arrayBuffer()));
}
const inspect = await wb.inspect({kind:'table',range:'Аналитика!A1:E11',include:'values,formulas',tableMaxRows:20,tableMaxCols:8});
console.log(inspect.ndjson);
const errors = await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:100},summary:'formula scan'});
console.log(errors.ndjson);
const output=await SpreadsheetFile.exportXlsx(wb); await output.save(`${outDir}Шаблон_CRM_бота_Металлик.xlsx`);
