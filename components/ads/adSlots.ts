export const ADSENSE_CLIENT_ID =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || 'ca-pub-6613952474052415';

export const adSlots = {
  top: process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOP,
  inline: process.env.NEXT_PUBLIC_ADSENSE_SLOT_INLINE,
  sideRail: process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDE_RAIL,
} as const;
