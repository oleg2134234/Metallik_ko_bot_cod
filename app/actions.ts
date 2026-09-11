'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { getChatGPTUser } from './chatgpt-auth';
import { getDb } from '@/db';
import { contacts, conversations, leads, messages } from '@/db/schema';
import { findContactByIdentity } from '@/db/queries';
import { parseContactLine } from '@/lib/contact-parsing';

// Server actions are their own POST endpoints, reachable even without
// rendering the page first, so each one re-checks auth rather than relying
// on the page-level guard alone.
async function requireUser() {
  const user = await getChatGPTUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}

export async function importContactsAction(
  rawText: string,
): Promise<{ imported: number; skipped: number }> {
  await requireUser();
  const lines = rawText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const db = await getDb();
  let imported = 0;
  let skipped = 0;

  for (const line of lines) {
    const parsed = parseContactLine(line);
    if (!parsed.phone && !parsed.email && !parsed.telegram) {
      skipped++;
      continue;
    }

    const existing = await findContactByIdentity({
      email: parsed.email || undefined,
      phone: parsed.phone || undefined,
      telegram: parsed.telegram || undefined,
    });
    if (existing) {
      skipped++;
      continue;
    }

    const now = new Date();
    const [contact] = await db
      .insert(contacts)
      .values({
        name: parsed.name || 'Без имени',
        company: parsed.company || null,
        email: parsed.email || null,
        phone: parsed.phone || null,
        telegram: parsed.telegram || null,
        city: null,
        source: 'manual_import',
        createdAt: now,
      })
      .returning();

    // No first message is fabricated here — a manually imported contact
    // legitimately starts with an empty conversation, and botMode stays
    // 'paused' since no bot pipeline acts on these yet.
    await db.insert(conversations).values({
      contactId: contact.id,
      channel: 'manual',
      status: 'open',
      botMode: 'paused',
      lastMessageAt: now,
    });

    imported++;
  }

  revalidatePath('/');
  return { imported, skipped };
}

export async function sendManagerMessageAction(conversationId: number, body: string): Promise<void> {
  await requireUser();
  const text = body.trim();
  if (!text || text.length > 2000) throw new Error('Некорректное сообщение');

  const db = await getDb();
  const now = new Date();
  await db.insert(messages).values({ conversationId, sender: 'manager', body: text, createdAt: now });
  await db.update(conversations).set({ lastMessageAt: now }).where(eq(conversations.id, conversationId));
  revalidatePath('/');
}

export async function updateConversationStatusAction(conversationId: number, status: string): Promise<void> {
  await requireUser();
  const db = await getDb();
  await db.update(conversations).set({ status }).where(eq(conversations.id, conversationId));
  revalidatePath('/');
}

export async function updateLeadStatusAction(leadId: number, status: string): Promise<void> {
  await requireUser();
  const db = await getDb();
  await db.update(leads).set({ status }).where(eq(leads.id, leadId));
  revalidatePath('/');
}

export async function setBotModeAction(
  conversationId: number,
  botMode: 'active' | 'paused',
): Promise<void> {
  await requireUser();
  const db = await getDb();
  await db.update(conversations).set({ botMode }).where(eq(conversations.id, conversationId));
  revalidatePath('/');
}
