/**
 * The Wikimedia Commons search behind each dish photograph.
 *
 * One entry per dish on the menu, keyed by the dish name exactly as it appears in
 * javatri-menu.json. The query is what we ask Commons for, not what the dish is called —
 * "Kori Gassi" returns nothing on Commons, "Mangalorean chicken curry" returns the dish.
 *
 * These are library photographs of the dish *type*, not photographs of Javatri's food. See
 * QUESTIONS_FOR_CLIENT.md #16: the moment the kitchen sends real photography, set
 * MenuItem.imageUrl on the dish and it wins over anything in here.
 *
 * A query of the form `file:Some File.jpg` pins that exact Commons file, for the few dishes
 * whose name matches scanned books and family albums before it matches food.
 *
 * A dish with no entry falls back to its category query in CATEGORY_QUERIES, so a menu change
 * degrades to a plausible photograph rather than to a hole.
 */
export const DISH_QUERIES = {
  // Chaat Corner
  'Samosa Chaat': 'samosa chaat',
  'Papri Chaat': 'papri chaat',
  'Aloo Tikki Chaat': 'aloo tikki chaat',
  'Pani Puri': 'pani puri golgappa',
  'Dahi Bhalla': 'dahi vada bhalla',
  'Palak Patta Chaat': 'chaat yoghurt chutney',

  // Classic Indian Street Bite (Veg)
  'Poppadum Basket': 'papadum',
  'Masala Poppadum': 'masala papad onion tomato',
  'Punjabi Samosa': 'punjabi samosa',
  'Aloo Tikki with Chickpea': 'aloo tikki chole',
  'Hara Bhara Kebab': 'hara bhara kabab',
  'Vegetable Pakora': 'pakoda fritter',
  'Okra Fries / Kurkuri Bhindi': 'kurkuri bhindi okra fry',
  'Vegetable Momos': 'vegetable momo dumpling',

  // Classic Indian Street Bite (Non-Veg)
  'Chicken Momos': 'chicken momo',
  'Lamb Momos': 'mutton momo',

  // Tongue Ticklers - Modern Starters (Veg)
  'Onion and Spinach Bhaji': 'onion bhaji',
  'Salt and Pepper Mogo': 'cassava fries',
  'Tandoori Paneer Shashlick': 'paneer tikka skewer',
  'Veg Chowmein': 'vegetable chow mein noodles',
  'Hakka Noodles': 'hakka noodles',
  'Chilli Paneer': 'chilli paneer',
  'Paneer 65': 'fried paneer cubes',
  'Paneer Pakoda (5 pieces)': 'paneer pakora',
  'Gobi Manchurian': 'manchurian cauliflower',
  'Paneer Malai Tikka': 'malai paneer tikka',
  'Soya Chaap': 'soya chaap',

  // Tongue Ticklers - Modern Starters (Non-Veg)
  'Chicken 65': 'chicken 65',
  'Chilli Chicken': 'chilli chicken',
  'Chicken Noodles': 'chicken noodles indian',
  'Chicken Manchurian': 'chicken manchurian',
  'Fish Chilli': 'chilli fish fried',
  'Lamb Samosa': 'meat samosa',

  // Famous Indian Grill (Non-Veg)
  'Malai Chicken Tikka': 'malai chicken tikka',
  'Chicken Tikka Shashlick': 'chicken tikka skewer',
  'Garlic Chicken Tikka': 'chicken tikka grilled',
  'Tandoori Chicken (6 pieces)': 'tandoori chicken',
  'Lamb Seekh Kebab': 'seekh kabab',
  'Lamb Chops': 'lamb chops cooked plate',
  'Chicken Seekh Kebab': 'chicken seekh kabab',
  'Chicken Sharabi Tikka': 'chicken tikka tandoor',

  // Main Sea Food Galore
  'Tandoori Prawns': 'tandoori prawns',
  'Fish Jalandhari': 'amritsari fish fry',
  'Salt and Pepper Prawns': 'salt and pepper prawns',
  'Chilli Squid': 'fried calamari squid rings',
  'Salmon Tikka': 'grilled salmon fillet',
  'Fish Masala': 'fish curry masala',
  'Jhinga Malai Curry': 'prawn malai curry',
  'Prawn do Pyaza': 'prawn curry indian',
  'Sea Food Moliee': 'fish moilee kerala',

  // Biryanis
  'King Prawn Biryani': 'prawn biryani',
  'Hyderabadi Gosht Biryani': 'hyderabadi mutton biryani',
  'Chicken Biryani': 'chicken biryani',
  'Veg Biryani': 'vegetable biryani',

  // Vegetarian Delights
  'Channa Masala': 'chana masala chole',
  'Bhindi do Pyaza': 'bhindi masala okra curry',
  'Mirchi Baigan ka Salan': 'mirchi ka salan',
  Koftas: 'malai kofta curry',
  'Baigan ka Bharta': 'baingan bharta',
  'Mix Veg Curry': 'mixed vegetable curry',
  'Veg Tawa Fry': 'tawa vegetable fry',
  'Choice of Potatoes': 'jeera aloo potato',

  // Sharing Platters
  'Vegetarian Platter': 'vegetarian thali platter',
  'Mixed Tandoori Grill': 'tandoori chicken platter grill',
  'Sea Food Platter': 'seafood platter grilled',
  'Vegetarian Tandoor Platter': 'tandoori vegetable platter',
  'B&B Special Family Mix Grill': 'tandoori platter kebab',

  // Choice of Paneer
  'Kadai Paneer': 'file:Kadai Paneer (15913018051).jpg',
  'Palak Paneer': 'palak paneer',
  'Matar Paneer': 'matar paneer',
  'Paneer Lababdar': 'paneer lababdar',
  'Paneer Butter Masala': 'paneer butter masala',
  'Saag Paneer': 'saag paneer curry',

  // Indian Lentils
  'Dal Makhani': 'dal makhani',
  'Dal Tadka': 'dal tadka',
  'Dal Palak': 'palak dal spinach lentil',
  'Punjabi Rajma Masala': 'rajma masala kidney bean',

  // Main Course Lamb
  'Railway Lamb Curry': 'railway mutton curry',
  'Rogan Josh': 'rogan josh',
  'Lamb Vindaloo': 'vindaloo curry',
  'Handi Gosht': 'handi mutton',
  'Rajasthani Laal Maas': 'file:Mutton Curry (44786).jpg',
  'Badami Lamb Korma': 'mutton korma',
  'Dhaba ka Keema': 'keema matar mince',
  'Lamb Madras': 'madras curry lamb',
  'Punjabi Meat Masala': 'mutton masala curry bowl',
  'Kadai Lamb': 'kadai mutton',
  'Saag Lamb': 'palak gosht lamb spinach',
  'Seekh Kebab Masala': 'file:Seekh Kabab 2.JPG',
  'Lamb Bhuna': 'bhuna curry',

  // Main Course Chicken
  'Butter Chicken Dilli Wala': 'butter chicken curry bowl',
  'Kadai Murg': 'kadai chicken',
  'Kori Gassi': 'mangalorean chicken curry',
  'Chicken Badami Korma': 'chicken korma',
  'Dhaba Chicken': 'dhaba chicken curry',
  'Chicken Balti': 'balti chicken',
  'Chicken Tikka Masala': 'chicken tikka masala',
  'Chicken Dhansak': 'dhansak',
  'Chicken Jalfrezi': 'chicken jalfrezi',
  'Saag Wala Chicken': 'saag chicken spinach',
  'Chicken Madras': 'madras chicken curry',
  'Methi Murgh': 'chicken curry fenugreek leaves',
  'Chicken do Pyaza': 'chicken do pyaza onion',

  // Choice of Rice (Basmati)
  'Plain Rice': 'basmati rice cooked bowl',
  'Pulao Rice': 'file:Peas Pilaf And Basmati Rice - The Indismart Hotel - Salt Lake City - Kolkata 2023-09-10 5203.jpg',
  'Veg Pulao': 'vegetable pulao',
  'Egg Rice': 'egg fried rice bowl',
  'Mushroom & Garlic Rice': 'mushroom fried rice',
  'Lemon Rice': 'lemon rice',

  // Choice of Naan & Breads
  'Plain Naan': 'naan bread',
  'Butter Naan': 'naan bread plate',
  'Garlic Naan': 'garlic naan',
  'Chilli Garlic Naan': 'file:Butter Naan 2.jpg',
  'Peshwari Naan': 'file:Naan 2.jpg',
  'Cheese Naan': 'cheese naan',
  'Keema Naan': 'keema naan',
  'Lacha Parantha': 'lachha paratha',
  'Pudina Paratha': 'paratha flatbread mint',
  'Tawa Paratha': 'tawa paratha',
  'Aloo Parantha': 'aloo paratha',
  'Tandoori Roti': 'tandoori roti',
  'Missi Roti': 'missi roti',
  'Roti Basket': 'chapati bread',

  // Salads & Raita
  'Green Salad': 'salad lettuce tomato cucumber plate',
  'Onion Salad': 'onion salad rings',
  'Desi Kachumber': 'kachumber salad',
  'Plain Yoghurt': 'yogurt bowl curd',
  'Cumin Raita': 'raita yoghurt',
  'Mix-Veg Raita': 'vegetable raita',
  'Boondi Raita': 'boondi raita',

  // Indian Street Food
  'Paper Dosa': 'paper dosa',
  'Masala Dosa': 'masala dosa',
  'Mysore Masala Dosa': 'mysore masala dosa',
  'Paneer Dosa': 'paneer dosa',
  'Rawa Dosa': 'rava dosa',
  Upma: 'upma',
  'Onion Vada Sambhar': 'medu vada sambar',
  'Onion Tomato Uttapam': 'uttapam onion tomato',
  Pongal: 'ven pongal',
  Sambar: 'sambar south indian lentil',
  'Chole Bhature': 'chole bhature',
  'Puri Bhaji': 'puri bhaji',
  'Bombay Pav Bhaji': 'pav bhaji masala',
  'Gobi Parantha': 'gobi paratha',
  'Paneer Parantha': 'paneer paratha',

  // Desserts
  'Red Velvet Cheesecake': 'red velvet cheesecake',
  'New York Cheesecake': 'new york cheesecake',
  'Lemon Meringue Pie': 'lemon meringue pie slice',
  'Black Forest Gateau': 'black forest cake',
  'Carrot Cake': 'carrot cake slice plate',
  'Chocolate Fudge Cake': 'chocolate fudge cake',
  'Chocolate Brownie Cake': 'chocolate brownie',
  'Choice of Ice Cream': 'ice cream scoops bowl',
  'Malai Kulfi Ice Cream': 'kulfi',
  'Gulab Jamun': 'gulab jamun',
  'Gajar ka Halwa': 'gajar ka halwa carrot',
  'Apple Crumble': 'apple crumble',

  // Coffee & Tea
  Americano: 'caffe americano cup',
  Cappuccino: 'cappuccino cup',
  'Café Latte': 'caffe latte glass',
  Espresso: 'espresso coffee',
  'Masala Chai': 'masala chai tea',
  'English Breakfast Tea': 'black tea cup english breakfast',
  'Liqueur Coffee': 'irish coffee glass',
  'Hot Chocolate': 'hot chocolate whipped cream mug',

  // Liqueurs
  "Bailey's": 'baileys irish cream',
  'Tia Maria': 'tia maria liqueur',
  Drambuie: 'drambuie bottle',
  Amaretto: 'amaretto liqueur',
  'Southern Comfort': 'southern comfort whiskey',

  // Beer & Cider
  Cobra: 'cobra beer bottle glass',
  Peroni: 'peroni beer',
  "Foster's": 'lager beer glass',
  'Kingfisher (650ml)': 'kingfisher beer bottle glass india',
  'Guinness (500ml)': 'guinness pint',
  "Inch's Cider": 'cider pint glass',
  "Magner's": 'cider glass pub',
  "Beck's Zero": 'becks beer bottle',
  'Peroni Zero': 'peroni nastro azzurro',
}

/** Fallback for any dish added later that has no entry above. */
export const CATEGORY_QUERIES = {
  'Chaat Corner': 'indian chaat',
  'Classic Indian Street Bite (Veg)': 'indian vegetarian starter',
  'Classic Indian Street Bite (Non-Veg)': 'indian meat starter',
  'Tongue Ticklers - Modern Starters (Veg)': 'indo chinese vegetarian starter',
  'Tongue Ticklers - Modern Starters (Non-Veg)': 'indo chinese chicken starter',
  'Famous Indian Grill (Non-Veg)': 'tandoori grill kebab',
  'Main Sea Food Galore': 'indian seafood curry',
  Biryanis: 'biryani',
  'Vegetarian Delights': 'indian vegetable curry',
  'Sharing Platters': 'indian food platter',
  'Choice of Paneer': 'paneer curry',
  'Indian Lentils': 'dal lentil curry',
  'Main Course Lamb': 'mutton curry',
  'Main Course Chicken': 'chicken curry indian',
  'Choice of Rice (Basmati)': 'basmati rice dish',
  'Choice of Naan & Breads': 'indian flatbread naan',
  'Salads & Raita': 'raita salad indian',
  'Indian Street Food': 'south indian food',
  Desserts: 'dessert plate',
  'Coffee & Tea': 'coffee cup',
  Liqueurs: 'liqueur glass',
  'Beer & Cider (partial, unverified)': 'beer glass',
}
