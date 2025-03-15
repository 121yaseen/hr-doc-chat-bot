-- Drop the old Document table
DROP TABLE IF EXISTS "Document" CASCADE;

-- Recreate the Document table with the new schema
CREATE TABLE "Document" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "blobUrl" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "uploadDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" TEXT NOT NULL,
  "size" INTEGER NOT NULL,

  CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraint
ALTER TABLE "Document" ADD CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Recreate the VectorStore table with the new schema
CREATE TABLE IF NOT EXISTS "VectorStore" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "documentName" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "embedding" DOUBLE PRECISION[] NOT NULL,

  CONSTRAINT "VectorStore_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraint
ALTER TABLE "VectorStore" ADD CONSTRAINT "VectorStore_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE; 