// Sheet — bottom sheet on mobile, centered panel on desktop, with spring
// motion and a scrim. The one place framer-motion's AnimatePresence lives
// for modals, so every dialog animates the same way.

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, type ReactNode } from 'react';
import { useIsMobile } from '../hooks';
import s from './ui.module.css';

/** Lock body scroll while any sheet is open. */
function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);
}

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  ariaLabel: string;
}

const spring = { type: 'spring', stiffness: 380, damping: 34 } as const;

export function Sheet({ open, onClose, children, ariaLabel }: SheetProps) {
  const mobile = useIsMobile();
  useScrollLock(open);
  // iOS WKWebView retargets the tap's synthesized click to the scrim that
  // renders under the finger mid-tap, closing the sheet as it opens — ignore
  // scrim clicks until the open is old enough to be a real second tap.
  const openedAt = useRef(0);
  useEffect(() => {
    if (open) openedAt.current = performance.now();
  }, [open]);
  const closeFromScrim = () => {
    if (performance.now() - openedAt.current > 400) onClose();
  };
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className={s.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={closeFromScrim}
          />
          {mobile ? (
            <motion.div
              key="m"
              className={s.sheetMobile}
              role="dialog"
              aria-modal="true"
              aria-label={ariaLabel}
              initial={{ y: '100%' }}
              animate={{ y: '0%' }}
              exit={{ y: '100%' }}
              transition={spring}
            >
              <div className={s.grabber} />
              {children}
            </motion.div>
          ) : (
            <motion.div
              key="d"
              className={s.sheetDesktop}
              role="dialog"
              aria-modal="true"
              aria-label={ariaLabel}
              initial={{ opacity: 0, scale: 0.96, y: 12, x: '-50%' }}
              animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, scale: 0.97, y: 8, x: '-50%' }}
              transition={spring}
            >
              <button className={s.sheetClose} onClick={onClose} aria-label="Close">
                ✕
              </button>
              {children}
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
