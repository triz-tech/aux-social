import {
  ExternalLink,
  Music2,
  Repeat2,
} from "lucide-react";

import Link from "next/link";

import type { Post } from "@/types";

import Avatar from "@/components/ui/Avatar";
import { RatingStars } from "@/components/review/RatingStars";
import MemoryCarousel from "@/components/memory/MemoryCarousel";

import PostActions from "./PostActions";

import { timeAgo } from "@/lib/utils";

export default function PostCard({
  post,
}: {
  post: Post;
}) {
  return (
    <article className="post">
      {/* QUEM REPOSTOU */}

      {post.reposted_by && (
        <div
          className="subtle"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "12px 16px 0",
            fontSize: 13,
          }}
        >
          <Repeat2 size={14} />

          <Link
            href={`/u/${post.reposted_by.username}`}
            style={{
              color: "inherit",
              textDecoration: "none",
            }}
          >
            @{post.reposted_by.username} repostou
          </Link>
        </div>
      )}

      {/* AUTOR DO POST */}

      <header className="postHead">
        <Link
          href={`/u/${post.author.username}`}
          aria-label={`Ver perfil de ${post.author.display_name}`}
          style={{
            display: "block",
            flexShrink: 0,
            color: "inherit",
            textDecoration: "none",
          }}
        >
          <Avatar
            profile={post.author}
          />
        </Link>

        <div className="who">
          {/* NOME */}

          <Link
            href={`/u/${post.author.username}`}
            style={{
              color: "inherit",
              textDecoration: "none",
            }}
          >
            <strong>
              {post.author.display_name}
            </strong>
          </Link>

          {/* @ + DATA */}

          <span>
            <Link
              href={`/u/${post.author.username}`}
              style={{
                color: "inherit",
                textDecoration: "none",
              }}
            >
              @{post.author.username}
            </Link>

            {" · "}

            {timeAgo(
              post.created_at
            )}
          </span>
        </div>
      </header>

      {/* CONTEÚDO */}

      {post.type ===
      "review" ? (
        <div className="artwork">
          {post.track
            .artwork_url && (
            <img
              src={
                post.track
                  .artwork_url
              }
              alt={`Capa de ${post.track.title}`}
            />
          )}

          <div className="artworkOverlay">
            <strong>
              {post.track.title}
            </strong>

            <span>
              {post.track.artist}
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
        {post.type ===
          "review" &&
          post.rating && (
            <RatingStars
              value={
                post.rating
              }
            />
          )}

        <p className="postText">
          {post.body}
        </p>

        {/* ABRIR MÚSICA */}

        <a
          className="trackline"
          href={
            post.track
              .source_url
          }
          target="_blank"
          rel="noreferrer"
        >
          <Music2 size={15} />

          <span>
            {post.track.title}
            {" · "}
            {post.track.artist}
          </span>

          <ExternalLink
            size={13}
          />
        </a>

        <PostActions
          post={post}
        />
      </div>
    </article>
  );
}