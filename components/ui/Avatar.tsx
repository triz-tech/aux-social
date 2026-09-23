"use client";

import { useState } from "react";

import type { Profile } from "@/types";

export default function Avatar({
  profile,
}: {
  profile: Profile;
}) {
  const [imageFailed, setImageFailed] =
    useState(false);

  const avatarUrl = profile.avatar_url;

  if (!avatarUrl || imageFailed) {
    return (
      <div
        className="avatar"
        aria-label={`Avatar padrão de ${profile.display_name}`}
        role="img"
        style={{
          position: "relative",
          display: "grid",
          placeItems: "center",
          overflow: "hidden",
          background:
            "linear-gradient(145deg, #171717 0%, #090909 100%)",
        }}
      >
        {/* disco */}
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            width: "70%",
            height: "70%",
            borderRadius: "999px",
            background:
              "repeating-radial-gradient(circle, #181818 0 2px, #292929 3px 4px)",
            boxShadow:
              "0 2px 8px rgba(0, 0, 0, 0.35)",
          }}
        />

        {/* selo vinho */}
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            width: "27%",
            height: "27%",
            borderRadius: "999px",
            background: "#6f1734",
          }}
        />

        {/* furo do vinil */}
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            width: "7%",
            height: "7%",
            borderRadius: "999px",
            background: "#f5f1ef",
          }}
        />

        {/* brilho */}
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            width: "23%",
            height: "5%",
            top: "25%",
            left: "19%",
            borderRadius: "999px",
            background:
              "rgba(255, 255, 255, 0.18)",
            transform: "rotate(-36deg)",
          }}
        />
      </div>
    );
  }

  return (
    <img
      className="avatar"
      src={avatarUrl}
      alt={`Foto de ${profile.display_name}`}
      width={38}
      height={38}
      loading="lazy"
      decoding="async"
      onError={() => {
        setImageFailed(true);
      }}
    />
  );
}