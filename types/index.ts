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

export interface Artist {
  id: string;
  provider: MusicProvider;
  provider_artist_id:
    | string
    | null;
  name: string;
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
}

export interface ResolvedArtist
  extends Omit<Artist, "id"> {}

export interface Playlist {
  id: string;
  provider: MusicProvider;
  provider_playlist_id:
    | string
    | null;
  title: string;
  owner_name:
    | string
    | null;
  description:
    | string
    | null;
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
  total_tracks?:
    | number
    | null;
}

export interface ResolvedPlaylist
  extends Omit<Playlist, "id"> {}

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
  | "album"
  | "artist"
  | "playlist";

export interface Post {
  id: string;
  type: PostType;
  body: string;
  rating: number | null;
  trend: string | null;
  created_at: string;
  author: Profile;

  /*
   * Compatibilidade temporária:
   * vários componentes ainda renderizam post.track.
   * Para album/artist/playlist a camada de queries pode
   * entregar um adapter visual aqui até migrarmos tudo.
   */
  track: Track;

  subject_kind?: PostSubjectKind;

  album?:
    | Album
    | null;

  artist?:
    | Artist
    | null;

  playlist?:
    | Playlist
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
