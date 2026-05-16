CREATE TABLE "alert_reads" (
	"user_id" integer NOT NULL,
	"alert_id" integer NOT NULL,
	"read_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "alert_reads_user_id_alert_id_unique" UNIQUE("user_id","alert_id")
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"hybas_id" bigint NOT NULL,
	"forecast_date" date NOT NULL,
	"risk_level" varchar(10) NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "basin_weather" (
	"id" serial PRIMARY KEY NOT NULL,
	"hybas_id" bigint NOT NULL,
	"date" date NOT NULL,
	"precip_mm" real,
	CONSTRAINT "basin_weather_hybas_id_date_unique" UNIQUE("hybas_id","date")
);
--> statement-breakpoint
CREATE TABLE "basins" (
	"hybas_id" bigint PRIMARY KEY NOT NULL,
	"lat" real NOT NULL,
	"lon" real NOT NULL,
	"province" varchar(100),
	"region_id" integer,
	"elev_m" real,
	"slope_deg" real,
	"twi" real,
	"dist_river_m" real,
	"basin_area_km2" real,
	"up_area_km2" real,
	"river_order" integer
);
--> statement-breakpoint
CREATE TABLE "official_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"message" varchar(1000) NOT NULL,
	"is_urgent" boolean DEFAULT false NOT NULL,
	"province" varchar(100),
	"posted_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "predictions" (
	"id" serial PRIMARY KEY NOT NULL,
	"hybas_id" bigint NOT NULL,
	"forecast_date" date NOT NULL,
	"run_date" date NOT NULL,
	"flood_prob" real NOT NULL,
	"risk_level" varchar(10) NOT NULL,
	CONSTRAINT "predictions_hybas_id_forecast_date_run_date_unique" UNIQUE("hybas_id","forecast_date","run_date")
);
--> statement-breakpoint
CREATE TABLE "push_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" varchar(500) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "push_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "rescue_points" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"lat" real NOT NULL,
	"lon" real NOT NULL,
	"capacity" integer,
	"province" varchar(100),
	"address" varchar(500),
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rescue_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"lat" real NOT NULL,
	"lon" real NOT NULL,
	"people_count" integer DEFAULT 1 NOT NULL,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"notes" varchar(500),
	"photos" text[] DEFAULT '{}',
	"assigned_users" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"name" varchar(100),
	"role" varchar(20) DEFAULT 'user' NOT NULL,
	"province" varchar(100),
	"phone" varchar(20),
	"address" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "alert_reads" ADD CONSTRAINT "alert_reads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_reads" ADD CONSTRAINT "alert_reads_alert_id_official_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."official_alerts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_hybas_id_basins_hybas_id_fk" FOREIGN KEY ("hybas_id") REFERENCES "public"."basins"("hybas_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "basin_weather" ADD CONSTRAINT "basin_weather_hybas_id_basins_hybas_id_fk" FOREIGN KEY ("hybas_id") REFERENCES "public"."basins"("hybas_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "official_alerts" ADD CONSTRAINT "official_alerts_posted_by_users_id_fk" FOREIGN KEY ("posted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_hybas_id_basins_hybas_id_fk" FOREIGN KEY ("hybas_id") REFERENCES "public"."basins"("hybas_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rescue_requests" ADD CONSTRAINT "rescue_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_bw_date" ON "basin_weather" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_bw_basin" ON "basin_weather" USING btree ("hybas_id");--> statement-breakpoint
CREATE INDEX "idx_pred_date" ON "predictions" USING btree ("forecast_date");--> statement-breakpoint
CREATE INDEX "idx_pred_basin" ON "predictions" USING btree ("hybas_id");