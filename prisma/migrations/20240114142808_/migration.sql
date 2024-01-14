-- CreateTable
CREATE TABLE "Tweets" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tweetId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "tweetedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Tweets_tweetId_key" ON "Tweets"("tweetId");
