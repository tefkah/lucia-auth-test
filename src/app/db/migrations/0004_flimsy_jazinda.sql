ALTER TABLE user ADD `github_id` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `user_github_id_unique` ON `user` (`github_id`);