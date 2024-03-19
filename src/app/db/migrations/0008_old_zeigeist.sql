ALTER TABLE user ADD `orcid_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `user_orcid_id_unique` ON `user` (`orcid_id`);