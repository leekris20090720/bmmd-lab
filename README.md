# BM//MD

Interactive training records, movement courses and mechanics experiments.

This repository publishes the existing BM//MD website with GitHub Pages.

## Website package

`site.zip` contains the public HTML, JavaScript, styles, teaching models and
images. It can be extracted directly into any static website host. It does not
contain visitor training records, private backups or account credentials.

`.github/workflows/pages.yml` extracts the package and publishes it using
GitHub's official open-source Pages actions. Replacing `site.zip` on `main`
automatically updates the website.

## Training records

Records are saved in the visitor's browser. A different website address uses a
separate browser storage area. Use Settings -> Backup and restore to export
records from the previous address and import them at the new address.

## Third-party notices

The package retains the license and credit notices for React, Three.js, GSAP,
React Bits, Magic UI and the other bundled resources. Hosting this package does
not change their terms or grant additional rights in third-party images.
