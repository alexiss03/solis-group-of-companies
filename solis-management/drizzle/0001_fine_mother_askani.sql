ALTER TABLE `cms_companies` ADD `slug` text;--> statement-breakpoint
CREATE UNIQUE INDEX `cms_company_slug_unique` ON `cms_companies` (`owner`,`slug`);