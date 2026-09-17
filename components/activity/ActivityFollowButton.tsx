"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { IS_DEMO } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";

export default function ActivityFollowButton({
  userId,
}: {
  userId: string;
}) {
  const router = useRouter();

  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (IS_DEMO) {
      setLoading(false);
      return;
    }

    let active = true;

    async function checkFollowing() {
      try {
        const supabase = createClient();

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (active) {
            setLoading(false);
          }

          return;
        }

        const { data } = await supabase
          .from("follows")
          .select("follower_id")
          .eq("follower_id", user.id)
          .eq("following_id", userId)
          .maybeSingle();

        if (active) {
          setFollowing(!!data);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void checkFollowing();

    return () => {
      active = false;
    };
  }, [userId]);

  async function toggleFollow() {
    if (busy) return;

    const previous = following;

    setFollowing(!previous);
    setBusy(true);

    if (IS_DEMO) {
      setBusy(false);
      return;
    }

    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login?next=/activity");
        return;
      }

      if (previous) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", userId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("follows")
          .insert({
            follower_id: user.id,
            following_id: userId,
          });

        if (error) throw error;
      }

      router.refresh();
    } catch {
      setFollowing(previous);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return null;
  }

  return (
    <button
      type="button"
      className={following ? "secondary" : "primary"}
      disabled={busy}
      onClick={() => void toggleFollow()}
      style={{
        flexShrink: 0,
        width: "auto",
        padding: "9px 14px",
        fontSize: 13,
      }}
    >
      {busy
        ? "..."
        : following
          ? "seguindo"
          : "seguir de volta"}
    </button>
  );
}