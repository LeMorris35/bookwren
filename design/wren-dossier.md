# BookWren — Design Research Dossier: The Wren (and the Raven)

*Compiled 2026-08-02 for the BookWren design session. Bird facts verified against Cornell Lab (All About Birds), Audubon, RSPB/BTO and university extension sources. Folklore and literary claims sourced individually; anything shaky is flagged as such.*

---

## 1. The bird itself

### What a wren is

Wrens are the family **Troglodytidae** — small, brown, stub-winged, insect-eating songbirds (roughly 88–96 species). The key geographic fact for branding: **every wren species is a New World bird except one.** The single Old World species is the Eurasian Wren — the bird that "wren" originally meant in English, and the bird all the folklore is about.

The family name is a gift for a reading app: *Troglodytes* means **"cave dweller"** — a reference to the wren's habit of creeping into sheltered, hidden, enclosed spaces. A bird that lives in nooks.

### The three species that matter

**Carolina Wren** (*Thryothorus ludovicianus*) — **the hero bird for a US audience.**
- ~12–14 cm long, ~29 cm wingspan, 18–22 g. Chunky, round-bodied, long tail habitually **cocked upward** — the iconic silhouette.
- Warm reddish-brown above, warm buffy-orange below, **bold white eyebrow stripe**, white chin/throat, dark slightly downcurved bill.
- Non-migratory. Pairs form at any time of year, **stay bonded for life**, hold the same territory together year-round, forage side by side. (Reading-partner / book-club brand hook.)
- State bird of South Carolina.

**Northern House Wren** (*Troglodytes aedon*) — **the "lives at your house" bird.**
- ~11–13 cm, ~10–12 g. Grey-brown, fine dark barring on wings/flanks/tail, faint eyebrow.
- Named for nesting around human homes; nest sites include boxes, drainpipes, **old shoes, tin cans, mailboxes, flowerpots**.
- Brand-safety honesty: House Wrens are ruthlessly territorial (they puncture other birds' eggs). Charming on the surface, ferocious underneath — keep out of marketing copy.

**Eurasian Wren** (*Troglodytes troglodytes*) — **the folklore bird.**
- ~9–10 cm, **8–10 g** — about the weight of a £1 coin. One of Europe's smallest birds.
- Rich rufous-brown, heavily barred, very short cocked tail. Reads almost as a *sphere with a tail*.
- Reported as the UK's most numerous breeding bird (~11 million territories).
- Appeared on the British **farthing** — the smallest bird on the smallest-value coin ("small things have worth").

Also worth knowing: Bewick's Wren (west), Winter/Pacific Wrens (tiny dark forest birds), and the **Cactus Wren** (largest US wren, Arizona state bird) for a desert seasonal theme someday.

### Shape, in design terms

The wren silhouette is essentially **two shapes**: a plump teardrop body and a short tail snapped up at ~45–70°. Add a thin decurved bill and it's readable at 16×16 favicon size. **This is the logo.**

---

## 2. Colors — the palette

| Feature | Description | Hex | Use |
|---|---|---|---|
| Back, crown (Carolina) | bright reddish-brown / rufous | `#9C5A33` **Wren Russet** | Primary brand, headers, logo |
| Sunlit mantle | cinnamon, copper | `#B0703C` **Cinnamon** | Hover states, secondary fills |
| Underparts | warm buffy-orange | `#D9A566` **Buff** | Accents, progress bars (fills only, never text) |
| Belly wash | pale warm buff | `#E8C89A` **Pale Buff** | Card tints, hover backgrounds |
| Chin, throat, eyebrow | white to cream | `#F6EFE0` **Cream** | Page background (light mode) |
| Paper highlight | warm white | `#FDFAF3` **Shell** | Card surfaces, modals |
| Wing & tail barring | dark chocolate bars | `#5C3A21` **Barred Brown** | Body text, dividers, texture |
| Eyeline, bill, eye | near-black warm brown | `#2E2119` **Ink Brown** | Headings, high-contrast text |
| House Wren grey-brown | muted taupe | `#8B7B6A` **Twig** | Muted/disabled text |

**Egg palette** — eggs are creamy white, densely speckled reddish-brown (clutch typically 4–5):
egg shell `#F4EFE3` · speckle light `#C98A63` · speckle dark `#A75B3A`.
**The speckle is the bullet point, unread dot, progress pip, rating unit.** Five speckled eggs in a nest = a five-star rating without a single star.

**Habitat/background palette** (illustration + empty states only, NOT interface chrome):
moss `#7A8B5A` · hedgerow deep `#45543A` · lichen `#C7CBB0` · bark `#6B5847` · honeyed light `#F2E3C4` · bramble berry `#8E3B46` (the one saturated accent).

**Palette logic:** cream page → shell cards → russet as the single dominant brand color → buff for warmth → ink brown type. Keeping the greens out of the UI chrome is what stops it tipping into "garden center." Verify `#9C5A33` on `#F6EFE0` contrast at body sizes before shipping.

---

## 3. Habitat & world

**Geography:** the family runs Canada → Tierra del Fuego (greatest diversity in Central/South America). Carolina Wren: US Southeast/East. House Wren: coast to coast. Eurasian Wren: Europe/North Africa/temperate Asia — hedgerows, stone walls, cottage gardens.

**Textures — the visual world** (Cornell's Carolina habitat list is a mood board: *brushy thickets, bottomland woods, ravines choked with rhododendron, overgrown farmland, dilapidated buildings, brushy suburban yards, backyard brush piles, areas choked with vines*):

- Weathered wood: fence posts, a leaning garden gate, the underside of an eave
- **Brush pile** — crossed twigs, accidental architecture; the perfect TBR-stack metaphor
- Moss and lichen on a fallen log; damp bark; a stone wall with mortar gaps
- Terracotta pot on its side, a watering can, a hung-up boot (House Wren real estate)
- **The nest:** the Eurasian male builds 6–12 **domed** nests of moss/grass/lichen with a **side entrance**; the female picks one and lines it with feathers. A domed side-entrance nest beats a generic folder icon every time.

**Foliage vocabulary:** hedgerow (hawthorn, blackthorn, ivy), bramble arcs, rosehips, dog rose, cow parsley, fern fiddleheads, honeysuckle over a doorway; hellebore + snowdrop for winter; holly + ivy for December.

**Light:** low, warm, sidelit — late afternoon through a hedge, dappled shade, hot cream highlights. Lean on **warm shadow**, never flat overhead light. A lit kitchen window seen from the garden at dusk.

**Register:** cottagecore-adjacent but grounded in a real bird. Slightly wild — unswept path, self-seeded plants, moss in the stone joint. Manicured = wrong. Tangled = right.

---

## 4. Song & personality

- Carolina Wren signature: rolling **"teakettle-teakettle-teakettle"**, under 2 seconds, male repertoire of dozens of variations; females answer in chatter — pairs duet.
- **Sings all year round, all day** — loudest late winter/early spring. No silent season (streak feature copy writes itself).
- Per unit body weight, **Winter Wrens produce ~10× the sound power of a crowing rooster** (Cornell — use this, NOT the unsourced "90 decibels" claim).
- Pacific Wren: up to **36 notes/second**. Eurasian Wren: ~100 notes in a 5-second song ending in a machine-gun rattle.

**Traits a brand can borrow:** surprisingly loud · cheerful year-round · industrious (male builds 6–12 nests) · homey (nests at houses) · curious/restless · loyal (life bonds, forage together) · nook-dweller (*Troglodytes*).

---

## 5. Folklore & symbolism

### King of Birds
The founding fable: contest — whoever flies highest is king. The eagle outclimbs everyone, but the wren has hidden in its back feathers and springs out at the top to flutter a few feet higher. **Wit beats strength; the smallest bird takes the crown.** Recorded across Northern Europe, in 13th-century Jewish writing, India, central Africa, some North American peoples; Aristophanes calls the wren king of birds in 414 BCE. For a reading app: *the quiet one who reads carries further than the loud one who doesn't.*

### Wren Day — 26 December
**Lá an Dreoilín** (Ireland, Isle of Man): St Stephen's Day procession — the **Wren Boys** in straw masks carry a pole dressed with **holly, ivy and ribbons**, go door to door with music. Survives strongest in Dingle, Co. Kerry; entirely symbolic today (fake bird). ⚠ The origin is a ritual bird-hunt — if we ever build a "Wren Day" December challenge, lead with holly/ivy/ribbons/music/crowning, acknowledge the origin plainly, never sanitize silently.

### Druid bird, goddesses, luck
- Irish *dreoilín* is traditionally said to derive from *draoi éan*, "druid bird" (⚠ folk etymology — attribute as tradition, not fact). Druids read omens in wren song and flight.
- The goddess **Clíodhna** escapes by transforming into a wren.
- The wren is the **old year** (paired with the robin as the new) — same seasonal machinery as Holly King/Oak King.
- Harming a wren outside the ritual day = lifelong misfortune. Sailors carried a **wren's feather** as a charm against shipwreck.

**Usable symbol stack:** cleverness · humility that wins by wit · smallness with outsized worth · the crowned commoner · hearth and home · the turning of the year · a bird kept near for luck.

---

## 6. Wrens in books & fantasy (sister was right)

**Verified Wren-led fantasy:**
- **Sherwood Smith — the *Wren* quartet** (1990s; Mythopoeic finalist): THE foundational "girl named Wren" fantasy.
- **Holly Black — *The Stolen Heir* / *The Prisoner's Throne*** (2023–24): heroine **Suren, called Wren**, changeling queen — *Folk of the Air* world, one of the biggest BookTok fandoms alive. **The most commercially significant Wren in current fantasy.**
- **Mary Watson — *The Wren Hunt*** (2018): Irish YA fantasy built directly on Wren Day; heroine Wren is an augur chased each St Stephen's Day.
- **K.A. Linde — *The Wren in the Holly Library*** (2024, adult romantasy, Oak & Holly Cycle): thief hired by the Holly King; Celtic myth throughout. Note: a bird-plus-library title doing exactly BookWren's job.

**Classics:** Shakespeare (*Macbeth*: "the poor wren… will fight… against the owl"), Blake ("He who shall hurt the little wren / Shall never be beloved by men"), Dickens's **Jenny Wren** (*Our Mutual Friend*), and **Emily Dickinson describing herself: "I am small, like the wren."** ← perfect epigraph.

**Corrections:** Lucy Gray (Hunger Games) is mockingjay-coded, not a wren. *House of Salt and Sorrows* is **Poe-coded** (Lenore, Ligeia…) — file it under **Raven mode** references instead.

**Conclusion:** to this audience "Wren" reads as *bookish* before it reads as *bird* — exactly the right order.

---

## 7. The raven (dark mode)

Common Raven (*Corvus corax*): largest songbird on earth (54–67 cm, 115–150 cm wingspan), wedge-shaped tail, shaggy throat hackles. Entirely black with **iridescent purple/blue/green sheen** — black that isn't flat.

| Role | Hex |
|---|---|
| Raven Black (page bg) | `#101119` — blue-black, never pure #000 |
| Deep Ink (cards) | `#181A24` |
| Feather Blue sheen (primary accent) | `#3E4380` |
| Violet sheen (hover/gradients) | `#5A4C7A` |
| Green-teal sheen (rare highlight) | `#26514A` |
| Moonlight (text) | `#E4E1D8` — warm off-white |
| Old Parchment (secondary text) | `#C6C1B4` |
| Candle Brass (the one warm accent) | `#C9A227` |
| Oxblood (leather/destructive) | `#5A2233` |

**Symbolism:** Odin's **Huginn and Muninn** (Thought & Memory — knowledge gatherers), **Poe's "The Raven"** (the gothic-reader touchstone), the **Three-Eyed Raven** (living memory). Collective noun: an **unkindness** / a **conspiracy** of ravens ("a conspiracy of readers" for group features). Real ravens solve problems, use tools, know faces — the mystique is earned.

### Wren mode / Raven mode

| | **Wren (light)** | **Raven (dark)** |
|---|---|---|
| Place | Cottage kitchen, garden window seat | Moonlit library |
| Time | 4pm sun through a hedge | "Once upon a midnight dreary" |
| Light | Honey and cream sidelight | Candle, moon, brass lamp |
| Season | Spring/summer, year opening | Deep winter, year closing |
| Materials | Linen, terracotta, moss, pine | Leather, gilt, ink, cold stone |
| Suits | Cozy fantasy, romance, comfort reads | Gothic, dark academia, horror |
| One word | **Welcome** | **Mystery** |
| Micro-copy | "Your nook is ready." | "The library is open. It usually is." |

**Mechanic:** make the theme toggle a *sunset* — the wren's world dims, sheen comes up on black, russet accent shifts to feather-blue. Optionally auto-switch at local dusk: *the wren sings all day, the raven keeps the night watch.*
**Guardrail:** Raven mode is the same product in different light — same layout, same icons, same silhouette. Swapping the logo bird in dark mode is an easter egg at most.

---

## 8. Design cues summary

**Palette** — Light: cream `#F6EFE0` / shell `#FDFAF3` / russet `#9C5A33` / buff `#D9A566` / ink `#2E2119` / twig `#8B7B6A`. Dark: `#101119` / `#181A24` / feather-blue `#3E4380` / brass `#C9A227` / moonlight `#E4E1D8`. Naturals (moss/lichen/bark/bramble) for illustration only. Never pure black, never pure white, never a cool grey.

**Motifs**
- **Cocked-tail silhouette** — logo, spinner, favicon, empty states. One shape, never redrawn.
- **Speckled egg** — bullets, unread dots, progress pips, rating units (clutch of 5).
- **Domed side-entrance nest** — shelves/collections/archive icon.
- **Brush pile** — the TBR stack; more books, taller tangle.
- **Feather barring** — fine dark bars as dividers and low-opacity pattern paper.
- **Hedgerow band** — hand-drawn foliage footer; holly-and-ivy variant in December.
- Raven swaps: barring → sheen gradients · nest → keyhole alcove · hedgerow → bare branches · speckles → stars.

**Type:** warm old-style serif for headings (bookish, letterpress-ish) + humanist sans for UI. Generous line height. Nothing geometric or condensed — the type IS the product.

**Illustration:** naturalist field-guide style — fine ink linework, flat washes, paper grain. 1950s bird guide, not flat vector. Keep the bird accurate (the audience will notice a missing eyebrow stripe).

**Tone words:** cozy · small-and-mighty · industrious · cheerful · homey · clever · loyal · nook · hearth · year-round. (Raven: mysterious · watchful · knowing · gilt-edged · patient.)

**Copy hooks**
- "The smallest bird on the smallest coin."
- "King of Birds — by riding along and rising at the right moment."
- "Sings every month of the year." (streaks)
- "Ten times a rooster, pound for pound."
- "Small, like the wren." — Emily Dickinson
- "*Troglodytes* — the one who lives in the nook."

**Avoid:** (1) over-sweetening — the real wren is fierce and loud; keep the russet saturated and the ink dark. (2) Building Wren Day features without acknowledging the custom's origin.

---

*Full source list (Cornell, Audubon, RSPB/BTO, folklore and book links) is in the session log; key facts above are from All About Birds, Audubon field guides, BTO BirdFacts, and the cited book pages.*
