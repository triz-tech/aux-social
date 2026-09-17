import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="landing">
      <header className="landingHeader">
        <div className="brand">aux.</div>

        <Link
          href="/login"
          className="landingLogin"
        >
          entrar
        </Link>
      </header>

      <section className="landingHero">
        <div className="landingHeroCopy">
          <span className="landingEyebrow">
            para as músicas que ficam
          </span>

          <h1>
            música,
            <br />
            ligada à vida.
          </h1>

          <p>
            avalie o que você ouviu.
            guarde as músicas que ficaram
            presas a pessoas, lugares e
            momentos.
          </p>

          <div className="landingActions">
            <Link
              href="/login?signup=1"
              className="landingPrimary"
            >
              começar
            </Link>

            <a
              href="#como-funciona"
              className="landingSecondary"
            >
              ver como funciona
            </a>
          </div>
        </div>

        {/*
         * Preview conceitual.
         * Não são posts falsos nem conteúdo de usuários.
         */}

        <div
          className="landingStage"
          aria-hidden="true"
        >
          <div className="landingReviewCard">
            <div className="landingCardLabel">
              REVIEW
            </div>

            <div className="landingFakeArtwork">
              <div className="landingRecord" />
            </div>

            <div className="landingFakeTrack">
              <strong>
                o que você achou?
              </strong>

              <span>
                ★ ★ ★ ★ ★
              </span>
            </div>

            <p>
              “essa ficou.”
            </p>
          </div>

          <div className="landingMemoryCard">
            <div className="landingMemoryPhoto">
              <div className="landingMemoryGlow" />
            </div>

            <div className="landingMiniTrack">
              <div className="landingMiniCover" />

              <div>
                <small>
                  MEMORY
                </small>

                <strong>
                  essa música
                  <br />
                  → esse momento
                </strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className="landingHow"
        id="como-funciona"
      >
        <article>
          <span>01</span>

          <h2>
            o que você achou?
          </h2>

          <p>
            dê sua nota e escreva uma
            Review sobre a música.
          </p>
        </article>

        <article>
          <span>02</span>

          <h2>
            onde ela entrou na sua vida?
          </h2>

          <p>
            junte música, foto e memória
            no mesmo lugar.
          </p>
        </article>

        <article>
          <span>03</span>

          <h2>
            seu gosto, do seu jeito.
          </h2>

          <p>
            suas músicas, Reviews e
            Memories formam um perfil
            que parece você.
          </p>
        </article>
      </section>

      <section className="landingFinal">
        <div className="landingFinalMark">
          aux.
        </div>

        <h2>
          seu gosto começa
          <br />
          com uma música.
        </h2>

        <Link
          href="/login?signup=1"
          className="landingPrimary"
        >
          começar
        </Link>

        <p>
          já tem conta?{" "}
          <Link href="/login">
            entrar
          </Link>
        </p>
      </section>
    </main>
  );
}