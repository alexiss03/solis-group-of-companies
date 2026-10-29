CREATE TABLE `cms_companies` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`website` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'In development' NOT NULL,
	`logo` text DEFAULT '' NOT NULL,
	`archived` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `cms_company_owner_idx` ON `cms_companies` (`owner`,`archived`);--> statement-breakpoint
CREATE TABLE `cms_movements` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`company_id` text NOT NULL,
	`item_id` text NOT NULL,
	`type` text NOT NULL,
	`delta` real NOT NULL,
	`before_quantity` real NOT NULL,
	`after_quantity` real NOT NULL,
	`note` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `cms_companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`item_id`) REFERENCES `cms_records`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `cms_movement_owner_idx` ON `cms_movements` (`owner`,`created_at`);--> statement-breakpoint
CREATE TABLE `cms_records` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`company_id` text NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'Active' NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`sku` text,
	`quantity` real DEFAULT 0 NOT NULL,
	`reorder_level` real DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`last_movement` text,
	`archived` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `cms_companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `cms_record_owner_idx` ON `cms_records` (`owner`,`kind`,`company_id`,`archived`);--> statement-breakpoint
CREATE UNIQUE INDEX `cms_sku_unique` ON `cms_records` (`owner`,`company_id`,`kind`,`sku`);--> statement-breakpoint
CREATE TABLE `cms_workspaces` (
	`owner` text PRIMARY KEY NOT NULL,
	`initialized_at` text NOT NULL
);
