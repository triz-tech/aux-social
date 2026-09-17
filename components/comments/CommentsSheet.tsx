
"use client";

import { Send, X } from "lucide-react";
import { useEffect, useState } from "react";
import { IS_DEMO } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";

type Item = {
  id: string;
  name: string;
  text: string;
};

type CommentRow = {
  id: string;
  body: string;
  author:
    | { username: string | null }
    | Array<{ username: string | null }>
    | null;
};

export default function CommentsSheet({
  postId,
  open,
  onClose,
}: {
  postId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [body, setBody] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (IS_DEMO) {
      setItems([
        {
          id: "demo",
          name: "lu",
          text: "essa ficou mesmo.",
        },
      ]);
      return;
    }

    void (async () => {
      setLoading(true);
      setError("");

      try {
        const s = createClient();

        const { data, error: e } = await s
          .from("comments")
          .select(
            "id,body,author:profiles!comments_user_id_fkey(username)"
          )
          .eq("post_id", postId)
          .order("created_at");

        if (e) throw e;

        const rows = (data ?? []) as unknown as CommentRow[];

        setItems(
          rows.map((row) => {
            const author = Array.isArray(row.author)
              ? row.author[0]
              : row.author;

            return {
              id: row.id,
              text: row.body,
              name: author?.username ?? "alguém",
            };
          })
        );
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Não consegui carregar os comentários."
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [open, postId]);

  if (!open) return null;

  async function send() {
    const text = body.trim();

    if (!text) return;

    if (IS_DEMO) {
      setItems((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          name: "você",
          text,
        },
      ]);

      setBody("");
      return;
    }

    try {
      const s = createClient();

      const {
        data: { user },
      } = await s.auth.getUser();

      if (!user) {
        location.href = `/login?next=${encodeURIComponent(
          location.pathname
        )}`;
        return;
      }

      const { data, error: e } = await s
        .from("comments")
        .insert({
          post_id: postId,
          user_id: user.id,
          body: text,
        })
        .select("id")
        .single();

      if (e) throw e;

      setItems((current) => [
        ...current,
        {
          id: data.id,
          name: "você",
          text,
        },
      ]);

      setBody("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não consegui comentar."
      );
    }
  }

  return (
    <div
      className="sheetBackdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Comentários"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section className="sheet">
        <div className="handle" />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2
            className="sheetTitle"
            style={{ margin: "0 auto 16px" }}
          >
            comentários
          </h2>

          <button
            className="iconBtn"
            aria-label="Fechar"
            onClick={onClose}
          >
            <X />
          </button>
        </div>

        <div className="stack">
          {loading && (
            <p className="subtle">carregando...</p>
          )}

          {!loading && !items.length && (
            <p className="subtle">
              ninguém comentou ainda.
            </p>
          )}

          {items.map((item) => (
            <div key={item.id}>
              <strong>@{item.name}</strong>{" "}
              <span>{item.text}</span>
            </div>
          ))}

          {error && <div className="error">{error}</div>}

          <div
            style={{
              display: "flex",
              gap: 8,
            }}
          >
            <input
              className="field"
              value={body}
              onChange={(event) =>
                setBody(event.target.value)
              }
              maxLength={800}
              placeholder="escreva um comentário"
            />

            <button
              className="primary"
              aria-label="Enviar"
              onClick={send}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}