import { ReactNode, useEffect, useRef } from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function nextFocusIndex(current: number, count: number, backwards: boolean): number {
  if (count <= 0) return -1;
  if (current < 0) return backwards ? count - 1 : 0;
  return (current + (backwards ? -1 : 1) + count) % count;
}

type Props = {
  children: ReactNode;
  labelledBy: string;
  className?: string;
  onDismiss?: () => void;
};

export function AccessibleModal({ children, labelledBy, className = "", onDismiss }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const siblings = Array.from(overlay.parentElement?.children ?? []).filter(
      (element): element is HTMLElement => element instanceof HTMLElement && element !== overlay,
    );
    const changedSiblings = siblings.filter((element) => !element.inert);
    changedSiblings.forEach((element) => { element.inert = true; });

    const focusable = () => Array.from(overlay.querySelectorAll<HTMLElement>(FOCUSABLE));
    const initial = overlay.querySelector<HTMLElement>("[autofocus]") ?? focusable()[0] ?? overlay;
    initial.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && onDismissRef.current) {
        event.preventDefault();
        onDismissRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const targets = focusable();
      if (targets.length === 0) {
        event.preventDefault();
        overlay.focus();
        return;
      }
      const current = targets.indexOf(document.activeElement as HTMLElement);
      const next = nextFocusIndex(current, targets.length, event.shiftKey);
      if (current < 0 || (event.shiftKey && current === 0) || (!event.shiftKey && current === targets.length - 1)) {
        event.preventDefault();
        targets[next].focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      changedSiblings.forEach((element) => { element.inert = false; });
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, []);

  return (
    <div
      ref={overlayRef}
      className={`modalback ${className}`.trim()}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      tabIndex={-1}
    >
      {children}
    </div>
  );
}
