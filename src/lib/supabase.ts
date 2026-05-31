import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Custom storage adapter to ensure persistent session storage
const customStorage = {
  getItem: (key: string) => {
    if (typeof window !== 'undefined') {
      const item = window.localStorage.getItem(key);
      return item;
    }
    return null;
  },
  setItem: (key: string, value: string) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, value);
    }
  },
  removeItem: (key: string) => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(key);
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: customStorage,
  },
});

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          first_name: string;
          last_name: string;
          avatar_url: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          email: string;
          first_name: string;
          last_name: string;
          avatar_url?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          first_name?: string;
          last_name?: string;
          avatar_url?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      schools: {
        Row: {
          id: string;
          name: string;
          school_code: string;
          address: string | null;
          city: string | null;
          postal_code: string | null;
          country: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          school_code: string;
          address?: string | null;
          city?: string | null;
          postal_code?: string | null;
          country?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          school_code?: string;
          address?: string | null;
          city?: string | null;
          postal_code?: string | null;
          country?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      students: {
        Row: {
          id: string;
          school_id: string;
          first_name: string;
          last_name: string;
          student_number: string | null;
          grade_level: string | null;
          date_of_birth: string | null;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          school_id: string;
          first_name: string;
          last_name: string;
          student_number?: string | null;
          grade_level?: string | null;
          date_of_birth?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          school_id?: string;
          first_name?: string;
          last_name?: string;
          student_number?: string | null;
          grade_level?: string | null;
          date_of_birth?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      user_schools: {
        Row: {
          id: string;
          user_id: string;
          school_id: string;
          role: string;
          joined_at: string | null;
          is_active: boolean | null;
          status: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          school_id: string;
          role?: string;
          joined_at?: string | null;
          is_active?: boolean | null;
          status?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          school_id?: string;
          role?: string;
          joined_at?: string | null;
          is_active?: boolean | null;
          status?: string;
        };
      };
      teammembers: {
        Row: {
          id: string;
          user_id: string;
          employee_number: string | null;
          subject_specialization: string | null;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          employee_number?: string | null;
          subject_specialization?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          employee_number?: string | null;
          subject_specialization?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      student_groups: {
        Row: {
          id: string;
          student_id: string;
          group_id: string;
          enrolled_at: string | null;
          is_active: boolean | null;
        };
        Insert: {
          id?: string;
          student_id: string;
          group_id: string;
          enrolled_at?: string | null;
          is_active?: boolean | null;
        };
        Update: {
          id?: string;
          student_id?: string;
          group_id?: string;
          enrolled_at?: string | null;
          is_active?: boolean | null;
        };
      };
      groups: {
        Row: {
          id: string;
          school_id: string;
          name: string;
          description: string | null;
          grade_level: string | null;
          school_year: string | null;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          school_id: string;
          name: string;
          description?: string | null;
          grade_level?: string | null;
          school_year?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          school_id?: string;
          name?: string;
          description?: string | null;
          grade_level?: string | null;
          school_year?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      teammember_groups: {
        Row: {
          id: string;
          teammember_id: string;
          group_id: string;
          role: string | null;
          assigned_at: string | null;
        };
        Insert: {
          id?: string;
          teammember_id: string;
          group_id: string;
          role?: string | null;
          assigned_at?: string | null;
        };
        Update: {
          id?: string;
          teammember_id?: string;
          group_id?: string;
          role?: string | null;
          assigned_at?: string | null;
        };
      };
      user_favorites: {
        Row: {
          id: string;
          user_id: string;
          favoritable_type: 'student' | 'group';
          favoritable_id: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          favoritable_type: 'student' | 'group';
          favoritable_id: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          favoritable_type?: 'student' | 'group';
          favoritable_id?: string;
          created_at?: string | null;
        };
      };
      student_roles: {
        Row: {
          id: string;
          school_id: string;
          name: string;
          description: string | null;
          color: string;
          is_active: boolean;
          is_default: boolean;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          school_id: string;
          name: string;
          description?: string | null;
          color?: string;
          is_active?: boolean;
          is_default?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          school_id?: string;
          name?: string;
          description?: string | null;
          color?: string;
          is_active?: boolean;
          is_default?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      followup_actions: {
        Row: {
          id: string;
          school_id: string;
          name: string;
          description: string | null;
          color: string;
          is_active: boolean;
          sort_order: number;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          school_id: string;
          name: string;
          description?: string | null;
          color?: string;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          school_id?: string;
          name?: string;
          description?: string | null;
          color?: string;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      behavior_incident_attachments: {
        Row: {
          id: string;
          incident_id: string;
          file_name: string;
          file_url: string;
          file_type: string;
          file_size: number;
          uploaded_by: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          incident_id: string;
          file_name: string;
          file_url: string;
          file_type: string;
          file_size?: number;
          uploaded_by: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          incident_id?: string;
          file_name?: string;
          file_url?: string;
          file_type?: string;
          file_size?: number;
          uploaded_by?: string;
          created_at?: string | null;
        };
      };
      behavior_incident_students: {
        Row: {
          id: string;
          incident_id: string;
          student_id: string;
          role_id: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          incident_id: string;
          student_id: string;
          role_id: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          incident_id?: string;
          student_id?: string;
          role_id?: string;
          created_at?: string | null;
        };
      };
      behavior_incident_notifications: {
        Row: {
          id: string;
          incident_id: string;
          teacher_id: string | null;
          group_id: string | null;
          notification_type: 'teacher' | 'group';
          created_at: string | null;
        };
        Insert: {
          id?: string;
          incident_id: string;
          teacher_id?: string | null;
          group_id?: string | null;
          notification_type: 'teacher' | 'group';
          created_at?: string | null;
        };
        Update: {
          id?: string;
          incident_id?: string;
          teacher_id?: string | null;
          group_id?: string | null;
          notification_type?: 'teacher' | 'group';
          created_at?: string | null;
        };
      };
      behavior_categories: {
        Row: {
          id: string;
          school_id: string;
          name: string;
          description: string | null;
          color: string;
          is_active: boolean;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          school_id: string;
          name: string;
          description?: string | null;
          color?: string;
          is_active?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          school_id?: string;
          name?: string;
          description?: string | null;
          color?: string;
          is_active?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      behavior_severity_levels: {
        Row: {
          id: string;
          school_id: string;
          name: string;
          level: number;
          color: string;
          description: string | null;
          is_active: boolean;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          school_id: string;
          name: string;
          level: number;
          color?: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          school_id?: string;
          name?: string;
          level?: number;
          color?: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      behavior_items: {
        Row: {
          id: string;
          school_id: string;
          category_id: string;
          severity_level_id: string;
          name: string;
          description: string | null;
          is_active: boolean;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          school_id: string;
          category_id: string;
          severity_level_id: string;
          name: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          school_id?: string;
          category_id?: string;
          severity_level_id?: string;
          name?: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      consequences: {
        Row: {
          id: string;
          school_id: string;
          name: string;
          description: string | null;
          severity_level: number | null;
          is_active: boolean;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          school_id: string;
          name: string;
          description?: string | null;
          severity_level?: number | null;
          is_active?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          school_id?: string;
          name?: string;
          description?: string | null;
          severity_level?: number | null;
          is_active?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      behavior_item_consequences: {
        Row: {
          id: string;
          behavior_item_id: string;
          consequence_id: string;
          is_default: boolean;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          behavior_item_id: string;
          consequence_id: string;
          is_default?: boolean;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          behavior_item_id?: string;
          consequence_id?: string;
          is_default?: boolean;
          created_at?: string | null;
        };
      };
      day_templates: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          school_id: string;
          is_active: boolean;
          created_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          school_id: string;
          is_active?: boolean;
          created_at?: string;
          created_by: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          school_id?: string;
          is_active?: boolean;
          created_at?: string;
          created_by?: string;
        };
      };
      day_template_blocks: {
        Row: {
          id: string;
          template_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          student_id: string;
          block_type: 'lesson' | 'break' | 'lunch' | 'other';
          title: string;
          subject: string | null;
          location: string | null;
          description: string | null;
          sort_order: number | null;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          template_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          block_type: 'lesson' | 'break' | 'lunch' | 'other';
          title: string;
          subject?: string | null;
          location?: string | null;
          description?: string | null;
          sort_order?: number | null;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          template_id?: string;
          day_of_week?: number;
          start_time?: string;
          end_time?: string;
          block_type?: 'lesson' | 'break' | 'lunch' | 'other';
          title?: string;
          subject?: string | null;
          location?: string | null;
          description?: string | null;
          sort_order?: number | null;
          is_active?: boolean;
        };
      };
      school_day_templates: {
        Row: {
          id: string;
          school_id: string;
          template_id: string;
          is_default: boolean;
          effective_from: string;
          effective_until: string | null;
        };
        Insert: {
          id?: string;
          school_id: string;
          student_id: string;
          template_id: string;
          is_default?: boolean;
          effective_from: string;
          effective_until?: string | null;
        };
        Update: {
          id?: string;
          school_id?: string;
          student_id?: string;
          template_id?: string;
          is_default?: boolean;
          effective_from?: string;
          effective_until?: string | null;
        };
      };
      group_day_templates: {
        Row: {
          id: string;
          group_id: string;
          template_id: string;
          is_default: boolean;
          effective_from: string;
          effective_until: string | null;
        };
        Insert: {
          id?: string;
          group_id: string;
          template_id: string;
          is_default?: boolean;
          effective_from: string;
          effective_until?: string | null;
        };
        Update: {
          id?: string;
          group_id?: string;
          template_id?: string;
          is_default?: boolean;
          effective_from?: string;
          effective_until?: string | null;
        };
      };
      day_block_activities: {
        Row: {
          id: string;
          template_block_id: string;
          user_id: string;
          activity_date: string;
          activity_type: 'technique_used' | 'behavior_incident' | 'note';
          technique_id: string | null;
          behavior_incident_id: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          template_block_id: string;
          user_id: string;
          activity_date: string;
          activity_type: 'technique_used' | 'behavior_incident' | 'note';
          technique_id?: string | null;
          behavior_incident_id?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          template_block_id?: string;
          user_id?: string;
          activity_date?: string;
          activity_type?: 'technique_used' | 'behavior_incident' | 'note';
          technique_id?: string | null;
          behavior_incident_id?: string | null;
          notes?: string | null;
          created_at?: string;
        };
      };
    }
  }
}