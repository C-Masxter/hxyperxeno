export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_credits: {
        Row: {
          balance: number
          daily_allowance: number
          last_reset: string
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          daily_allowance?: number
          last_reset?: string
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          daily_allowance?: number
          last_reset?: string
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_flagged_reports: {
        Row: {
          content: string
          created_at: string
          id: string
          reason: string
          reviewed: boolean
          user_id: string | null
          username: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          reason: string
          reviewed?: boolean
          user_id?: string | null
          username?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          reason?: string
          reviewed?: boolean
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          cost: number
          created_at: string
          id: string
          mode: string | null
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          cost?: number
          created_at?: string
          id?: string
          mode?: string | null
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          cost?: number
          created_at?: string
          id?: string
          mode?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_upgrade_requests: {
        Row: {
          admin_note: string | null
          amount_cents: number
          cashapp_username: string
          created_at: string
          device_info: string | null
          email: string | null
          full_name: string | null
          id: string
          ip_address: string | null
          status: string
          tier: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount_cents: number
          cashapp_username: string
          created_at?: string
          device_info?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          ip_address?: string | null
          status?: string
          tier: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount_cents?: number
          cashapp_username?: string
          created_at?: string
          device_info?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          ip_address?: string | null
          status?: string
          tier?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          active: boolean
          body: string
          created_at: string
          id: string
          title: string
          type: string
        }
        Insert: {
          active?: boolean
          body: string
          created_at?: string
          id?: string
          title: string
          type?: string
        }
        Update: {
          active?: boolean
          body?: string
          created_at?: string
          id?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      appeals: {
        Row: {
          admin_response: string | null
          created_at: string
          id: string
          message: string
          reason: string
          status: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          created_at?: string
          id?: string
          message: string
          reason: string
          status?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          created_at?: string
          id?: string
          message?: string
          reason?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          details: Json | null
          id: string
          target: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target?: string | null
        }
        Relationships: []
      }
      changelogs: {
        Row: {
          changes: Json
          id: string
          notes: string | null
          release_date: string
          version: string
        }
        Insert: {
          changes?: Json
          id?: string
          notes?: string | null
          release_date?: string
          version: string
        }
        Update: {
          changes?: Json
          id?: string
          notes?: string | null
          release_date?: string
          version?: string
        }
        Relationships: []
      }
      community_posts: {
        Row: {
          body: string
          created_at: string
          hidden: boolean
          id: string
          title: string
          user_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          hidden?: boolean
          id?: string
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          hidden?: boolean
          id?: string
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      content_versions: {
        Row: {
          content_json: Json | null
          content_text: string
          id: string
          page_id: string
          saved_at: string
          saved_by: string | null
          section_id: string
        }
        Insert: {
          content_json?: Json | null
          content_text: string
          id?: string
          page_id: string
          saved_at?: string
          saved_by?: string | null
          section_id: string
        }
        Update: {
          content_json?: Json | null
          content_text?: string
          id?: string
          page_id?: string
          saved_at?: string
          saved_by?: string | null
          section_id?: string
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          delivered_at: string | null
          edited_at: string | null
          hidden_by_admin: boolean
          id: string
          read: boolean
          recipient_id: string
          reply_to_id: string | null
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          deleted_at?: string | null
          delivered_at?: string | null
          edited_at?: string | null
          hidden_by_admin?: boolean
          id?: string
          read?: boolean
          recipient_id: string
          reply_to_id?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          delivered_at?: string | null
          edited_at?: string | null
          hidden_by_admin?: boolean
          id?: string
          read?: boolean
          recipient_id?: string
          reply_to_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "direct_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_pins: {
        Row: {
          created_at: string
          id: string
          peer_id: string
          priority: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          peer_id: string
          priority?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          peer_id?: string
          priority?: boolean
          user_id?: string
        }
        Relationships: []
      }
      downloads: {
        Row: {
          file_name: string
          id: string
          product_key: string
          requires_approval: boolean
          url: string
          version: string
        }
        Insert: {
          file_name: string
          id?: string
          product_key: string
          requires_approval?: boolean
          url: string
          version: string
        }
        Update: {
          file_name?: string
          id?: string
          product_key?: string
          requires_approval?: boolean
          url?: string
          version?: string
        }
        Relationships: []
      }
      faq_items: {
        Row: {
          answer: string
          enabled: boolean
          id: string
          question: string
          sort_order: number
        }
        Insert: {
          answer: string
          enabled?: boolean
          id?: string
          question: string
          sort_order?: number
        }
        Update: {
          answer?: string
          enabled?: boolean
          id?: string
          question?: string
          sort_order?: number
        }
        Relationships: []
      }
      feature_blocks: {
        Row: {
          description: string
          enabled: boolean
          icon: string | null
          id: string
          page_id: string
          sort_order: number
          title: string
        }
        Insert: {
          description?: string
          enabled?: boolean
          icon?: string | null
          id?: string
          page_id: string
          sort_order?: number
          title: string
        }
        Update: {
          description?: string
          enabled?: boolean
          icon?: string | null
          id?: string
          page_id?: string
          sort_order?: number
          title?: string
        }
        Relationships: []
      }
      ip_blocklist: {
        Row: {
          created_at: string
          id: string
          ip: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip?: string
          reason?: string | null
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "direct_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      news_posts: {
        Row: {
          body: string
          created_at: string
          id: string
          published: boolean
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          published?: boolean
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          published?: boolean
          title?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      page_content: {
        Row: {
          content_json: Json | null
          content_text: string
          id: string
          page_id: string
          section_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content_json?: Json | null
          content_text?: string
          id?: string
          page_id: string
          section_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content_json?: Json | null
          content_text?: string
          id?: string
          page_id?: string
          section_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          enabled: boolean
          id: string
          method_key: string
          name: string
          sort_order: number
        }
        Insert: {
          enabled?: boolean
          id?: string
          method_key: string
          name: string
          sort_order?: number
        }
        Update: {
          enabled?: boolean
          id?: string
          method_key?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      pricing_plans: {
        Row: {
          enabled: boolean
          features: Json
          highlight: boolean
          id: string
          name: string
          period: string
          plan_key: string
          price_cents: number
          sort_order: number
        }
        Insert: {
          enabled?: boolean
          features?: Json
          highlight?: boolean
          id?: string
          name: string
          period?: string
          plan_key: string
          price_cents?: number
          sort_order?: number
        }
        Update: {
          enabled?: boolean
          features?: Json
          highlight?: boolean
          id?: string
          name?: string
          period?: string
          plan_key?: string
          price_cents?: number
          sort_order?: number
        }
        Relationships: []
      }
      products: {
        Row: {
          description: string
          enabled: boolean
          features: Json
          id: string
          name: string
          price_cents: number
          product_key: string
          sort_order: number
          tier: string
        }
        Insert: {
          description?: string
          enabled?: boolean
          features?: Json
          id?: string
          name: string
          price_cents?: number
          product_key: string
          sort_order?: number
          tier: string
        }
        Update: {
          description?: string
          enabled?: boolean
          features?: Json
          id?: string
          name?: string
          price_cents?: number
          product_key?: string
          sort_order?: number
          tier?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          username?: string
        }
        Relationships: []
      }
      purchase_requests: {
        Row: {
          admin_note: string | null
          amount_cents: number
          cashapp_username: string
          country: string | null
          created_at: string
          device_info: string | null
          email: string
          full_name: string
          id: string
          ip_address: string | null
          phone: string
          product_key: string
          status: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          admin_note?: string | null
          amount_cents?: number
          cashapp_username: string
          country?: string | null
          created_at?: string
          device_info?: string | null
          email: string
          full_name: string
          id?: string
          ip_address?: string | null
          phone: string
          product_key: string
          status?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          admin_note?: string | null
          amount_cents?: number
          cashapp_username?: string
          country?: string | null
          created_at?: string
          device_info?: string | null
          email?: string
          full_name?: string
          id?: string
          ip_address?: string | null
          phone?: string
          product_key?: string
          status?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      security_logs: {
        Row: {
          created_at: string
          details: Json | null
          event_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      system_status: {
        Row: {
          id: string
          message: string | null
          service_name: string
          status: string
          updated_at: string
        }
        Insert: {
          id?: string
          message?: string | null
          service_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          id?: string
          message?: string | null
          service_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_friends: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          trusted: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          trusted?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          trusted?: boolean
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "user" | "admin" | "banned"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["user", "admin", "banned"],
    },
  },
} as const
