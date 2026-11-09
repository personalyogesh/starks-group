# Starks public website content

The public V2 site loads content from **local typed files** and **`public/` assets** — no Firebase, CMS, paid APIs, or mirrored social media.

## Where to update what

| Content | File / folder |
| -------- | ------------- |
| Club name, tagline, contact, social links, My Cricket 360 note | `src/content/publicSite.ts` → `PUBLIC_SITE` |
| **Social highlights** (outbound links to Instagram / YouTube / Facebook posts or channels) | `src/content/publicSite.ts` → `BASE_SOCIAL_HIGHLIGHTS` and optional `PUBLIC_SITE.social.facebook` |
| **Support / sponsorship copy** | `src/content/publicSite.ts` → `SPONSORSHIP_SUPPORT` |
| **Verified club highlights** (no invented stats) | `src/content/publicSite.ts` → `VERIFIED_CLUB_HIGHLIGHTS` |
| Homepage announcements | `src/content/publicSite.ts` → `CLUB_ANNOUNCEMENTS` |
| Verified match results (scores / outcomes) | `src/content/publicSite.ts` → `VERIFIED_MATCH_RESULTS` |
| Mega Smash 2026 fixture list | `src/data/starksFixtures2026.ts` → `MEGA_SMASH_2026_OFFICIAL_SCHEDULE` |
| On-site photo gallery (subset) | `public/key-moments/{year}/` + optional captions in `src/lib/localKeyMoments.ts` |
| Featured sponsor (Hashtag India Cary) | `src/content/publicSite.ts` → `SPONSOR_HASHTAG_INDIA`, logo `public/partners/hashtag-india-optimized.png` |
| SEO defaults | `src/lib/publicSiteMetadata.ts` |
| Legacy member URLs | `next.config.js` → `redirects` |

## Social media strategy on this site

- **Primary media:** Instagram, Facebook (when URL is set), and YouTube carry ongoing photos, video and celebrations.
- **This website:** Curated **links only** in `SOCIAL_HIGHLIGHTS`—no embeds that pull media, no scraping, no sync jobs.
- To feature a **specific post**, add an entry to `BASE_SOCIAL_HIGHLIGHTS` with `isChannelLink: false` and the full verified URL.

## Player / private data

Registration, kit sizes, birthdays and photo consent belong in **My Cricket 360** only—not in these files.

## After editing

1. `npm run build`
2. `npm run dev` and check mobile width (320–430px)
3. Deploy on the existing Vercel Hobby project when approved
