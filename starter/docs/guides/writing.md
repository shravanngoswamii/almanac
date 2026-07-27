---
title: Writing docs
description: The frontmatter and conventions Almanac understands.
---

Every docs page needs a `title`. Everything else is optional.

```yaml
---
title: Writing docs
description: Shown under the title and used for search and social cards.
sidebar:
  label: Writing        # shorter label for the sidebar
  order: 2              # lower sorts first
---
```

## Organising pages

Almanac derives URLs from file paths, so `docs/guides/writing.md` serves at
`/docs/guides/writing/`. A file named `index.md` serves its directory.

If you leave `sidebar` out of the config, pages are grouped by their top-level
directory and sorted alphabetically, with `sidebar.order` taking precedence.
