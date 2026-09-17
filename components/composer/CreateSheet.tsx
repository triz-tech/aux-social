"use client";

import { Link2, Mic2, Search, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";

export default function CreateSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();

  function go(mode: "listen" | "link" | "search") {
    onClose();
    router.push(`/new?mode=${mode}`);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="sheetBackdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              onClose();
            }
          }}
        >
          <motion.section
            className="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{
              type: "spring",
              stiffness: 360,
              damping: 34,
            }}
          >
            <div className="handle" />

            <button
              className="sheetClose"
              aria-label="Fechar"
              onClick={onClose}
            >
              <X size={22} strokeWidth={1.8} />
            </button>

            <div className="sheetHeader">
              <div className="brand">aux.</div>
              <p>Qual é a música?</p>
            </div>

            <div className="createChoices">
              <button
                className="choice"
                onClick={() => go("listen")}
              >
                <span className="choiceIcon" aria-hidden="true">
                  <Mic2 size={25} strokeWidth={1.8} />
                </span>

                <div className="choiceCopy">
                  <strong>O que tá tocando?</strong>
                  <span>ouve alguns segundos e tenta identificar</span>
                </div>
              </button>

              <button
                className="choice"
                onClick={() => go("link")}
              >
                <span className="choiceIcon" aria-hidden="true">
                  <Link2 size={25} strokeWidth={1.8} />
                </span>

                <div className="choiceCopy">
                  <strong>Colar link</strong>
                  <span>Spotify, Apple Music, Deezer ou YouTube</span>
                </div>
              </button>

              <button
                className="choice"
                onClick={() => go("search")}
              >
                <span className="choiceIcon" aria-hidden="true">
                  <Search size={25} strokeWidth={1.8} />
                </span>

                <div className="choiceCopy">
                  <strong>Buscar música</strong>
                  <span>nome, artista ou álbum</span>
                </div>
              </button>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
