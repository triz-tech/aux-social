import { notFound } from "next/navigation";

import ProfileView from "@/components/profile/ProfileView";

import { IS_DEMO } from "@/lib/config";
import {
  demoPosts,
  demoProfiles,
} from "@/lib/data/demo";
import {
  getProfile,
  getProfilePosts,
  getProfileSocial,
} from "@/lib/data/queries";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{
    username: string;
  }>;
}) {
  const { username } =
    await params;

  if (IS_DEMO) {
    const profile =
      username === "demo"
        ? demoProfiles[0]
        : demoProfiles.find(
            (item) =>
              item.username ===
              username
          ) ??
          demoProfiles[0];

    return (
      <ProfileView
        profile={profile}
        posts={demoPosts.filter(
          (post) =>
            post.author.id ===
              profile.id ||
            username === "demo"
        )}
        social={{
          followers: 128,
          following: 94,
          viewerId:
            "demo-viewer",
          isFollowing: false,
        }}
      />
    );
  }

  /*
   * Primeiro precisamos do perfil,
   * porque posts/social usam o id dele.
   */
  const profile =
    await getProfile(username);

  if (!profile) {
    notFound();
  }

  /*
   * Estas duas consultas são independentes.
   * Fazemos as duas em paralelo em vez de
   * esperar uma terminar para começar a outra.
   */
  const [
    posts,
    social,
  ] = await Promise.all([
    getProfilePosts(
      profile.id
    ),
    getProfileSocial(
      profile.id
    ),
  ]);

  return (
    <ProfileView
      profile={profile}
      posts={posts}
      social={social}
    />
  );
}