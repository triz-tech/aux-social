"use client";

import {
  Reply,
  Send,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { createPortal } from "react-dom";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  FormEvent,
  ReactNode,
} from "react";

import { IS_DEMO } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/utils";

import styles from "./CommentsSheet.module.css";

type CommentAuthor = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

type CommentItem = {
  id: string;
  body: string;
  parent_id: string | null;
  created_at: string;
  author: CommentAuthor;
};

type RawComment = Omit<
  CommentItem,
  "author"
> & {
  author:
    | CommentAuthor
    | CommentAuthor[];
};

function one<T>(
  value: T | T[]
): T {
  return Array.isArray(value)
    ? value[0]
    : value;
}

function initials(
  name: string
) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "A"
  );
}

function CommentAvatar({
  author,
}: {
  author: CommentAuthor;
}) {
  if (author.avatar_url) {
    return (
      <img
        className={styles.avatar}
        src={author.avatar_url}
        alt=""
      />
    );
  }

  return (
    <div
      className={styles.avatarFallback}
      aria-hidden="true"
    >
      {initials(
        author.display_name
      )}
    </div>
  );
}

export default function CommentsSheet({
  postId,
  open,
  onClose,
  onCommentCountChange,
}: {
  postId: string;
  open: boolean;
  onClose: () => void;
  onCommentCountChange?: (
    count: number
  ) => void;
}) {
  const [
    comments,
    setComments,
  ] = useState<CommentItem[]>(
    []
  );

  const [text, setText] =
    useState("");

  const [
    replyingTo,
    setReplyingTo,
  ] = useState<CommentItem | null>(
    null
  );

  const [loading, setLoading] =
    useState(false);

  const [sending, setSending] =
    useState(false);

  const [error, setError] =
    useState("");

  const [
    viewerId,
    setViewerId,
  ] = useState<string | null>(
    null
  );

  const [
    deletingId,
    setDeletingId,
  ] = useState<string | null>(
    null
  );

  const [
    confirmDeleteId,
    setConfirmDeleteId,
  ] = useState<string | null>(
    null
  );

  const inputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const [
    viewportStyle,
    setViewportStyle,
  ] = useState<{
    height?: string;
    top?: string;
  }>({});

  async function loadComments(
    options?: {
      silent?: boolean;
    }
  ) {
    if (IS_DEMO) {
      setComments([]);
      setLoading(false);
      onCommentCountChange?.(
        0
      );
      return;
    }

    const silent =
      options?.silent ??
      false;

    if (!silent) {
      setLoading(true);
    }

    setError("");

    try {
      const supabase =
        createClient();

      const {
        data,
        error: loadError,
      } = await supabase
        .from("comments")
        .select(`
          id,
          body,
          parent_id,
          created_at,
          author:profiles!comments_user_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq(
          "post_id",
          postId
        )
        .order(
          "created_at",
          {
            ascending: true,
          }
        );

      if (loadError) {
        throw loadError;
      }

      const normalized =
        (
          data ??
          []
        ).map((item) => {
          const row =
            item as unknown as RawComment;

          return {
            id: row.id,
            body: row.body,
            parent_id:
              row.parent_id,
            created_at:
              row.created_at,
            author: one(
              row.author
            ),
          };
        });

      setComments(
        normalized
      );

      onCommentCountChange?.(
        normalized.length
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "não consegui carregar os comentários."
      );
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    /*
     * O modal é renderizado em document.body via portal.
     * Também descobrimos quem está logado para mostrar
     * "excluir" somente nos próprios comentários.
     */
    if (!IS_DEMO) {
      const supabase =
        createClient();

      void supabase.auth
        .getUser()
        .then(
          ({
            data: { user },
          }) => {
            setViewerId(
              user?.id ?? null
            );
          }
        )
        .catch(() => {
          setViewerId(null);
        });
    }

    void loadComments();

    const previousOverflow =
      document.body.style
        .overflow;

    document.body.style.overflow =
      "hidden";

    function keydown(
      event: KeyboardEvent
    ) {
      if (
        event.key === "Escape"
      ) {
        onClose();
      }
    }

    window.addEventListener(
      "keydown",
      keydown
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        keydown
      );
    };

    // postId identifica a conversa que precisa ser carregada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, postId]);

  useEffect(() => {
    if (!open) {
      setReplyingTo(null);
      setText("");
      setError("");
      setConfirmDeleteId(
        null
      );
      setDeletingId(null);
    }
  }, [open]);

  const childrenByParent =
    useMemo(() => {
      const map =
        new Map<
          string,
          CommentItem[]
        >();

      comments.forEach(
        (comment) => {
          if (
            !comment.parent_id
          ) {
            return;
          }

          const existing =
            map.get(
              comment.parent_id
            ) ?? [];

          existing.push(
            comment
          );

          map.set(
            comment.parent_id,
            existing
          );
        }
      );

      return map;
    }, [comments]);

  const roots =
    useMemo(
      () =>
        comments.filter(
          (comment) =>
            !comment.parent_id ||
            !comments.some(
              (candidate) =>
                candidate.id ===
                comment.parent_id
            )
        ),
      [comments]
    );

  function chooseReply(
    comment: CommentItem
  ) {
    setReplyingTo(
      comment
    );

    window.setTimeout(
      () => {
        inputRef.current?.focus();
      },
      0
    );
  }

  async function sendComment(
    event: FormEvent
  ) {
    event.preventDefault();

    const body =
      text.trim();

    if (
      !body ||
      sending
    ) {
      return;
    }

    setSending(true);
    setError("");

    try {
      if (IS_DEMO) {
        const demoAuthor: CommentAuthor =
          {
            id: "demo-viewer",
            username: "voce",
            display_name:
              "Você",
            avatar_url:
              null,
          };

        setComments(
          (current) => {
            const next = [
              ...current,
              {
                id:
                  crypto.randomUUID(),
                body,
                parent_id:
                  replyingTo?.id ??
                  null,
                created_at:
                  new Date().toISOString(),
                author:
                  demoAuthor,
              },
            ];

            onCommentCountChange?.(
              next.length
            );

            return next;
          }
        );

        setText("");
        setReplyingTo(
          null
        );
        return;
      }

      const supabase =
        createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        location.href =
          `/login?next=${encodeURIComponent(
            location.pathname
          )}`;

        return;
      }

      const {
        error: insertError,
      } = await supabase
        .from("comments")
        .insert({
          post_id: postId,
          user_id: user.id,
          body,
          parent_id:
            replyingTo?.id ??
            null,
        });

      if (insertError) {
        throw insertError;
      }

      setText("");
      setReplyingTo(
        null
      );

      /*
       * Atualiza a lista sem trocar o conteúdo por
       * "carregando...". Assim o comentário não pisca.
       * A própria consulta devolve a contagem real.
       */
      await loadComments({
        silent: true,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "não consegui enviar o comentário."
      );
    } finally {
      setSending(false);
    }
  }

  async function deleteComment(
    comment: CommentItem
  ) {
    if (
      deletingId ||
      comment.author.id !==
        viewerId
    ) {
      return;
    }

    setDeletingId(
      comment.id
    );
    setError("");

    try {
      if (IS_DEMO) {
        /*
         * No schema real parent_id usa ON DELETE CASCADE.
         * O demo imita o mesmo comportamento:
         * apaga o comentário e toda a ramificação abaixo.
         */
        const idsToDelete =
          new Set<string>([
            comment.id,
          ]);

        let changed = true;

        while (changed) {
          changed = false;

          comments.forEach(
            (item) => {
              if (
                item.parent_id &&
                idsToDelete.has(
                  item.parent_id
                ) &&
                !idsToDelete.has(
                  item.id
                )
              ) {
                idsToDelete.add(
                  item.id
                );
                changed = true;
              }
            }
          );
        }

        setComments(
          (current) => {
            const next =
              current.filter(
                (item) =>
                  !idsToDelete.has(
                    item.id
                  )
              );

            onCommentCountChange?.(
              next.length
            );

            return next;
          }
        );

        setConfirmDeleteId(
          null
        );
        return;
      }

      const supabase =
        createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (
        !user ||
        user.id !==
          comment.author.id
      ) {
        throw new Error(
          "você só pode excluir seus próprios comentários."
        );
      }

      const {
        error: deleteError,
      } = await supabase
        .from("comments")
        .delete()
        .eq(
          "id",
          comment.id
        )
        .eq(
          "user_id",
          user.id
        );

      if (deleteError) {
        throw deleteError;
      }

      if (
        replyingTo?.id ===
        comment.id
      ) {
        setReplyingTo(null);
      }

      setConfirmDeleteId(
        null
      );

      /*
       * Consulta silenciosa: mantém a thread na tela
       * durante a sincronização e devolve a contagem real.
       */
      await loadComments({
        silent: true,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "não consegui excluir esse comentário."
      );
    } finally {
      setDeletingId(null);
    }
  }

  function renderComment(
    comment: CommentItem,
    depth = 0
  ): ReactNode {
    const replies =
      childrenByParent.get(
        comment.id
      ) ?? [];

    return (
      <div
        key={comment.id}
        className={
          depth > 0
            ? styles.replyBranch
            : styles.commentBranch
        }
      >
        <article
          className={
            styles.comment
          }
        >
          <Link
            href={`/u/${comment.author.username}`}
            className={
              styles.avatarLink
            }
            onClick={onClose}
            aria-label={`Abrir perfil de ${comment.author.display_name}`}
          >
            <CommentAvatar
              author={
                comment.author
              }
            />
          </Link>

          <div
            className={
              styles.commentContent
            }
          >
            <div
              className={
                styles.commentMeta
              }
            >
              <Link
                href={`/u/${comment.author.username}`}
                onClick={
                  onClose
                }
              >
                @
                {
                  comment.author
                    .username
                }
              </Link>

              <span>
                {timeAgo(
                  comment.created_at
                )}
              </span>
            </div>

            <p>
              {comment.body}
            </p>

            <div
              className={
                styles.commentActions
              }
            >
              <button
                type="button"
                className={
                  styles.replyButton
                }
                onClick={() =>
                  chooseReply(
                    comment
                  )
                }
              >
                <Reply
                  size={13}
                  strokeWidth={
                    1.8
                  }
                />
                responder
              </button>

              {viewerId ===
                comment.author
                  .id && (
                <>
                  {confirmDeleteId ===
                  comment.id ? (
                    <span
                      className={
                        styles.deleteConfirm
                      }
                    >
                      <button
                        type="button"
                        onClick={() =>
                          void deleteComment(
                            comment
                          )
                        }
                        disabled={
                          deletingId ===
                          comment.id
                        }
                      >
                        {deletingId ===
                        comment.id
                          ? "excluindo..."
                          : "sim, excluir"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setConfirmDeleteId(
                            null
                          )
                        }
                        disabled={
                          deletingId ===
                          comment.id
                        }
                      >
                        cancelar
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className={
                        styles.deleteButton
                      }
                      onClick={() =>
                        setConfirmDeleteId(
                          comment.id
                        )
                      }
                      aria-label="Excluir comentário"
                    >
                      <Trash2
                        size={12}
                      />
                      excluir
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </article>

        {replies.length >
          0 && (
          <div
            className={
              styles.replies
            }
          >
            {replies.map(
              (reply) =>
                renderComment(
                  reply,
                  depth + 1
                )
            )}
          </div>
        )}
      </div>
    );
  }

  useEffect(() => {
    if (!open) {
      setViewportStyle({});
      return;
    }

    const viewportCandidate =
      window.visualViewport;

    if (!viewportCandidate) {
      return;
    }

    /*
     * Depois da checagem acima, congelamos a referência
     * como VisualViewport não-null. Assim o TypeScript
     * mantém o narrowing também dentro do callback do
     * requestAnimationFrame.
     */
    const visualViewport: VisualViewport =
      viewportCandidate;

    let frame = 0;

    function syncViewport() {
      cancelAnimationFrame(frame);

      frame = requestAnimationFrame(
        () => {
          setViewportStyle({
            height: `${visualViewport.height}px`,
            top: `${visualViewport.offsetTop}px`,
          });
        }
      );
    }

    syncViewport();

    visualViewport.addEventListener(
      "resize",
      syncViewport
    );
    visualViewport.addEventListener(
      "scroll",
      syncViewport
    );

    return () => {
      cancelAnimationFrame(frame);

      visualViewport.removeEventListener(
        "resize",
        syncViewport
      );
      visualViewport.removeEventListener(
        "scroll",
        syncViewport
      );
    };
  }, [open]);

  if (!open) {
    return null;
  }

  if (
    typeof document ===
    "undefined"
  ) {
    return null;
  }

  return createPortal(
    <div
      className={
        styles.backdrop
      }
      style={viewportStyle}
      role="presentation"
      onMouseDown={(
        event
      ) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <section
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label="Comentários"
      >
        <div
          className={styles.handle}
          aria-hidden="true"
        />

        <header
          className={
            styles.header
          }
        >
          <div>
            <span>
              conversa
            </span>
            <h2>
              comentários
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar comentários"
            className={
              styles.closeButton
            }
          >
            <X size={18} />
          </button>
        </header>

        <div
          className={styles.list}
        >
          {loading && (
            <div
              className={
                styles.state
              }
            >
              carregando...
            </div>
          )}

          {!loading &&
            error && (
            <div
              className={
                styles.error
              }
              role="alert"
            >
              {error}
            </div>
          )}

          {!loading &&
            !error &&
            comments.length ===
              0 && (
              <div
                className={
                  styles.empty
                }
              >
                <strong>
                  ainda tá quieto
                  por aqui.
                </strong>
                <span>
                  começa a
                  conversa.
                </span>
              </div>
            )}

          {!loading &&
            roots.map(
              (comment) =>
                renderComment(
                  comment
                )
            )}
        </div>

        <div
          className={
            styles.composerArea
          }
        >
          {replyingTo && (
            <div
              className={
                styles.replying
              }
            >
              <span>
                respondendo{" "}
                <strong>
                  @
                  {
                    replyingTo
                      .author
                      .username
                  }
                </strong>
              </span>

              <button
                type="button"
                onClick={() =>
                  setReplyingTo(
                    null
                  )
                }
                aria-label="Cancelar resposta"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <form
            className={
              styles.form
            }
            onSubmit={
              sendComment
            }
          >
            <input
              ref={inputRef}
              value={text}
              onChange={(
                event
              ) =>
                setText(
                  event.target
                    .value
                )
              }
              maxLength={800}
              placeholder={
                replyingTo
                  ? `responder @${replyingTo.author.username}...`
                  : "escreva um comentário..."
              }
              aria-label={
                replyingTo
                  ? `Responder @${replyingTo.author.username}`
                  : "Escrever comentário"
              }
            />

            <button
              type="submit"
              disabled={
                !text.trim() ||
                sending
              }
              aria-label="Enviar comentário"
            >
              <Send
                size={17}
              />
            </button>
          </form>
        </div>
      </section>
    </div>,
    document.body
  );
}
