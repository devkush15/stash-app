export type Platform = "youtube" | "instagram" | "x" | "whatsapp" | "website";
export type ProcessingStatus = "saved" | "pending" | "processing" | "ready" | "failed";

export type SavedItem = {
  id: string;
  user_id: string;
  original_url: string;
  normalized_url: string;
  platform: Platform;
  title: string | null;
  description: string | null;
  processing_status: ProcessingStatus;
  created_at: string;
  updated_at: string;
  search_document: string;
};

export type Database = {
  public: {
    Tables: {
      saved_items: {
        Row: SavedItem;
        Insert: {
          id?: string;
          user_id: string;
          original_url: string;
          normalized_url: string;
          platform: Platform;
          title?: string | null;
          description?: string | null;
          processing_status?: ProcessingStatus;
          created_at?: string;
          updated_at?: string;
          search_document?: never;
        };
        Update: {
          title?: string | null;
          description?: string | null;
          processing_status?: ProcessingStatus;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
