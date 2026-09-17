"use client";

import {
  Check,
  Copy,
  ImageIcon,
  Link2,
  Share2,
  X,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";
import {
  createPortal,
} from "react-dom";

import type { Post } from "@/types";

import { shareStoryCard } from "@/components/share/story";

import styles from "./ShareSheet.module.css";

type Feedback =
  | ""
  | "copied"
  | "shared"
  | "story"
  | "error";

export default function ShareSheet({
  post,
  open,
  onClose,
}: {
  post: Post;
  open: boolean;
  onClose: () => void;
}) {
  const [busy, setBusy] =
    useState<
      "post" | "story" | "copy" | ""
    >("");

  const [
    feedback,
    setFeedback,
  ] = useState<Feedback>("");

  function postUrl() {
    return `${window.location.origin}/p/${post.id}`;
  }

  async function copyText(
    value: string
  ) {
    if (
      navigator.clipboard?.writeText
    ) {
      await navigator.clipboard.writeText(
        value
      );
      return;
    }

    const textarea =
      document.createElement(
        "textarea"
      );

    textarea.value = value;
    textarea.style.position =
      "fixed";
    textarea.style.opacity = "0";

    document.body.appendChild(
      textarea
    );

    textarea.focus();
    textarea.select();

    document.execCommand(
      "copy"
    );

    textarea.remove();
  }

  async function sharePost() {
    if (busy) {
      return;
    }

    setBusy("post");
    setFeedback("");

    try {
      const url = postUrl();

      const text =
        `${post.track.title} · ${post.track.artist} no aux.`;

      if (navigator.share) {
        try {
          await navigator.share({
            title:
              `${post.track.title} · ${post.track.artist}`,
            text,
            url,
          });

          setFeedback(
            "shared"
          );
          return;
        } catch (error) {
          if (
            error instanceof
              DOMException &&
            error.name ===
              "AbortError"
          ) {
            return;
          }

          /*
           * Se o share nativo existe, mas falha por
           * limitação do navegador, usamos copiar link.
           */
        }
      }

      await copyText(url);

      setFeedback("copied");
    } catch {
      setFeedback("error");
    } finally {
      setBusy("");
    }
  }

  async function shareStory() {
    if (busy) {
      return;
    }

    setBusy("story");
    setFeedback("");

    try {
      const result =
        await shareStoryCard(
          post
        );

      if (
        result === "shared"
      ) {
        setFeedback(
          "story"
        );
      }

      if (
        result ===
        "downloaded"
      ) {
        setFeedback(
          "story"
        );
      }
    } catch {
      setFeedback("error");
    } finally {
      setBusy("");
    }
  }

  async function copyLink() {
    if (busy) {
      return;
    }

    setBusy("copy");
    setFeedback("");

    try {
      await copyText(
        postUrl()
      );

      setFeedback("copied");
    } catch {
      setFeedback("error");
    } finally {
      setBusy("");
    }
  }

  useEffect(() => {
    if (!open) {
      setFeedback("");
      setBusy("");
      return;
    }

    const previousOverflow =
      document.body.style
        .overflow;

    document.body.style.overflow =
      "hidden";

    function keydown(
      event: KeyboardEvent
    ) {
      if (
        event.key ===
        "Escape"
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
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  /*
   * O ShareSheet precisa sair da árvore do PostCard.
   * Cards e transições podem usar transform/hover; quando um
   * position: fixed vive dentro deles, o navegador pode mudar
   * a referência do modal e fazê-lo "pular" com o mouse.
   */
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
        aria-label="Compartilhar publicação"
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
            <span>aux.</span>
            <h2>
              compartilhar
            </h2>
          </div>

          <button
            type="button"
            className={
              styles.closeButton
            }
            aria-label="Fechar"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>

        <div
          className={
            styles.track
          }
        >
          {post.track
            .artwork_url ? (
            <img
              src={
                post.track
                  .artwork_url
              }
              alt=""
            />
          ) : (
            <div
              className={
                styles.artworkFallback
              }
            >
              aux.
            </div>
          )}

          <div>
            <strong>
              {post.track.title}
            </strong>

            <span>
              {post.track.artist}
            </span>
          </div>
        </div>

        <div
          className={
            styles.options
          }
        >
          <button
            type="button"
            className={
              styles.option
            }
            onClick={() =>
              void sharePost()
            }
            disabled={!!busy}
          >
            <span
              className={
                styles.optionIcon
              }
            >
              <Share2
                size={20}
              />
            </span>

            <span
              className={
                styles.optionCopy
              }
            >
              <strong>
                compartilhar
                publicação
              </strong>

              <small>
                manda o link pelo
                celular ou outro app
              </small>
            </span>
          </button>

          <button
            type="button"
            className={
              styles.option
            }
            onClick={() =>
              void shareStory()
            }
            disabled={!!busy}
          >
            <span
              className={
                styles.optionIcon
              }
            >
              <ImageIcon
                size={20}
              />
            </span>

            <span
              className={
                styles.optionCopy
              }
            >
              <strong>
                compartilhar no
                Story
              </strong>

              <small>
                gera a arte 9:16
                do aux.
              </small>
            </span>
          </button>

          <button
            type="button"
            className={
              styles.option
            }
            onClick={() =>
              void copyLink()
            }
            disabled={!!busy}
          >
            <span
              className={
                styles.optionIcon
              }
            >
              {feedback ===
              "copied" ? (
                <Check
                  size={20}
                />
              ) : (
                <Copy
                  size={20}
                />
              )}
            </span>

            <span
              className={
                styles.optionCopy
              }
            >
              <strong>
                copiar link
              </strong>

              <small>
                link direto para
                esta publicação
              </small>
            </span>
          </button>
        </div>

        <div
          className={
            styles.urlPreview
          }
          aria-hidden="true"
        >
          <Link2 size={13} />

          <span>
            /p/{post.id.slice(0, 8)}
            …
          </span>
        </div>

        {busy && (
          <p
            className={
              styles.feedback
            }
          >
            {busy === "story"
              ? "criando seu Story..."
              : busy === "copy"
                ? "copiando..."
                : "abrindo compartilhamento..."}
          </p>
        )}

        {!busy &&
          feedback && (
          <p
            className={
              feedback ===
              "error"
                ? styles.error
                : styles.feedback
            }
            role={
              feedback ===
              "error"
                ? "alert"
                : "status"
            }
          >
            {feedback ===
              "copied" &&
              "link copiado."}

            {feedback ===
              "shared" &&
              "pronto para compartilhar."}

            {feedback ===
              "story" &&
              "Story pronto."}

            {feedback ===
              "error" &&
              "não consegui compartilhar agora."}
          </p>
        )}
      </section>
    </div>,
    document.body
  );
}
