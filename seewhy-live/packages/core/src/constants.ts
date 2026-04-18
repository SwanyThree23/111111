export const CREATOR_SHARE = 0.90;
export const PLATFORM_FEE = 0.10;
export const MAX_GUESTS = 20;
export const PREVIEW_SECS = 120;

export function calcSplitCents(grossCents: number): { creatorCents: number; feeCents: number } {
  const feeCents = Math.floor(grossCents * PLATFORM_FEE);
  const creatorCents = grossCents - feeCents;
  return { creatorCents, feeCents };
}
