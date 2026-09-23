"use client";

import {
  Download,
  Share,
  X,
} from "lucide-react";
import { usePathname } from "next/navigation";
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

const DISMISS_KEY =
  "aux-install-after-login-dismissed-at";

const INSTALLED_KEY =
  "aux-install-after-login-installed";

const DISMISS_FOR_DAYS = 14;

const BLOCKED_ROUTES = [
  "/login",
  "/onboarding",
];

export default function InstallPrompt({
  signedIn,
}: {
  signedIn: boolean;
}) {
  const pathname = usePathname();

  const [
    showPrompt,
    setShowPrompt,
  ] = useState(false);

  const [
    showIOSGuide,
    setShowIOSGuide,
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

  const routeBlocked =
    BLOCKED_ROUTES.some(
      (route) =>
        pathname === route ||
        pathname.startsWith(
          `${route}/`
        )
    );

  useEffect(() => {
    const ios =
      /iphone|ipad|ipod/i.test(
        navigator.userAgent
      );

    setIsIOS(ios);

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

  useEffect(() => {
    if (
      !signedIn ||
      routeBlocked
    ) {
      setShowPrompt(false);
      return;
    }

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

    const markedInstalled =
      localStorage.getItem(
        INSTALLED_KEY
      ) === "true";

    if (
      standalone ||
      navigatorStandalone ||
      markedInstalled
    ) {
      setShowPrompt(false);
      return;
    }

    const dismissedValue =
      localStorage.getItem(
        DISMISS_KEY
      );

    if (dismissedValue) {
      const dismissedAt =
        Number(
          dismissedValue
        );

      if (
        Number.isFinite(
          dismissedAt
        )
      ) {
        const days =
          (Date.now() -
            dismissedAt) /
          (
            1000 *
            60 *
            60 *
            24
          );

        if (
          days <
          DISMISS_FOR_DAYS
        ) {
          setShowPrompt(false);
          return;
        }
      }
    }

    /*
     * iPhone:
     * não possui beforeinstallprompt,
     * então mostramos o tutorial.
     *
     * Chrome/Chromium:
     * o aviso só aparece quando
     * o navegador confirma que a
     * instalação está disponível.
     */
    if (
      !isIOS &&
      !installEvent
    ) {
      setShowPrompt(false);
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          setShowPrompt(true);
        },
        1800
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    signedIn,
    routeBlocked,
    isIOS,
    installEvent,
  ]);

  function dismiss() {
    localStorage.setItem(
      DISMISS_KEY,
      String(Date.now())
    );

    setShowPrompt(false);
    setShowIOSGuide(false);
  }

  async function startInstall() {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

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
        INSTALLED_KEY,
        "true"
      );

      localStorage.removeItem(
        DISMISS_KEY
      );

      setShowPrompt(false);
      setInstallEvent(null);
    }
  }

  if (
    !showPrompt ||
    routeBlocked ||
    !signedIn
  ) {
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

        {!showIOSGuide ? (
          <>
            <span className="installEyebrow">
              acesso mais rápido
            </span>

            <h1>
              quer o AUX na sua
              tela de início?
            </h1>

            <p>
              ele fica junto dos seus
              outros apps e abre em tela
              cheia, sem precisar procurar
              o site toda vez.
            </p>

            <button
              type="button"
              className="installPrimary"
              onClick={() =>
                void startInstall()
              }
            >
              <Download size={17} />
              adicionar à tela
            </button>

            <button
              type="button"
              className="installSecondary"
              onClick={dismiss}
            >
              agora não
            </button>
          </>
        ) : (
          <>
            <span className="installEyebrow">
              no iPhone
            </span>

            <h1>
              adicionar o AUX.
            </h1>

            <div className="iosInstallGuide">
              <div className="iosGuideHeader">
                <div className="iosGuideBadge">
                  <Share
                    size={18}
                    strokeWidth={1.8}
                  />
                </div>

                <div>
                  <strong>
                    leva menos de um minuto
                  </strong>

                  <span>
                    siga estes três passos
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
                      abra o menu de compartilhar
                      da página no Safari
                    </span>
                  </div>

                  <div className="iosSystemIcon">
                    <Share
                      size={20}
                      strokeWidth={1.7}
                    />
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
                      role as opções e toque
                      nessa opção
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
                      toque em Adicionar
                    </strong>

                    <span>
                      depois abra o AUX pelo
                      novo ícone
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
                    o AUX fica junto dos seus
                    outros apps.
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="installSecondary"
              onClick={() =>
                setShowIOSGuide(
                  false
                )
              }
            >
              voltar
            </button>
          </>
        )}
      </section>
    </div>
  );
}
