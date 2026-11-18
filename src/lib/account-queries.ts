import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Browser-only queries for signed-in pages (RLS applies as the user).

export const myTutorQuery = (userId: string) =>
  queryOptions({
    queryKey: ["my-tutor", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("tutors").select("*").eq("user_id", userId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const myDocumentsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["my-documents", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("verification_documents")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const isAdminQuery = (userId: string) =>
  queryOptions({
    queryKey: ["is-admin", userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
      if (error) throw error;
      return data === true;
    },
  });

export const profileQuery = (userId: string) =>
  queryOptions({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
