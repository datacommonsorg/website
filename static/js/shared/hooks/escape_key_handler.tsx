import { useEffect } from "react";

export default function useEscapeKeyInputHandler(handler: () => void): void {
  useEffect(() => {
    function listener(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        handler();
      }
    }

    document.addEventListener("keydown", listener);

    return (): void => {
      document.removeEventListener("keydown", listener);
    };
  }, [handler]);
}
