"use server";

import { createClient } from "@/lib/supabase/server";

export async function resetPassword(email: string) {
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/login/restablecerContra`, 
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function updatePassword(newPassword: string) {
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    throw new Error(error.message);
  }
}
