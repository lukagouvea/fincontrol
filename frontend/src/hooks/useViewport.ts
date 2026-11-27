import { useEffect } from "react";

/**
 * Quanto a área visível precisa encolher para contar como teclado aberto. A
 * barra de endereço que some e aparece mexe em menos que isso.
 */
export const KEYBOARD_MIN_HEIGHT = 150;

/** Teclado virtual aberto: a área visível (descontado o zoom) ficou bem menor que a janela. */
export function isKeyboardOpen(viewport: Pick<VisualViewport, "height" | "scale"> | null | undefined, windowHeight: number) {
  if (!viewport) return false;
  return windowHeight - viewport.height * viewport.scale > KEYBOARD_MIN_HEIGHT;
}

// Mobile keyboards can resize the visual viewport without resizing the layout viewport.
export function useViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    const root = document.documentElement;
    const update = () => {
      const height = viewport?.height ?? window.innerHeight;
      if (height > 0)
        root.style.setProperty("--viewport-height", height + "px");
      root.style.setProperty(
        "--viewport-top",
        (viewport?.offsetTop ?? 0) + "px",
      );
      // Sheet esconde o rodapé enquanto o teclado está aberto.
      if (isKeyboardOpen(viewport, window.innerHeight)) root.dataset.keyboard = "open";
      else delete root.dataset.keyboard;
    };
    update();
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      root.style.removeProperty("--viewport-height");
      root.style.removeProperty("--viewport-top");
      delete root.dataset.keyboard;
    };
  }, []);
}
