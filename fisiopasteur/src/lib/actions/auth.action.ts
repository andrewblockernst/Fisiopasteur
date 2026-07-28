"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions/action-result";
import { passwordSchema } from "@/lib/schemas/password.schema";

export async function resetPassword(email: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/login/restablecerContra`, 
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function updatePassword(newPassword: string): Promise<ActionResult> {
  const parsed = passwordSchema.safeParse(newPassword);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
