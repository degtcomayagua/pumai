import {
  buildRagSearchFilter,
  getQdrantClient,
  normalizeRagChunkPoint,
  pointMatchesRagFilters,
  RagQueryFilters,
  RagQueryResult,
  RAG_DOC_CHUNKS_COLLECTION,
} from "./shared.js";

export type { RAG_DOC_CHUNKS_COLLECTION, RagQueryFilters } from "./shared.js";

export async function queryRagDocumentsByEmbedding(
  queryEmbedding: number[],
  options: {
    nResults?: number;
    filters?: RagQueryFilters;
  } = {},
): Promise<RagQueryResult> {
  const client = await getQdrantClient();
  const targetResults = options.nResults ?? 3;
  const searchLimit = Math.max(targetResults * 10, 25);

  const points = await client.search(RAG_DOC_CHUNKS_COLLECTION, {
    vector: queryEmbedding,
    limit: searchLimit,
    filter: buildRagSearchFilter(options.filters),
    with_payload: true,
    with_vector: false,
  });

  const normalizedPoints = points
    .map((point) => normalizeRagChunkPoint(point))
    .filter((point): point is NonNullable<typeof point> => point !== null)
    .filter((point) => pointMatchesRagFilters(point.payload, options.filters))
    .slice(0, targetResults);

  return {
    ids: normalizedPoints.map((point) => point.id),
    documents: normalizedPoints.map((point) => point.payload.content),
    metadatas: normalizedPoints.map((point) => point.payload),
    scores: normalizedPoints.map((point) => point.score),
    points: normalizedPoints,
  };
}