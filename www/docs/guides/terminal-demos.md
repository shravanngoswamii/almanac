---
title: Terminal demos
description: Replay a real terminal session with the optional PromptCast component.
---

If your project is a CLI or another dev tool, the clearest documentation is often a real terminal session rather than a wall of instructions. Almanac ships an optional component for exactly that. Nothing else in the framework depends on it, and it costs you nothing if you never import it.

## `<PromptCast />`

`PromptCast` plays back an [asciinema](https://asciinema.org/) recording (a `.cast` file) with the `asciinema-player` package, so readers see the session replay rather than a static screenshot.

It is not bundled with the framework's dependencies, so install the player yourself:

```sh
npm install asciinema-player
```

Then import the component and drop it in:

```astro
---
import PromptCast from "almanac/components/PromptCast.astro";
---

<PromptCast />
```

The component takes no props. It plays `public/casts/quickstart.cast`, resolved against your site's base path, and autoplays with a loop that restarts two seconds after the recording ends. The player is themed from the same CSS custom properties as the rest of the site, so it follows whichever theme the visitor picked.

<div class="callout note">
Plain `.md` files can't import components. Use `PromptCast` from an `.astro` page, or from an `.mdx` page if you have added Astro's MDX integration.
</div>

## Recording your own

1. Install the [asciinema CLI](https://asciinema.org/docs/installation) if you don't already have it.
2. Record a session:

   ```sh
   asciinema rec quickstart.cast
   ```

   Run through the workflow you want to show, then press `Ctrl+D` or type `exit` to stop recording.

3. Move the file to `public/casts/quickstart.cast`. That path is fixed in the component, so keeping the name means there is nothing else to change.
4. Keep it short. A cast that runs longer than about a minute stops being a demo and starts being a video nobody watches.

## Removing it

If your project has no terminal in it, delete `public/casts/`, remove your `<PromptCast />` usage, and uninstall `asciinema-player`. Search, navigation, theming, and everything else described in these docs are unaffected.
