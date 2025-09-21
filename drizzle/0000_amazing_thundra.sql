CREATE TABLE "users" (
	"id" varchar(256) PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"email" varchar(256) NOT NULL,
	"imageUrl" varchar,
	"subscription" boolean DEFAULT false,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "chatHistory" (
	"id" serial PRIMARY KEY NOT NULL,
	"sessionId" integer,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"suggestedQuestion" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chatSessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" varchar(256) NOT NULL,
	"documentId" integer,
	"sessionName" varchar(500),
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" varchar(256) NOT NULL,
	"title" varchar(500),
	"content" text NOT NULL,
	"summary" text,
	"contentLength" integer,
	"documentType" varchar(50),
	"fileName" varchar(500),
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "suggestedQuestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"documentId" integer,
	"question" text NOT NULL,
	"questionOrder" integer,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "chatHistory" ADD CONSTRAINT "chatHistory_sessionId_chatSessions_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."chatSessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatSessions" ADD CONSTRAINT "chatSessions_documentId_documents_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suggestedQuestions" ADD CONSTRAINT "suggestedQuestions_documentId_documents_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;