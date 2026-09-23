"use client";

import {
  Download,
  Share,
  X,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";

type BeforeInstallPromptEvent =
  Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{
      outcome:
        | "accepted"
        | "dismissed";
      platform: string;
    }>;
  };

export default function InstallPrompt() {
  const [
    showPrompt,
    setShowPrompt,
  ] = useState(false);

  const [
    installEvent,
    setInstallEvent,
  ] =
    useState<BeforeInstallPromptEvent | null>(
      null
    );

  const [isIOS, setIsIOS] =
    useState(false);

  useEffect(() => {
    const alreadySeen =
      localStorage.getItem(
        "aux-install-intro-seen"
      );

    const standalone =
      window.matchMedia(
        "(display-mode: standalone)"
      ).matches;

    const navigatorStandalone =
      (
        window.navigator as Navigator & {
          standalone?: boolean;
        }
      ).standalone === true;

    if (
      alreadySeen ||
      standalone ||
      navigatorStandalone
    ) {
      return;
    }

    const ios =
      /iphone|ipad|ipod/i.test(
        navigator.userAgent
      );

    setIsIOS(ios);
    setShowPrompt(true);

    function handleInstallPrompt(
      event: Event
    ) {
      event.preventDefault();

      setInstallEvent(
        event as BeforeInstallPromptEvent
      );
    }

    window.addEventListener(
      "beforeinstallprompt",
      handleInstallPrompt
    );

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleInstallPrompt
      );
    };
  }, []);

  function dismiss() {
    localStorage.setItem(
      "aux-install-intro-seen",
      "true"
    );

    setShowPrompt(false);
  }

  async function install() {
    if (!installEvent) {
      return;
    }

    await installEvent.prompt();

    const result =
      await installEvent.userChoice;

    if (
      result.outcome ===
      "accepted"
    ) {
      localStorage.setItem(
        "aux-install-intro-seen",
        "true"
      );

      setShowPrompt(false);
    }
  }

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="installOverlay">
      <section className="installCard">
        <button
          type="button"
          className="installClose"
          onClick={dismiss}
          aria-label="Fechar"
        >
          <X size={18} />
        </button>

        <div className="installIcon">
          aux.
        </div>

        <span className="installEyebrow">
          leve o AUX com você
        </span>

        <h1>
          use como um app.
        </h1>

        <p>
          adicione o AUX à sua
          tela de início para
          abrir mais rápido e
          usar em tela cheia.
        </p>

{isIOS ? (
  <div className="iosInstallGuide">
    <div className="iosGuideHeader">
      <div className="iosGuideBadge">
        <Share size={18} strokeWidth={1.8} />
      </div>

      <div>
        <strong>
          Adicionar o AUX ao iPhone
        </strong>

        <span>
          leva menos de um minuto
        </span>
      </div>
    </div>

    <div className="iosGuideSteps">
      <div className="iosGuideStep">
        <span className="iosStepNumber">
          1
        </span>

        <div className="iosStepCopy">
          <strong>
            toque em Compartilhar
          </strong>

          <span>
            no Safari, toque no botão
            de compartilhar ou abra o
            menu da página e escolha
            Compartilhar
          </span>
        </div>

        <div className="iosSystemIcon">
          <Share size={20} strokeWidth={1.7} />
        </div>
      </div>

      <div className="iosGuideConnector" />

      <div className="iosGuideStep">
        <span className="iosStepNumber">
          2
        </span>

        <div className="iosStepCopy">
          <strong>
            Adicionar à Tela de Início
          </strong>

          <span>
            role as opções e toque em
            “Adicionar à Tela de Início”
          </span>
        </div>

        <div
          className="iosSystemIcon"
          aria-hidden="true"
        >
          <span className="iosPlusIcon">
            +
          </span>
        </div>
      </div>

      <div className="iosGuideConnector" />

      <div className="iosGuideStep">
        <span className="iosStepNumber">
          3
        </span>

        <div className="iosStepCopy">
          <strong>
            abra como app
          </strong>

          <span>
            ative “Abrir como App” e
            toque em “Adicionar”
          </span>
        </div>

        <div
          className="iosSystemIcon iosAppPreview"
          aria-hidden="true"
        >
          aux.
        </div>
      </div>
    </div>

    <div className="iosGuideResult">
      <div className="iosHomeIcon">
        aux.
      </div>

      <div>
        <strong>
          pronto.
        </strong>

        <span>
          o AUX aparece na sua Tela de
          Início como os outros apps.
        </span>
      </div>
    </div>
  </div>
) : installEvent ? (
          <button
            type="button"
            className="installPrimary"
            onClick={() =>
              void install()
            }
          >
            <Download size={17} />
            adicionar à tela
          </button>
        ) : (
          <div className="installWaiting">
            disponível para
            instalação pelo
            navegador.
          </div>
        )}

        <button
          type="button"
          className="installSecondary"
          onClick={dismiss}
        >
          continuar no navegador
        </button>
      </section>
    </div>
  );
}