-- Add card system foundation: card, card_history
CREATE TYPE "public"."card_type" AS ENUM('icon-corner', 'header-image', 'full-image');
--> statement-breakpoint
CREATE TABLE "card_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"card_id" integer NOT NULL,
	"action" text NOT NULL,
	"internal_name" text NOT NULL,
	"title" text,
	"type" text NOT NULL,
	"image_url" text,
	"content" text,
	"link" jsonb,
	"footer_content" text,
	"footer_separator" boolean NOT NULL,
	"enabled" boolean NOT NULL,
	"is_pinned" boolean NOT NULL,
	"pinned_position" integer,
	"position" integer NOT NULL,
	"changed_by" integer NOT NULL,
	"changed_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "card" (
	"id" serial PRIMARY KEY NOT NULL,
	"legacy_id" integer,
	"internal_name" text NOT NULL,
	"title" text,
	"type" "card_type" DEFAULT 'icon-corner' NOT NULL,
	"image_url" text,
	"content" text,
	"link" jsonb,
	"footer_content" text,
	"footer_separator" boolean DEFAULT false NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"pinned_position" integer,
	"position" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "card_legacy_id_unique" UNIQUE("legacy_id"),
	CONSTRAINT "card_internal_name_unique" UNIQUE("internal_name")
);
--> statement-breakpoint
ALTER TABLE "card_history" ADD CONSTRAINT "card_history_changed_by_user_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "card_history_card_id_idx" ON "card_history" USING btree ("card_id");
--> statement-breakpoint
CREATE INDEX "idx_card_position" ON "card" USING btree ("position");
--> statement-breakpoint
CREATE INDEX "idx_card_pinned" ON "card" USING btree ("is_pinned","pinned_position");
