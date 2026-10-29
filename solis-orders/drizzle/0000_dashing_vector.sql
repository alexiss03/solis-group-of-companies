CREATE TABLE `commerce_companies` (
	`slug` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`website` text DEFAULT '' NOT NULL,
	`logo` text DEFAULT '' NOT NULL,
	`accepting` integer DEFAULT 1 NOT NULL,
	`archived` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `commerce_events` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`company_slug` text NOT NULL,
	`status` text NOT NULL,
	`public_note` text DEFAULT '' NOT NULL,
	`internal_note` text DEFAULT '' NOT NULL,
	`actor_email` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `commerce_orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`company_slug`) REFERENCES `commerce_companies`(`slug`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `commerce_events_order_idx` ON `commerce_events` (`order_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `commerce_members` (
	`id` text PRIMARY KEY NOT NULL,
	`company_slug` text NOT NULL,
	`email` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`company_slug`) REFERENCES `commerce_companies`(`slug`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `commerce_member_unique` ON `commerce_members` (`company_slug`,`email`);--> statement-breakpoint
CREATE TABLE `commerce_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`reference` text NOT NULL,
	`company_slug` text NOT NULL,
	`customer_name` text NOT NULL,
	`customer_email` text NOT NULL,
	`customer_phone` text DEFAULT '' NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`details` text NOT NULL,
	`quantity` integer,
	`desired_date` text,
	`method` text NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'New' NOT NULL,
	`tracking_hash` text NOT NULL,
	`request_key` text NOT NULL,
	`rate_key` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`last_event` text,
	`fulfillment_note` text DEFAULT '' NOT NULL,
	`fulfilled_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`company_slug`) REFERENCES `commerce_companies`(`slug`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `commerce_orders_reference_unique` ON `commerce_orders` (`reference`);--> statement-breakpoint
CREATE INDEX `commerce_orders_company_idx` ON `commerce_orders` (`company_slug`,`created_at`);--> statement-breakpoint
CREATE INDEX `commerce_orders_rate_idx` ON `commerce_orders` (`rate_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `commerce_request_unique` ON `commerce_orders` (`company_slug`,`request_key`);