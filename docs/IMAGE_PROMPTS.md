# Image prompts for Weatherman Chan

Prompts for generating the app's artwork with Nano Banana 2 (Gemini), ChatGPT, or any image model. The current SVG water cycle and canvas sky are placeholders to be replaced by these.

## How to use
1. Paste the **Shared style block** first (or prepend it to each prompt), then the individual prompt.
2. Save results in `assets/images/` using the filename listed. Export as **WebP**, ideally under 200 KB each (schools have slow networks). Keep the original PNG somewhere outside the repo if you want to re-export.
3. Generate **2–3 variations** and pick the most scientifically accurate one, not just the prettiest.
4. **No text inside images.** AI-rendered text is unreliable and cannot be translated, edited, or read by screen readers. Labels are added by the app in HTML over the image.
5. Write alt text for each image in the lesson that uses it.
6. Check accuracy against the "Check" note before accepting an image.

## Shared style block
> Editorial science illustration for teenagers and adults. Realistic proportions and natural, slightly muted colors, in the style of a modern museum exhibit or a quality science magazine. Clean, precise, and calm. Soft directional light, subtle texture, gentle atmospheric depth. No cartoon characters, no faces, no mascots, no emojis, no glossy clip-art look. No text, labels, letters, numbers, arrows with words, logos, or watermarks anywhere in the image.

## Sky scenes (replace the canvas sky backdrop)
Format: 16:9 landscape, 1600×900, with the **top 60% as open sky** (the app draws clouds, rain, and snow on top).

| File | Prompt (add after style block) | Check |
|---|---|---|
| `sky-clear-day.webp` | A wide open landscape of rolling farmland under a clear late-morning sky, deep blue gradient overhead fading to pale near the horizon. Low sun, long soft shadows. | Sky gradient is smooth; no clouds |
| `sky-clear-night.webp` | The same rolling farmland at night under a clear sky, stars and a faint Milky Way, thin crescent moon low. | Star density realistic |
| `sky-overcast.webp` | The same landscape under a uniform gray stratus overcast, flat diffuse light, no visible sun. | Even, featureless cloud deck |
| `sky-rain.webp` | The same landscape in steady rain: dark gray-blue sky, wet fields, distant rain curtains, muted colors. | Rain visible only as a distant haze |
| `sky-snow.webp` | The same landscape after fresh snowfall under a pale gray-white winter sky, soft light. | No snowflakes (app draws them) |
| `sky-fog.webp` | The same landscape in dense morning fog, only nearby fence posts and trees visible, pale gray-white. | Depth fades with distance |
| `sky-thunderstorm.webp` | The same landscape beneath a towering cumulonimbus anvil cloud, dark green-gray base, dramatic side light. **No lightning bolt.** | Anvil top is flat, as a real cumulonimbus is |

## Concept diagrams (background art; labels are added in HTML)
Format: 3:2, 1800×1200.

| File | Prompt | Check |
|---|---|---|
| `water-cycle.webp` | A cutaway landscape showing the whole water cycle in one scene: ocean on the left, coastal plain, mountain on the right with snow on the peak, a river returning to the sea, groundwater visible in a cross-section beneath the soil, vapor rising from the sea and from forest trees, cumulus clouds forming over the mountain, rain and snow falling. Bird's-eye oblique view. | Includes evaporation, transpiration, condensation, precipitation, runoff, infiltration, groundwater |
| `enso-neutral.webp` | A side-on cross-section of the tropical Pacific Ocean and atmosphere, Asia and Australia on the left and South America on the right. **Neutral conditions:** trade winds blowing east to west, warm surface water pooled in the west, cold water rising (upwelling) off South America, thermocline tilted, rising air and cloud over the west Pacific. | Thermocline deeper in the west, shallower in the east |
| `enso-el-nino.webp` | Same composition as the neutral image. **El Niño:** weak trade winds, warm water spreading east toward South America, suppressed upwelling, cloud and rain shifted to the central and eastern Pacific, flatter thermocline. | Warm water reaches the eastern side |
| `enso-la-nina.webp` | Same composition. **La Niña:** stronger trade winds, very warm water piled in the west, strong upwelling of cold water off South America, deep thermocline in the west, intense cloud over the west Pacific. | Cold tongue clearly stronger than in neutral |
| `jet-stream.webp` | A high-altitude view of Earth's northern hemisphere showing a wavy ribbon of fast air (jet stream) high in the atmosphere, subtle cloud bands along it, curvature of the Earth visible. Scientific visualization style. | Ribbon is wavy, not a straight line |
| `hurricane-structure.webp` | A cutaway of a tropical cyclone: the eye at the center, the eyewall, spiral rainbands, warm ocean below, air spiraling in at the surface and rising in the eyewall, outflow at the top. | Eye is clear and the eyewall is the tallest cloud wall |
| `monsoon-shift.webp` | A split view of a subcontinent coastline: dry season on one half (dry land, light winds off the land), wet season on the other (moist ocean air pushing inland, heavy clouds against hills). | Wind direction differs between halves |

## Society and food lessons
Format: 3:2, 1800×1200. Show real, respectful, culturally accurate settings and avoid stereotypes.

| File | Prompt | Check |
|---|---|---|
| `food-wheat-prairie.webp` | A golden wheat field on the Canadian prairie at harvest, a combine in the distance, big sky with towering clouds, realistic farm scale. | Crop and machinery are plausible for the region |
| `food-corn-midwest.webp` | A US Midwest cornfield in midsummer, tall green corn, farmhouse and grain bins on the horizon, slightly hazy warm air. | Corn height and rows look realistic |
| `food-drought.webp` | The same kind of cornfield during drought: stunted, curled yellow-brown leaves, cracked dry soil, hard bright sky. | Curled leaves, not just brown |
| `culture-rain-market.webp` | A busy open-air market in a monsoon downpour, vendors under tarps and umbrellas, people in everyday clothing, reflective wet ground. | Diverse, dignified, no caricature |
| `business-energy.webp` | Wind turbines and solar panels on a plain at sunrise, a power line running to a distant city, thin morning cloud. | Turbines spaced realistically |
| `business-shipping.webp` | A container ship in heavy seas under a dark sky, spray over the bow, another ship on the horizon. | Ship is proportioned realistically |

## Icons (optional)
Format: square, 512×512, transparent background, consistent line weight. A **flat monochrome** set (single ink color, no gradients, no faces). One prompt per icon, for example: "Minimal monochrome line icon of a barometer, thin uniform stroke, transparent background, no text."

Suggested set: thermometer, barometer, anemometer, hygrometer, rain gauge, sun, cloud, snowflake, wind, wave, drought, flood.

## Keeping the set consistent
- Reuse the shared style block verbatim.
- For a series (sky scenes, ENSO), give the model the first approved image as a reference and ask for "the same scene, same camera, same lighting, changed only as described."
- Record any prompt changes here so images can be regenerated later.
