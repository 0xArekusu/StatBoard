export const BREAKPOINTS = {
  /** Max width (dp) to consider a mobile in landscape (vs tablet) */
  mobileLandscapeMaxWidth: 900,
  /** Max width (dp) in portrait to consider a device a phone vs tablet */
  phoneMaxWidth: 600,
  /** Max height (dp) to consider a small portrait screen */
  smallPortraitMaxHeight: 700,
  /** Max width (dp) to consider a narrow portrait screen (e.g. iPhone SE) */
  narrowPortraitMaxWidth: 390,
} as const;
