import { redirect } from "next/navigation";
import Link from "next/link";

import LandingPage from "@/components/landing/LandingPage";
import PostCard from "@/components/post/PostCard";

import { IS_DEMO } from "@/lib/config";
import { demoPosts } from "@/lib/data/demo";
import { getFeed } from "@/lib/data/queries";
import { getViewer } from "@/lib/auth/viewer";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
  }>;
}) {
  /*
   * =====================================================
   * VISITANTE OU USUÁRIO?
   * =====================================================
   */

 const viewer =
  await getViewer();

if (
  viewer.signedIn &&
  !viewer.onboardingCompleted
) {
  redirect("/onboarding");
}

if (!viewer.signedIn) {
  return <LandingPage />;
}
  /*
   * Visitante vê a apresentação do AUX.
   */



  /*
   * =====================================================
   * HOME DO AUX
   * =====================================================
   */

  const { tab } =
    await searchParams;

  const following =
    tab === "following";

  let posts = demoPosts;
  let error = "";

  if (!IS_DEMO) {
    try {
      posts =
        await getFeed(
          following
        );
    } catch (err) {
      posts = [];

      error =
        err instanceof Error
          ? err.message
          : "Não consegui carregar o feed.";
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          aux.
        </div>

        <span className="pill">
          música, ligada à vida
        </span>
      </header>

      <section className="hero">
        <h1>
          o que ficou?
        </h1>

        <p>
          Reviews para o que você
          pensa. Memories para o
          lugar que a música ocupou
          na sua vida.
        </p>
      </section>

      <div className="tabs">
        <Link
          className={`tab ${
            !following
              ? "active"
              : ""
          }`}
          href="/"
        >
          Para você
        </Link>

        <Link
          className={`tab ${
            following
              ? "active"
              : ""
          }`}
          href="/?tab=following"
        >
          Seguindo
        </Link>
      </div>

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      <section className="feed">
        {posts.length ? (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              viewerId={viewer.id}
            />
          ))
        ) : (
          <div className="empty">
            <div className="brand">
              aux.
            </div>

            <p>
              {following
                ? "siga alguém para montar este feed."
                : "seu gosto começa com uma música."}
            </p>

            <a
              className="primary"
              href={
                following
                  ? "/discover"
                  : "/new"
              }
            >
              {following
                ? "descobrir pessoas"
                : "adicionar primeira música"}
            </a>
          </div>
        )}
      </section>
    </main>
  );
}
