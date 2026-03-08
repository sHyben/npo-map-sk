-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ico" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "activity" TEXT,
    "skNace" TEXT,
    "address" TEXT,
    "city" TEXT,
    "zipCode" TEXT,
    "legalFormCode" TEXT,
    "legalFormName" TEXT,
    "ownershipCode" TEXT,
    "ownershipName" TEXT,
    "sizeCategory" TEXT,
    "sizeName" TEXT,
    "creationDate" DATETIME,
    "cancellationDate" DATETIME,
    "taxGift" REAL,
    "latitude" REAL,
    "longitude" REAL,
    "description" TEXT,
    "claimedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Organization_claimedById_fkey" FOREIGN KEY ("claimedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "street" TEXT,
    "buildingNumber" TEXT,
    "registrationNumber" TEXT,
    "zipCode" TEXT,
    "city" TEXT,
    "municipalCode" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    CONSTRAINT "Branch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HelpRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "helpType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "deadline" DATETIME,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HelpRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "topic" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_ico_key" ON "Organization"("ico");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_claimedById_key" ON "Organization"("claimedById");

-- CreateIndex
CREATE INDEX "Organization_city_idx" ON "Organization"("city");

-- CreateIndex
CREATE INDEX "Organization_activity_idx" ON "Organization"("activity");

-- CreateIndex
CREATE INDEX "Organization_legalFormCode_idx" ON "Organization"("legalFormCode");

-- CreateIndex
CREATE INDEX "Organization_latitude_longitude_idx" ON "Organization"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "Branch_organizationId_idx" ON "Branch"("organizationId");

-- CreateIndex
CREATE INDEX "HelpRequest_organizationId_idx" ON "HelpRequest"("organizationId");

-- CreateIndex
CREATE INDEX "HelpRequest_helpType_idx" ON "HelpRequest"("helpType");

-- CreateIndex
CREATE INDEX "HelpRequest_status_idx" ON "HelpRequest"("status");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "Subscription_organizationId_idx" ON "Subscription"("organizationId");

-- CreateIndex
CREATE INDEX "Subscription_topic_idx" ON "Subscription"("topic");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_organizationId_key" ON "Subscription"("userId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_topic_key" ON "Subscription"("userId", "topic");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
