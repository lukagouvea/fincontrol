import { useEffect } from "react";

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
    };
  }, []);
}
