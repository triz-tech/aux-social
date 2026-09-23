"use client";

import {
  Mic2,
  Search,
  X,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
} from "motion/react";
import { useRouter } from "next/navigation";

export default function CreateSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();

  function go(path: string) {
    onClose();
    router.push(path);
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
            if (
              event.currentTarget ===
              event.target
            ) {
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
              <X
                size={22}
                strokeWidth={1.8}
              />
            </button>

            <div className="sheetHeader">
              <div className="brand">
                aux.
              </div>

              <p>
                O que você quer
                compartilhar?
              </p>
            </div>

            <div className="createChoices">
              <button
                className="choice"
                onClick={() =>
                  go("/new")
                }
              >
                <span
                  className="choiceIcon"
                  aria-hidden="true"
                >
                  <Search
                    size={25}
                    strokeWidth={1.8}
                  />
                </span>

                <div className="choiceCopy">
                  <strong>
                    Buscar ou colar
                  </strong>

                  <span>
                    música, álbum,
                    artista, playlist
                    ou link
                  </span>
                </div>
              </button>

              <button
                className="choice"
                onClick={() =>
                  go(
                    "/new?mode=listen"
                  )
                }
              >
                <span
                  className="choiceIcon"
                  aria-hidden="true"
                >
                  <Mic2
                    size={25}
                    strokeWidth={1.8}
                  />
                </span>

                <div className="choiceCopy">
                  <strong>
                    O que tá tocando?
                  </strong>

                  <span>
                    ouve alguns
                    segundos e tenta
                    identificar
                  </span>
                </div>
              </button>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
