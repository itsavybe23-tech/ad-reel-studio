/* Shops, product categories, video styles, prompt building and SEO copy.
   To add a category, copy one entry in CATEGORIES and change its words. */

const SHOPS = {
  pod: { label: 'Print on demand (Etsy)', short: 'Etsy POD', cta: 'Shop on Etsy',
         tags: ['#EtsyFinds', '#EtsyShop', '#ShopSmall'], keywords: ['etsy finds', 'unique gift'] },
  emb: { label: 'Custom embroidery', short: 'Embroidery', cta: 'Order yours custom',
         tags: ['#CustomEmbroidery', '#Embroidered', '#ShopSmall'], keywords: ['custom embroidery', 'personalized gift'] }
};

/* subject: how the prompt names the item. pro: scene ideas for a videographer shot.
   blogger: where the creator films, what they do, a line they might say. */
const CATEGORIES = [
  { id: 'aluminum', shop: 'pod', label: 'Brushed aluminum prints', subject: 'the brushed aluminum print',
    sceneLabels: { hero: 'On the wall', light: 'Metallic light play', lifestyle: 'Room walk-through', scale: 'Scale with a person', detail: 'Brushed finish close-up' },
    pro: { hero: 'the brushed aluminum print hangs centered above a styled sofa in a bright modern living room, soft daylight from a side window',
           light: 'a soft beam of light slowly sweeps across the brushed aluminum print, the metal finish shimmering and the colors glowing as the light moves',
           lifestyle: 'camera glides slowly through a modern styled room with plants and warm lamps and settles on the brushed aluminum print on the wall',
           scale: 'a person walks into frame and stands beside the brushed aluminum print on the wall, showing its true size in the room',
           detail: 'macro gliding along the brushed aluminum surface, fine metal grain catching the light, the clean edge and float mount in view' },
    blogger: { setting: 'in a modern living room with a bare wall', action: 'unboxes the aluminum print, tilts it so the metal catches the light for the camera, hangs it and steps back', line: 'The way this metal print catches the light is unreal.',
               shots: ['In a modern living room, a friendly creator unboxes the brushed aluminum print and holds it up to the camera with an excited smile.',
                       'Handheld close-up as the creator tilts the brushed aluminum print so the metal finish shimmers in the light.',
                       'The creator hangs the brushed aluminum print, steps back to stand beside it so its size shows, and smiles at the camera.'] },
    features: ['Printed on brushed aluminum', 'Metallic finish that glows in the light', 'Ready to hang, no frame needed'],
    keywords: ['metal wall art', 'aluminum print', 'brushed metal art', 'modern wall decor', 'metal print', 'living room decor', 'office wall art', 'housewarming gift'],
    tags: ['#MetalWallArt', '#AluminumPrint', '#WallArt', '#ModernDecor'] },
  { id: 'acrylic', shop: 'pod', label: 'Acrylic prints', subject: 'the acrylic print',
    sceneLabels: { hero: 'On the wall', gloss: 'Depth and gloss', lifestyle: 'Room walk-through', scale: 'Scale with a person', detail: 'Edge close-up' },
    pro: { hero: 'the acrylic print hangs centered above a styled sofa in a bright modern living room, soft daylight from a side window',
           gloss: 'slow push-in on the acrylic print as soft light glides across its glossy face, the colors looking deep and vivid behind the clear acrylic',
           lifestyle: 'camera glides slowly through a modern styled room and settles on the acrylic print on the wall, its glossy surface reflecting the room softly',
           scale: 'a person walks into frame and stands beside the acrylic print on the wall, showing its true size in the room',
           detail: 'macro along the polished edge of the clear acrylic, showing its thickness and the depth of the colors, light glinting off the edge' },
    blogger: { setting: 'in a bright living room with a bare wall', action: 'unboxes the acrylic print, peels off the protective film, shows the glossy face and edge to the camera, then hangs it', line: 'Look how deep and glossy the colors are on this acrylic print.',
               shots: ['In a bright living room, a friendly creator unboxes the acrylic print and peels off the protective film with an excited smile.',
                       'Handheld close-up of the acrylic print\'s glossy face and clear polished edge, showing the depth of the colors.',
                       'The creator hangs the acrylic print, steps back to stand beside it so its size shows, and smiles at the camera.'] },
    features: ['Vivid colors under glossy acrylic', 'Polished edges with real depth', 'Ready to hang, gallery look'],
    keywords: ['acrylic wall art', 'acrylic print', 'glass look wall art', 'modern wall decor', 'living room decor', 'photo on acrylic', 'office wall art', 'housewarming gift'],
    tags: ['#AcrylicPrint', '#AcrylicArt', '#WallArt', '#ModernDecor'] },
  { id: 'tapestry', shop: 'pod', label: 'Tapestries', subject: 'the wall tapestry',
    sceneLabels: { hero: 'Hanging in the room', drape: 'Fabric drape', bedroom: 'Above the bed', scale: 'Room scale', detail: 'Fabric close-up' },
    pro: { hero: 'the wall tapestry hangs on a bedroom wall above a cozy bed with fairy lights and plants, warm evening light',
           drape: 'a gentle breeze moves the wall tapestry so the fabric ripples and drapes softly, the full design in view',
           bedroom: 'the wall tapestry hangs above a neatly made bed in a calm, airy bedroom, soft morning light',
           scale: 'slow wide pull-back revealing the wall tapestry filling the wall of a styled room, a person walking past for scale',
           detail: 'macro gliding across the tapestry fabric, the soft weave and printed colors and the hemmed edge in warm side light' },
    blogger: { setting: 'in a dorm room with a bare wall', action: 'unfolds the tapestry toward the camera to show the whole design, pins it up on the wall and steps back to show the room', line: 'One tapestry and my whole room feels brand new.',
               shots: ['In a dorm room, a friendly creator unfolds the wall tapestry toward the camera to show the whole design, smiling.',
                       'Handheld close-up of the creator\'s hand smoothing the tapestry fabric, showing the colors and soft texture.',
                       'The creator pins the tapestry up, steps back so it fills the wall behind them, and smiles at the camera.'] },
    features: ['Soft, lightweight fabric', 'Big statement design for any wall', 'Easy to hang, no tools needed'],
    keywords: ['wall tapestry', 'tapestry wall hanging', 'dorm room decor', 'bedroom decor', 'boho wall decor', 'large wall art', 'aesthetic room decor', 'gift for her'],
    tags: ['#Tapestry', '#WallTapestry', '#DormDecor', '#RoomDecor'] },
  { id: 'blanket', shop: 'pod', label: 'Woven blankets & throws', subject: 'the woven blanket',
    sceneLabels: { hero: 'Draped on a sofa', bed: 'On the bed', unfold: 'Unfolding', lifestyle: 'Cozy lifestyle', detail: 'Weave close-up' },
    pro: { hero: 'the woven blanket is draped over the arm of a linen sofa with soft cushions, warm lamp light in a cozy living room',
           bed: 'the woven blanket is spread across the foot of a neatly made bed, soft morning light through sheer curtains',
           unfold: 'hands unfold the woven blanket and shake it open so it ripples and settles over a sofa, showing the full design',
           lifestyle: 'someone curls up under the woven blanket on the sofa with a mug of tea, a fireplace glowing softly behind',
           detail: 'macro gliding across the woven texture and threads of the blanket, warm side light showing the depth of the weave' },
    blogger: { setting: 'on a cozy couch in a living room', action: 'unfolds the blanket toward the camera to show the whole design, rubs the weave close to the lens, then wraps up in it', line: 'This blanket is so cozy, and the design looks even better in person.',
               shots: ['On a cozy couch, a friendly creator unfolds the woven blanket toward the camera to show the whole design, smiling.',
                       'Handheld close-up of the creator\'s hand running over the woven texture and threads of the blanket.',
                       'The creator wraps up in the woven blanket on the couch, snuggles in and smiles at the camera.'] },
    features: ['Soft, cozy woven cotton', 'Your design woven into the fabric', 'Made to order, a great gift'],
    keywords: ['woven blanket', 'throw blanket', 'cozy home decor', 'custom blanket', 'sofa throw', 'housewarming gift', 'gift for her', 'bedroom decor'],
    tags: ['#ThrowBlanket', '#WovenBlanket', '#CozyHome', '#HomeDecor'] },
  { id: 'tshirt', shop: 'pod', label: 'T-shirts', subject: 'the printed t-shirt',
    pro: { hero: 'the folded t-shirt rests on a linen surface beside a plant, soft window light', lifestyle: 'a model wears the t-shirt and walks toward camera down a sunny city street', detail: 'extreme close-up of the printed design and fabric weave, light sweeps across it' },
    blogger: { setting: 'in a bright bedroom with a full-length mirror', action: 'holds the t-shirt up to the camera, then shows it on in the mirror and turns to show the fit', line: 'Okay, the print on this tee is even better in person.' },
    features: ['Soft, breathable cotton', 'Bold print that lasts wash after wash', 'Unisex fit in every size'],
    keywords: ['graphic tee', 'printed t-shirt', 'funny shirt', 'gift shirt', 'unisex tee'], tags: ['#GraphicTee', '#TshirtDesign', '#OOTD'] },
  { id: 'hoodie', shop: 'pod', label: 'Hoodies & sweatshirts', subject: 'the printed hoodie',
    pro: { hero: 'the hoodie hangs on a wooden hanger against a warm textured wall, golden-hour light', lifestyle: 'a model pulls up the hood and smiles on an autumn street, leaves falling', detail: 'close-up of the printed design, soft fleece texture and drawstrings' },
    blogger: { setting: 'in a cozy living room with a couch and a blanket', action: 'unfolds the hoodie, holds it to the camera, then wears it and snuggles into it', line: 'This is officially my new favorite hoodie.' },
    features: ['Cozy fleece inside', 'Printed to order just for you', 'Relaxed unisex fit'],
    keywords: ['graphic hoodie', 'cozy sweatshirt', 'printed hoodie', 'gift for her', 'gift for him'], tags: ['#Hoodie', '#CozyStyle', '#Sweatshirt'] },
  { id: 'mug', shop: 'pod', label: 'Mugs & tumblers', subject: 'the printed mug',
    pro: { hero: 'the mug sits on a café table as steam rises from fresh coffee, morning light', lifestyle: 'hands wrap around the mug at a sunny breakfast table and lift it for a sip', detail: 'slow macro along the printed design and glossy glaze, coffee being poured in' },
    blogger: { setting: 'at a kitchen counter in the morning', action: 'pours coffee into the mug, turns it to show the design to the camera and takes a sip', line: 'My morning coffee just got a whole lot better.' },
    features: ['Dishwasher and microwave safe', 'Vivid print that will not fade', 'Holds a full 11 or 15 oz'],
    keywords: ['coffee mug', 'funny mug', 'gift mug', 'custom mug', 'coffee lover gift'], tags: ['#CoffeeMug', '#MugLife', '#CoffeeLover'] },
  { id: 'tote', shop: 'pod', label: 'Tote bags', subject: 'the printed tote bag',
    pro: { hero: 'the tote bag hangs on a chair by a sunny window, filled with flowers and a book', lifestyle: 'a woman carries the tote over her shoulder at a farmers market', detail: 'close-up of the printed design and canvas texture, straps in soft focus' },
    blogger: { setting: 'in a sunny entryway by the front door', action: 'packs the tote with a laptop, water bottle and book, then shows the design to the camera', line: 'It fits everything, and the print is so cute.' },
    features: ['Sturdy cotton canvas', 'Holds your laptop and more', 'Printed design on both sides'],
    keywords: ['tote bag', 'canvas tote', 'book bag', 'reusable bag', 'gift for her'], tags: ['#ToteBag', '#CanvasTote', '#BookBag'] },
  { id: 'phonecase', shop: 'pod', label: 'Phone cases', subject: 'the printed phone case',
    pro: { hero: 'the phone in its case stands on a marble surface with soft reflections', lifestyle: 'a hand picks up the phone in its case from a café table and takes a photo', detail: 'slow orbit around the phone case showing the print, edges and camera cutout' },
    blogger: { setting: 'at a desk with a ring light', action: 'snaps the case onto a phone, shows the front and back to the camera and taps it', line: 'It clicked right on and it is so protective.' },
    features: ['Slim, tough protection', 'Glossy, scratch-resistant print', 'Fits the latest iPhone and Galaxy'],
    keywords: ['phone case', 'iphone case', 'cute phone case', 'aesthetic case', 'custom case'], tags: ['#PhoneCase', '#iPhoneCase', '#TechAccessories'] },
  { id: 'sticker', shop: 'pod', label: 'Stickers', subject: 'the vinyl sticker',
    pro: { hero: 'the sticker sits on a laptop lid next to coffee and a notebook, soft daylight', lifestyle: 'a hand peels the sticker and presses it onto a water bottle', detail: 'macro of the sticker\'s glossy finish and crisp die-cut edge, light glinting' },
    blogger: { setting: 'at a craft desk with a laptop and water bottle', action: 'peels a sticker and places it on a water bottle, then shows it to the camera', line: 'These are waterproof, and they look amazing on my bottle.' },
    features: ['Waterproof vinyl', 'Will not fade in the sun', 'Perfect for laptops and bottles'],
    keywords: ['vinyl sticker', 'laptop sticker', 'water bottle sticker', 'cute stickers', 'die cut sticker'], tags: ['#Stickers', '#LaptopStickers', '#StickerShop'] },

  { id: 'hat', shop: 'emb', label: 'Embroidered hats', subject: 'the embroidered hat',
    pro: { hero: 'the embroidered cap rests on a wooden table, the stitching lit by warm side light', lifestyle: 'a model puts on the cap outdoors, turns to camera and adjusts the brim', detail: 'macro along the raised embroidery stitches and thread texture' },
    blogger: { setting: 'on a sunny patio', action: 'takes the hat out of the package, shows the embroidery close to the camera, then puts it on', line: 'Look at the stitching on this, it is so clean.' },
    features: ['Clean, raised stitching', 'Adjustable strap fits most', 'Made to order with your design'],
    keywords: ['embroidered hat', 'custom cap', 'dad hat', 'trucker hat', 'personalized hat'], tags: ['#EmbroideredHat', '#CustomHat', '#DadHat'] },
  { id: 'embhoodie', shop: 'emb', label: 'Embroidered hoodies', subject: 'the embroidered hoodie',
    pro: { hero: 'the embroidered hoodie is laid flat on linen, the stitched logo in sharp focus', lifestyle: 'a model wears the embroidered hoodie at a coffee shop window, soft daylight', detail: 'macro of the embroidered stitches and fleece texture' },
    blogger: { setting: 'in a cozy bedroom', action: 'unfolds the hoodie, runs a finger over the embroidery for the camera, then tries it on', line: 'You can feel the embroidery, it is so good quality.' },
    features: ['Premium stitched embroidery', 'Heavyweight cozy fleece', 'Your name or design, made to order'],
    keywords: ['embroidered hoodie', 'custom hoodie', 'embroidered sweatshirt', 'personalized hoodie', 'monogram hoodie'], tags: ['#EmbroideredHoodie', '#CustomHoodie', '#Monogram'] },
  { id: 'polo', shop: 'emb', label: 'Polos & workwear', subject: 'the embroidered polo shirt',
    pro: { hero: 'the polo with an embroidered chest logo hangs in a bright modern office', lifestyle: 'a smiling team member in the embroidered polo greets a customer at a shop counter', detail: 'macro of the embroidered logo on the chest, crisp stitch lines' },
    blogger: { setting: 'in a small business storefront', action: 'holds up the polo to show the embroidered logo, then wears it behind the counter', line: 'Our new team polos came in and they look so professional.' },
    features: ['Your business logo, embroidered', 'Breathable, wrinkle-resistant fabric', 'Bulk team orders welcome'],
    keywords: ['embroidered polo', 'business logo shirt', 'team uniform', 'custom workwear', 'company polo'], tags: ['#CustomPolo', '#SmallBusiness', '#Workwear'] },
  { id: 'patch', shop: 'emb', label: 'Patches', subject: 'the embroidered patch',
    pro: { hero: 'the embroidered patch rests on denim beside thread spools, warm light', lifestyle: 'hands press the patch onto a denim jacket, then the jacket is worn', detail: 'macro of the patch\'s satin stitching and merrowed border' },
    blogger: { setting: 'at a craft table with a denim jacket', action: 'irons the patch onto the jacket and holds the finished jacket up to the camera', line: 'It took ten seconds and my jacket looks brand new.' },
    features: ['Iron-on or sew-on backing', 'Dense, detailed stitching', 'Custom shapes and sizes'],
    keywords: ['embroidered patch', 'iron on patch', 'custom patch', 'jacket patch', 'logo patch'], tags: ['#Patches', '#IronOnPatch', '#CustomPatch'] },
  { id: 'gift', shop: 'emb', label: 'Personalized gifts', subject: 'the personalized embroidered gift',
    pro: { hero: 'the personalized embroidered gift sits beside wrapping paper and a ribbon, soft festive light', lifestyle: 'someone opens the gift box and lifts out the embroidered item with a big smile', detail: 'macro of the embroidered name and stitch detail' },
    blogger: { setting: 'in a living room with gift wrap on the table', action: 'opens a gift box, lifts out the personalized item and shows the embroidered name to the camera', line: 'They put her name on it, she is going to cry.' },
    features: ['Personalized with any name', 'Embroidered to last for years', 'Gift-ready packaging'],
    keywords: ['personalized gift', 'custom name gift', 'embroidered gift', 'gift for mom', 'baby gift'], tags: ['#PersonalizedGift', '#GiftIdeas', '#CustomGift'] }
];

const STYLES = {
  pro: { label: 'Pro videographer', blurb: 'Cinematic, polished product film: smooth camera moves, studio lighting, shallow depth of field.',
         models: ['seedance2', 'kling3pro', 'cinema4', 'kling3std'] },
  blogger: { label: 'Blogger showcase', blurb: 'Phone-shot creator video: someone shows the product to camera and says why they love it.',
             models: ['kling3pro', 'seedance2ref', 'seedance2', 'kling3std'] }
};
/* Camera moves. The video models take them as words in the prompt. */
const CAMERA_MOVES = [
  { group: 'Classic', id: 'dolly', label: 'Dolly in', text: 'slow dolly-in toward the product' },
  { group: 'Classic', id: 'dollyout', label: 'Dolly out', text: 'slow dolly-out, pulling back to reveal the scene around the product' },
  { group: 'Classic', id: 'push', label: 'Push in with focus pull', text: 'gentle push-in with a rack focus from background to product' },
  { group: 'Classic', id: 'static', label: 'Locked-off (still camera)', text: 'locked-off static camera on a tripod, only the light and the scene move' },
  { group: 'Classic', id: 'pan', label: 'Slow pan', text: 'slow horizontal pan across the scene that lands on the product' },
  { group: 'Classic', id: 'tilt', label: 'Tilt up reveal', text: 'slow tilt up from the floor that reveals the product' },
  { group: 'Classic', id: 'truck', label: 'Side tracking (truck)', text: 'smooth sideways tracking move parallel to the product' },
  { group: 'Orbit and crane', id: 'orbit', label: 'Half orbit', text: 'smooth 180-degree orbit around the product' },
  { group: 'Orbit and crane', id: 'orbit360', label: '360 orbit', text: 'smooth full 360-degree orbit around the product' },
  { group: 'Orbit and crane', id: 'arc', label: 'Arc', text: 'gentle arc around the product while keeping it centered in frame' },
  { group: 'Orbit and crane', id: 'crane', label: 'Crane down', text: 'slow crane down from above, settling at eye level' },
  { group: 'Orbit and crane', id: 'craneup', label: 'Crane up', text: 'slow crane up, rising above the product to a high angle' },
  { group: 'Orbit and crane', id: 'topdown', label: 'Overhead spin', text: 'overhead top-down camera slowly rotating above the product' },
  { group: 'Dynamic', id: 'crashzoom', label: 'Crash zoom in', text: 'fast crash zoom in onto the product, then a steady hold' },
  { group: 'Dynamic', id: 'whip', label: 'Whip pan', text: 'quick whip pan with motion blur that lands on the product' },
  { group: 'Dynamic', id: 'fpv', label: 'FPV drone fly-through', text: 'FPV drone fly-through of the space, swooping in to the product' },
  { group: 'Dynamic', id: 'bullet', label: 'Bullet time', text: 'bullet-time moment, the scene frozen as the camera sweeps around the product' },
  { group: 'Dynamic', id: 'robo', label: 'Robotic arm sweep', text: 'fast, precise robotic-arm camera sweep around the product' },
  { group: 'Dynamic', id: 'dutch', label: 'Dutch tilt', text: 'slow move framed at a tilted dutch angle for a stylish, dynamic feel' },
  { group: 'Close-up and handheld', id: 'macro', label: 'Macro light sweep', text: 'locked-off macro shot with a slow light sweep' },
  { group: 'Close-up and handheld', id: 'pushmacro', label: 'Macro push-in', text: 'slow push-in at macro distance across the surface detail' },
  { group: 'Close-up and handheld', id: 'rackfocus', label: 'Rack focus', text: 'steady shot with a rack focus from a foreground object to the product' },
  { group: 'Close-up and handheld', id: 'gimbal', label: 'Gimbal tracking', text: 'gimbal tracking shot following the action' },
  { group: 'Close-up and handheld', id: 'walk', label: 'Gimbal walk-through', text: 'smooth gimbal walk-through of the room toward the product' },
  { group: 'Close-up and handheld', id: 'handheld', label: 'Handheld', text: 'natural handheld camera with gentle movement, documentary feel' }
];
const CAMERAS = Object.fromEntries(CAMERA_MOVES.map(m => [m.id, m.text]));
const SCENES = { hero: 'Hero reveal', lifestyle: 'Lifestyle, in use', detail: 'Detail close-up' };
/* Scene choices for one category: its own labels if it has them, else the standard three. */
function scenesFor(c) { return c && c.sceneLabels ? c.sceneLabels : SCENES; }

/* Platforms that share one generated clip shape */
const SHAPES = {
  vertical: { label: 'Vertical 9:16', aspect: '9:16', frame: [1080, 1920], uses: 'TikTok, Reels, Shorts' },
  pinterest: { label: 'Pinterest 2:3', aspect: '3:4', frame: [1080, 1620], uses: 'Pinterest' },
  wide: { label: 'X 16:9', aspect: '16:9', frame: [1920, 1080], uses: 'X' },
  square: { label: 'X 1:1', aspect: '1:1', frame: [1080, 1080], uses: 'X' }
};
function frameSize(shape, res) {
  const [w, h] = SHAPES[shape].frame; const k = res === '480p' ? 480 / 1080 : res === '720p' ? 720 / 1080 : 1;
  const ev = n => Math.round(n * k / 2) * 2; return [ev(w), ev(h)];
}

function catById(id) { return CATEGORIES.find(c => c.id === id) || CATEGORIES[0]; }

function productLine(p) {
  const name = (p.name || '').trim(), desc = (p.desc || '').trim().replace(/\.$/, '');
  if (!name && !desc) return '';
  return `The product is ${name || 'this item'}${desc ? ': ' + desc : ''}.`;
}
function compositionHint(shape) {
  if (shape === 'wide') return 'Wide 16:9 composition with the product slightly right of center.';
  if (shape === 'square') return 'Square composition with the product centered.';
  return 'Vertical composition with the product in the middle of the frame, clear space above and below for captions.';
}
const KEEP = s => `Keep ${s} exactly as in the reference image: same design, colors, text and logo, no warping or extra elements.`;

/* ---------- shot library ----------
   {s} is replaced with the category's subject ("the acrylic print").
   home: only offered for wall art, tapestries and blankets. */
const HOME_CATS = new Set(['aluminum', 'acrylic', 'tapestry', 'blanket']);
const PRO_SHOTS = [
  { group: 'Studio', id: 'turntable', label: 'Turntable spin', text: '{s} slowly rotates on a clean studio turntable against a seamless backdrop, every side in view' },
  { group: 'Studio', id: 'pushin', label: 'Slow push-in', text: 'the camera creeps slowly toward {s} as the background melts into soft bokeh' },
  { group: 'Studio', id: 'macro', label: 'Macro texture', text: 'extreme macro gliding across the surface and texture of {s}, light raking across the detail' },
  { group: 'Studio', id: 'reveal', label: 'Fabric reveal', text: 'a soft piece of fabric slides away to reveal {s} in a single beam of light' },
  { group: 'Studio', id: 'flatlay', label: 'Flat lay', text: 'top-down flat lay of {s} styled on a neutral surface with a few matching props' },
  { group: 'Studio', id: 'overhead', label: 'Overhead drift', text: 'the camera drifts slowly over {s} from directly above, props sliding in and out of frame' },
  { group: 'Studio', id: 'shadow', label: 'Plant shadow play', text: '{s} sits in soft light as leaf shadows from a nearby plant drift slowly across it' },
  { group: 'Lifestyle', id: 'golden', label: 'Golden-hour window light', text: 'warm golden-hour sunlight streams through a window across {s}, dust motes floating in the air' },
  { group: 'Lifestyle', id: 'hands', label: 'Hands pick it up', text: 'hands reach into frame and gently pick up and present {s} to the camera' },
  { group: 'Lifestyle', id: 'model', label: 'Lifestyle with a model', text: 'a smiling model naturally shows off {s} in a stylish, sunlit setting' },
  { group: 'Lifestyle', id: 'unbox', label: 'Unboxing', text: 'hands lift {s} out of tissue paper in a neat shipping box and turn it toward the camera' },
  { group: 'Lifestyle', id: 'roomreveal', label: 'Room reveal from doorway', home: true, text: 'the camera glides from a doorway into a styled room, revealing {s} as the centerpiece' },
  { group: 'Lifestyle', id: 'beforeafter', label: 'Before and after', home: true, text: 'a plain, empty space, then the same space styled with {s}, a clean match cut between the two' },
  { group: 'Lifestyle', id: 'cozy', label: 'Cozy evening', home: true, text: '{s} in a cozy room at night, warm lamps and candles glowing, rain on the window' },
  { group: 'Seasonal and gifts', id: 'gift', label: 'Gift wrap', text: '{s} beside wrapping paper, a ribbon and a gift tag, warm festive light' },
  { group: 'Seasonal and gifts', id: 'holiday', label: 'Holiday scene', text: '{s} in a cozy holiday setting with a decorated tree and soft string lights' },
  { group: 'Seasonal and gifts', id: 'autumn', label: 'Autumn styling', text: '{s} styled with autumn leaves, small pumpkins and warm amber tones' },
  { group: 'Seasonal and gifts', id: 'summer', label: 'Summer brights', text: '{s} in bright summer daylight with fresh flowers and greenery' },
  { group: 'Seasonal and gifts', id: 'valentine', label: 'Valentine\'s Day', text: '{s} with red roses, a handwritten card and soft pink light' }
];
const BLOG_SHOTS = [
  { group: 'Creator moments', id: 'bunbox', label: 'Unboxing reaction', text: 'opens the package, pulls out {s} and reacts with genuine excitement' },
  { group: 'Creator moments', id: 'bclose', label: 'Close-up show', text: 'holds {s} close to the phone camera and turns it to show the details' },
  { group: 'Creator moments', id: 'breview', label: 'Talking review', text: 'sits facing the camera holding {s} and talks about why they love it' },
  { group: 'Creator moments', id: 'bpov', label: 'POV hands', text: 'films a first-person view of their own hands holding {s} and tilting it in the light' },
  { group: 'Creator moments', id: 'bhaul', label: 'Haul favorite', text: 'lays out a few recent finds on the bed and picks up {s} as the favorite' },
  { group: 'Creator moments', id: 'bbeforeafter', label: 'Before and after', home: true, text: 'films the space before, then shows it again after adding {s}' },
  { group: 'Creator moments', id: 'broomtour', label: 'Room tour', home: true, text: 'walks the camera through their room and stops to show off {s}' },
  { group: 'Gifts', id: 'bgift', label: 'Gift moment', text: 'hands {s} to a friend, who opens it and lights up' },
  { group: 'Gifts', id: 'bgiftwrap', label: 'Wrapping a gift', text: 'wraps {s} with paper and ribbon, then shows the finished gift to the camera' }
];
const MAX_SHOTS = 4;
const fillS = (t, subj) => t.replace(/\{s\}/g, subj);

/** All the shots a category can use for a style, grouped for the picker: [{group, id, label, text}] */
function shotOptions(c, style) {
  const home = HOME_CATS.has(c.id), out = [], mine = 'Made for ' + c.label.toLowerCase();
  if (style === 'blogger') {
    out.push({ group: mine, id: 'buse', label: 'Show it in use', text: c.blogger.action });
    BLOG_SHOTS.forEach(o => { if (!o.home || home) out.push({ group: o.group, id: o.id, label: o.label, text: fillS(o.text, c.subject) }); });
  } else {
    const labels = scenesFor(c);
    Object.keys(c.pro).forEach(k => out.push({ group: mine, id: k, label: labels[k] || k, text: c.pro[k] }));
    PRO_SHOTS.forEach(o => { if ((!o.home || home) && !c.pro[o.id]) out.push({ group: o.group, id: o.id, label: o.label, text: fillS(o.text, c.subject) }); });
  }
  return out;
}
/** The picked shots that exist for this category and style, in pick order, at most MAX_SHOTS. */
function pickedShots(st, c) {
  const opts = shotOptions(c, st.style), byId = new Map(opts.map(o => [o.id, o]));
  const want = ((st.picks && st.picks[st.style]) || []).filter(id => byId.has(id)).slice(0, MAX_SHOTS);
  if (!want.length) want.push(st.style === 'blogger' ? 'buse' : (byId.has(st.scene) ? st.scene : 'hero'));
  return want.map(id => byId.get(id));
}
function splitDurations(total, n) {
  n = Math.max(1, Math.min(n, Math.floor(total / 2) || 1));
  const base = Math.floor(total / n), out = Array(n).fill(base); out[0] += total - base * n; return out;
}

/** Build the prompt (and, for multi-shot Kling, a shot list) for one clip. */
function buildPrompt(st, shape, modelInfo) {
  const cat = catById(st.cat), p = st.product, subj = cat.subject, keep = KEEP(subj);
  const audioLine = st.audio ? '' : ' No speech.';
  const picks = pickedShots(st, cat), multi = !!(modelInfo && modelInfo.multiShot && st.multiShot);
  const total = (st.durations && st.durations[shape]) || 10;
  if (st.style === 'pro') {
    const cam = CAMERAS[st.camera] || CAMERAS.dolly;
    const action = picks.length === 1 ? `${cap(picks[0].text)}.`
      : `A short edit of ${picks.length} shots. ${picks.map((x, i) => `Shot ${i + 1}: ${x.text}.`).join(' ')}`;
    const prompt = `Professional commercial product video, filmed by a professional videographer on a cinema camera. ${action} Camera: ${cam}. Soft, high-end studio-quality lighting, shallow depth of field, natural color grade, smooth stabilized motion, photorealistic, crisp detail. ${productLine(p)} ${keep} ${compositionHint(shape)} No on-screen text, no watermark.${audioLine}`.replace(/\s+/g, ' ').trim();
    let shots = [];
    if (multi && picks.length > 1) {
      const d = splitDurations(total, picks.length);
      shots = d.map((sec, i) => ({ prompt: clipText(`Professional product video on a cinema camera. ${cap(picks[i].text)}. Camera: ${cam}. ${keep}`, 500), duration: sec }));
    }
    return { prompt, shots };
  }
  const b = cat.blogger, line = (st.line || b.line).replace(/"/g, '\'');
  const speech = st.audio ? ` Speaking naturally to camera, they say: "${line}"` : ' No speech.';
  const doing = picks.map(x => x.text).join(', then ');
  const prompt = `Authentic UGC-style social video filmed on a smartphone by a friendly lifestyle blogger, handheld with natural slight shake, casual and genuine, like a real TikTok or Instagram product review. ${cap(b.setting)}, the creator ${doing}. Natural daylight, real home setting, true-to-life color.${speech} ${productLine(p)} ${keep} ${compositionHint(shape)} No captions, no watermark.`.replace(/\s+/g, ' ').trim();
  let shots = [];
  if (multi && picks.length > 1) {
    const d = splitDurations(total, picks.length), last = d.length - 1;
    shots = d.map((sec, i) => ({ prompt: clipText(`Phone-shot UGC. ${cap(b.setting)}, a friendly creator ${picks[i].text}.${i === 0 ? ' ' + keep : ''}${st.audio && i === last ? ` They say: "${line}"` : ''}`, 500), duration: sec }));
  } else if (multi && picks[0].id === 'buse') {
    const a = Math.max(1, Math.round(total * 0.35)), c = Math.max(1, Math.round(total * 0.3)), m = Math.max(1, total - a - c);
    if (b.shots) {
      const t = b.shots, d = [a, m, c];
      shots = [
        { prompt: clipText(`Phone-shot UGC. ${t[0]}${st.audio ? ' They say: "You have to see this."' : ''}`, 500), duration: d[0] },
        { prompt: clipText(`Phone-shot UGC. ${t[1]} ${keep}`, 500), duration: d[1] },
        { prompt: clipText(`Phone-shot UGC. ${t[2]}${st.audio ? ` They say: "${line}"` : ''}`, 500), duration: d[2] }
      ];
    } else {
      shots = [
        { prompt: clipText(`Phone-shot UGC. ${cap(b.setting)}, a friendly creator holds ${subj} up to the camera with an excited smile.${st.audio ? ' They say: "You have to see this."' : ''}`, 500), duration: a },
        { prompt: clipText(`Handheld close-up of ${subj}, the creator's hand turns it to show the design and details. ${keep}`, 500), duration: m },
        { prompt: clipText(`The creator uses or wears ${subj} and gives a thumbs up to camera.${st.audio ? ` They say: "${line}"` : ''}`, 500), duration: c }
      ];
    }
  }
  return { prompt, shots };
}
function cap(s) { s = String(s || ''); return s ? s[0].toUpperCase() + s.slice(1) : s; }
function clipText(s, n) { s = String(s); return s.length <= n ? s : s.slice(0, n - 1); }

/* ---------- SEO copy, tailored by category and shop ---------- */
function categoryCopy(st) {
  const cat = catById(st.cat), shop = SHOPS[cat.shop];
  const p = Object.assign({}, st.product);
  p.cta = (p.cta || '').trim() || shop.cta;
  if (!(p.features || []).some(f => String(f || '').trim())) p.features = cat.features.slice();
  const base = templateCopy(p); // from core.js
  const kw = keywordsOf(p);
  const seo = uniqKw([...cat.keywords.slice(0, 4), ...shop.keywords, ...kw.slice(0, 2)]);
  const nameTag = toTag(p.name || cat.label);
  const catTags = cat.tags, shopTags = shop.tags;
  base.tiktok.hashtags = uniqTags([nameTag, catTags[0], catTags[1], shopTags[0], '#TikTokMadeMeBuyIt']).slice(0, 5);
  base.reels.hashtags = uniqTags([nameTag, ...catTags, ...shopTags, ...seo.slice(0, 3).map(toTag)]).slice(0, 8);
  base.shorts.hashtags = uniqTags(['#Shorts', catTags[0], shopTags[0]]).slice(0, 3);
  base.shorts.title = clip(`${p.name || cat.label}: ${cap(seo[0] || cat.label)} ${cat.shop === 'emb' ? 'made to order' : 'you will love'} #Shorts`, 100);
  base.pinterest.title = clip(`${p.name || cat.label} | ${seo.slice(0, 3).map(cap).join(', ')}`, 100);
  base.pinterest.keywords = seo.slice(0, 8);
  const f = p.features.map(x => String(x || '').trim()).filter(Boolean), desc = (p.desc || '').trim().replace(/\.$/, '');
  base.pinterest.description = clip(`${desc ? desc + '. ' : ''}${f.join('. ')}${f.length ? '. ' : ''}A great pick if you love ${seo.slice(0, 3).join(', ')}. ${cat.shop === 'pod' ? 'Find it in my Etsy shop' : 'Made to order with your name, logo or design'}: ${p.cta} at ${(p.link || '').trim() || 'the link'}.`.replace(/\s+/g, ' '), 500);
  base.x.post = clipX(`${base.x.post} ${catTags[0]}`);
  return base;
}
function uniqKw(a) { const s = new Set(); return a.filter(x => { x = String(x || '').toLowerCase().trim(); if (!x || s.has(x)) return false; s.add(x); return true; }); }
