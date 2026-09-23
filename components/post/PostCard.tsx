"use client";

import {
  ExternalLink,
  Music2,
  Repeat2,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  useMemo,
  useState,
} from "react";

import type {
  Post,
  PostSubjectKind,
} from "@/types";

import MemoryCarousel from "@/components/memory/MemoryCarousel";
import {
  RatingInput,
  RatingStars,
} from "@/components/review/RatingStars";
import Avatar from "@/components/ui/Avatar";

import { IS_DEMO } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/utils";

import PostActions from "./PostActions";
import styles from "./PostCard.module.css";

function labelForSubject(
  kind: PostSubjectKind
) {
  if (kind === "album") {
    return "álbum";
  }

  if (kind === "artist") {
    return "artista";
  }

  if (kind === "playlist") {
    return "playlist";
  }

  return "música";
}

export default function PostCard({
  post,
  viewerId,
}: {
  post: Post;
  viewerId?: string | null;
}) {
  const isReview =
    post.type === "review";

  const subjectKind =
    post.subject_kind ??
    "track";

  const subjectLabel =
    labelForSubject(
      subjectKind
    );

  /*
   * `post.track` continua sendo o adapter visual universal.
   * Assim MemoryCarousel, Story Card e componentes antigos
   * continuam funcionando, enquanto aqui usamos os objetos
   * reais quando eles existem.
   */
  const subject =
    useMemo(() => {
      if (
        subjectKind ===
          "album" &&
        post.album
      ) {
        return {
          title:
            post.album.title,
          artist:
            post.album.artist,
          artwork_url:
            post.album.artwork_url,
          source_url:
            post.album.source_url,
        };
      }

      if (
        subjectKind ===
          "artist" &&
        post.artist
      ) {
        return {
          title:
            post.artist.name,
          artist: "artista",
          artwork_url:
            post.artist.artwork_url,
          source_url:
            post.artist.source_url,
        };
      }

      if (
        subjectKind ===
          "playlist" &&
        post.playlist
      ) {
        return {
          title:
            post.playlist.title,
          artist:
            post.playlist
              .owner_name ||
            "playlist",
          artwork_url:
            post.playlist
              .artwork_url,
          source_url:
            post.playlist
              .source_url,
        };
      }

      return {
        title:
          post.track.title,
        artist:
          post.track.artist,
        artwork_url:
          post.track
            .artwork_url,
        source_url:
          post.track.source_url,
      };
    }, [
      post,
      subjectKind,
    ]);

  const [body, setBody] =
    useState(post.body);

  const [rating, setRating] =
    useState<number | null>(
      post.rating ?? null
    );

  const [trend, setTrend] =
    useState(
      post.trend ?? ""
    );

  const [
    editOpen,
    setEditOpen,
  ] = useState(false);

  const [
    draftBody,
    setDraftBody,
  ] = useState(post.body);

  const [
    draftRating,
    setDraftRating,
  ] = useState(
    post.rating ?? 4.5
  );

  const [
    draftTrend,
    setDraftTrend,
  ] = useState(
    post.trend ?? ""
  );

  const [saving, setSaving] =
    useState(false);

  const [
    editError,
    setEditError,
  ] = useState("");

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

    if (
      cleanBody.length >
      4000
    ) {
      setEditError(
        "o texto ficou grande demais."
      );
      return;
    }

    if (
      cleanTrend.length >
      40
    ) {
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

      let currentViewerId =
        viewerId ?? null;

      if (
        !currentViewerId &&
        !IS_DEMO
      ) {
        const {
          data: { user },
        } =
          await supabase.auth
            .getUser();

        currentViewerId =
          user?.id ?? null;
      }

      if (
        !currentViewerId ||
        currentViewerId !==
          post.author.id
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
          body:
            cleanBody,
          trend:
            cleanTrend ||
            null,
          rating:
            isReview
              ? draftRating
              : null,
        })
        .eq(
          "id",
          post.id
        )
        .eq(
          "user_id",
          currentViewerId
        )
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
          : Number(
              data.rating
            )
      );

      setTrend(
        data.trend ?? ""
      );

      setEditOpen(false);
    } catch (caught) {
      setEditError(
        caught instanceof Error
          ? caught.message
          : "não consegui salvar essa edição."
      );
    } finally {
      setSaving(false);
    }
  }

  const isBadReview =
    isReview &&
    typeof rating ===
      "number" &&
    rating <= 2.5;

  const kindText =
    isReview
      ? subjectKind ===
        "track"
        ? "review"
        : `review · ${subjectLabel}`
      : subjectKind ===
          "track"
        ? "memory"
        : `memory · ${subjectLabel}`;

  return (
    <>
      <article
        className={`post ${
          styles.post
        } ${
          isReview
            ? styles.review
            : styles.memory
        } ${
          isBadReview
            ? styles.badReview
            : ""
        }`}
      >
        {post.reposted_by && (
          <div
            className="subtle"
            style={{
              display: "flex",
              alignItems:
                "center",
              gap: 6,
              padding:
                "12px 16px 0",
              fontSize: 13,
            }}
          >
            <Repeat2
              size={14}
            />

            <Link
              href={`/u/${post.reposted_by.username}`}
              style={{
                color:
                  "inherit",
                textDecoration:
                  "none",
              }}
            >
              @
              {
                post
                  .reposted_by
                  .username
              }{" "}
              repostou
            </Link>
          </div>
        )}

        <header className="postHead">
          <Link
            href={`/u/${post.author.username}`}
            aria-label={`Ver perfil de ${post.author.display_name}`}
            style={{
              display:
                "block",
              flexShrink: 0,
              color:
                "inherit",
              textDecoration:
                "none",
            }}
          >
            <Avatar
              profile={
                post.author
              }
            />
          </Link>

          <div className="who">
            <Link
              href={`/u/${post.author.username}`}
              style={{
                color:
                  "inherit",
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
                @
                {
                  post.author
                    .username
                }
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
                kindText
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
                {kindText}
              </span>
            </div>
          </div>
        </header>

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
                loading="lazy"
                decoding="async"
              />
            )}

            <div className="artworkOverlay">
              {subjectKind !==
                "track" && (
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
                  {subjectLabel}
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

        <div className="postBody">
          {isReview &&
            rating !==
              null && (
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

          <a
            className="trackline"
            href={
              subject.source_url
            }
            target="_blank"
            rel="noreferrer"
            aria-label={`Abrir ${subjectLabel} ${subject.title}`}
          >
            <Music2
              size={15}
            />

            <span>
              {subjectKind !==
                "track"
                ? `${subjectLabel} · `
                : ""}
              {subject.title}
              {subject.artist
                ? ` · ${subject.artist}`
                : ""}
            </span>

            <ExternalLink
              size={13}
            />
          </a>

          <PostActions
            post={post}
            viewerId={
              viewerId
            }
            onEdit={
              openEditor
            }
          />
        </div>
      </article>

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
                  {isReview
                    ? "★"
                    : "◎"}{" "}
                  {kindText}
                </span>

                <h2
                  id={`edit-post-${post.id}`}
                >
                  editar
                  publicação
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
                disabled={
                  saving
                }
              >
                <X
                  size={19}
                />
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
                  {subject.title}
                </strong>

                <span>
                  {subjectLabel}
                  {" · "}
                  {
                    subject.artist
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
                maxLength={
                  4000
                }
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
                maxLength={
                  40
                }
                placeholder="opcional · ex: late night"
              />
            </div>

            <p
              className={
                styles.editHint
              }
            >
              o {subjectLabel}
              {!isReview
                ? " e as fotos"
                : ""}{" "}
              continuam como
              estão.
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
                disabled={
                  saving
                }
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
                disabled={
                  saving
                }
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
