export type Platform = "youtube" | "instagram" | "x" | "website";
export type ProcessingStatus =
  | "saved"
  | "pending"
  | "processing"
  | "ready"
  | "limited"
  | "deferred"
  | "failed";
export type SavedItem = {
  id: string;
  user_id: string;
  original_url: string;
  normalized_url: string;
  platform: Platform;
  title: string | null;
  description: string | null;
  user_note: string | null;
  title_edited: number;
  tags_edited: number;
  processing_status: ProcessingStatus;
  created_at: string;
  updated_at: string;
  summary: string | null;
  category: string | null;
  tags: string[];
  source_text: string | null;
  metadata_level: "none" | "metadata" | "text";
  indexing_note: string | null;
  processing_started_at: string | null;
  ai_processed_at: string | null;
};
export type User = { id: string; username: string };
