// Copy for the per-sport landing pages (blockcast.ca/golf-weather/ etc.).
// Factor weights and comfort bands are read from core/activities.ts at build
// time, so the pages can never drift from what the app actually scores.
// House style: no em dashes in anything a visitor reads.

export const SPORTS = [
  {
    id: 'golf',
    en: {
      slug: 'golf-weather',
      name: 'Golf',
      title: 'Golf Weather Forecast: Best Tee Times This Week',
      h1: 'Golf weather, scored for your tee time',
      lede: 'BlockCast splits every day of your week into blocks and scores each one for golf: green means go, yellow means pack the rain gear, red means book another day. Rain, wind, gusts, feels-like temperature and UV, all in one glance.',
      meta: 'Find the best tee time this week. BlockCast scores every block of your week green, yellow or red for golf from live rain, wind, temperature and UV forecasts. Free on iPhone and the web.',
      shot: 'Orlando',
      faq: [
        [
          'How windy is too windy for golf?',
          'Most golfers start to feel the wind at 15 to 20 km/h (10 to 12 mph), and above 30 to 40 km/h (20 to 25 mph) club selection and putting get genuinely hard. BlockCast starts adding risk at 20 km/h of sustained wind and counts 45 km/h, or gusts near 70 km/h, as a full red. You can move that line under Adjust if you play links courses for fun.',
        ],
        [
          'Can you play golf in the rain?',
          'Light rain is playable with the right gear, but soaked greens, standing water and cold hands add up fast, which is why rain carries a weight of 9 out of 10 for golf. BlockCast takes the wettest of three forecast models, so a green block means every credible model agrees it stays dry. Always follow your course’s lightning policy.',
        ],
        [
          'What is the best time of day to golf?',
          'It depends on the day, which is the point of BlockCast. In summer an early tee time usually dodges heat and UV, in spring and fall the warm middle of the day often wins. Pick 2, 3, 4 or 6 hour blocks to match a 9 or an 18 and compare morning and afternoon side by side.',
        ],
      ],
    },
    fr: {
      slug: 'meteo-golf',
      name: 'Golf',
      title: 'Météo golf : les meilleurs départs de la semaine',
      h1: 'La météo du golf, notée pour votre départ',
      lede: 'BlockCast découpe chaque journée de votre semaine en blocs et note chacun pour le golf : vert, on y va, jaune, on apporte l’imperméable, rouge, on choisit un autre jour. Pluie, vent, rafales, température ressentie et UV, d’un seul coup d’œil.',
      meta: 'Trouvez le meilleur départ de la semaine. BlockCast note chaque bloc de votre semaine en vert, jaune ou rouge pour le golf selon la pluie, le vent, la température et les UV. Gratuit sur iPhone et sur le web.',
      shot: 'Fort Lauderdale',
      faq: [
        [
          'À partir de quel vent le golf devient-il difficile?',
          'La plupart des golfeurs sentent le vent dès 15 à 20 km/h, et au-delà de 30 à 40 km/h le choix de bâton et les coups roulés deviennent vraiment difficiles. BlockCast commence à ajouter du risque à 20 km/h de vent soutenu et compte 45 km/h, ou des rafales près de 70 km/h, comme un rouge complet. Vous pouvez déplacer ce seuil dans Ajuster.',
        ],
        [
          'Peut-on jouer au golf sous la pluie?',
          'Une pluie légère se joue avec le bon équipement, mais les verts détrempés, l’eau stagnante et les mains froides s’additionnent vite. C’est pourquoi la pluie pèse 9 sur 10 pour le golf. BlockCast retient le plus pluvieux de trois modèles de prévision : un bloc vert veut dire que tous les modèles crédibles s’entendent sur un temps sec. Suivez toujours la politique de foudre de votre club.',
        ],
        [
          'Quel est le meilleur moment de la journée pour jouer?',
          'Ça dépend de la journée, et c’est justement le rôle de BlockCast. L’été, un départ tôt évite la chaleur et les UV; au printemps et à l’automne, le milieu de journée gagne souvent. Choisissez des blocs de 2, 3, 4 ou 6 heures pour un 9 ou un 18 trous et comparez matin et après-midi.',
        ],
      ],
    },
  },
  {
    id: 'tennis',
    en: {
      slug: 'tennis-weather',
      name: 'Tennis',
      title: 'Tennis Weather Forecast: When to Book the Court',
      h1: 'Tennis weather, block by block',
      lede: 'Which evening this week should you book the court? BlockCast scores every block of your week for tennis from live rain, wind, feels-like temperature and UV forecasts, so the answer is a green square instead of five weather tabs.',
      meta: 'Know which evening to book the court. BlockCast scores every block of your week green, yellow or red for tennis from live rain, wind, temperature and UV forecasts. Free on iPhone and the web.',
      shot: 'Charlotte',
      faq: [
        [
          'Can you play tennis after it rains?',
          'A wet hard court is slippery and the lines get dangerous, so even a short shower can cost an hour of drying time. That is why rain carries the full weight of 10 out of 10 for tennis in BlockCast, and why the app takes the wettest of three forecast models before it calls a block green.',
        ],
        [
          'How windy is too windy for tennis?',
          'Wind starts to move the toss and the lob at around 20 km/h (12 mph), and gusts make timing unpredictable well before that. BlockCast adds risk from 20 km/h of sustained wind and weighs gusts on their own, so a calm average with a gusty afternoon still shows up.',
        ],
        [
          'What temperature is too hot for tennis?',
          'BlockCast scores tennis as comfortable between 10 and 30 °C (50 and 86 °F) of feels-like temperature, which already folds in humidity and wind chill. Outside that band the block turns yellow, then red. Your own limits may differ, and you can move both ends under Adjust.',
        ],
      ],
    },
    fr: {
      slug: 'meteo-tennis',
      name: 'Tennis',
      title: 'Météo tennis : quand réserver le terrain',
      h1: 'La météo du tennis, bloc par bloc',
      lede: 'Quel soir de la semaine réserver le terrain? BlockCast note chaque bloc de votre semaine pour le tennis selon la pluie, le vent, la température ressentie et les UV. La réponse tient dans un carré vert plutôt que dans cinq onglets météo.',
      meta: 'Sachez quel soir réserver le terrain. BlockCast note chaque bloc de votre semaine en vert, jaune ou rouge pour le tennis selon la pluie, le vent, la température et les UV. Gratuit sur iPhone et sur le web.',
      shot: 'Montréal',
      faq: [
        [
          'Peut-on jouer au tennis après la pluie?',
          'Un terrain dur mouillé est glissant et les lignes deviennent dangereuses : une courte averse peut coûter une heure de séchage. C’est pourquoi la pluie pèse 10 sur 10 pour le tennis dans BlockCast, qui retient en plus le plus pluvieux de trois modèles avant de déclarer un bloc vert.',
        ],
        [
          'À partir de quel vent le tennis devient-il pénible?',
          'Le vent déplace le lancer et le lob dès environ 20 km/h, et les rafales dérèglent le timing bien avant. BlockCast ajoute du risque dès 20 km/h de vent soutenu et pèse les rafales séparément.',
        ],
        [
          'Quelle température est trop chaude pour le tennis?',
          'BlockCast juge le tennis confortable entre 10 et 30 °C ressentis, une mesure qui tient déjà compte de l’humidité et du refroidissement éolien. Hors de cette plage, le bloc passe au jaune puis au rouge. Vous pouvez déplacer les deux limites dans Ajuster.',
        ],
      ],
    },
  },
  {
    id: 'pickleball',
    en: {
      slug: 'pickleball-weather',
      name: 'Pickleball',
      title: 'Pickleball Weather Forecast: Wind, Rain and Heat by the Hour',
      h1: 'Pickleball weather, scored for outdoor courts',
      lede: 'An outdoor pickleball is a hollow plastic ball with holes in it, and the wind knows. BlockCast scores every block of your week for pickleball with wind weighted higher than for tennis, plus rain, heat and UV, so you can pick the calm morning before you text the group.',
      meta: 'Pick the calm, dry morning before you text the group. BlockCast scores every block of your week green, yellow or red for outdoor pickleball, with wind weighted heavily. Free on iPhone and the web.',
      shot: 'Naples',
      faq: [
        [
          'How windy is too windy for pickleball?',
          'Outdoor balls are light and perforated, so they drift sooner than a tennis ball: many players notice it at 15 km/h (10 mph) and find 25 km/h (15 mph) frustrating. BlockCast weighs wind at 8 out of 10 for pickleball, against 6 for tennis, and scores gusts separately.',
        ],
        [
          'Can you play pickleball in the rain?',
          'Wet courts are slippery and painted lines get slick, so most clubs close them. Rain carries the full 10 out of 10 weight, and BlockCast uses the wettest of three forecast models so a green block really means dry.',
        ],
        [
          'Does BlockCast work for snowbird season in Florida and Arizona?',
          'Yes. Save up to three places, for example home and your winter spot, and switch between them from the top of the screen. Units follow your phone (°F and mph in the US) and you can change them in Settings.',
        ],
      ],
    },
    fr: {
      slug: 'meteo-pickleball',
      name: 'Pickleball',
      title: 'Météo pickleball : vent, pluie et chaleur heure par heure',
      h1: 'La météo du pickleball, notée pour les terrains extérieurs',
      lede: 'Une balle de pickleball extérieure est une sphère de plastique trouée, et le vent le sait. BlockCast note chaque bloc de votre semaine pour le pickleball avec un vent pesé plus lourd qu’au tennis, en plus de la pluie, de la chaleur et des UV.',
      meta: 'Choisissez le matin calme et sec avant d’écrire au groupe. BlockCast note chaque bloc de votre semaine en vert, jaune ou rouge pour le pickleball extérieur. Gratuit sur iPhone et sur le web.',
      shot: 'Pompano Beach',
      faq: [
        [
          'À partir de quel vent le pickleball devient-il difficile?',
          'Les balles extérieures sont légères et perforées : elles dérivent plus tôt qu’une balle de tennis. Bien des joueurs le sentent dès 15 km/h et trouvent 25 km/h frustrant. BlockCast pèse le vent à 8 sur 10 pour le pickleball, contre 6 pour le tennis, et note les rafales séparément.',
        ],
        [
          'Peut-on jouer au pickleball sous la pluie?',
          'Les terrains mouillés et les lignes peintes deviennent glissants, et la plupart des clubs ferment. La pluie pèse 10 sur 10, et BlockCast retient le plus pluvieux de trois modèles pour qu’un bloc vert veuille vraiment dire sec.',
        ],
        [
          'BlockCast fonctionne-t-il en Floride pour l’hiver?',
          'Oui. Enregistrez jusqu’à trois lieux, par exemple votre ville et votre coin de Floride, et passez de l’un à l’autre en haut de l’écran. Les unités restent en °C et km/h si votre téléphone est réglé ainsi.',
        ],
      ],
    },
  },
  {
    id: 'cycling',
    en: {
      slug: 'cycling-weather',
      name: 'Cycling',
      title: 'Cycling Weather Forecast: Plan Your Ride Around Wind and Rain',
      h1: 'Cycling weather, scored for your ride',
      lede: 'Headwinds, wet roads and wind chill on a descent: cycling punishes the weather more than most sports. BlockCast scores every block of your week for riding, with rain and wind both weighted at 8 out of 10, so the long ride lands on the calm dry day.',
      meta: 'Put the long ride on the calm, dry day. BlockCast scores every block of your week green, yellow or red for cycling from live rain, wind, gust, temperature and UV forecasts. Free on iPhone and the web.',
      shot: 'Toronto',
      faq: [
        [
          'How windy is too windy for cycling?',
          'Sustained wind above about 25 km/h (15 mph) turns a flat loop into interval training, and gusts above 50 km/h (30 mph) make a road bike hard to hold in a crosswind. BlockCast ramps risk from 20 km/h sustained and from 38 km/h in gusts.',
        ],
        [
          'What temperature is too cold to ride?',
          'BlockCast uses feels-like temperature, which includes wind chill, and scores cycling as comfortable between 5 and 32 °C (41 and 90 °F). On a bike you make your own wind, so a cold, breezy morning scores lower than the thermometer suggests.',
        ],
        [
          'Does BlockCast tell me wind direction?',
          'Not yet. The scores use wind speed and gusts. Open any block for an hour-by-hour chart of rain and wind, and the radar to see showers coming.',
        ],
      ],
    },
    fr: {
      slug: 'meteo-velo',
      name: 'Vélo',
      title: 'Météo vélo : planifiez votre sortie selon le vent et la pluie',
      h1: 'La météo du vélo, notée pour votre sortie',
      lede: 'Vent de face, routes mouillées, refroidissement éolien en descente : le vélo encaisse la météo plus que la plupart des sports. BlockCast note chaque bloc de votre semaine pour le vélo, pluie et vent pesés à 8 sur 10, pour que la grande sortie tombe le jour calme et sec.',
      meta: 'Placez la grande sortie le jour calme et sec. BlockCast note chaque bloc de votre semaine en vert, jaune ou rouge pour le vélo selon la pluie, le vent, les rafales, la température et les UV. Gratuit sur iPhone et sur le web.',
      shot: 'Montréal',
      faq: [
        [
          'À partir de quel vent le vélo devient-il difficile?',
          'Un vent soutenu de plus de 25 km/h transforme une boucle plate en entraînement par intervalles, et des rafales de plus de 50 km/h rendent un vélo de route difficile à tenir par vent de travers. BlockCast augmente le risque dès 20 km/h soutenus et dès 38 km/h en rafales.',
        ],
        [
          'Quelle température est trop froide pour rouler?',
          'BlockCast utilise la température ressentie, qui inclut le refroidissement éolien, et juge le vélo confortable entre 5 et 32 °C. À vélo, on crée son propre vent : un matin frais et venteux obtient une note plus basse que ce que le thermomètre laisse croire.',
        ],
        [
          'BlockCast donne-t-il la direction du vent?',
          'Pas encore. Les notes utilisent la vitesse du vent et les rafales. Ouvrez un bloc pour voir la pluie et le vent heure par heure, et le radar pour voir venir les averses.',
        ],
      ],
    },
  },
  {
    id: 'jogging',
    en: {
      slug: 'running-weather',
      name: 'Running',
      title: 'Running Weather Forecast: Best Time to Run This Week',
      h1: 'Running weather, scored for your next run',
      lede: 'For runners the big risk is heat, not rain. BlockCast scores every block of your week for running with heat weighted at 8 out of 10 and a comfort band built for the effort, so the tempo run goes on the cool morning and the easy jog takes the drizzle.',
      meta: 'Find the cool, calm window for your next run. BlockCast scores every block of your week green, yellow or red for running, with heat weighted most. Free on iPhone and the web.',
      shot: 'Vancouver',
      faq: [
        [
          'What is the best temperature for running?',
          'Most runners do their best work in the cool range, roughly 5 to 15 °C (41 to 59 °F). BlockCast scores running as comfortable between 0 and 26 °C (32 and 79 °F) of feels-like temperature, and above that the block turns yellow fast, because heat costs runners more than any other weather.',
        ],
        [
          'Should I run in the rain?',
          'Usually yes: rain weighs only 5 out of 10 for running, against 10 for tennis. A steady downpour or a cold rain still pushes a block toward yellow, and you can raise the weight under Adjust if you hate wet socks.',
        ],
        [
          'Does BlockCast include air quality?',
          'Yes, on the Today view: Canada’s AQHI for Canadian locations and the EPA AQI for US locations, which matters on wildfire-smoke days.',
        ],
      ],
    },
    fr: {
      slug: 'meteo-course-a-pied',
      name: 'Course à pied',
      title: 'Météo course à pied : le meilleur moment pour courir',
      h1: 'La météo de la course, notée pour votre prochaine sortie',
      lede: 'Pour les coureurs, le grand risque, c’est la chaleur, pas la pluie. BlockCast note chaque bloc de votre semaine pour la course avec la chaleur pesée à 8 sur 10, pour que le tempo tombe le matin frais et que le footing lent prenne la bruine.',
      meta: 'Trouvez la fenêtre fraîche et calme pour votre prochaine course. BlockCast note chaque bloc de votre semaine en vert, jaune ou rouge pour la course à pied. Gratuit sur iPhone et sur le web.',
      shot: 'Québec',
      faq: [
        [
          'Quelle est la meilleure température pour courir?',
          'La plupart des coureurs performent mieux au frais, environ 5 à 15 °C. BlockCast juge la course confortable entre 0 et 26 °C ressentis; au-delà, le bloc jaunit vite, parce que la chaleur coûte plus cher aux coureurs que toute autre météo.',
        ],
        [
          'Faut-il courir sous la pluie?',
          'En général, oui : la pluie ne pèse que 5 sur 10 pour la course, contre 10 pour le tennis. Une averse soutenue ou une pluie froide pousse quand même le bloc vers le jaune, et vous pouvez augmenter ce poids dans Ajuster.',
        ],
        [
          'BlockCast affiche-t-il la qualité de l’air?',
          'Oui, dans la vue Aujourd’hui : la cote air santé (CAS) pour le Canada et l’indice AQI de l’EPA aux États-Unis, utile les jours de fumée de feux de forêt.',
        ],
      ],
    },
  },
  {
    id: 'hiking',
    en: {
      slug: 'hiking-weather',
      name: 'Hiking',
      title: 'Hiking Weather Forecast: Pick the Right Day for the Trail',
      h1: 'Hiking weather, scored for the trail',
      lede: 'A good hiking day needs everything to line up: dry, not too hot, not too cold, not too windy up top. BlockCast weighs them almost evenly for hiking and scores every block of your week, so the big hike goes on the one day that checks every box.',
      meta: 'Put the big hike on the day that checks every box. BlockCast scores every block of your week green, yellow or red for hiking from live rain, wind, temperature and UV forecasts. Free on iPhone and the web.',
      shot: 'Asheville',
      faq: [
        [
          'What weather is too dangerous for hiking?',
          'Thunderstorms, strong wind on exposed ridges, and cold rain are the classic hazards, along with heat on long climbs. BlockCast flags rain, wind, gusts, cold and heat in its score, but always check your local alerts before an exposed route; the Today view shows official warnings from Environment Canada and the US National Weather Service.',
        ],
        [
          'Does BlockCast forecast the summit?',
          'It forecasts the point you choose. Drop the pin on the trailhead or the summit from the location search, and save up to three spots.',
        ],
        [
          'What is the best time of day to hike?',
          'In summer, early starts beat heat, UV and afternoon storms. Use 4 or 6 hour blocks to see the whole outing in one square.',
        ],
      ],
    },
    fr: {
      slug: 'meteo-randonnee',
      name: 'Randonnée',
      title: 'Météo randonnée : choisissez la bonne journée pour le sentier',
      h1: 'La météo de la randonnée, notée pour le sentier',
      lede: 'Une bonne journée de randonnée demande que tout s’aligne : sec, ni trop chaud, ni trop froid, pas trop venteux au sommet. BlockCast pèse chacun presque également et note chaque bloc de votre semaine, pour que la grande sortie tombe le jour qui coche toutes les cases.',
      meta: 'Placez la grande randonnée le jour qui coche toutes les cases. BlockCast note chaque bloc de votre semaine en vert, jaune ou rouge pour la randonnée. Gratuit sur iPhone et sur le web.',
      shot: 'Magog',
      faq: [
        [
          'Quelle météo est trop dangereuse pour la randonnée?',
          'Les orages, le vent fort sur les crêtes exposées et la pluie froide sont les dangers classiques, tout comme la chaleur dans les longues montées. BlockCast tient compte de la pluie, du vent, des rafales, du froid et de la chaleur, mais vérifiez toujours les alertes avant un parcours exposé; la vue Aujourd’hui affiche les avertissements officiels d’Environnement Canada.',
        ],
        [
          'BlockCast prévoit-il la météo au sommet?',
          'Il prévoit le point que vous choisissez. Placez l’épingle sur le stationnement ou sur le sommet, et enregistrez jusqu’à trois lieux.',
        ],
        [
          'Quel est le meilleur moment pour partir?',
          'L’été, un départ tôt évite la chaleur, les UV et les orages d’après-midi. Utilisez des blocs de 4 ou 6 heures pour voir toute la sortie dans un seul carré.',
        ],
      ],
    },
  },
  {
    id: 'fishing',
    en: {
      slug: 'fishing-weather',
      name: 'Fishing',
      title: 'Fishing Weather Forecast: Wind, Waves and Tide by the Block',
      h1: 'Fishing weather, scored for the boat',
      lede: 'For anglers the wind decides the day: it moves the boat, the line and the waves. BlockCast weighs wind at 9 out of 10 for fishing and, near the coast, adds swell and tide to the score, so you know which morning the lake or the bay will lie down.',
      meta: 'Know which morning the water will lie down. BlockCast scores every block of your week green, yellow or red for fishing from live wind, wave, tide, rain and temperature forecasts. Free on iPhone and the web.',
      shot: 'Tampa',
      faq: [
        [
          'How windy is too windy to fish from a boat?',
          'In a small boat many anglers call it at 20 to 25 km/h (12 to 15 mph); open water builds a chop quickly beyond that. BlockCast ramps risk from 20 km/h of sustained wind and treats strong gusts separately.',
        ],
        [
          'Does BlockCast use waves and tides?',
          'Yes, near the coast. Swell height and the tide cycle are part of the fishing score when marine data exists for your spot. Inland lakes are scored on wind, rain, temperature and UV.',
        ],
        [
          'Does BlockCast use barometric pressure or solunar tables?',
          'No. It scores whether the conditions are comfortable and safe to be out, not whether the fish will bite. That part is still up to you.',
        ],
      ],
    },
    fr: {
      slug: 'meteo-peche',
      name: 'Pêche',
      title: 'Météo pêche : vent, vagues et marée par bloc',
      h1: 'La météo de la pêche, notée pour le bateau',
      lede: 'Pour les pêcheurs, c’est le vent qui décide : il pousse le bateau, la ligne et les vagues. BlockCast pèse le vent à 9 sur 10 pour la pêche et, près des côtes, ajoute la houle et la marée à la note, pour savoir quel matin le lac sera calme.',
      meta: 'Sachez quel matin le plan d’eau sera calme. BlockCast note chaque bloc de votre semaine en vert, jaune ou rouge pour la pêche selon le vent, les vagues, la marée, la pluie et la température. Gratuit sur iPhone et sur le web.',
      shot: 'Trois-Rivières',
      faq: [
        [
          'À partir de quel vent est-il trop venteux pour pêcher en bateau?',
          'En petite embarcation, bien des pêcheurs arrêtent vers 20 à 25 km/h; en eau libre, le clapot monte vite au-delà. BlockCast augmente le risque dès 20 km/h de vent soutenu et traite les fortes rafales séparément.',
        ],
        [
          'BlockCast tient-il compte des vagues et des marées?',
          'Oui, près des côtes. La hauteur de la houle et le cycle de marée font partie de la note de pêche quand des données marines existent pour votre lieu. Les lacs sont notés selon le vent, la pluie, la température et les UV.',
        ],
        [
          'BlockCast utilise-t-il la pression ou les tables solunaires?',
          'Non. Il juge si les conditions sont confortables et sécuritaires pour sortir, pas si le poisson va mordre. Ça, c’est encore votre affaire.',
        ],
      ],
    },
  },
  {
    id: 'sailing',
    en: {
      slug: 'sailing-weather',
      name: 'Sailing',
      title: 'Sailing Weather Forecast: Find the Right Wind This Week',
      h1: 'Sailing weather, scored for the right breeze',
      lede: 'Sailing is the one sport where too little wind is as bad as too much. BlockCast scores every block of your week for sailing against a wind band of 9 to 32 km/h (5 to 17 knots), adds gusts, swell and tide near the coast, and turns the week into a heat map you can read from the dock.',
      meta: 'Find the day with the right breeze, not just the least wind. BlockCast scores every block of your week green, yellow or red for sailing from live wind, gust, wave and rain forecasts. Free on iPhone and the web.',
      shot: 'Annapolis',
      faq: [
        [
          'What is a good wind speed for sailing?',
          'BlockCast’s default band is 9 to 32 km/h (about 5 to 17 knots): enough to move a keelboat, not so much that you are reefing all afternoon. Below the band counts as risk too, so a light-air day shows yellow and a glassy one red. Racers and dinghy sailors can move both ends under Adjust.',
        ],
        [
          'Does BlockCast include gusts and waves?',
          'Yes. Gusts are scored on their own, and near the coast swell height and the tide cycle are part of the sailing score.',
        ],
        [
          'Is BlockCast a marine forecast?',
          'No. It is a planning tool built on public forecast models. Check the official marine forecast and warnings before you leave the dock.',
        ],
      ],
    },
    fr: {
      slug: 'meteo-voile',
      name: 'Voile',
      title: 'Météo voile : trouvez le bon vent cette semaine',
      h1: 'La météo de la voile, notée pour la bonne brise',
      lede: 'La voile est le seul sport où trop peu de vent est aussi mauvais que trop. BlockCast note chaque bloc de votre semaine pour la voile selon une plage de vent de 9 à 32 km/h (5 à 17 nœuds), ajoute les rafales, la houle et la marée près des côtes, et transforme la semaine en carte de couleurs lisible depuis le quai.',
      meta: 'Trouvez le jour avec la bonne brise, pas seulement le moins de vent. BlockCast note chaque bloc de votre semaine en vert, jaune ou rouge pour la voile. Gratuit sur iPhone et sur le web.',
      shot: 'Magog',
      faq: [
        [
          'Quelle vitesse de vent est idéale pour naviguer?',
          'La plage par défaut de BlockCast est de 9 à 32 km/h (environ 5 à 17 nœuds) : assez pour faire avancer un quillard, pas assez pour prendre des ris tout l’après-midi. Sous la plage, c’est aussi un risque : une brise trop faible s’affiche en jaune, une mer d’huile en rouge. Vous pouvez déplacer les deux limites dans Ajuster.',
        ],
        [
          'BlockCast tient-il compte des rafales et des vagues?',
          'Oui. Les rafales sont notées séparément et, près des côtes, la houle et le cycle de marée font partie de la note.',
        ],
        [
          'BlockCast est-il une prévision maritime?',
          'Non. C’est un outil de planification basé sur des modèles publics. Consultez la prévision maritime officielle et les avertissements avant de quitter le quai.',
        ],
      ],
    },
  },
  {
    id: 'skiing',
    en: {
      slug: 'ski-weather',
      name: 'Skiing',
      title: 'Ski Weather Forecast: Powder Days, Base and Cold by the Block',
      h1: 'Ski weather, scored for the hill',
      lede: 'A great ski day is a stack of conditions: a real base, maybe some fresh snow, cold enough to keep it, not so cold or windy that the lifts hurt. BlockCast scores every block of your week for skiing on all of them, so you know which day to call in sick.',
      meta: 'Know which day to ski this week. BlockCast scores every block of your week green, yellow or red for skiing from snow base, fresh snow, temperature, wind and rain forecasts. Free on iPhone and the web.',
      shot: 'Valle Nevado',
      faq: [
        [
          'How does BlockCast score a ski day?',
          'Snow base carries the most weight (9 out of 10): under about 20 cm the ground counts as bare. Fresh snow helps, rain on snow hurts, and the comfortable band is -18 to 6 °C (0 to 43 °F) of feels-like temperature, which includes wind chill on the lift.',
        ],
        [
          'How windy is too windy for skiing?',
          'Strong wind closes upper lifts and makes the chair brutal. BlockCast ramps risk from 20 km/h of sustained wind and from 38 km/h in gusts, then turns red as gusts approach 70 km/h, a common range for wind holds.',
        ],
        [
          'Is the snow forecast for the resort or the town?',
          'For the exact point you pick. Drop the pin on the hill rather than the town below it; snow depth and temperature change a lot with elevation.',
        ],
      ],
    },
    fr: {
      slug: 'meteo-ski',
      name: 'Ski',
      title: 'Météo ski : poudreuse, fond de neige et froid par bloc',
      h1: 'La météo du ski, notée pour la montagne',
      lede: 'Une belle journée de ski, c’est une pile de conditions : un vrai fond de neige, un peu de neige fraîche, assez froid pour la garder, pas trop froid ni venteux pour que le télésiège reste supportable. BlockCast note chaque bloc de votre semaine pour le ski selon tout ça.',
      meta: 'Sachez quel jour skier cette semaine. BlockCast note chaque bloc de votre semaine en vert, jaune ou rouge pour le ski selon le fond de neige, la neige fraîche, la température, le vent et la pluie. Gratuit sur iPhone et sur le web.',
      shot: 'Valle Nevado',
      faq: [
        [
          'Comment BlockCast note-t-il une journée de ski?',
          'Le fond de neige pèse le plus (9 sur 10) : sous environ 20 cm, le sol est considéré comme nu. La neige fraîche aide, la pluie sur la neige nuit, et la plage confortable est de -18 à 6 °C ressentis, refroidissement éolien du télésiège compris.',
        ],
        [
          'À partir de quel vent le ski devient-il pénible?',
          'Le vent fort ferme les remontées du sommet et rend le télésiège brutal. BlockCast augmente le risque dès 20 km/h de vent soutenu et dès 38 km/h en rafales, puis passe au rouge quand les rafales approchent 70 km/h.',
        ],
        [
          'La prévision est-elle pour la station ou pour le village?',
          'Pour le point exact que vous choisissez. Placez l’épingle sur la montagne plutôt que sur le village en bas : le fond de neige et la température changent beaucoup avec l’altitude.',
        ],
      ],
    },
  },
  {
    id: 'snowmob',
    en: {
      slug: 'snowmobile-weather',
      name: 'Snowmobiling',
      title: 'Snowmobile Weather Forecast: Trail Days by Snow Base and Cold',
      h1: 'Snowmobile weather, scored for the trail',
      lede: 'Sledders need a base first and everything else second. BlockCast weighs snow cover at 10 out of 10 for snowmobiling, then warm spells that soften the trail, rain, wind and deep cold, and scores every block of your week so the long ride goes on the right day.',
      meta: 'Plan the long ride on the right day. BlockCast scores every block of your week green, yellow or red for snowmobiling from snow base, temperature, rain and wind forecasts. Free on iPhone and the web.',
      shot: 'Valle Nevado',
      faq: [
        [
          'How much snow do you need to ride?',
          'BlockCast treats ground with less than about 15 cm (6 in) of snow as bare, and snow base carries the full 10 out of 10 weight for snowmobiling. Trails also need to be open: check your club or federation trail report before you load the trailer.',
        ],
        [
          'Why does a warm day score badly?',
          'Above freezing the trail softens, ruts up and gets slushy, so heat weighs 7 out of 10 for sleds. The comfortable band is -25 to 4 °C (-13 to 39 °F) of feels-like temperature.',
        ],
        [
          'Does BlockCast show trail conditions?',
          'No, it scores the weather at the point you choose. Pair it with your local trail map for grooming and closures.',
        ],
      ],
    },
    fr: {
      slug: 'meteo-motoneige',
      name: 'Motoneige',
      title: 'Météo motoneige : les bonnes journées de sentier selon la neige et le froid',
      h1: 'La météo de la motoneige, notée pour le sentier',
      lede: 'En motoneige, il faut d’abord un fond de neige, le reste vient après. BlockCast pèse la couverture de neige à 10 sur 10, puis les redoux qui ramollissent le sentier, la pluie, le vent et le grand froid, et note chaque bloc de votre semaine pour que la longue randonnée tombe le bon jour.',
      meta: 'Planifiez la longue randonnée le bon jour. BlockCast note chaque bloc de votre semaine en vert, jaune ou rouge pour la motoneige selon le fond de neige, la température, la pluie et le vent. Gratuit sur iPhone et sur le web.',
      shot: 'Valle Nevado',
      faq: [
        [
          'Combien de neige faut-il pour rouler?',
          'BlockCast considère un sol avec moins d’environ 15 cm de neige comme nu, et le fond de neige pèse 10 sur 10 pour la motoneige. Les sentiers doivent aussi être ouverts : vérifiez la carte iMotoneige de la FCMQ ou votre club avant de charger la remorque.',
        ],
        [
          'Pourquoi une journée douce obtient-elle une mauvaise note?',
          'Au-dessus de zéro, le sentier ramollit, se creuse et devient de la gadoue : la chaleur pèse 7 sur 10 pour la motoneige. La plage confortable est de -25 à 4 °C ressentis.',
        ],
        [
          'BlockCast affiche-t-il l’état des sentiers?',
          'Non, il note la météo au point choisi. Combinez-le avec la carte des sentiers de votre région pour le surfaçage et les fermetures.',
        ],
      ],
    },
  },
];
