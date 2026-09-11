import { asc, desc, eq, inArray, or } from 'drizzle-orm';
import { getDb } from './index';
import { contacts, conversations, leads, messages } from './schema';

type ContactRow = typeof contacts.$inferSelect;
type ConversationRow = typeof conversations.$inferSelect;
type MessageRow = typeof messages.$inferSelect;
type LeadRow = typeof leads.$inferSelect;

const DIALOG_LIMIT = 100;

export type DialogListItem = {
  conversation: ConversationRow;
  contact: ContactRow;
  messages: MessageRow[];
  lead: LeadRow | null;
};

export async function listDialogs(): Promise<DialogListItem[]> {
  const db = await getDb();

  const rows = await db
    .select({ conversation: conversations, contact: contacts })
    .from(conversations)
    .innerJoin(contacts, eq(conversations.contactId, contacts.id))
    .orderBy(desc(conversations.lastMessageAt))
    .limit(DIALOG_LIMIT);

  if (rows.length === 0) return [];

  const conversationIds = rows.map((row) => row.conversation.id);

  const [allMessages, allLeads] = await Promise.all([
    db
      .select()
      .from(messages)
      .where(inArray(messages.conversationId, conversationIds))
      .orderBy(asc(messages.createdAt)),
    db
      .select()
      .from(leads)
      .where(inArray(leads.conversationId, conversationIds))
      .orderBy(desc(leads.id)),
  ]);

  const messagesByConversation = new Map<number, MessageRow[]>();
  for (const message of allMessages) {
    const list = messagesByConversation.get(message.conversationId);
    if (list) list.push(message);
    else messagesByConversation.set(message.conversationId, [message]);
  }

  const leadByConversation = new Map<number, LeadRow>();
  for (const lead of allLeads) {
    if (lead.conversationId != null && !leadByConversation.has(lead.conversationId)) {
      leadByConversation.set(lead.conversationId, lead);
    }
  }

  return rows.map((row) => ({
    conversation: row.conversation,
    contact: row.contact,
    messages: messagesByConversation.get(row.conversation.id) ?? [],
    lead: leadByConversation.get(row.conversation.id) ?? null,
  }));
}

export async function findContactByIdentity(identity: {
  email?: string;
  phone?: string;
  telegram?: string;
}): Promise<ContactRow | null> {
  const conditions = [
    identity.email ? eq(contacts.email, identity.email) : null,
    identity.phone ? eq(contacts.phone, identity.phone) : null,
    identity.telegram ? eq(contacts.telegram, identity.telegram) : null,
  ].filter((condition) => condition !== null);

  if (conditions.length === 0) return null;

  const db = await getDb();
  const [existing] = await db
    .select()
    .from(contacts)
    .where(or(...conditions))
    .limit(1);
  return existing ?? null;
}
