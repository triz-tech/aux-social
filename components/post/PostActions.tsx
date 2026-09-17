"use client";

import {
  Heart,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Repeat2,
  Share,
  Trash2,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import type { Post } from "@/types";

import { IS_DEMO } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";

import CommentsSheet from "@/components/comments/CommentsSheet";
import ShareSheet from "@/components/share/ShareSheet";

export default function PostActions({
  post,
  onEdit,
}: {
  post: Post;
  onEdit?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [liked, setLiked] =
    useState(
      !!post.counts.liked
    );

  const [likes, setLikes] =
    useState(
      post.counts.likes
    );

  const [reposted, setReposted] =
    useState(
      !!post.counts.reposted
    );

  const [reposts, setReposts] =
    useState(
      post.counts.reposts
    );

  const [likeBusy, setLikeBusy] =
    useState(false);

  const [
    repostBusy,
    setRepostBusy,
  ] = useState(false);

  const [likePulse, setLikePulse] =
    useState(false);

  const [
    repostPulse,
    setRepostPulse,
  ] = useState(false);

  const [
    actionFeedback,
    setActionFeedback,
  ] = useState("");

  const [comments, setComments] =
    useState(false);

  const [
    commentCount,
    setCommentCount,
  ] = useState(
    post.counts.comments
  );

  const [share, setShare] =
    useState(false);

  const [isOwnPost, setIsOwnPost] =
    useState(false);

  const [menuOpen, setMenuOpen] =
    useState(false);

  const [
    confirmDelete,
    setConfirmDelete,
  ] = useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const [deleteError, setDeleteError] =
    useState("");

  /*
   * Se o feed/perfil receber uma contagem nova do servidor,
   * sincroniza o número local. Isso evita alternar entre
   * valor antigo do card e valor atualizado do CommentsSheet.
   */
  useEffect(() => {
    setCommentCount(
      post.counts.comments
    );
  }, [
    post.counts.comments,
    post.id,
  ]);

  /*
   * =====================================================
   * DESCOBRIR SE É PUBLICAÇÃO DA PRÓPRIA PESSOA
   * =====================================================
   */

  useEffect(() => {
    if (IS_DEMO) return;

    let active = true;

    async function checkOwner() {
      const supabase =
        createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (active) {
        setIsOwnPost(
          !!user &&
            user.id ===
              post.author.id
        );
      }
    }

    void checkOwner();

    return () => {
      active = false;
    };
  }, [post.author.id]);

  function flashFeedback(
    message: string
  ) {
    setActionFeedback(
      message
    );

    window.setTimeout(
      () => {
        setActionFeedback(
          ""
        );
      },
      1300
    );
  }

  /*
   * =====================================================
   * LIKE
   * =====================================================
   */

  async function toggleLike() {
    if (likeBusy) {
      return;
    }

    const before = liked;
    const next = !before;

    setLiked(next);

    setLikes((current) =>
      Math.max(
        0,
        current +
          (before ? -1 : 1)
      )
    );

    setLikePulse(true);

    window.setTimeout(
      () => {
        setLikePulse(false);
      },
      190
    );

    if (IS_DEMO) {
      flashFeedback(
        next
          ? "curtido."
          : "curtida removida."
      );
      return;
    }

    setLikeBusy(true);

    try {
      const supabase =
        createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        /*
         * Como a ação foi otimista, volta o estado antes
         * de mandar a pessoa para o login.
         */
        setLiked(before);

        setLikes((current) =>
          Math.max(
            0,
            current +
              (before ? 1 : -1)
          )
        );

        location.href =
          `/login?next=${encodeURIComponent(
            location.pathname
          )}`;

        return;
      }

      const query =
        supabase.from("likes");

      const { error } =
        before
          ? await query
              .delete()
              .eq(
                "post_id",
                post.id
              )
              .eq(
                "user_id",
                user.id
              )
          : await query.insert({
              post_id:
                post.id,

              user_id:
                user.id,
            });

      if (error) {
        throw error;
      }

      flashFeedback(
        next
          ? "curtido."
          : "curtida removida."
      );
    } catch {
      setLiked(before);

      setLikes((current) =>
        Math.max(
          0,
          current +
            (before ? 1 : -1)
        )
      );

      flashFeedback(
        "não consegui atualizar a curtida."
      );
    } finally {
      setLikeBusy(false);
    }
  }

  /*
   * =====================================================
   * REPOST
   * =====================================================
   */

  async function toggleRepost() {
    if (
      isOwnPost ||
      repostBusy
    ) {
      return;
    }

    const before =
      reposted;

    const next =
      !before;

    setReposted(next);

    setReposts((current) =>
      Math.max(
        0,
        current +
          (before ? -1 : 1)
      )
    );

    setRepostPulse(true);

    window.setTimeout(
      () => {
        setRepostPulse(false);
      },
      220
    );

    if (IS_DEMO) {
      flashFeedback(
        next
          ? "repostado."
          : "repost desfeito."
      );
      return;
    }

    setRepostBusy(true);

    try {
      const supabase =
        createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        setReposted(before);

        setReposts(
          (current) =>
            Math.max(
              0,
              current +
                (before
                  ? 1
                  : -1)
            )
        );

        location.href =
          `/login?next=${encodeURIComponent(
            location.pathname
          )}`;

        return;
      }

      if (
        user.id ===
        post.author.id
      ) {
        setReposted(before);

        setReposts(
          (current) =>
            Math.max(
              0,
              current +
                (before
                  ? 1
                  : -1)
            )
        );

        return;
      }

      const query =
        supabase.from(
          "reposts"
        );

      const { error } =
        before
          ? await query
              .delete()
              .eq(
                "post_id",
                post.id
              )
              .eq(
                "user_id",
                user.id
              )
          : await query.insert({
              post_id:
                post.id,

              user_id:
                user.id,
            });

      if (error) {
        throw error;
      }

      flashFeedback(
        next
          ? "repostado."
          : "repost desfeito."
      );
    } catch {
      setReposted(before);

      setReposts((current) =>
        Math.max(
          0,
          current +
            (before ? 1 : -1)
        )
      );

      flashFeedback(
        "não consegui atualizar o repost."
      );
    } finally {
      setRepostBusy(false);
    }
  }

  /*
   * =====================================================
   * EXCLUIR PUBLICAÇÃO
   * =====================================================
   */

  async function deletePost() {
    if (
      deleting ||
      !isOwnPost
    ) {
      return;
    }

    setDeleting(true);
    setDeleteError("");

    try {
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

      /*
       * Nunca confia apenas no botão.
       */

      if (
        user.id !==
        post.author.id
      ) {
        throw new Error(
          "Você só pode excluir suas próprias publicações."
        );
      }

      /*
       * Guardamos os arquivos antes de
       * apagar o post.
       *
       * O post_media é removido por
       * cascade no banco.
       */

      const storagePaths =
        post.media
          .map(
            (media) =>
              media.storage_path
          )
          .filter(Boolean);

      /*
       * Primeiro apaga o post.
       *
       * Likes, comentários, reposts,
       * notificações e post_media
       * relacionados são removidos
       * pelo banco.
       */

      const {
        error: postError,
      } =
        await supabase
          .from("posts")
          .delete()
          .eq(
            "id",
            post.id
          )
          .eq(
            "user_id",
            user.id
          );

      if (postError) {
        throw postError;
      }

      /*
       * Se era uma Memory,
       * limpa também as fotos reais
       * do Storage.
       *
       * Se essa limpeza falhar,
       * o post já foi excluído e
       * não deixamos a interface travar.
       */

      if (
        storagePaths.length >
        0
      ) {
        const {
          error:
            storageError,
        } =
          await supabase.storage
            .from(
              "memories"
            )
            .remove(
              storagePaths
            );

        if (
          storageError
        ) {
          console.warn(
            "AUX: post excluído, mas não foi possível limpar uma mídia:",
            storageError.message
          );
        }
      }

      setMenuOpen(false);
      setConfirmDelete(
        false
      );

      /*
       * Se a pessoa estava na página
       * individual do post, voltamos
       * para o perfil dela.
       */

      if (
        pathname.startsWith(
          "/p/"
        )
      ) {
        router.replace(
          `/u/${post.author.username}`
        );

        router.refresh();

        return;
      }

      /*
       * No Home ou perfil,
       * atualiza o feed.
       */

      router.refresh();
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "Não consegui excluir a publicação."
      );
    } finally {
      setDeleting(false);
    }
  }

  /*
   * =====================================================
   * UI
   * =====================================================
   */

  return (
    <>
      <div
        className="actions"
        style={{
          position:
            "relative",
        }}
      >
        <div className="actionGroup">
          {/* LIKE */}

          <button
            className={`iconBtn ${
              liked ? "on" : ""
            }`}
            aria-label={
              liked
                ? "Remover curtida"
                : "Curtir"
            }
            aria-pressed={liked}
            disabled={likeBusy}
            onClick={
              toggleLike
            }
            style={{
              opacity:
                likeBusy
                  ? 0.72
                  : 1,
            }}
          >
            <span
              style={{
                display:
                  "inline-grid",
                placeItems:
                  "center",
                transform:
                  likePulse
                    ? "scale(1.22)"
                    : "scale(1)",
                transition:
                  "transform 170ms cubic-bezier(.2,.8,.2,1)",
              }}
            >
              <Heart
                size={19}
                fill={
                  liked
                    ? "currentColor"
                    : "none"
                }
              />
            </span>

            <small>
              {likes || ""}
            </small>
          </button>

          {/* COMENTÁRIOS */}

          <button
            className="iconBtn"
            aria-label="Comentários"
            onClick={() =>
              setComments(true)
            }
          >
            <MessageCircle
              size={19}
            />

            <small>
              {commentCount || ""}
            </small>
          </button>

          {/* REPOST */}

          <button
            className={`iconBtn ${
              reposted ? "on" : ""
            }`}
            aria-label={
              isOwnPost
                ? "Você não pode repostar sua própria publicação"
                : reposted
                  ? "Desfazer repost"
                  : "Repostar"
            }
            title={
              isOwnPost
                ? "Você não pode repostar sua própria publicação"
                : undefined
            }
            aria-pressed={
              reposted
            }
            disabled={
              isOwnPost ||
              repostBusy
            }
            onClick={
              toggleRepost
            }
            style={{
              opacity:
                isOwnPost
                  ? 0.35
                  : repostBusy
                    ? 0.72
                    : 1,

              cursor:
                isOwnPost
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            <span
              style={{
                display:
                  "inline-grid",
                placeItems:
                  "center",
                transform:
                  repostPulse
                    ? "rotate(-10deg) scale(1.13)"
                    : "rotate(0deg) scale(1)",
                transition:
                  "transform 190ms cubic-bezier(.2,.8,.2,1)",
              }}
            >
              <Repeat2
                size={20}
              />
            </span>

            <small>
              {reposts || ""}
            </small>
          </button>
        </div>

        {/* DIREITA */}

        <div
          style={{
            display: "flex",
            alignItems:
              "center",
            gap: 3,
          }}
        >
          {/* SHARE */}

          <button
            className="iconBtn"
            aria-label="Compartilhar"
            onClick={() =>
              setShare(true)
            }
          >
            <Share
              size={19}
            />
          </button>

          {/* MENU DA PRÓPRIA PUBLICAÇÃO */}

          {isOwnPost && (
            <button
              className="iconBtn"
              aria-label="Mais opções"
              onClick={() => {
                setMenuOpen(
                  (current) =>
                    !current
                );

                setConfirmDelete(
                  false
                );

                setDeleteError(
                  ""
                );
              }}
            >
              <MoreHorizontal
                size={20}
              />
            </button>
          )}
        </div>

        {/* MENU */}

        {isOwnPost &&
          menuOpen && (
            <div
              style={{
                position:
                  "absolute",

                right: 0,
                bottom: 45,

                width: 230,

                padding: 8,

                zIndex: 50,

                borderRadius:
                  18,

                background:
                  "var(--surface-solid)",

                border:
                  "1px solid var(--line)",

                boxShadow:
                  "var(--shadow)",
              }}
            >
              {!confirmDelete ? (
                <div>
                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(
                          false
                        );
                        onEdit();
                      }}
                      style={{
                        width:
                          "100%",

                        display:
                          "flex",

                        alignItems:
                          "center",

                        gap: 10,

                        border: 0,

                        padding:
                          "12px 13px",

                        borderRadius:
                          12,

                        background:
                          "transparent",

                        color:
                          "var(--text)",

                        font:
                          "inherit",

                        cursor:
                          "pointer",

                        textAlign:
                          "left",
                      }}
                    >
                      <Pencil
                        size={17}
                      />

                      editar publicação
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      setConfirmDelete(
                        true
                      )
                    }
                    style={{
                      width:
                        "100%",

                      display:
                        "flex",

                      alignItems:
                        "center",

                      gap: 10,

                      border: 0,

                      padding:
                        "12px 13px",

                      borderRadius:
                        12,

                      background:
                        "transparent",

                      color:
                        "#b42318",

                      font:
                        "inherit",

                      cursor:
                        "pointer",

                      textAlign:
                        "left",
                    }}
                  >
                    <Trash2
                      size={17}
                    />

                    excluir publicação
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    padding:
                      "8px",
                  }}
                >
                  <strong
                    style={{
                      display:
                        "block",

                      fontSize:
                        14,

                      marginBottom:
                        6,
                    }}
                  >
                    excluir
                    publicação?
                  </strong>

                  <p
                    className="subtle"
                    style={{
                      margin:
                        "0 0 14px",

                      fontSize:
                        12,

                      lineHeight:
                        1.4,
                    }}
                  >
                    essa ação não
                    pode ser
                    desfeita.
                  </p>

                  {deleteError && (
                    <div
                      className="error"
                      style={{
                        marginBottom:
                          10,

                        fontSize:
                          12,
                      }}
                    >
                      {
                        deleteError
                      }
                    </div>
                  )}

                  <div
                    style={{
                      display:
                        "flex",

                      gap: 7,
                    }}
                  >
                    <button
                      type="button"
                      className="secondary"
                      disabled={
                        deleting
                      }
                      onClick={() =>
                        setConfirmDelete(
                          false
                        )
                      }
                      style={{
                        flex: 1,
                        minHeight:
                          38,
                      }}
                    >
                      cancelar
                    </button>

                    <button
                      type="button"
                      disabled={
                        deleting
                      }
                      onClick={() =>
                        void deletePost()
                      }
                      style={{
                        flex: 1,

                        minHeight:
                          38,

                        border: 0,

                        borderRadius:
                          12,

                        background:
                          "#b42318",

                        color:
                          "white",

                        font:
                          "inherit",

                        fontWeight:
                          650,

                        cursor:
                          deleting
                            ? "wait"
                            : "pointer",

                        opacity:
                          deleting
                            ? 0.65
                            : 1,
                      }}
                    >
                      {deleting
                        ? "excluindo..."
                        : "excluir"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        <span
          aria-live="polite"
          aria-atomic="true"
          style={{
            position:
              "absolute",
            left: "50%",
            bottom: -22,
            zIndex: 3,
            transform:
              "translateX(-50%)",
            maxWidth: 220,
            overflow:
              "hidden",
            color:
              actionFeedback.includes(
                "não consegui"
              )
                ? "#a83a32"
                : "#767670",
            fontSize: 10,
            fontWeight: 600,
            textOverflow:
              "ellipsis",
            whiteSpace:
              "nowrap",
            pointerEvents:
              "none",
            opacity:
              actionFeedback
                ? 1
                : 0,
            transition:
              "opacity 160ms ease",
          }}
        >
          {actionFeedback}
        </span>
      </div>

      {/* COMMENTS */}

      <CommentsSheet
        postId={post.id}
        open={comments}
        onClose={() =>
          setComments(false)
        }
        onCommentCountChange={(
          count
        ) =>
          setCommentCount(
            count
          )
        }
      />

      {/* SHARE */}

      <ShareSheet
        post={post}
        open={share}
        onClose={() =>
          setShare(false)
        }
      />
    </>
  );
}