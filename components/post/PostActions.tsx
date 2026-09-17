"use client";

import {
  Heart,
  MessageCircle,
  MoreHorizontal,
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
}: {
  post: Post;
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

  const [comments, setComments] =
    useState(false);

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

  /*
   * =====================================================
   * LIKE
   * =====================================================
   */

  async function toggleLike() {
    const before = liked;

    setLiked(!before);

    setLikes((current) =>
      current +
      (before ? -1 : 1)
    );

    if (IS_DEMO) return;

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
    } catch {
      setLiked(before);

      setLikes((current) =>
        current +
        (before ? 1 : -1)
      );
    }
  }

  /*
   * =====================================================
   * REPOST
   * =====================================================
   */

  async function toggleRepost() {
    if (isOwnPost) {
      return;
    }

    const before =
      reposted;

    setReposted(!before);

    setReposts((current) =>
      current +
      (before ? -1 : 1)
    );

    if (IS_DEMO) return;

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
       * Segunda proteção.
       * A RLS também protege isso.
       */

      if (
        user.id ===
        post.author.id
      ) {
        setReposted(before);

        setReposts(
          (current) =>
            current +
            (before
              ? 1
              : -1)
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
    } catch {
      setReposted(before);

      setReposts((current) =>
        current +
        (before ? 1 : -1)
      );
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
            aria-label="Curtir"
            onClick={
              toggleLike
            }
          >
            <Heart
              size={19}
              fill={
                liked
                  ? "currentColor"
                  : "none"
              }
            />

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
              {post.counts
                .comments ||
                ""}
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
            disabled={
              isOwnPost
            }
            onClick={
              toggleRepost
            }
            style={
              isOwnPost
                ? {
                    opacity:
                      0.35,

                    cursor:
                      "not-allowed",
                  }
                : undefined
            }
          >
            <Repeat2
              size={20}
            />

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
                  "rgba(255,255,255,.98)",

                border:
                  "1px solid rgba(0,0,0,.08)",

                boxShadow:
                  "0 18px 50px rgba(0,0,0,.14)",
              }}
            >
              {!confirmDelete ? (
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
      </div>

      {/* COMMENTS */}

      <CommentsSheet
        postId={post.id}
        open={comments}
        onClose={() =>
          setComments(false)
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