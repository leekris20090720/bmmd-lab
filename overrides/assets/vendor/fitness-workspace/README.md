# Fitness workspace — references and adaptations

The website retains its original JavaScript application, original React islands,
training store, forms, routes and 3D modules. No new framework or paid package is
required. Calendar data and set progress are calculated from real browser-local
records; reference artwork and reference numbers are not used as product data.

- Primary visual reference: Tanjil Mahmud, SaaS Fitness App UI Animation,
  https://dribbble.com/shots/25967675-SaaS-Fitness-App-UI-Animation .
  The publicly available still was inspected: neutral dark workspace, grouped
  numerical readouts, selection strip and green set-progress lines. Its author,
  organization picker and sample measurements are not included in this product.
  The live Dribbble page returned an empty 202 response during this implementation;
  video timing could not be verified. Reference screenshots are private design
  notes, not assets served by this site.
- Taste Skill: design-taste-frontend, True-black flat app style, seed 433844848.
  Product-specific element: real set completion and BM//MD equipment photographs.
  The selected visual reference takes precedence for the one green primary action.
- Aceternity UI Animated Tabs,
  https://ui.aceternity.com/components/tabs , source registry
  https://ui.aceternity.com/registry/tabs.json . Its shared selection indicator and
  spring-like follow inspired the calendar's native DOM/CSS adaptation. This is
  independently implemented, rather than an imported React/Motion package.
  ARIA tabs, arrow/Home/End navigation and reduced-motion behavior were added.
- React Bits CountUp by David Haz,
  https://github.com/DavidHDev/react-bits/blob/main/src/content/TextAnimations/CountUp/CountUp.jsx .
  Its normalized exponential interpolation is adapted for changes between actual
  numerical values. Values are not fabricated or animated on the initial empty
  account. Existing React Bits license and Commons Clause notices remain in
  ../reference-effects/ . The site's existing ScrollReveal adaptation is retained.
- Uiverse: alexmaracinaru's arrow button,
  https://uiverse.io/alexmaracinaru/perfect-panda-77 . The existing adaptation,
  source and MIT notice remain in ../studio-redesign/ . The primary action uses
  that button's arrow movement and press response with the reference's green fill.
- MotionSites, https://motionsites.ai/ : composition and transition pacing
  reference. No paid prompt, template, footage or other asset was copied.

`fitness-workspace.js` only changes presentation. It does not fetch data, write
records, modify storage, convert load units or generate training prescriptions.
