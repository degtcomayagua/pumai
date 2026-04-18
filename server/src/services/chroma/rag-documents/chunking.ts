type BuildTextChunksOptions = {
  sizePattern?: number[];
  overlap?: number;
  minChunkSize?: number;
};

const DEFAULT_SIZE_PATTERN = [2200, 1400, 900];
const DEFAULT_OVERLAP = 180;
const DEFAULT_MIN_CHUNK_SIZE = 240;

function normalizeWhitespace(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\t/g, " ").trim();
}

function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n{2,}/g)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

function buildOverlapTail(chunk: string, overlap: number): string {
  if (overlap <= 0 || chunk.length <= overlap) {
    return chunk;
  }

  return chunk.slice(chunk.length - overlap).trim();
}

function splitLargeSentence(sentence: string, maxSize: number): string[] {
  const words = sentence.split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return [];
  }

  const pieces: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxSize) {
      current = next;
      continue;
    }

    if (current) {
      pieces.push(current);
    }

    current = word;
  }

  if (current) {
    pieces.push(current);
  }

  return pieces;
}

export function buildTextChunks(
  rawText: string,
  options: BuildTextChunksOptions = {},
): string[] {
  const text = normalizeWhitespace(rawText);
  if (!text) {
    return [];
  }

  const sizePattern =
    options.sizePattern?.filter((value) => value > 200) ?? DEFAULT_SIZE_PATTERN;
  const overlap = Math.max(0, options.overlap ?? DEFAULT_OVERLAP);
  const minChunkSize = Math.max(60, options.minChunkSize ?? DEFAULT_MIN_CHUNK_SIZE);

  const sentences = splitIntoSentences(text);
  if (sentences.length === 0) {
    return [text];
  }

  const chunks: string[] = [];
  let currentChunk = "";
  let sizeIndex = 0;
  let currentTargetSize = sizePattern[sizeIndex] ?? DEFAULT_SIZE_PATTERN[0];

  const flushCurrentChunk = () => {
    const trimmed = currentChunk.trim();
    if (!trimmed) {
      currentChunk = "";
      return;
    }

    chunks.push(trimmed);

    const overlapTail = buildOverlapTail(trimmed, overlap);
    currentChunk = overlapTail;

    sizeIndex = (sizeIndex + 1) % sizePattern.length;
    currentTargetSize = sizePattern[sizeIndex] ?? currentTargetSize;
  };

  for (const sentence of sentences) {
    const sentenceCandidates =
      sentence.length > currentTargetSize
        ? splitLargeSentence(sentence, currentTargetSize)
        : [sentence];

    for (const candidate of sentenceCandidates) {
      const candidateText = candidate.trim();
      if (!candidateText) {
        continue;
      }

      const nextChunk = currentChunk
        ? `${currentChunk} ${candidateText}`
        : candidateText;

      if (nextChunk.length <= currentTargetSize) {
        currentChunk = nextChunk;
        continue;
      }

      if (currentChunk.trim().length >= minChunkSize) {
        flushCurrentChunk();
        currentChunk = currentChunk
          ? `${currentChunk} ${candidateText}`.trim()
          : candidateText;
        continue;
      }

      currentChunk = nextChunk;
      if (currentChunk.length >= currentTargetSize) {
        flushCurrentChunk();
      }
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
