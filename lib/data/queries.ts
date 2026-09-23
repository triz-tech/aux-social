import type {
  Album,
  Artist,
  Playlist,
  Post,
  Profile,
  Track,
} from "@/types";

import { getCurrentUser } from "@/lib/auth/current-user";

import { createClient } from "@/lib/supabase/server";

type RawAlbum = Album;
type RawArtist = Artist;
type RawPlaylist = Playlist;

type RawPost = {
  id: string;
  type: "review" | "memory";
  body: string;
  rating: number | null;
  trend: string | null;
  created_at: string;

  author:
    | Profile
    | Profile[];

  track:
    | Track
    | Track[]
    | null;

  album:
    | RawAlbum
    | RawAlbum[]
    | null;

  artist:
    | RawArtist
    | RawArtist[]
    | null;

  playlist:
    | RawPlaylist
    | RawPlaylist[]
    | null;

  post_media: Array<{
    id: string;
    storage_path: string;
    position: number;
    width: number | null;
    height: number | null;
    aspect_ratio:
      number | null;
  }>;

  likes: Array<{
    count: number;
  }>;

  comments: Array<{
    count: number;
  }>;

  reposts: Array<{
    count: number;
  }>;
};

type ServerClient =
  Awaited<
    ReturnType<
      typeof createClient
    >
  >;

type ViewerState = {
  liked: Set<string>;
  reposted: Set<string>;
};

function one<T>(
  value: T | T[]
): T {
  return Array.isArray(value)
    ? value[0]
    : value;
}

function oneOrNull<T>(
  value:
    | T
    | T[]
    | null
    | undefined
): T | null {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function albumAsDisplayTrack(
  album: RawAlbum
): Track {
  return {
    id: album.id,
    provider:
      album.provider,
    provider_track_id:
      null,
    title:
      album.title,
    artist:
      album.artist,
    album:
      album.title,
    artwork_url:
      album.artwork_url,
    source_url:
      album.source_url,
    spotify_url:
      album.spotify_url ??
      null,
    apple_music_url:
      album.apple_music_url ??
      null,
    deezer_url:
      album.deezer_url ??
      null,
    duration_ms:
      null,
  };
}

function artistAsDisplayTrack(
  artist: RawArtist
): Track {
  return {
    id: artist.id,
    provider:
      artist.provider,
    provider_track_id:
      null,
    title:
      artist.name,
    artist:
      artist.name,
    album:
      null,
    artwork_url:
      artist.artwork_url,
    source_url:
      artist.source_url,
    spotify_url:
      artist.spotify_url ??
      null,
    apple_music_url:
      artist.apple_music_url ??
      null,
    deezer_url:
      artist.deezer_url ??
      null,
    duration_ms:
      null,
  };
}

function playlistAsDisplayTrack(
  playlist: RawPlaylist
): Track {
  return {
    id: playlist.id,
    provider:
      playlist.provider,
    provider_track_id:
      null,
    title:
      playlist.title,
    artist:
      playlist.owner_name ||
      "Playlist",
    album:
      null,
    artwork_url:
      playlist.artwork_url,
    source_url:
      playlist.source_url,
    spotify_url:
      playlist.spotify_url ??
      null,
    apple_music_url:
      playlist.apple_music_url ??
      null,
    deezer_url:
      playlist.deezer_url ??
      null,
    duration_ms:
      null,
  };
}

function mapPosts(
  supabase: ServerClient,
  data: unknown,
  viewerState: ViewerState = {
    liked:
      new Set<string>(),
    reposted:
      new Set<string>(),
  }
): Post[] {
  return (
    (data ?? []) as RawPost[]
  ).map((post) => {
    const media =
      post.post_media
        .sort(
          (a, b) =>
            a.position -
            b.position
        )
        .map((item) => ({
          ...item,
          public_url:
            supabase.storage
              .from(
                "memories"
              )
              .getPublicUrl(
                item.storage_path
              ).data.publicUrl,
        }));

    const track =
      oneOrNull(
        post.track
      );

    const album =
      oneOrNull(
        post.album
      );

    const artist =
      oneOrNull(
        post.artist
      );

    const playlist =
      oneOrNull(
        post.playlist
      );

    const displayTrack =
      track ??
      (album
        ? albumAsDisplayTrack(
            album
          )
        : artist
          ? artistAsDisplayTrack(
              artist
            )
          : playlist
            ? playlistAsDisplayTrack(
                playlist
              )
            : null);

    if (!displayTrack) {
      throw new Error(
        `Publicação ${post.id} está sem assunto musical.`
      );
    }

    const subjectKind =
      album
        ? "album"
        : artist
          ? "artist"
          : playlist
            ? "playlist"
            : "track";

    return {
      id:
        post.id,
      type:
        post.type,
      body:
        post.body,
      rating:
        post.rating,
      trend:
        post.trend,
      created_at:
        post.created_at,
      author:
        one(post.author),
      track:
        displayTrack,
      subject_kind:
        subjectKind,
      album,
      artist,
      playlist,
      media,
      counts: {
        likes:
          post.likes?.[0]
            ?.count ?? 0,
        comments:
          post.comments?.[0]
            ?.count ?? 0,
        reposts:
          post.reposts?.[0]
            ?.count ?? 0,
        liked:
          viewerState
            .liked
            .has(post.id),
        reposted:
          viewerState
            .reposted
            .has(post.id),
      },
    };
  });
}

async function postQuery(
  userIds?: string[],
  postIds?: string[]
) {
  const supabase =
    await createClient();

  let query =
    supabase
      .from("posts")
      .select(
        `
          id,
          type,
          body,
          rating,
          trend,
          created_at,

          author:profiles!posts_user_id_fkey(
            id,
            username,
            display_name,
            bio,
            avatar_url
          ),

          track:tracks!posts_track_id_fkey(*),

          album:albums!posts_album_id_fkey(
            id,
            provider,
            provider_album_id,
            title,
            artist,
            artwork_url,
            source_url,
            spotify_url,
            apple_music_url,
            deezer_url,
            release_date,
            total_tracks
          ),

          artist:artists!posts_artist_id_fkey(
            id,
            provider,
            provider_artist_id,
            name,
            artwork_url,
            source_url,
            spotify_url,
            apple_music_url,
            deezer_url
          ),

          playlist:playlists!posts_playlist_id_fkey(
            id,
            provider,
            provider_playlist_id,
            title,
            owner_name,
            description,
            artwork_url,
            source_url,
            spotify_url,
            apple_music_url,
            deezer_url,
            total_tracks
          ),

          post_media(
            id,
            storage_path,
            position,
            width,
            height,
            aspect_ratio
          ),

          likes(count),
          comments(count),
          reposts(count)
        `
      )
      .eq(
        "visibility",
        "public"
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(40);

  if (userIds) {
    query =
      userIds.length
        ? query.in(
            "user_id",
            userIds
          )
        : query.eq(
            "user_id",
            "00000000-0000-0000-0000-000000000000"
          );
  }

  if (postIds) {
    query =
      postIds.length
        ? query.in(
            "id",
            postIds
          )
        : query.eq(
            "id",
            "00000000-0000-0000-0000-000000000000"
          );
  }

  const {
    data,
    error,
  } = await query;

  if (error) {
    throw error;
  }

  const ids =
    (data ?? []).map(
      (post) =>
        post.id
    );

  const viewerState:
    ViewerState = {
      liked:
        new Set<string>(),
      reposted:
        new Set<string>(),
    };

  const {
    data: { user },
  } =
    await supabase.auth
      .getUser();

  if (
    user &&
    ids.length
  ) {
    const [
      likesResult,
      repostsResult,
    ] = await Promise.all([
      supabase
        .from("likes")
        .select("post_id")
        .eq(
          "user_id",
          user.id
        )
        .in(
          "post_id",
          ids
        ),

      supabase
        .from("reposts")
        .select("post_id")
        .eq(
          "user_id",
          user.id
        )
        .in(
          "post_id",
          ids
        ),
    ]);

    for (
      const like of
      likesResult.data ??
      []
    ) {
      viewerState
        .liked
        .add(
          like.post_id
        );
    }

    for (
      const repost of
      repostsResult.data ??
      []
    ) {
      viewerState
        .reposted
        .add(
          repost.post_id
        );
    }
  }

  return {
    supabase,
    data,
    viewerState,
  };
}

export async function getFeed(
  following = false
): Promise<Post[]> {
  let ids:
    | string[]
    | undefined;

  /*
   * HOME EM ORDEM CRONOLÓGICA
   *
   * Para você:
   *   todos os posts públicos, mais recente primeiro.
   *
   * Seguindo:
   *   posts das pessoas seguidas, também mais recente primeiro.
   *
   * A ordenação já acontece dentro de postQuery:
   * .order("created_at", { ascending: false })
   */
  if (following) {
    const supabase =
      await createClient();

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    const {
      data,
    } =
      await supabase
        .from("follows")
        .select(
          "following_id"
        )
        .eq(
          "follower_id",
          user.id
        );

    ids =
      (data ?? []).map(
        (item) =>
          item.following_id
      );
  }

  const {
    supabase,
    data,
    viewerState,
  } =
    await postQuery(
      following
        ? ids
        : undefined
    );

  return mapPosts(
    supabase,
    data,
    viewerState
  );
}

export async function getPost(
  id: string
) {
  const {
    supabase,
    data,
    viewerState,
  } =
    await postQuery(
      undefined,
      [id]
    );

  return (
    mapPosts(
      supabase,
      data,
      viewerState
    )[0] ?? null
  );
}

export async function getProfile(
  username: string
) {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } =
    await supabase
      .from("profiles")
      .select(
        "id,username,display_name,bio,avatar_url"
      )
      .eq(
        "username",
        username
      )
      .maybeSingle();

  if (error) {
    throw error;
  }

  return data as
    | Profile
    | null;
}

export async function getProfilePosts(
  userId: string
): Promise<Post[]> {
  const supabase =
    await createClient();

  // Publicações criadas pelo usuário.
  const ownResult =
    await postQuery(
      [userId]
    );

  const ownPosts =
    mapPosts(
      ownResult.supabase,
      ownResult.data,
      ownResult.viewerState
    );

  // Perfil da pessoa cujo perfil estamos abrindo.
  const {
    data: profile,
    error:
      profileError,
  } =
    await supabase
      .from("profiles")
      .select(
        "id,username,display_name,bio,avatar_url"
      )
      .eq(
        "id",
        userId
      )
      .single();

  if (profileError) {
    throw profileError;
  }

  // Reposts feitos por essa pessoa.
  const {
    data:
      repostRows,
    error:
      repostError,
  } =
    await supabase
      .from("reposts")
      .select(
        "post_id,created_at"
      )
      .eq(
        "user_id",
        userId
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

  if (repostError) {
    throw repostError;
  }

  const repostIds =
    (
      repostRows ?? []
    ).map(
      (row) =>
        row.post_id
    );

  if (
    !repostIds.length
  ) {
    return ownPosts;
  }

  const repostResult =
    await postQuery(
      undefined,
      repostIds
    );

  const ownIds =
    new Set(
      ownPosts.map(
        (post) =>
          post.id
      )
    );

  const repostDates =
    new Map(
      (
        repostRows ?? []
      ).map(
        (row) => [
          row.post_id,
          row.created_at,
        ]
      )
    );

  // Se existisse repost de um post próprio antigo,
  // não duplicamos esse post no perfil.
  const repostedPosts =
    mapPosts(
      repostResult.supabase,
      repostResult.data,
      repostResult.viewerState
    )
      .filter(
        (post) =>
          !ownIds.has(
            post.id
          )
      )
      .map(
        (post) => ({
          ...post,

          reposted_by:
            profile as Profile,
        })
      );

  // "All" segue a atividade do perfil:
  // publicação nova ou repost recente.
  return [
    ...ownPosts,
    ...repostedPosts,
  ].sort(
    (a, b) => {
      const aTime =
        a.reposted_by
          ? repostDates.get(
              a.id
            ) ??
            a.created_at
          : a.created_at;

      const bTime =
        b.reposted_by
          ? repostDates.get(
              b.id
            ) ??
            b.created_at
          : b.created_at;

      return (
        new Date(
          bTime
        ).getTime() -
        new Date(
          aTime
        ).getTime()
      );
    }
  );
}

export async function getProfileSocial(
  userId: string
) {
  const supabase =
    await createClient();

  const [
    {
      count:
        followers,
    },
    {
      count:
        following,
    },
    user,
  ] =
    await Promise.all([
      supabase
        .from("follows")
        .select(
          "*",
          {
            count:
              "exact",
            head: true,
          }
        )
        .eq(
          "following_id",
          userId
        ),

      supabase
        .from("follows")
        .select(
          "*",
          {
            count:
              "exact",
            head: true,
          }
        )
        .eq(
          "follower_id",
          userId
        ),

      getCurrentUser(),
    ]);

  let isFollowing =
    false;

  if (
    user &&
    user.id !== userId
  ) {
    const {
      data,
    } =
      await supabase
        .from("follows")
        .select(
          "follower_id"
        )
        .eq(
          "follower_id",
          user.id
        )
        .eq(
          "following_id",
          userId
        )
        .maybeSingle();

    isFollowing =
      !!data;
  }

  return {
    followers:
      followers ?? 0,

    following:
      following ?? 0,

    viewerId:
      user?.id ??
      null,

    isFollowing,
  };
}