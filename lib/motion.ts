import type { Transition } from 'framer-motion';

// Short ease-out: UI motion should confirm an action, never make the user wait for it.
export const FAST: Transition = { duration: 0.16, ease: [0.23, 1, 0.32, 1] };
