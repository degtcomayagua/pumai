import { QdrantClient } from '@qdrant/js-client-rest';

export const RAG_DOC_CHUNKS_COLLECTION = process.env.QDRANT_RAG_DOCS_COLLECTION ?? 'rag_docs';
export const RAG_CHUNK_VECTOR_SIZE = Number(process.env.QDRANT_VECTOR_SIZE ?? 768);

let qdrantClientInstance: QdrantClient | null = null;
let qdrantClientInitPromise: Promise<QdrantClient> | null = null;

function getCollectionVectorSize(collectionInfo: any): number | null {
  const vectorSize = collectionInfo?.config?.params?.vectors?.size;

  return Number.isFinite(vectorSize) ? Number(vectorSize) : null;
}


export async function setupQdrant() {
  const uri = process.env.QDRANT_URI;

  if (!Number.isFinite(RAG_CHUNK_VECTOR_SIZE) || RAG_CHUNK_VECTOR_SIZE <= 0) {
    console.error('[QDrant] Error: QDRANT_VECTOR_SIZE must be a positive number');
    throw new Error('QDRANT_VECTOR_SIZE must be a positive number');
  }

  if (qdrantClientInstance) {
    return qdrantClientInstance;
  }

  if (qdrantClientInitPromise) {
    return qdrantClientInitPromise;
  }

  qdrantClientInitPromise = (async () => {
    try {
      const client = new QdrantClient({ url: uri });
      console.log('[QDrant] Successfully connected to QDrant');

      const exists = await client.collectionExists(RAG_DOC_CHUNKS_COLLECTION);

      if (!exists.exists) {
        await client.createCollection(RAG_DOC_CHUNKS_COLLECTION, {
          vectors: {
            size: RAG_CHUNK_VECTOR_SIZE,
            distance: 'Cosine',
          },
        });
        console.log(`[QDrant] Collection '${RAG_DOC_CHUNKS_COLLECTION}' created successfully`);
      } else {
        const collectionInfo = await client.getCollection(RAG_DOC_CHUNKS_COLLECTION);
        const currentVectorSize = getCollectionVectorSize(collectionInfo);

        if (currentVectorSize !== null && currentVectorSize !== RAG_CHUNK_VECTOR_SIZE) {
          console.warn(
            `[QDrant] Collection '${RAG_DOC_CHUNKS_COLLECTION}' has vector size ${currentVectorSize}, recreating with ${RAG_CHUNK_VECTOR_SIZE}`,
          );

          await client.recreateCollection(RAG_DOC_CHUNKS_COLLECTION, {
            vectors: {
              size: RAG_CHUNK_VECTOR_SIZE,
              distance: 'Cosine',
            },
          });

          console.log(`[QDrant] Collection '${RAG_DOC_CHUNKS_COLLECTION}' recreated successfully`);
        } else {
          console.log(`[QDrant] Collection '${RAG_DOC_CHUNKS_COLLECTION}' already exists`);
        }
      }

      qdrantClientInstance = client;
      return client;
    } catch (error) {
      qdrantClientInitPromise = null;
      console.error('[QDrant] Error connecting to QDrant:', error instanceof Error ? error.message : error);
      throw error;
    }
  })();

  return qdrantClientInitPromise;
}