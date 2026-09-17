export type MusicProvider =
  | "spotify"
  | "apple"
  | "deezer"
  | "youtube"
  | "manual";

export type PostType =
  | "review"
  | "memory";

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  created_at?: string;
}

export interface Track {
  id: string;
  provider: MusicProvider;
  provider_track_id:
    | string
    | null;
  title: string;
  artist: string;
  album: string | null;
  artwork_url:
    | string
    | null;
  source_url: string;
  spotify_url?:
    | string
    | null;
  apple_music_url?:
    | string
    | null;
  deezer_url?:
    | string
    | null;
  duration_ms?:
    | number
    | null;
}

export interface ResolvedTrack
  extends Omit<Track, "id"> {
  external_urls?: Partial<
    Record<
      | "spotify"
      | "appleMusic"
      | "deezer"
      | "youtube",
      string
    >
  >;
}

/* =========================================================
   ALBUMS
   Usados pela feature de Review de álbum.

   Ainda não alteramos Post aqui. Os componentes atuais
   continuam recebendo post.track normalmente até a etapa
   em que Composer + PostCard forem atualizados juntos.
   ========================================================= */

export interface Album {
  id: string;

  provider: MusicProvider;

  provider_album_id:
    | string
    | null;

  title: string;
  artist: string;

  artwork_url:
    | string
    | null;

  source_url: string;

  spotify_url?:
    | string
    | null;

  apple_music_url?:
    | string
    | null;

  deezer_url?:
    | string
    | null;

  release_date?:
    | string
    | null;

  total_tracks?:
    | number
    | null;
}

export interface ResolvedAlbum
  extends Omit<Album, "id"> {}

export interface PostMedia {
  id: string;
  storage_path: string;
  public_url?: string;
  position: number;
  width: number | null;
  height: number | null;
  aspect_ratio:
    | number
    | null;
}

export interface SocialCounts {
  likes: number;
  comments: number;
  reposts: number;
  liked?: boolean;
  reposted?: boolean;
}

export type PostSubjectKind =
  | "track"
  | "album";

export interface Post {
  id: string;
  type: PostType;
  body: string;
  rating: number | null;
  trend: string | null;
  created_at: string;
  author: Profile;

  /*
   * Compatibilidade:
   * track continua obrigatório por enquanto porque vários
   * componentes atuais ainda usam post.track diretamente.
   *
   * Para Review de álbum, a camada de queries entrega aqui
   * um adapter visual do álbum. O objeto real fica em album.
   */
  track: Track;

  /*
   * Novo sinal explícito para a UI saber se a Review é
   * de uma música ou de um álbum.
   *
   * Opcional temporariamente para que demoPosts e qualquer
   * objeto antigo continuem válidos durante a migração.
   */
  subject_kind?: PostSubjectKind;

  album?:
    | Album
    | null;

  media: PostMedia[];
  counts: SocialCounts;
  reposted_by?:
    | Profile
    | null;
}

export interface Comment {
  id: string;
  body: string;
  created_at: string;
  author: Profile;
}

export interface ActivityItem {
  id: string;
  type:
    | "like"
    | "comment"
    | "follow"
    | "repost";
  created_at: string;
  actor: Profile;
  post_id?:
    | string
    | null;
  read_at?:
    | string
    | null;
}
