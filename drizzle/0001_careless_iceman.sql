CREATE TABLE `feedback` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`device_id` text,
	`body` text NOT NULL,
	`page_url` text,
	`user_agent` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE set null
);
