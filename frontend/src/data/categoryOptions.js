export const CATEGORY_OPTIONS = [
  { id: "academic", label: "학술/교육", icon: "🎓", algorithmCategory: "study" },
  { id: "music", label: "음악/공연", icon: "🎵", algorithmCategory: "culture" },
  { id: "sports", label: "운동/스포츠", icon: "⚽", algorithmCategory: "exercise" },
  { id: "art", label: "미술/공예", icon: "🎨", algorithmCategory: "culture" },
  { id: "it", label: "IT/개발", icon: "💻", algorithmCategory: "study" },
  { id: "volunteer", label: "봉사/사회", icon: "🤝", algorithmCategory: "volunteer" },
  { id: "photo", label: "사진/영상", icon: "📷", algorithmCategory: "culture" },
  { id: "language", label: "언어/국제", icon: "🌍", algorithmCategory: "study" },
  { id: "networking", label: "네트워킹", icon: "🔗", algorithmCategory: "culture" },
  { id: "startup", label: "창업/경영", icon: "💡", algorithmCategory: "study" },
  { id: "culture", label: "문화/취미", icon: "🎭", algorithmCategory: "culture" },
  { id: "game", label: "게임/e스포츠", icon: "🎮", algorithmCategory: "game" },
  { id: "religion", label: "종교", icon: "🙏", algorithmCategory: "religion" },
];

export const CATEGORY_TO_TAG_ID = Object.fromEntries(
  CATEGORY_OPTIONS.map((category) => [category.id, category.algorithmCategory])
);

export const CATEGORY_LABELS = Object.fromEntries(
  CATEGORY_OPTIONS.map((category) => [category.id, category.label])
);

export const CATEGORY_IMAGE_URLS = {
  academic: "/category-images/academic.svg",
  music: "/category-images/music.svg",
  sports: "/category-images/sports.svg",
  art: "/category-images/art.svg",
  it: "/category-images/it.svg",
  volunteer: "/category-images/volunteer.svg",
  photo: "/category-images/photo.svg",
  language: "/category-images/language.svg",
  networking: "/category-images/networking.svg",
  startup: "/category-images/startup.svg",
  culture: "/category-images/culture.svg",
  game: "/category-images/game.svg",
  religion: "/category-images/religion.svg",
};

export const ALGORITHM_CATEGORY_FALLBACKS = {
  study: { id: "academic", label: "학술/교육" },
  exercise: { id: "sports", label: "운동/스포츠" },
  culture: { id: "culture", label: "문화/취미" },
  game: { id: "game", label: "게임/e스포츠" },
  religion: { id: "religion", label: "종교" },
  volunteer: { id: "volunteer", label: "봉사/사회" },
};
