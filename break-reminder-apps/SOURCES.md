# Sources for the comparison page

Where each fact on [`break-reminder-apps/index.html`](index.html) comes from. The file sits beside the page and isn't
deployed (only `public/` and the built pages reach `dist/`). The `Review the comparison page` workflow opens an
issue at the start of each quarter that points here.

Last checked: 27 November 2026, every row.

## How to review

1. Open each source below and compare it with the page's table row and its paragraph.
2. Fix what changed in both places, in plain words, and update the facts and sources here.
3. Set "Last checked" on the page and here to the day you finished, only once every row is checked.
4. Run `vp check && vp build`.

## mybackhurts

The app's own facts come from its store listings and from this site's home page copy (`src/i18n/en.json`; `app-sync.ts`
checks its moves and default interval against the app).

| Fact on the page                                                                                | Source                                                                                                       |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Mac, iPhone, iPad and Windows 11; menu bar app on the Mac, tray app on Windows                  | https://apps.apple.com/app/id6817265333, https://apps.microsoft.com/detail/9NT3SV8SQ3KD, `en.json` (`lede`)  |
| Android soon: the Google Play listing isn't live yet                                            | `en.json` (the platform line, "Android soon"); write "Android" here and on the page once Google Play is live |
| Free; Supporter is a one-time unlock ($0.99; the page used to give the euro price, €0.99)       | the US App Store listing above (In-App Purchases); one-time: [terms](../terms/index.html)                    |
| Every 45 minutes by default, within your active hours and days                                  | `app-data/app.json` (`defaultIntervalMinutes`), `en.json` (`meta.description`)                               |
| Two exercises per break by default, with steps, a figure and a timer; +1 per rep or Webcam mode | `en.json` (`meta.description`, the modes section), `app-data/app.json` (`catalog`)                           |
| Frames analyzed on the device, never stored or sent; no account, no network requests of its own | `en.json` (`stampTitle`, `meta.ogDescription`), [privacy](../privacy/index.html)                             |
| On Mac and Windows, waits while the camera or microphone is in use or an app is full screen     | `en.json` (`callAnswer`)                                                                                     |
| Five minutes away from the keyboard counts as a break                                           | `en.json` (`panel4Body`)                                                                                     |
| Streak, last 7 days, stickers, CSV export                                                       | `en.json` (the stats section, `item3`)                                                                       |
| 17 languages                                                                                    | `src/i18n/` (one file per language)                                                                          |

## Stretchly

| Fact on the page                                                                                               | Source                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Mac, Windows, Linux; free, open source, BSD-2-Clause                                                           | https://hovancik.net/stretchly/, https://github.com/hovancik/stretchly                                                                        |
| Installs from GitHub, Homebrew, winget, the Microsoft Store, Flathub and others                                | https://hovancik.net/stretchly/downloads/, https://apps.microsoft.com/detail/9pp2b76lqqbn, https://flathub.org/en/apps/net.hovancik.Stretchly |
| 20-second mini break every 10 minutes, 5-minute long break every 30 minutes, each with an idea; your own ideas | https://github.com/hovancik/stretchly (README)                                                                                                |
| Time away counts as a natural break; pauses in Do Not Disturb; strict mode                                     | https://github.com/hovancik/stretchly (README)                                                                                                |
| Extra preferences for sponsors and contributors                                                                | https://hovancik.net/stretchly/sponsor/                                                                                                       |

## Time Out

| Fact on the page                                                                                                                                                                              | Source                                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Mac only, from Dejal; version 4.1 needs macOS 26                                                                                                                                              | https://www.dejal.com/timeout/, https://apps.apple.com/us/app/time-out-break-reminders/id402592703?mt=12       |
| Normal and micro breaks dim the screen to a theme (image, video, web page)                                                                                                                    | https://www.dejal.com/timeout/                                                                                 |
| Free: two breaks, built-in themes, one action per break, rules for apps and Focus                                                                                                             | https://www.dejal.com/timeout/features/ (the Free column)                                                      |
| Premium: more breaks, fixed-time and calendar breaks, other or own themes, script rules for calls (FaceTime, Teams, Zoom and others), full-screen and calendar rules, Activity and Statistics | https://www.dejal.com/timeout/features/ (the Premium column), https://www.dejal.com/timeout/ (meeting scripts) |
| Supporter $4.99 / 3 months, $9.99 / 6, $19.99 / 12; doesn't renew; unlocks for good what's out at purchase plus what's added during the period                                                | https://www.dejal.com/timeout/, https://www.dejal.com/store/                                                   |
| Lifetime $79.99, current and future premium features (was $59.99 when first checked)                                                                                                          | https://www.dejal.com/timeout/, https://www.dejal.com/store/                                                   |
| App Store edition offers Premium subscriptions; in Setapp                                                                                                                                     | https://apps.apple.com/us/app/time-out-break-reminders/id402592703?mt=12, https://www.dejal.com/timeout/       |

## LookAway

| Fact on the page                                                                                  | Source                                                                                             |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Mac, macOS 13 or later; Windows coming soon                                                       | https://lookaway.com/, https://lookaway.com/changelog/                                             |
| $19 for one Mac with a year of updates, $29 for two, $99 for five with lifetime updates, one-time | https://lookaway.com/pricing                                                                       |
| On the App Store at different prices, and in Setapp                                               | https://apps.apple.com/us/app/lookaway-digital-wellness/id6747192301, https://lookaway.com/pricing |
| Pauses for meetings and calls, screen recording, video, focus apps and full-screen games          | https://lookaway.com/, https://lookaway.com/docs                                                   |
| Blink and posture nudges, planned breaks such as lunch, AppleScript and Shortcuts                 | https://lookaway.com/docs, https://lookaway.com/docs/planned-breaks                                |
| LookAway Mirror, free on iPhone and iPad                                                          | https://apps.apple.com/us/app/id6748218279                                                         |

## Workrave

| Fact on the page                                                                                      | Source                                                                          |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Free software (GPL), around since 2001                                                                | https://workrave.org/about/, https://github.com/rcaelers/workrave               |
| Version 1.11.4, September 2026                                                                        | https://workrave.org/download/, https://github.com/rcaelers/workrave (releases) |
| Windows and Linux; the Mac port is in development with no download                                    | https://workrave.org/download/                                                  |
| Micro-breaks (about 30 seconds every 3 minutes), rest breaks (about 10 minutes every 45), daily limit | https://workrave.org/, https://workrave.org/about/                              |
| Stats: breaks taken, postponed and ignored, computer time; calls not mentioned                        | https://workrave.org/about/                                                     |

## BreakTimer

| Fact on the page                                                          | Source                                                                               |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Mac, Windows, Linux; free, open source, GPL-3.0                           | https://breaktimer.app/, https://github.com/tom-james-watson/breaktimer-app          |
| How often and how long, working hours, colors and message                 | https://breaktimer.app/, https://github.com/tom-james-watson/breaktimer-app (README) |
| A notification before each break, to skip or snooze                       | https://breaktimer.app/                                                              |
| The Windows installer isn't signed, so Windows warns; calls not mentioned | https://github.com/tom-james-watson/breaktimer-app (README)                          |
