# iantarter.com

Ian Tarter's personal site: a hand-built static site served by GitHub Pages.

## Pages
- `index.html`: the homepage
- `work/exact-sports/`: the EXACT Sports case study
- `resume/`: redirects to the résumé on Google Docs
- `404.html`: page-not-found

## Editing
- **Text:** edit the HTML directly.
- **Look:** every color, font and spacing value is a token in the first block of `assets/site.css` (`--s-*` colors, `--f-*`/`--t-*` type, `--sp-*` spacing).
- **Behavior:** `assets/site.js` holds the filled 3D name and its letter spins, the hidden-words easter egg, the drawing timeline, the copy-on-click email button and the contact form.
- **Contact form:** paste a Web3Forms access key into `WEB3FORMS_KEY` near the end of `assets/site.js`. Until then, Send opens the visitor's email app with the message filled in.

To preview locally, run `python3 -m http.server` in this folder and open http://localhost:8000.
