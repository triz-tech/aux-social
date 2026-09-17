import {
  Heart,
  MessageCircle,
  Repeat2,
  UserPlus,
} from "lucide-react";
import Link from "next/link";

import ActivityFollowButton from "@/components/activity/ActivityFollowButton";
import Avatar from "@/components/ui/Avatar";

import { IS_DEMO } from "@/lib/config";
import { demoActivity } from "@/lib/data/demo";
import { createClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/utils";

import type {
  ActivityItem,
  Profile,
} from "@/types";

/*
 * =========================================================
 * ACTIVITY REAL
 * =========================================================
 */

async function realActivity(): Promise<
  ActivityItem[]
> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    const { data, error } = await supabase
      .from("notifications")
      .select(
        `
          id,
          type,
          created_at,
          post_id,
          read_at,

          actor:profiles!notifications_actor_id_fkey(
            id,
            username,
            display_name,
            bio,
            avatar_url
          )
        `
      )
      .eq("recipient_id", user.id)
      .order("created_at", {
        ascending: false,
      })
      .limit(50);

    if (error) {
      throw error;
    }

    return (data ?? []).map((row) => ({
      ...row,

      actor: (
        Array.isArray(row.actor)
          ? row.actor[0]
          : row.actor
      ) as Profile,
    })) as ActivityItem[];
  } catch {
    return [];
  }
}

/*
 * =========================================================
 * COPY
 * =========================================================
 */

const labels = {
  like: "curtiu sua publicação",
  comment: "comentou na sua publicação",
  follow: "começou a seguir você",
  repost: "repostou sua publicação",
};

const icons = {
  like: Heart,
  comment: MessageCircle,
  follow: UserPlus,
  repost: Repeat2,
};

/*
 * =========================================================
 * PAGE
 * =========================================================
 */

export default async function ActivityPage() {
  const items = IS_DEMO
    ? demoActivity
    : await realActivity();

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          aux.
        </div>

        <span className="pill">
          Activity
        </span>
      </header>

      <h1 className="pageTitle">
        aconteceu.
      </h1>

      <div className="stack">
        {items.map((item) => {
          const Icon =
            icons[item.type];

          /*
           * Follow abre o perfil.
           *
           * Likes/comments/reposts
           * levam para a publicação.
           */

          const href =
            item.type === "follow" ||
            !item.post_id
              ? `/u/${item.actor.username}`
              : `/p/${item.post_id}`;

          return (
            <div
              className="choice"
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              {/*
               * Tipo da atividade
               */}

              <span className="choiceIcon">
                <Icon size={18} />
              </span>

              {/*
               * Pessoa + descrição
               */}

              <Link
                href={href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  flex: 1,
                  minWidth: 0,
                  color: "inherit",
                  textDecoration: "none",
                }}
              >
                <Avatar
                  profile={item.actor}
                />

                <div
                  style={{
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  <strong
                    style={{
                      display: "block",
                    }}
                  >
                    {
                      item.actor
                        .display_name
                    }{" "}
                    {labels[item.type]}
                  </strong>

                  <span>
                    {timeAgo(
                      item.created_at
                    )}
                  </span>
                </div>
              </Link>

              {/*
               * Seguir de volta
               */}

              {item.type ===
                "follow" && (
                <ActivityFollowButton
                  userId={
                    item.actor.id
                  }
                />
              )}
            </div>
          );
        })}

        {!items.length && (
          <div className="empty">
            <p>
              ainda tá quieto por aqui.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}