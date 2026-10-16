# TableTap image prompts

Generate each image, save it with the **exact file name** shown, and send them to me (or drop them in `client/public/images/`).
The site works without them (it shows warm placeholder tones), so you can add them one at a time.

**Paste this style line at the start of every prompt** so all the images match:

> Editorial luxury hospitality photography, soft natural light, warm muted palette of stone, sand, ivory, bronze and deep brown, quiet and calm mood, shallow depth of field, shot on a medium-format camera, subtle film grain, refined and minimal composition, no text, no logos, no watermarks, no people looking at the camera.

Formats: JPG or WebP, under ~500 KB each if you can (compress at squoosh.app). Sizes are the minimum. Bigger is fine if the aspect ratio stays the same.

---

## Landing page

**1. `hero.jpg`** (2400 × 1350, 16:9, full-screen background behind white text, so keep the middle calm and slightly dark)
> Wide shot of an intimate fine-dining restaurant at golden hour. A low wooden table set for two with linen napkins, handmade ceramic plates, a short candle, and a small brass card stand holding a minimal square QR code card. Warm sunlight falls through tall windows with sheer curtains. Soft shadows, deep brown and sand tones, lots of negative space in the upper half. Slightly underexposed so white text reads clearly over it.

**2. `intro-wide.jpg`** (2400 × 1500, 16:10)
> Interior of a modern warm-minimalist restaurant dining room, empty and quiet before service. Limewashed stone walls, oak tables, woven rattan chairs, a long banquette, ceramic pendant lights glowing softly. Late-afternoon light. Calm, architectural, symmetrical composition.

**3. `step-scan.jpg`** (1250 × 1975, portrait 5:8)
> Close-up of a guest's hand holding a smartphone above a restaurant table, scanning a small QR card in a brass stand. The phone screen is softly out of focus. Linen tablecloth, a glass of water with condensation, a sprig of herbs. Warm side light, shallow depth of field.

**4. `step-order.jpg`** (1250 × 1975, portrait 5:8)
> Over-the-shoulder view of a person relaxing in a restaurant chair, browsing an elegant menu on their phone. Only hands and the phone are in focus; the screen glows softly with an abstract blurred interface. A ceramic cup of chai and a small bowl of olives on the table. Cosy, warm evening light.

**5. `step-savour.jpg`** (1250 × 1975, portrait 5:8)
> A server's hands placing a beautifully plated Indian dish on a table: paneer tikka on a hand-thrown matte ceramic plate with charred edges, micro-herbs and a swoosh of mint chutney. Motion feels gentle and graceful. Warm candlelight, dark brown background.

**6. `kitchen-wide.jpg`** (2400 × 1500, 16:10)
> A calm, professional restaurant kitchen pass during service. Brushed steel counter, warm under-cabinet lighting, a chef in a linen apron plating a dish, and a wall-mounted tablet showing softly blurred order cards. Copper pots in the background. Cinematic, warm, orderly. Not chaotic.

**7. `owner.jpg`** (1200 × 1500, portrait 4:5)
> A restaurant owner standing at a wooden bar counter after service, looking down at a tablet in their hands, softly lit by a single pendant lamp. Shelves of glassware and ceramics behind, out of focus. Quiet, confident, end-of-day mood. Face partly turned away.

**8. `cta.jpg`** (2400 × 1350, 16:9, white text sits on top, so make it dark and moody)
> A candle-lit restaurant table at night seen from slightly above. Empty wine glasses, a folded linen napkin and a small brass QR stand, surrounded by deep warm shadows. Very dark, rich and atmospheric, with a soft glow in the centre. Lots of dark negative space.

---

## Login / sign-up pages

**9. `auth.jpg`** (1200 × 1600, portrait 3:4)
> Still life on a stone countertop: a stack of handmade ceramic plates, a linen napkin, a brass bell, and fresh herbs in a small glass. Morning light from a window casting long soft shadows. Serene, tactile and premium.

---

## Diner menu page (what guests see after scanning)

**10. `menu-header.jpg`** (1600 × 900, 16:9, sits behind the restaurant name)
> Top-down flat lay of a restaurant table with several Indian dishes in handmade ceramic bowls: dal makhani, butter naan in a basket, paneer tikka, mango lassi in a tall glass, and small bowls of chutney. Linen cloth, brass serving spoons, scattered coriander leaves. Warm, rich and inviting, with soft shadows.

---

## Dish photos for the demo menu (optional, adds a lot)

All **1200 × 1200, square**. Same setting for every dish so they look like one set: *a single dish on a hand-thrown matte ceramic plate or bowl, on a warm sand-coloured linen surface, soft window light from the left, 45° angle, dark brown softly blurred background.* Put that sentence after the style line, then add the dish line below.

| File | Dish line |
|---|---|
| `dishes/paneer-tikka.jpg` | Paneer tikka: charred cottage cheese cubes with peppers and onions, mint chutney, lemon wedge. |
| `dishes/chicken-65.jpg` | Chicken 65: crispy deep-red fried chicken pieces with curry leaves and green chillies. |
| `dishes/hara-bhara-kebab.jpg` | Hara bhara kebab: green spinach and pea patties with a cashew on top, mint dip. |
| `dishes/dal-makhani.jpg` | Dal makhani: creamy black lentils in a copper bowl with a swirl of cream and butter. |
| `dishes/butter-chicken.jpg` | Butter chicken: tandoori chicken in a glossy orange tomato-butter gravy, cream drizzle. |
| `dishes/paneer-butter-masala.jpg` | Paneer butter masala: soft paneer cubes in a rich orange gravy, kasuri methi on top. |
| `dishes/veg-biryani.jpg` | Veg biryani: fragrant long-grain basmati with saffron streaks, vegetables, fried onions, raita on the side. |
| `dishes/butter-naan.jpg` | Butter naan: soft blistered naan brushed with butter, torn and stacked in a small basket. |
| `dishes/garlic-naan.jpg` | Garlic naan: naan topped with chopped garlic and coriander, lightly charred. |
| `dishes/tandoori-roti.jpg` | Tandoori roti: rustic whole-wheat flatbreads with char spots, stacked. |
| `dishes/mango-lassi.jpg` | Mango lassi: thick golden mango yoghurt drink in a tall glass, a sprinkle of saffron and pistachio. |
| `dishes/masala-chai.jpg` | Masala chai: milky spiced tea in a small clay cup (kulhad), steam rising, cardamom pods beside it. |
| `dishes/fresh-lime-soda.jpg` | Fresh lime soda: sparkling drink with lime slices, mint and ice in a tall glass, condensation. |

---

### Where they go
```
client/public/images/
├── hero.jpg  intro-wide.jpg  step-scan.jpg  step-order.jpg  step-savour.jpg
├── kitchen-wide.jpg  owner.jpg  cta.jpg  auth.jpg  menu-header.jpg
└── dishes/  (13 files above)
```
