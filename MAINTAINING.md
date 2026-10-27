# Maintaining TFX Traced

Use Node.js 22 or newer (CI uses 24).

```sh
npm ci
npm run build
npm run check
npm run preview
```

`dist/` is self-contained. The build never reads the research tree, game data
or ROMs and requires no external browser libraries. Pages uses relative URLs
and works beneath `/tfx-traced/` as well as at a domain root.

Pushes to master and manual runs build, check and deploy using GitHub Actions;
pull requests build and check without publishing. Set the Pages source to
GitHub Actions. No release archives are created.

Edit `content/investigation.md` for the article, `src/` for presentation and
`public/` for the committed exhibit snapshot. `content/research-sources.md`
connects public claims to evidence. Keep team language and preserve caveats.

To deliberately refresh viewer data and adapters from the complete research
checkout, run `node scripts/import-analysis.mjs /path/to/tfx-reverse`.
The importer strips geometry exporters and source-resource links, reduces the
media data to textures and map schematics, and writes source hashes. Changes
to the research viewer's structure can require updating these explicit adapters.
HTML exhibit layouts in `src/models.html` and `src/maps.html` are maintained
separately. Ordinary builds and CI do not run the importer.

The sound exhibit contains four 20-second FLAC excerpts starting at 30 seconds
in the game-timed intro renders. No per-card normalization is applied. There
are no asset download links or export controls. Do not copy installation files,
ROMs, complete audio collections or raw resource archives into the site.
