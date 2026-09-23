import { cache } from "react";

import { IS_DEMO } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

export const getViewer = cache(
  async () => {
    if (IS_DEMO) {
      return {
        signedIn: true,
        id: "demo",
        username: "demo",
        onboardingCompleted: true,
      };
    }

    const supabase =
      await createClient();

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      return {
        signedIn: false,
        id: null,
        username: null,
        onboardingCompleted: false,
      };
    }

    const {
      data: profile,
    } = await supabase
      .from("profiles")
      .select(
        "username, onboarding_completed"
      )
      .eq("id", user.id)
      .maybeSingle();

    return {
      signedIn: true,
      id: user.id,
      username:
        profile?.username ?? null,
      onboardingCompleted:
        profile?.onboarding_completed ??
        false,
    };
  }
);