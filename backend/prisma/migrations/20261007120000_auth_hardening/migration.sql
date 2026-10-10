ALTER TABLE "users"
ADD COLUMN "full_name" VARCHAR(150),
ADD COLUMN "token_version" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "refresh_tokens"
ADD COLUMN "token_id" UUID NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX "refresh_tokens_token_id_key" ON "refresh_tokens"("token_id");
CREATE UNIQUE INDEX "users_username_lower_key" ON "users"(lower("username"));
