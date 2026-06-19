export const FadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] as const } },
};

export const SlideUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const } },
};

export const ScaleIn = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] as const } },
};

export const stagger = (delay = 0.04) => ({
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * delay, duration: 0.25 },
  }),
});

// legacy aliases (keep initial/animate keys for backward compat)
export const fadeIn = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] as const } },
};
export const slideUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const } },
};
export const slideDown = slideUp;
export const slideLeft = slideUp;
export const slideRight = slideUp;
export const scaleIn = {
  initial: { opacity: 0, scale: 0.97 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] as const } },
};
export const listStagger = {
  initial: {},
  animate: { transition: { staggerChildren: 0.04 } },
};
