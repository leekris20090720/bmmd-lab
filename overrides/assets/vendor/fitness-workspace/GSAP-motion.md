# GSAP motion upgrade

The existing black/green Fitness workspace, routes, forms and original data
owners are retained. GSAP 3.12.2 was already shipped by this project. The matching
ScrollTrigger 3.12.2 plugin is now served locally with its original license banner.

Applied skills: gsap-core, gsap-timeline, gsap-scrolltrigger, gsap-performance;
the existing Taste Skill direction continues to govern type, surfaces and layout.

- ScrollTrigger drives the equipment perspective, readable character reveal,
  chapter-heading movement, equipment-photo parallax and closing typography.
- GSAP timelines coordinate equipment image changes; quickTo handles pointer tilt.
- GSAP drives the calendar selection and panel feedback, transitions between real
  counts and progress changes after an actual recorded set. The previous native
  motion implementation is replaced for these properties; no duplicate controller
  runs on them. Earlier component inspiration remains credited in README.md.
- Scoped matchMedia/context cleanup removes only this layer's animations and
  triggers. Routing away, resizing and either reduced-motion preference are handled.
- No scroll hijacking, global killAll, new framework, data upload, synthetic
  product statistics, or changes to training handlers and timers are introduced.
- Without GSAP/ScrollTrigger, the interface remains usable with static content
  and the existing CSS/native controls.

Official references:
https://gsap.com/docs/v3/GSAP/gsap.context()/
https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/
https://gsap.com/docs/v3/GSAP/gsap.timeline()/
https://gsap.com/docs/v3/GSAP/gsap.quickTo()/
https://gsap.com/docs/v3/Plugins/ScrollTrigger/
https://github.com/greensock/gsap-skills
