"use client";

import {
  ExternalLink,
  Music2,
  Repeat2,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  useState,
} from "react";

import type { Post } from "@/types";

import MemoryCarousel from "@/components/memory/MemoryCarousel";
import {
  RatingInput,
  RatingStars,
} from "@/components/review/RatingStars";
import Avatar from "@/components/ui/Avatar";

import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/utils";

import PostActions from "./PostActions";
import styles from "./PostCard.module.css";

export default function PostCard({
  post,
}: {
  post: Post;
}) {
  const isReview =
    post.type === "review";

  const isAlbumReview =
    isReview &&
    post.subject_kind ===
      "album" &&
    Boolean(post.album);

  /*
   * Reviews podem apontar para uma música ou um álbum.
   * Memories continuam sempre apontando para música.
   */
  const subject =
    isAlbumReview &&
    post.album
      ? post.album
      : post.track;

  const subjectLabel =
    isAlbumReview
      ? "álbum"
      : "música";

  const [body, setBody] =
    useState(post.body);

  const [rating, setRating] =
    useState<number | null>(
      post.rating ?? null
    );

  const [trend, setTrend] =
    useState(post.trend ?? "");

  const [editOpen, setEditOpen] =
    useState(false);

  const [draftBody, setDraftBody] =
    useState(post.body);

  const [draftRating, setDraftRating] =
    useState(
      post.rating ?? 4.5
    );

  const [draftTrend, setDraftTrend] =
    useState(post.trend ?? "");

  const [saving, setSaving] =
    useState(false);

  const [editError, setEditError] =
    useState("");

  function openEditor() {
    setDraftBody(body);
    setDraftRating(
      rating ?? 4.5
    );
    setDraftTrend(trend);
    setEditError("");
    setEditOpen(true);
  }

  function closeEditor() {
    if (saving) {
      return;
    }

    setEditOpen(false);
    setEditError("");
  }

  async function saveEdit() {
    const cleanBody =
      draftBody.trim();

    const cleanTrend =
      draftTrend
        .trim()
        .replace(/^#/, "");

    if (!cleanBody) {
      setEditError(
        "escreva alguma coisa antes de salvar."
      );
      return;
    }

    if (cleanBody.length > 4000) {
      setEditError(
        "o texto ficou grande demais."
      );
      return;
    }

    if (cleanTrend.length > 40) {
      setEditError(
        "a tag pode ter no máximo 40 caracteres."
      );
      return;
    }

    setSaving(true);
    setEditError("");

    try {
      const supabase =
        createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (
        !user ||
        user.id !== post.author.id
      ) {
        throw new Error(
          "essa publicação não pertence a você."
        );
      }

      const {
        data,
        error,
      } = await supabase
        .from("posts")
        .update({
          body: cleanBody,
          trend:
            cleanTrend || null,
          rating:
            isReview
              ? draftRating
              : null,
        })
        .eq("id", post.id)
        .eq("user_id", user.id)
        .select(
          "body,rating,trend"
        )
        .single();

      if (error) {
        throw error;
      }

      setBody(data.body);
      setRating(
        data.rating === null
          ? null
          : Number(data.rating)
      );
      setTrend(
        data.trend ?? ""
      );

      setEditOpen(false);
    } catch (error) {
      setEditError(
        error instanceof Error
          ? error.message
          : "não consegui salvar essa edição."
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * Reviews de 0.5 a 2.5 recebem a identidade
   * laranja. De 3 a 5 continuam verdes.
   */
  const isBadReview =
    isReview &&
    typeof rating === "number" &&
    rating <= 2.5;

  return (
    <>
      <article
        className={`post ${styles.post} ${
          isReview
            ? styles.review
            : styles.memory
        } ${
          isBadReview
            ? styles.badReview
            : ""
        }`}
      >
        {/* QUEM REPOSTOU */}

        {post.reposted_by && (
          <div
            className="subtle"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding:
                "12px 16px 0",
              fontSize: 13,
            }}
          >
            <Repeat2 size={14} />

            <Link
              href={`/u/${post.reposted_by.username}`}
              style={{
                color: "inherit",
                textDecoration:
                  "none",
              }}
            >
              @{post.reposted_by.username} repostou
            </Link>
          </div>
        )}

        {/* AUTOR + TIPO DE PUBLICAÇÃO */}

        <header className="postHead">
          <Link
            href={`/u/${post.author.username}`}
            aria-label={`Ver perfil de ${post.author.display_name}`}
            style={{
              display: "block",
              flexShrink: 0,
              color: "inherit",
              textDecoration:
                "none",
            }}
          >
            <Avatar
              profile={post.author}
            />
          </Link>

          <div className="who">
            <Link
              href={`/u/${post.author.username}`}
              style={{
                color: "inherit",
                textDecoration:
                  "none",
              }}
            >
              <strong>
                {
                  post.author
                    .display_name
                }
              </strong>
            </Link>

            <span>
              <Link
                href={`/u/${post.author.username}`}
                style={{
                  color:
                    "inherit",
                  textDecoration:
                    "none",
                }}
              >
                @{post.author.username}
              </Link>

              {" · "}

              <span
                suppressHydrationWarning
              >
                {timeAgo(
                  post.created_at
                )}
              </span>
            </span>
          </div>

          <div
            className={
              styles.headActions
            }
          >
            <div
              className={
                styles.postKind
              }
              aria-label={
                isAlbumReview
                  ? "Review de álbum"
                  : isReview
                    ? "Review de música"
                    : "Memory"
              }
            >
              <span
                className={
                  styles.kindSymbol
                }
                aria-hidden="true"
              >
                {isReview
                  ? "★"
                  : "◎"}
              </span>

              <span>
                {isAlbumReview
                  ? "review · álbum"
                  : isReview
                    ? "review"
                    : "memory"}
              </span>
            </div>

          </div>
        </header>

        {/* CONTEÚDO */}

        {isReview ? (
          <div className="artwork">
            {subject
              .artwork_url && (
              <img
                src={
                  subject
                    .artwork_url
                }
                alt={`Capa de ${subject.title}`}
              />
            )}

            <div className="artworkOverlay">
              {isAlbumReview && (
                <span
                  style={{
                    display:
                      "block",
                    marginBottom:
                      4,
                    fontSize: 10,
                    fontWeight:
                      700,
                    letterSpacing:
                      "0.08em",
                    textTransform:
                      "uppercase",
                    opacity: 0.78,
                  }}
                >
                  álbum
                </span>
              )}

              <strong>
                {subject.title}
              </strong>

              <span>
                {subject.artist}
              </span>
            </div>
          </div>
        ) : (
          <MemoryCarousel
            post={post}
          />
        )}

        {/* POST */}

        <div className="postBody">
          {isReview &&
            rating !== null && (
              <RatingStars
                value={rating}
              />
            )}

          {trend && (
            <Link
              href={`/discover?tag=${encodeURIComponent(
                trend.replace(
                  /^#/,
                  ""
                )
              )}`}
              className={
                styles.trend
              }
              aria-label={`Ver publicações com a tag ${trend.replace(
                /^#/,
                ""
              )}`}
            >
              #
              {trend.replace(
                /^#/,
                ""
              )}
            </Link>
          )}

          <p className="postText">
            {body}
          </p>

          {/* ABRIR MÚSICA / ÁLBUM */}

          <a
            className="trackline"
            href={
              subject
                .source_url
            }
            target="_blank"
            rel="noreferrer"
            aria-label={`Abrir ${subjectLabel} ${subject.title} de ${subject.artist}`}
          >
            <Music2 size={15} />

            <span>
              {isAlbumReview
                ? "álbum · "
                : ""}
              {subject.title}
              {" · "}
              {subject.artist}
            </span>

            <ExternalLink
              size={13}
            />
          </a>

          <PostActions
            post={post}
            onEdit={openEditor}
          />
        </div>
      </article>

      {/* EDITAR PUBLICAÇÃO */}

      {editOpen && (
        <div
          className={
            styles.editOverlay
          }
          role="presentation"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeEditor();
            }
          }}
        >
          <section
            className={
              styles.editSheet
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby={`edit-post-${post.id}`}
          >
            <div
              className={
                styles.editHead
              }
            >
              <div>
                <span
                  className={
                    styles.editEyebrow
                  }
                >
                  {isAlbumReview
                    ? "★ review · álbum"
                    : isReview
                      ? "★ review"
                      : "◎ memory"}
                </span>

                <h2
                  id={`edit-post-${post.id}`}
                >
                  editar publicação
                </h2>
              </div>

              <button
                type="button"
                className={
                  styles.closeButton
                }
                onClick={
                  closeEditor
                }
                aria-label="Fechar"
                disabled={saving}
              >
                <X size={19} />
              </button>
            </div>

            <div
              className={
                styles.editTrack
              }
            >
              {subject
                .artwork_url ? (
                <img
                  src={
                    subject
                      .artwork_url
                  }
                  alt=""
                />
              ) : (
                <div
                  className={
                    styles.editTrackFallback
                  }
                >
                  aux.
                </div>
              )}

              <div>
                <strong>
                  {
                    subject
                      .title
                  }
                </strong>
                <span>
                  {isAlbumReview
                    ? "álbum · "
                    : ""}
                  {
                    subject
                      .artist
                  }
                </span>
              </div>
            </div>

            {isReview && (
              <div
                className={
                  styles.editField
                }
              >
                <label>
                  nota
                </label>

                <RatingInput
                  value={
                    draftRating
                  }
                  onChange={
                    setDraftRating
                  }
                />
              </div>
            )}

            <div
              className={
                styles.editField
              }
            >
              <label
                htmlFor={`edit-body-${post.id}`}
              >
                {isReview
                  ? "review"
                  : "memória"}
              </label>

              <textarea
                id={`edit-body-${post.id}`}
                className={
                  styles.editTextarea
                }
                value={
                  draftBody
                }
                onChange={(
                  event
                ) =>
                  setDraftBody(
                    event.target
                      .value
                  )
                }
                maxLength={4000}
                rows={6}
                autoFocus
              />

              <span
                className={
                  styles.charCount
                }
              >
                {
                  draftBody
                    .length
                }
                /4000
              </span>
            </div>

            <div
              className={
                styles.editField
              }
            >
              <label
                htmlFor={`edit-trend-${post.id}`}
              >
                tag
              </label>

              <input
                id={`edit-trend-${post.id}`}
                className={
                  styles.editInput
                }
                value={
                  draftTrend
                }
                onChange={(
                  event
                ) =>
                  setDraftTrend(
                    event.target
                      .value
                  )
                }
                maxLength={40}
                placeholder="opcional · ex: late night"
              />
            </div>

            <p
              className={
                styles.editHint
              }
            >
              {isAlbumReview
                ? "o álbum"
                : "a música"}
              {!isReview
                ? " e as fotos"
                : ""}{" "}
              continuam como estão.
            </p>

            {editError && (
              <p
                className={
                  styles.editError
                }
                role="alert"
              >
                {editError}
              </p>
            )}

            <div
              className={
                styles.editFooter
              }
            >
              <button
                type="button"
                className={
                  styles.cancelButton
                }
                onClick={
                  closeEditor
                }
                disabled={saving}
              >
                cancelar
              </button>

              <button
                type="button"
                className={
                  styles.saveButton
                }
                onClick={() =>
                  void saveEdit()
                }
                disabled={saving}
              >
                {saving
                  ? "salvando..."
                  : "salvar alterações"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
