/**
 * Mapping of searchable emoji names to unicode characters.
 * Used by the :emoji: autocomplete in MessageInput.
 */
export const EMOJI_NAME_MAP: Record<string, string> = {
  // Frequently Used
  thumbsup: '👍', '+1': '👍', thumbs_up: '👍',
  heart: '❤️', red_heart: '❤️',
  joy: '😂', laughing_crying: '😂',
  tada: '🎉', party: '🎉', hooray: '🎉',
  fire: '🔥', hot: '🔥',
  eyes: '👀', looking: '👀',
  open_mouth: '😮', surprised: '😮',
  pray: '🙏', please: '🙏', folded_hands: '🙏',
  cry: '😢', sad: '😢',
  sparkles: '✨', stars: '✨',
  skull: '💀', dead: '💀',
  rofl: '🤣', rolling_on_floor: '🤣',
  '100': '💯', hundred: '💯',
  pleading: '🥺', pleading_face: '🥺',
  sob: '😭', crying: '😭',
  thinking: '🤔', think: '🤔',

  // Smileys
  grinning: '😀', smile: '😃', smiley: '😄', grin: '😁',
  sweat_smile: '😅', laughing: '🤣',
  slightly_smiling: '🙂', blush: '😊', innocent: '😇',
  heart_eyes: '😍', '3_hearts: ': '🥰', star_struck: '🤩', starstruck: '🤩',
  kissing_heart: '😘', kissing: '😗', kissing_closed_eyes: '😚', kissing_smiling: '😙',
  holding_tears: '🥲',
  yum: '😋', stuck_out_tongue: '😛', wink_tongue: '😜', zany: '🤪',
  stuck_out_tongue_closed_eyes: '😝',
  money_mouth: '🤑', hugging: '🤗', hand_over_mouth: '🤭', shushing: '🤫',
  salute: '🫡', zipper_mouth: '🤐', raised_eyebrow: '🤨',
  neutral: '😐', expressionless: '😑', blank: '😶',
  dotted_face: '🫥', smirk: '😏', unamused: '😒',
  rolling_eyes: '🙄', eye_roll: '🙄',
  grimace: '😬', lying: '🤥', relieved: '😌',
  pensive: '😔', sleepy: '😪', drooling: '🤤', sleeping: '😴',
  mask: '😷', sick: '🤒', injured: '🤕',
  wink: '😉',

  // Gestures
  wave: '👋', raised_back_of_hand: '🤚', hand_splayed: '🖐️',
  raised_hand: '✋', vulcan: '🖖',
  ok_hand: '👌', pinched_fingers: '🤌', pinching_hand: '🤏',
  v: '✌️', victory: '✌️', peace: '✌️',
  crossed_fingers: '🤞', love_you: '🤟', rock_on: '🤘', call_me: '🤙',
  point_left: '👈', point_right: '👉', point_up_2: '👆',
  middle_finger: '🖕', point_down: '👇', point_up: '☝️',
  thumbsdown: '👎', '-1': '👎', thumbs_down: '👎',
  fist: '✊', punch: '👊', left_fist: '🤛', right_fist: '🤜',
  clap: '👏', raised_hands: '🙌', open_hands: '👐', handshake: '🤝',
  heart_hands: '🫶',

  // Hearts
  orange_heart: '🧡', yellow_heart: '💛', green_heart: '💚',
  blue_heart: '💙', purple_heart: '💜', black_heart: '🖤',
  white_heart: '🤍', brown_heart: '🤎', broken_heart: '💔',
  heart_on_fire: '❤️‍🔥', mending_heart: '❤️‍🩹',
  two_hearts: '💕', revolving_hearts: '💞', heartbeat: '💓',
  growing_heart: '💗', sparkling_heart: '💖', cupid: '💘', gift_heart: '💝',

  // Objects
  star: '⭐', glowing_star: '🌟', dizzy: '💫',
  musical_note: '🎵', notes: '🎶', musical_keyboard: '🎹',
  guitar: '🎸', trumpet: '🎺', drum: '🥁',
  video_game: '🎮', joystick: '🕹️', bullseye: '🎯', dart: '🎯',
  game_die: '🎲', puzzle: '🧩',
  trophy: '🏆', first_place: '🥇', second_place: '🥈', third_place: '🥉',

  // Symbols
  x: '❌', o: '⭕', exclamation: '❗', question: '❓',
  bangbang: '‼️', interrobang: '⁉️',
  check: '✅', white_check_mark: '✅', ballot_box: '☑️',
  boom: '💥', anger: '💢', dash: '💨', sweat_drops: '💦',
  zzz: '💤', hole: '🕳️',
  speech_balloon: '💬', thought_balloon: '💭',
  bell: '🔔', no_bell: '🔕',

  // Misc popular
  sun: '☀️', moon: '🌙', rainbow: '🌈', cloud: '☁️',
  umbrella: '☂️', snowflake: '❄️', comet: '☄️',
  dog: '🐶', cat: '🐱', bear: '🐻', panda: '🐼',
  rocket: '🚀', airplane: '✈️', car: '🚗',
  coffee: '☕', beer: '🍺', pizza: '🍕', cake: '🎂',
  crown: '👑', gem: '💎', ring: '💍',
  lock: '🔒', key: '🔑', bulb: '💡', bomb: '💣',
  pill: '💊', warning: '⚠️', no_entry: '🚫',
  skull_crossbones: '☠️', ghost: '👻', alien: '👽',
  robot: '🤖', poop: '💩', clown: '🤡',
  devil: '😈', imp: '👿', angel: '👼',
  wave_dark: '👋🏿', wave_medium: '👋🏽',
  muscle: '💪', brain: '🧠', tongue: '👅',
  see_no_evil: '🙈', hear_no_evil: '🙉', speak_no_evil: '🙊',
  monkey: '🐒', gorilla: '🦍',
  pineapple: '🍍', avocado: '🥑', eggplant: '🍆', corn: '🌽',
  potato: '🥔', carrot: '🥕', hot_dog: '🌭', burger: '🍔',
  fries: '🍟', taco: '🌮', burrito: '🌯', sushi: '🍣',
  egg: '🥚', cookie: '🍪', chocolate: '🍫', candy: '🍬',
  lollipop: '🍭', donut: '🍩', ice_cream: '🍦',
  wine: '🍷', cocktail: '🍸', champagne: '🍾',
  soccer: '⚽', basketball: '🏀', football: '🏈', baseball: '⚾',
  tennis: '🎾', volleyball: '🏐', bowling: '🎳',
  flag_white: '🏳️', flag_black: '🏴', checkered_flag: '🏁',
  earth: '🌍', globe: '🌐', world_map: '🗺️',
  sunrise: '🌅', sunset: '🌇', night: '🌃', city: '🏙️',
  house: '🏠', office: '🏢', hospital: '🏥', school: '🏫',
  clock: '🕐', hourglass: '⏳', stopwatch: '⏱️', timer: '⏲️',
  pencil: '✏️', memo: '📝', book: '📖', newspaper: '📰',
  envelope: '✉️', mailbox: '📬', package: '📦',
  scissors: '✂️', hammer: '🔨', wrench: '🔧', gear: '⚙️',
  link: '🔗', paperclip: '📎', pushpin: '📌',
  megaphone: '📣', loudspeaker: '📢', microphone: '🎤',
  headphones: '🎧', radio: '📻', tv: '📺', camera: '📷',
  mag: '🔍', search: '🔎',
  thumbsup_dark: '👍🏿', thumbsup_medium: '👍🏽',
};

/**
 * Build a list of {name, emoji} entries for autocomplete matching.
 * Pre-computed at module load time.
 */
export const EMOJI_AUTOCOMPLETE_LIST: { name: string; emoji: string }[] =
  Object.entries(EMOJI_NAME_MAP).map(([name, emoji]) => ({ name, emoji }));
