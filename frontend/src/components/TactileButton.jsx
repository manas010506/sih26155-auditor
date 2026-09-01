import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TactileButton = ({ children, onClick, className = '', style = {}, disabled = false, ...props }) => {
  const [isTapped, setIsTapped] = React.useState(false);

  const handleTap = (e) => {
    if (disabled) return;
    setIsTapped(true);
    setTimeout(() => setIsTapped(false), 400); // Reset animation ring
    if (onClick) onClick(e);
  };

  return (
    <motion.button
      whileTap={!disabled ? { scale: 0.97 } : {}}
      onClick={handleTap}
      disabled={disabled}
      className={`bracket-btn ${className}`}
      style={{ position: 'relative', overflow: 'visible', ...style }}
      {...props}
    >
      {children}
      <AnimatePresence>
        {isTapped && (
          <motion.div
            initial={{ opacity: 1, scale: 1 }}
            animate={{ opacity: 0, scale: 1.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{
              position: 'absolute',
              inset: '-2px',
              border: '1px solid var(--trace)',
              borderRadius: '2px',
              pointerEvents: 'none',
              zIndex: 10
            }}
          />
        )}
      </AnimatePresence>
    </motion.button>
  );
};

export default TactileButton;
