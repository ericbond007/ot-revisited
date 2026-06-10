# Audio strategy — license-safe music + SFX (VK #1277)

*2026-06-09. The game ships with ZERO audio today. Constraint: the game will be
SOLD — every audio asset must be commercially clean, no exceptions. Audio files
(OGG/WAV) are engine-agnostic, so everything here survives the Godot port
(Godot: `AudioStreamPlayer`, OGG Vorbis preferred).*

## 1. The licensing rules of thumb

| Source type | Verdict |
|---|---|
| CC0 / public domain | ✅ Safe for anything, no credit needed |
| Royalty-free with explicit commercial grant (e.g. Sonniss) | ✅ Safe — archive the license text with the asset |
| CC-BY | ✅ Usable — requires a credits screen entry (we'll have one anyway) |
| CC-NC, CC-ND, CC-SA | ❌ Banned for this project |
| AI-generated audio | ⚠️ Check the **weights** license, not the code license (see trap below) |
| Public-domain *composition* | ⚠️ The composition is free; any existing *recording* of it is NOT — render it ourselves |

**The AI trap:** Meta's MusicGen/AudioGen code is MIT but the **weights are
CC-BY-NC** — output in a sold game violates the license, self-hosted or not.
Banned here. The safe lane (verified 2026-06):

| Model | License | Commercial output | Notes |
|---|---|---|---|
| **ACE-Step 1.5** (Jan 2026) | MIT (code + weights) | ✅ explicit grant on generated music | Production recommendation |
| **ACE-Step v1 3.5B** | Apache 2.0 | ✅ | ComfyUI-native support; used for the spike |
| Stable Audio Open | Stability Community License | ✅ under $1M revenue | Designed for SFX/samples ≤47s |
| HeartMuLa | Apache 2.0 (Jan 2026) | ✅ | Song-oriented |
| Meta MusicGen / AudioGen | CC-BY-NC weights | ❌ BANNED | The trap |

## 2. Music — recommended approach (layered)

1. **Public-domain period folk, rendered by us.** The actual songs emigrants
   sang on the trail are all PD compositions: *Oh! Susanna* (1848), *Buffalo
   Gals* (1844), *Old Dan Tucker* (1843), *Camptown Races* (1850), *Wait for
   the Wagon* (~1851), *Sweet Betsy from Pike*. Render from sheet music via
   MIDI + FluidSynth + a period soundfont (banjo/fiddle/harmonica/dulcimer),
   or hum the melody into an ACE-Step style prompt. Maximum thematic
   authenticity, zero licensing exposure, zero cost.
2. **Local AI generation (ACE-Step on flattop)** for original BGM — travel
   loops, camp/night ambience, menu theme, event stings. 8 GB RTX 3070 runs
   the 3.5B model under ComfyUI (same box that runs FLUX). Spike results in §5.
3. **CC0 libraries as gap-filler:** Kenney audio packs (CC0), OpenGameArt
   (filtered to CC0), Wikimedia Commons PD recordings (verify per-file).
4. **Commission later** only if the quality bar isn't met (Fiverr/itch
   composers, ~$50–300/track — the only money in this plan).

## 3. SFX — recommended approach

1. **Sonniss GDC bundles** — ~200 GB of professional sound libraries across
   nine years, royalty-free for commercial games, no attribution. The single
   highest-value free SFX source; download once, curate into the repo.
2. **freesound.org filtered to CC0 strictly** (CC-BY acceptable with the
   credits screen; never NC). Organic period foley lives here: wagon creaks,
   canvas flap, river fords, oxen, campfire.
3. **Stable Audio Open** for anything we can't find (it's a sample/SFX model).
4. **Record our own foley** — wood creaks, footsteps, canvas; free and
   authentic.
5. jsfxr/bfxr-style retro synth is the wrong aesthetic for a period game;
   skip except possibly for abstract UI ticks.

## 4. Rough audio inventory (first pass)

- **Music:** menu/title theme · travel loop ×2–3 (plains / mountains / somber)
  · camp-night loop · town/trading-post loop · death/loss sting · arrival
  fanfare (Oregon City)
- **Ambience:** wind ×2 · rain + thunder · river · prairie day (insects/birds)
  · night (crickets/coyote) · town murmur
- **SFX:** UI tick/confirm/back · modal open/close · cash/purchase · wagon
  creak loop · oxen low · gunshot (hunt) · ford splash · arrival bell

## 5. Spike results (ACE-Step v1 via ComfyUI, flattop RTX 3070 8GB)

**The spike succeeded.** ComfyUI (already on flattop for FLUX) has native
ACE-Step support; the Apache-2.0 `ace_step_v1_3.5b.safetensors` checkpoint
(7.7 GB) generates a 75-second instrumental clip in **~37 seconds** at 50
steps on the 8 GB RTX 3070. Three candidates produced (fixed seeds, fully
reproducible):

| Candidate | Seed | Tags (abridged) |
|---|---|---|
| Menu/title theme | 18480101 | 1840s american folk, banjo, fiddle, harmonica, campfire |
| Travel loop | 18480415 | americana, walking rhythm, optimistic, open prairie |
| Death/loss sting | 18490120 | mournful solo fiddle, sparse lament, 19th c. |

Pipeline: `CheckpointLoaderSimple → EmptyAceStepLatentAudio →
TextEncodeAceStepAudio (lyrics="[instrumental]") → ModelSamplingSD3(shift 5)
→ KSampler(50, cfg 5, euler/simple) → VAEDecodeAudio → SaveAudioMP3`.
Candidates served for review at the nocache gallery (port 8771), per the
show-don't-inline rule. This ComfyUI build also ships ACE-Step **1.5** nodes
(`TextEncodeAceStepAudio1.5`) — the MIT-licensed 1.5 weights are the
production upgrade path when we industrialize.

**Conclusion: "can we create our own?" — YES.** Music generation is local,
fast, free, license-clean, and reproducible. Iteration cost is low enough to
generate dozens of candidates per slot and curate by ear. (Dave's listening
verdicts on these first three: pending.)

## 6. Operational rules from day one

- **`docs/audio/ATTRIBUTION.md` ledger**: every audio file that enters the
  repo gets a row — filename, source, license, URL/receipt, date. Cheap now,
  unreconstructable later.
- AI-generated assets get the model + version + prompt recorded in the ledger.
- OGG Vorbis at modest bitrates (music ~96–128 kbps, SFX 64–96 kbps) — audio
  must not repeat the 360 MB wagon-bg mistake.
