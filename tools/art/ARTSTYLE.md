# Art direction — "Monsoon Clay"

The world is made of four materials that weather together: lime-washed walls,
laterite and granite, fired clay, and plant matter (thatch, timber, paddy, palm).
Every sprite is built from them, so a village reads as one place.

**Light.** One warm sun from the upper left. Lit faces drift warm, shaded faces
drift cool blue-grey. Shadows are soft, fall to the right and are cast from the
real geometry, never pasted on. Corners touching the ground darken (ambient
occlusion). Top edges catch a thin highlight.

**Texture through patient repetition.** Detail comes from many small, careful,
slightly irregular marks, not from bigger shapes: individual roof tiles in
rows, laterite blocks with their own tone, thousands of thatch strokes, leaf
clusters lit as a volume. Nothing is a flat fill.

**Palette.** Earth reds (laterite #a9572f, tile #b65a32), lime white (#ece3cf),
straw gold (#c9a45a), granite grey, and the greens of the season: lush blue-green
in Maha, olive-gold in Yala. Saturated colour (maroon banners, gold finials,
the sarongs of villagers) is rare and placed where the eye should go.

**Life.** Things are used: grime splashes up whitewash, moss in tile valleys,
pots by doors, firewood under eaves, worn earth where people walk.

**Originality.** All forms come from Sri Lankan building traditions (Kandyan
hipped roofs, vahalkada gateways, dagobas, vee bissa granaries, wewa bunds).
No shapes, layouts, palettes or sprites are copied from any existing game.

**Craft over quantity.** Before adding a new element, refine what is there:
better light, cleaner silhouette, more coherent colour.

**3D figures (`tools/art3d/`).** Soldiers, raiders and villagers are built
from the kit in `kit3d.js` (`figure()`, `box`, `cyl`, `flat` colours from the
same palette) and pre-rendered by the bake. The camera matches `iso()` exactly
and the sun sits where the 2D light comes from (upper left), so figures and
painted buildings share one light. Keep figures simple and readable at 1×:
one clear silhouette, one team colour (sash, shield or turban), no texture
detail that only shows at 4×.
