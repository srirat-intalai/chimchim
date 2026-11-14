---
target: public-profile.html
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/Users/yok/Downloads/chimchim-web/public-profile.html"
target_fingerprint: "sha256:8e86fe194aa28b24720da53f5b4b3002458cd413287bc7384dbaf3cb38a32f20"
target_path: /Users/yok/Downloads/chimchim-web/public-profile.html
timestamp: 2026-11-02T08-00-12Z
slug: public-profile-html
---
Method: dual-agent (A: design review · B: detector + browser)

## Design Health Score — 26/40 (Acceptable)
| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | spinner/“–” ok; private “–” unexplained |
| 2 | Match System / Real World | 3 | mixed terms: บันทึก / มื้อ / บันทึกมื้ออาหาร |
| 3 | User Control and Freedom | 3 | follow sheet has no focus trap |
| 4 | Consistency and Standards | 2 | topnav 520 vs content 680; nav hard-highlights ติดตาม; stat cells look identical but only 2 clickable |
| 5 | Error Prevention | 3 | low-risk actions |
| 6 | Recognition Rather Than Recall | 3 | labelled tabs/stats |
| 7 | Flexibility and Efficiency | 2 | 12 latest only, no deep-link to tab |
| 8 | Aesthetic and Minimalist Design | 3 | bio duplicated; empty 4:3 box for no-photo cards |
| 9 | Error Recovery | 2 | diaryFailed has no retry; private state dead-ends |
| 10 | Help and Documentation | 2 | Lv/“ร้าน” meaning only in title tooltip |

## Design Specificity
LLM: category-interchangeable profile (Fastwork/IG pattern); ChimChim only via palette, Lv pill, food photos; Food DNA buried in tab 3; no Dino; letter avatar bland.
Detector: CLI 10 findings, all from shared stylesheets or hidden #ppContent (false positives for this page); in-page detect.js clean at 390/1280, light/dark, About tab. Only small target: #ppDiaryAll 95×36.

## Priority Issues
- [P1] Food identity buried in About tab → move DNA chips + taste-match % into header; drop duplicate bio. (/impeccable layout)
- [P1] No-photo diary card = 280px empty cream box → text-first card variant; tighter image ratio on mobile. (/impeccable layout)
- [P2] Dead-end states: private/failed have no next step or retry; shops tab repeats “private”. (/impeccable harden + clarify)
- [P2] Follow sheet a11y: dialog name reads “0”, tabs lack aria-controls/tabpanel, no focus trap. (/impeccable harden)
- [P2] Wide-screen alignment: topnav 520 vs .ppu 680; bio column 46ch wraps early. (/impeccable layout)

## Persona Red Flags
Casey: 520px header before food; bottom nav covers first card meta; empty no-photo card; non-clickable stat cells look tappable.
Sam: sheet dialog announced “0”; no focus trap; Lv/XP explanation only in title.
Jordan: doesn’t know how Lv is earned or “ร้าน” vs “ร้านโปรด”; private message doesn’t say whether following helps; logged-out follow → generic toast.

## Minor
theme-color #6842b5 off-brand; “ประทับใจ” wraps alone on wide cards; “ดูไดอารี่ทั้งหมด” small/36px; skeleton uses old layout (shift); login button in popup not full width (shared .w-100 missing outside home/following).

## Questions
- Should the header answer “can I eat like this person?” (taste match, cuisines) instead of follower counts?
- Should Dino carry the fallback avatar and empty states?
- Should ร้านโปรด offer “try one of Beam’s spots” (random pick) instead of a ranked list?
