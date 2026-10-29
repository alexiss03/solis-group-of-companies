CREATE TABLE `commerce_offerings` (
	`id` text PRIMARY KEY NOT NULL,
	`company_slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`kind` text NOT NULL,
	`pricing` text NOT NULL,
	`price_minor` integer,
	`currency` text NOT NULL,
	`unit` text NOT NULL,
	`lead_min` integer NOT NULL,
	`lead_max` integer NOT NULL,
	`lead_unit` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`company_slug`) REFERENCES `commerce_companies`(`slug`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `commerce_offerings_company_idx` ON `commerce_offerings` (`company_slug`,`active`);--> statement-breakpoint
CREATE TABLE `commerce_profiles` (
	`company_slug` text PRIMARY KEY NOT NULL,
	`location` text NOT NULL,
	`delivery_scope` text NOT NULL,
	`delivery_areas` text DEFAULT '' NOT NULL,
	`delivery_notes` text DEFAULT '' NOT NULL,
	`methods` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`company_slug`) REFERENCES `commerce_companies`(`slug`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `commerce_orders` ADD `offering_id` text REFERENCES commerce_offerings(id);--> statement-breakpoint
ALTER TABLE `commerce_orders` ADD `offering_snapshot` text DEFAULT '{}' NOT NULL;