import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  Camera,
  Check,
  MessageCircle,
  Music2,
  Search,
  Sparkles,
  Star,
} from "lucide-react";

import styles from "./LandingPage.module.css";

export default function LandingPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="AUX">
          aux.
        </Link>

        <Link href="/login" className={styles.login}>
          entrar
        </Link>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.pill}>
            música + contexto + pessoas
          </span>

          <h1>
            não é só
            <br />
            <span>o que você ouve.</span>
          </h1>

          <p className={styles.heroLead}>
            O AUX é uma rede social para falar sobre música
            do jeito que ela acontece na vida real:
            com opinião, lembrança e conversa.
          </p>

          <a href="#entenda" className={styles.heroLink}>
            entender o AUX
            <ArrowDown size={17} strokeWidth={1.8} />
          </a>
        </div>

        <div className={styles.heroDemo} aria-hidden="true">
          <div className={styles.demoTop}>
            <span>aux.</span>
            <span className={styles.demoBadge}>agora</span>
          </div>

          <div className={styles.demoArtwork}>
            <div className={styles.demoDisc} />
            <div className={styles.demoWave}>
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>

          <div className={styles.demoCopy}>
            <small>MEMORY</small>
            <strong>
              “essa música me lembra a volta pra casa
              depois de um dia muito bom.”
            </strong>
          </div>
        </div>
      </section>

      <section className={styles.intro} id="entenda">
        <span className={styles.eyebrow}>em uma frase</span>

        <h2>
          você escolhe uma música.
          <br />
          o AUX guarda o que ela virou pra você.
        </h2>
      </section>

      <section className={styles.splitSection}>
        <article className={styles.reviewCard}>
          <div className={styles.cardIcon}>
            <Star size={22} strokeWidth={1.8} />
          </div>

          <span className={styles.cardTag}>REVIEW</span>

          <h3>o que você achou?</h3>

          <p>
            Dê uma nota e escreva sua opinião
            sobre uma música, álbum, artista ou playlist.
          </p>

          <div className={styles.rating}>
            <span>★</span>
            <span>★</span>
            <span>★</span>
            <span>★</span>
            <span className={styles.ratingMuted}>★</span>
          </div>
        </article>

        <article className={styles.memoryCard}>
          <div className={styles.cardIcon}>
            <Camera size={22} strokeWidth={1.8} />
          </div>

          <span className={styles.cardTag}>MEMORY</span>

          <h3>o que isso te lembra?</h3>

          <p>
            Ligue uma música a uma pessoa,
            viagem, fase, festa ou qualquer momento.
          </p>

          <div className={styles.memoryNote}>
            <Sparkles size={16} strokeWidth={1.7} />
            <span>“essa tocou o verão inteiro.”</span>
          </div>
        </article>
      </section>

      <section className={styles.whySection}>
        <span className={styles.eyebrow}>mas por que um app só pra isso?</span>

        <h2>
          porque música também é
          uma forma de lembrar.
        </h2>

        <div className={styles.whyGrid}>
          <div className={styles.whyItem}>
            <Check size={18} strokeWidth={2} />
            <p>
              O streaming guarda <strong>o que você ouviu.</strong>
            </p>
          </div>

          <div className={styles.whyItem}>
            <Check size={18} strokeWidth={2} />
            <p>
              A conversa some no grupo, no direct ou no link enviado.
            </p>
          </div>

          <div className={`${styles.whyItem} ${styles.whyItemStrong}`}>
            <Check size={18} strokeWidth={2} />
            <p>
              O AUX guarda <strong>o que aquilo significou.</strong>
            </p>
          </div>
        </div>
      </section>

      <section className={styles.howSection}>
        <span className={styles.eyebrow}>como funciona</span>

        <h2>leva menos de um minuto.</h2>

        <div className={styles.steps}>
          <article className={styles.step}>
            <span className={styles.stepNumber}>01</span>
            <Search size={22} strokeWidth={1.8} />
            <div>
              <h3>encontre</h3>
              <p>
                Busque pelo nome ou cole um link.
              </p>
            </div>
          </article>

          <article className={styles.step}>
            <span className={styles.stepNumber}>02</span>
            <Music2 size={22} strokeWidth={1.8} />
            <div>
              <h3>escolha</h3>
              <p>
                Faça uma Review ou uma Memory.
              </p>
            </div>
          </article>

          <article className={styles.step}>
            <span className={styles.stepNumber}>03</span>
            <MessageCircle size={22} strokeWidth={1.8} />
            <div>
              <h3>compartilhe</h3>
              <p>
                Seus amigos veem, comentam e descobrem música com você.
              </p>
            </div>
          </article>
        </div>

        <p className={styles.providers}>
          música · álbum · artista · playlist
        </p>
      </section>

      <section className={styles.finalSection}>
        <div className={styles.finalBrand}>aux.</div>

        <h2>
          seu gosto também
          <br />
          conta uma história.
        </h2>

        <p>
          Crie seu perfil e comece pela música
          que você não consegue esquecer.
        </p>

        <Link href="/login?signup=1" className={styles.primaryButton}>
          criar minha conta
          <ArrowRight size={18} strokeWidth={1.9} />
        </Link>

        <span className={styles.already}>
          já tem conta? <Link href="/login">entrar</Link>
        </span>
      </section>
    </main>
  );
}
