export interface ChunkConfigOptions {
    defaultChunks?: number;
    maxConcurrency?: number;
    defaultOverlap?: number;
}

export interface ChunkConfig {
    totalTokens: number;
    numberOfChunks: number;
    overlapTokens: number;
    concurrency: number;
}

export interface TextChunk {
    text: string;
    blockTokens: number;
}
