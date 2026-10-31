# User acceptance testing

Run against the exact release candidate at its HTTPS staging origin. Record tester, date, browser/OS, commit SHA, result, and evidence for every case. These cases are not marked passed by automation.

| ID | Scenario | Acceptance criteria |
|---|---|---|
| U01 | First visit, no camera consent | Home loads; no camera permission prompt; camera light stays off; sign list and privacy explanation readable |
| U02 | Learn → Explore → search → Practice | Correct target selected; no unsupported signs promised; empty search state provides recovery |
| U03 | Allow camera | Front camera preview is mirrored and landmarks align across landscape/portrait; feedback remains readable |
| U04 | Deny/revoke permission | Clear recovery instructions; no repeated permission loop; learning remains usable |
| U05 | Missing camera / insecure origin | Actionable error, no crash; HTTPS requirement documented |
| U06 | Change view or hide/close app | Leaving Practice releases all camera tracks; light turns off; returning requires explicit activation |
| U07 | Slow model / offline / GPU unavailable | Loading state, error state or CPU fallback; no fabricated recognition; progress retained |
| U08 | Diverse signers | Fluent ASL reviewers evaluate accuracy across dominant hands, skin tones, hand sizes, mobility, lighting, backgrounds, devices; document dataset, per-sign confusion/abstention, latency and agreed release thresholds |
| U09 | Dynamic/two-handed vocabulary | Full instructor demonstration reviewed; classifier limitation visible; no static pose claimed as complete ASL correctness |
| U10 | Progress persistence | Match saved; reload retains; second independent browser session cannot read it; reset clears locally and on server |
| U11 | API outage and retry | Offline status; local practice retained; retry sync does not resurrect an intentional reset |
| U12 | Privacy controls | Export contains only sign IDs; deletion removes session and progress; no images, video, landmarks, speech or PII in network requests/logs |
| U13 | Partner activity | Signer chooses secretly; guesser chooses; reveal and role switch work; no automatic fluency score |
| U14 | Keyboard and screen reader | All actions reachable, labels announced, focus visible, Settings traps focus and Escape restores it; feedback not announced every video frame |
| U15 | Mobile/reduced motion | Test iOS Safari + Android Chrome and desktop Firefox/Chrome/Edge; 320px viewport and 200% zoom usable; reduced motion respected |
| U16 | Content review | Every published lesson has licensed demonstration, captions, cue text, reviewer name/date; instructor confirms ASL meaning, movement, location, orientation and nonmanual features |
| U17 | Deployment/restore | HTTPS, security headers, API health, durable progress across restart, backup restoration and rollback verified |

Do not submit invented reviewer names or replace user acceptance with automated tests. Record evidence in your release ticket and reference it from `release-signoff.json`.
