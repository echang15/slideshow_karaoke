# 🎤 Slideshow Karaoke

A browser-based party game inspired by the Toastmasters improv-speaking
activity of the same spirit: a speaker gets a short, unprepared speech built
around a sequence of random slides that change on their own. Every time a new
slide pops up, the speaker has to weave it into what they're saying — no
script, no warning.

Play it live: enable GitHub Pages for this repo (see below) and open the
published URL. Everything runs client-side; there's no backend.

## How it works

- Set the number of speakers (works well for a group of 10, but anywhere
  from 1–30 is supported), optional names, speech length, and seconds per
  slide.
- The app computes slides-per-speaker (`speech length ÷ slide length`,
  default **90s / 30s = 3 slides**) and generates a big, shuffled pool of
  random stock photos. Slides carry **no forced caption or topic** — the
  speaker just improvises off whatever image appears.
- Every speaker gets a **guaranteed-unique** slice of that pool — nobody
  sees the same slide twice in a session, so nobody can prepare by watching
  someone else go first.
- The presenter screen shows one speaker at a time: a countdown ring, the
  current slide, slide-progress dots, and an overall progress bar. Slides
  auto-advance on their own timer with an audible cue; there are host
  controls to skip a slide, restart a turn, or jump to the next speaker.
- If a speaker wants a starting topic for their whole speech, they can
  optionally click **💡 Suggest a Topic**, which picks a random line from
  [`topics.md`](./topics.md). Totally optional — clear it, re-roll it, or
  never touch it.

### Controls

| Action | How |
|---|---|
| Start / pause the speech | `Space` or the Start/Pause button |
| Force-advance to the next slide | `→` or Skip Slide |
| Restart the current speaker's turn | `R` or Restart Turn |
| Move to the next speaker | `N` or Next Speaker |
| Toggle fullscreen (nice for a projector) | ⛶ button |
| Mute/unmute sound cues | 🔊 button |

### Slide styles

- **Random photos** (default) — pulls a random photo from
  [picsum.photos](https://picsum.photos) for each slide. Requires internet
  access in the players' browsers.
- **Plain numbered cards** — drops the photos and just shows a big slide
  number on a gradient card. Works fully offline.

### Suggest a Topic

`topics.md` is a plain Markdown bullet list — one topic per line. Edit it to
add, remove, or replace topics; the app re-fetches it at runtime, so no code
changes are needed. If the file can't be loaded (e.g. opened directly from
disk without a server), a small built-in fallback list is used instead.

### Session codes

Slide generation is seeded by a short "session code" shown in the setup
form's advanced section. Reusing the same code (with the same speaker count
and timing) reproduces the exact same set of slides later — handy for
co-hosting or re-running a session. Leave it on the auto-generated value, or
click 🎲 for a new one.

## Running locally

No build step — it's static HTML/CSS/JS. Just serve the folder, e.g.:

```sh
python3 -m http.server 8080
# then open http://localhost:8080
```

## Deploying to GitHub Pages

1. Push this repo to GitHub.
2. In the repo settings, go to **Pages**.
3. Under **Build and deployment**, set **Source** to "Deploy from a branch",
   pick the branch this code lives on, and the `/ (root)` folder.
4. Save — GitHub will publish the site at
   `https://<username>.github.io/<repo-name>/`.

## Credits

Game format inspired by the Toastmasters "Slideshow Karaoke" /
"PowerPoint Karaoke"-style improv speaking exercise. Slide photos courtesy of
[picsum.photos](https://picsum.photos).
