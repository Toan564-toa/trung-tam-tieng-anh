-- AlterTable
ALTER TABLE "refresh_tokens" ADD COLUMN     "parent_refresh_token_id" INTEGER;

-- CreateIndex
CREATE INDEX "refresh_tokens_parent_refresh_token_id_idx" ON "refresh_tokens"("parent_refresh_token_id");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_parent_refresh_token_id_fkey" FOREIGN KEY ("parent_refresh_token_id") REFERENCES "refresh_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;
