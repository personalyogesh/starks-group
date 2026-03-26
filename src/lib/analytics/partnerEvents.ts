"use client";

import { sendGAEvent } from "@next/third-parties/google";

export type PartnerClickSection = "homepage_our_partners" | "partners_page";

/**
 * GA4 custom event for partner-related engagement.
 * In GA4: Reports → Engagement → Events (or Explore) — look for `partner_click`.
 * Params: partner_section, link_type, optional partner_name, link_url.
 */
export function trackPartnerClick(args: {
  section: PartnerClickSection;
  linkType: string;
  partnerName?: string;
  destination?: string;
}): void {
  sendGAEvent("event", "partner_click", {
    partner_section: args.section,
    link_type: args.linkType,
    ...(args.partnerName ? { partner_name: args.partnerName } : {}),
    ...(args.destination ? { link_url: args.destination } : {}),
  });
}
