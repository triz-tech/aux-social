import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    /*
     * ==========================================
     * DESCOBRIR QUEM ESTÁ EXCLUINDO A CONTA
     * ==========================================
     */

    const supabase =
      await createClient();

    const {
      data: { user },
      error: userError,
    } =
      await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error:
            "Você precisa estar logada.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * ==========================================
     * CLIENT ADMIN
     * ==========================================
     */

    const supabaseUrl =
      process.env
        .NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env
        .SUPABASE_SERVICE_ROLE_KEY;

    if (
      !supabaseUrl ||
      !serviceRoleKey
    ) {
      throw new Error(
        "Configuração do Supabase ausente."
      );
    }

    const admin =
      createAdminClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

    /*
     * ==========================================
     * FOTOS DAS MEMORIES
     * ==========================================
     *
     * Primeiro descobrimos os posts criados
     * pela pessoa.
     */

    const {
      data: userPosts,
      error: postsError,
    } =
      await admin
        .from("posts")
        .select("id")
        .eq("user_id", user.id);

    if (postsError) {
      throw postsError;
    }

    const postIds =
      (userPosts ?? []).map(
        (post) => post.id
      );

    /*
     * Depois buscamos os arquivos ligados
     * a esses posts.
     */

    if (postIds.length) {
      const {
        data: mediaRows,
        error: mediaError,
      } =
        await admin
          .from("post_media")
          .select("storage_path")
          .in("post_id", postIds);

      if (mediaError) {
        throw mediaError;
      }

      const memoryPaths =
        (mediaRows ?? [])
          .map(
            (media) =>
              media.storage_path
          )
          .filter(Boolean);

      if (memoryPaths.length) {
        const {
          error:
            removeMemoriesError,
        } =
          await admin.storage
            .from("memories")
            .remove(memoryPaths);

        if (removeMemoriesError) {
          throw removeMemoriesError;
        }
      }
    }

    /*
     * ==========================================
     * AVATARES
     * ==========================================
     *
     * Seu AUX salva os avatares dentro de:
     *
     * userId/nome-do-arquivo.jpg
     */

    const {
      data: avatarFiles,
      error: avatarListError,
    } =
      await admin.storage
        .from("avatars")
        .list(user.id);

    if (avatarListError) {
      throw avatarListError;
    }

    if (
      avatarFiles &&
      avatarFiles.length
    ) {
      const avatarPaths =
        avatarFiles.map(
          (file) =>
            `${user.id}/${file.name}`
        );

      const {
        error:
          removeAvatarError,
      } =
        await admin.storage
          .from("avatars")
          .remove(avatarPaths);

      if (removeAvatarError) {
        throw removeAvatarError;
      }
    }

    /*
     * ==========================================
     * EXCLUIR USUÁRIO
     * ==========================================
     *
     * profiles.id -> auth.users.id
     * está ON DELETE CASCADE.
     *
     * E as demais tabelas também estão
     * configuradas com CASCADE.
     */

    const {
      error: deleteError,
    } =
      await admin.auth.admin
        .deleteUser(user.id);

    if (deleteError) {
      throw deleteError;
    }

    /*
     * A sessão deixa de ter um usuário válido.
     */

    await supabase.auth.signOut();

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Erro ao excluir conta:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não consegui excluir sua conta.",
      },
      {
        status: 500,
      }
    );
  }
}