CREATE TYPE "public"."verification_method" AS ENUM('hub_approval', 'peer_attestation', 'sponsor_reference');--> statement-breakpoint
CREATE TYPE "public"."verification_request_status" AS ENUM('pending', 'approved', 'denied');--> statement-breakpoint
CREATE TYPE "public"."deletion_type" AS ENUM('manual', 'auto_inactivity');--> statement-breakpoint
CREATE TABLE "funding_request_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"funding_request_id" uuid NOT NULL,
	"status" "request_status" NOT NULL,
	"changed_by" uuid,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "peer_attestations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"verification_request_id" uuid NOT NULL,
	"attesting_group_id" uuid NOT NULL,
	"attested_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"method" "verification_method" NOT NULL,
	"status" "verification_request_status" DEFAULT 'pending' NOT NULL,
	"sponsor_info" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"denial_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mailbox_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mailbox_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"ciphertext" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mailbox_tombstones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"original_mailbox_id" uuid NOT NULL,
	"help_category" "aid_category" NOT NULL,
	"region" varchar(255) NOT NULL,
	"had_responses" boolean DEFAULT false NOT NULL,
	"responding_group_ids" uuid[],
	"deletion_type" "deletion_type" NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mailboxes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_key" "bytea" NOT NULL,
	"help_category" "aid_category" NOT NULL,
	"region" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_accessed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"deletion_type" "deletion_type"
);
--> statement-breakpoint
ALTER TABLE "funding_requests" ADD COLUMN "clarification_request" text;--> statement-breakpoint
ALTER TABLE "funding_requests" ADD COLUMN "approved_by" uuid;--> statement-breakpoint
ALTER TABLE "funding_requests" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "funding_request_status_history" ADD CONSTRAINT "funding_request_status_history_funding_request_id_funding_requests_id_fk" FOREIGN KEY ("funding_request_id") REFERENCES "public"."funding_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funding_request_status_history" ADD CONSTRAINT "funding_request_status_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_attestations" ADD CONSTRAINT "peer_attestations_verification_request_id_verification_requests_id_fk" FOREIGN KEY ("verification_request_id") REFERENCES "public"."verification_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_attestations" ADD CONSTRAINT "peer_attestations_attesting_group_id_groups_id_fk" FOREIGN KEY ("attesting_group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_attestations" ADD CONSTRAINT "peer_attestations_attested_by_users_id_fk" FOREIGN KEY ("attested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailbox_messages" ADD CONSTRAINT "mailbox_messages_mailbox_id_mailboxes_id_fk" FOREIGN KEY ("mailbox_id") REFERENCES "public"."mailboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailbox_messages" ADD CONSTRAINT "mailbox_messages_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mailbox_messages_mailbox_id_idx" ON "mailbox_messages" USING btree ("mailbox_id");--> statement-breakpoint
CREATE INDEX "mailboxes_region_idx" ON "mailboxes" USING btree ("region");--> statement-breakpoint
CREATE INDEX "mailboxes_help_category_idx" ON "mailboxes" USING btree ("help_category");--> statement-breakpoint
CREATE INDEX "mailboxes_last_accessed_at_idx" ON "mailboxes" USING btree ("last_accessed_at");--> statement-breakpoint
ALTER TABLE "funding_requests" ADD CONSTRAINT "funding_requests_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "groups_hub_id_idx" ON "groups" USING btree ("hub_id");--> statement-breakpoint
CREATE INDEX "groups_verification_status_idx" ON "groups" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "groups_service_area_idx" ON "groups" USING btree ("service_area");--> statement-breakpoint
CREATE INDEX "funding_requests_group_id_idx" ON "funding_requests" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "funding_requests_status_idx" ON "funding_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "funding_requests_category_idx" ON "funding_requests" USING btree ("category");--> statement-breakpoint
CREATE INDEX "funding_requests_urgency_idx" ON "funding_requests" USING btree ("urgency");--> statement-breakpoint
ALTER TABLE "funding_requests" ADD CONSTRAINT "positive_amount" CHECK ("funding_requests"."amount" > 0);