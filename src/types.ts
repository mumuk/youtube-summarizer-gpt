export interface TranscriptBlock {
  id: string;
  title: string;
  text: string;
  blockTokens: number;
}

export interface SemanticResult {
  textLanguage: string;
  blocks: TranscriptBlock[];
}

export interface TranscriptResponse {
  language: string;
  totalTokens: number;
  rawText: string;
  semantic: SemanticResult;
  chapters: TranscriptBlock[];
}

export interface SummaryBlock {
  title: string;
  summary: string;
  text: string;
  tokens: number;
}

export interface SummaryResponse {
  textLanguage: string;
  transcriptLanguage: string;
  blocks: SummaryBlock[];
}

export interface SummaryRequestBody {
  blocks: { title: string; text: string; tokens: number }[];
  textLanguage: string;
  transcriptLanguage?: string;
}

export interface TranscriptRequestBody {
  url: string;
  transcriptLanguage: string;
}

export interface ErrorResponse {
  error: string;
}
