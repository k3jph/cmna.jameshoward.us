/// <reference types="astro/client" />

export {};

declare global {
  interface Navigator {
    globalPrivacyControl?: boolean;
  }

  interface Window {
    cookieStart?: (
      gaId: string,
      cookieName: string,
      durationDays: number,
      policyVersion: string
    ) => void;
    cookieDisplay?: () => void;
    cookieStatus?: () => {
      decision: string | null;
      version: string | null;
      currentVersion: string;
      analyticsLoaded: boolean;
      globalPrivacyControl: boolean;
    };
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    [key: `ga-disable-${string}`]: unknown;
  }
}
