import { supabase } from "@/integrations/supabase/client";

export interface AuthUser {
  id: string;
  email?: string;
  login?: string;
  full_name?: string;
  role?: string;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  return {
    id: user.id,
    email: user.email,
    login: profile?.login,
    full_name: profile?.full_name,
    role: roleData?.role || "employee",
  };
}

export async function signIn(login: string, password: string) {
  // Try login as email first, then look up by login
  let email = login;
  
  // If it doesn't look like an email, try to find by login or phone
  if (!login.includes("@")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .or(`login.eq.${login},phone.eq.${login}`)
      .single();
    
    if (profile?.email) {
      email = profile.email;
    }
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function signOut() {
  return supabase.auth.signOut();
}
