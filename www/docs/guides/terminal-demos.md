---
title: Terminal demos
description: Play back a real terminal session in your docs using the optional PromptCast component.
---

If your project is a CLI or another dev tool, sometimes the clearest documentation is a real terminal session rather than a wall of instructions. Flect includes an optional component for exactly that.

## `<PromptCast />`

`src/components/PromptCast.astro` plays back an [asciinema](https://asciinema.org/) recording (a `.cast` file) using the `asciinema-player` package. Drop it into any docs page or onto the homepage to show install steps, CLI usage, or any other terminal workflow inline, as an actual replayed recording rather than a static screenshot.

Recordings are expected to live in `public/casts/`.

## Recording your own

1. Install the [asciinema CLI](https://asciinema.org/docs/installation) if you don't already have it.
2. Record a session:

   ```sh
   asciinema rec demo.cast
   ```

   Run through whatever workflow you want to show, then press `Ctrl+D` or type `exit` to stop recording.

3. Move the resulting file into `public/casts/` in this project.
4. Update the cast file path inside `src/components/PromptCast.astro` to point at your new file.
5. Use `<PromptCast />` wherever you want the recording to play: a docs page or `src/pages/index.astro`.

## This is entirely optional

If your project doesn't involve a terminal at all, there's no need to keep this around. To remove it:

- Delete `src/components/PromptCast.astro`.
- Remove any `<PromptCast />` usage (check `src/pages/index.astro` and any docs pages).
- Remove `public/casts/` and its contents.
- Remove the `asciinema-player` dependency from `package.json` and run `npm install` again to update the lockfile.

<div class="callout note">
Nothing else in the template depends on this component. Deleting it won't break search, navigation, theming, or anything else described in these docs.
</div>
