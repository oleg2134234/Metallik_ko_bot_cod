CREATE TABLE `contacts` (`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL, `name` text NOT NULL, `company` text, `email` text, `phone` text, `telegram` text, `city` text, `source` text DEFAULT 'website' NOT NULL, `created_at` integer NOT NULL);
--> statement-breakpoint
CREATE INDEX `idx_contacts_email` ON `contacts` (`email`);
--> statement-breakpoint
CREATE TABLE `conversations` (`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL, `contact_id` integer NOT NULL, `channel` text NOT NULL, `status` text DEFAULT 'open' NOT NULL, `bot_mode` text DEFAULT 'active' NOT NULL, `last_message_at` integer NOT NULL, FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`));
--> statement-breakpoint
CREATE INDEX `idx_conversations_status_last` ON `conversations` (`status`,`last_message_at`);
--> statement-breakpoint
CREATE TABLE `messages` (`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL, `conversation_id` integer NOT NULL, `sender` text NOT NULL, `body` text NOT NULL, `intent` text, `created_at` integer NOT NULL, FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`));
--> statement-breakpoint
CREATE INDEX `idx_messages_conversation_created` ON `messages` (`conversation_id`,`created_at`);
--> statement-breakpoint
CREATE TABLE `leads` (`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL, `contact_id` integer NOT NULL, `conversation_id` integer, `product` text NOT NULL, `status` text DEFAULT 'draft' NOT NULL, `parameters_json` text DEFAULT '{}' NOT NULL, `next_action` text, `assigned_to` text, `created_at` integer NOT NULL, FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`), FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`));
--> statement-breakpoint
CREATE INDEX `idx_leads_status_created` ON `leads` (`status`,`created_at`);
--> statement-breakpoint
CREATE TABLE `campaigns` (`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL, `name` text NOT NULL, `subject` text NOT NULL, `body` text NOT NULL, `status` text DEFAULT 'draft' NOT NULL, `sent_at` integer, `created_at` integer NOT NULL);
--> statement-breakpoint
CREATE TABLE `campaign_recipients` (`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL, `campaign_id` integer NOT NULL, `contact_id` integer NOT NULL, `delivery_status` text DEFAULT 'queued' NOT NULL, `replied_at` integer, FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`), FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`));
--> statement-breakpoint
CREATE INDEX `idx_recipients_replied` ON `campaign_recipients` (`campaign_id`,`replied_at`);
--> statement-breakpoint
PRAGMA optimize;
