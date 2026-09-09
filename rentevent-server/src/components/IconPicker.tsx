import { useState } from 'react'
import {
  // Furniture
  Armchair,
  Bed,
  BedDouble,
  BedSingle,
  DoorOpen,
  Lamp,
  LampDesk,
  LampFloor,
  Sofa,
  Table,
  Table2,

  // Electronics
  Camera,
  Cctv,
  Cpu,
  HardDrive,
  Headphones,
  Keyboard,
  Laptop,
  Mic,
  Mic2,
  Monitor,
  MonitorSpeaker,
  Mouse,
  Phone,
  Printer,
  Projector,
  Radio,
  Router,
  Smartphone,
  Speaker,
  Tablet,
  TabletSmartphone,
  Tv,
  Tv2,
  Video,
  Webcam,
  Wifi,

  // Tools & Construction
  Axe,
  Brush,
  CircleDot,
  Cog,
  Construction,
  Drill,
  Fan,
  Flashlight,
  Hammer,
  HardHat,
  Paintbrush,
  PaintBucket,
  Pipette,
  Plug,
  Ruler,
  Scale,
  Scissors,
  Settings,
  Shovel,
  Slice,
  Sparkles,
  Thermometer,
  Wrench,
  Zap,

  // Entertainment & Events
  Cake,
  Clapperboard,
  Drama,
  Gamepad,
  Gamepad2,
  Gift,
  Guitar,
  Laugh,
  Megaphone,
  Music,
  Music2,
  Music3,
  Music4,
  PartyPopper,
  Piano,
  Popcorn,
  Ticket,
  Trophy,

  // Sports & Outdoor
  Bike,
  Dumbbell,
  Footprints,
  Mountain,
  MountainSnow,
  Sailboat,
  Ship,
  Snowflake,
  Sun,
  Sunrise,
  Sunset,
  Tent,
  TreeDeciduous,
  TreePine,
  Trees,
  Umbrella,
  UmbrellaOff,
  Waves,
  Wind,

  // Kitchen & Home
  AirVent,
  AlarmClock,
  Bath,
  BatteryCharging,
  Blinds,
  ChefHat,
  CookingPot,
  Coffee,
  CupSoda,
  Droplet,
  Droplets,
  Flame,
  Flower,
  Flower2,
  Heater,
  Home,
  House,
  IceCream,
  Lightbulb,
  Microwave,
  Pizza,
  Refrigerator,
  Sandwich,
  Soup,
  Sparkle,
  Utensils,
  UtensilsCrossed,
  Vegan,
  WashingMachine,
  Wine,

  // Fashion & Accessories
  Baby,
  Backpack,
  Briefcase,
  Crown,
  Gem,
  Glasses,
  GraduationCap,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Wallet,
  Watch,

  // Transport & Vehicles
  Bike as Bicycle,
  Bus,
  Car,
  CarFront,
  Forklift,
  Fuel,
  Gauge,
  Plane,
  PlaneLanding,
  PlaneTakeoff,
  Rocket,
  Ship as Boat,
  Siren,
  Train,
  TrainFront,
  Tractor,
  Truck,

  // Medical & Health
  Activity,
  Ambulance,
  Bandage,
  Bed as HospitalBed,
  Bone,
  Brain,
  Cross,
  Eye,
  Heart,
  HeartPulse,
  Hospital,
  Pill,
  Stethoscope,
  Syringe,

  // Office & Business
  Archive,
  Bookmark,
  Calculator,
  Calendar,
  CalendarDays,
  ClipboardList,
  Clock,
  FileText,
  Folder,
  FolderOpen,
  Inbox,
  Mail,
  MapPin,
  Newspaper,
  NotebookPen,
  Paperclip,
  PenTool,
  Presentation,

  // Photography & Media
  Aperture,
  Disc,
  Film,
  Focus,
  Frame,
  Image,
  ImagePlus,
  ScanLine,
  Sliders,
  SlidersHorizontal,
  Sparkle as Flash,

  // Art & Design
  Brush as ArtBrush,
  Crop,
  Eraser,
  Layers,
  Layout,
  LayoutGrid,
  Palette,
  Pen,
  Pencil,
  PenLine,
  Shapes,
  Square,
  Triangle,
  Type,

  // Nature & Garden
  Bug,
  Cat,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudSun,
  Dog,
  Leaf,
  Moon,
  Rabbit,
  Rainbow,
  Shell,
  Shrub,
  Sprout,

  // Other / General
  AlertCircle,
  Award,
  Badge,
  Bell,
  Box,
  Boxes,
  CheckCircle,
  CircleUser,
  Compass,
  Flag,
  Globe,
  Info,
  Key,
  Link,
  Lock,
  Map,
  Package,
  QrCode,
  ScanBarcode,
  Search,
  Shield,
  Signal,
  Star,
  Tag,
  Target,
  Truck as Delivery,
  Users,
  X,
  LucideIcon,
} from 'lucide-react'

// Icon catalog with categories
export const iconCatalog: Record<string, { icon: LucideIcon; label: string; category: string }> = {
  // Furniture
  armchair: { icon: Armchair, label: 'Кресло', category: 'furniture' },
  bed: { icon: Bed, label: 'Кровать', category: 'furniture' },
  bedDouble: { icon: BedDouble, label: 'Двуспальная', category: 'furniture' },
  bedSingle: { icon: BedSingle, label: 'Односпальная', category: 'furniture' },
  doorOpen: { icon: DoorOpen, label: 'Дверь', category: 'furniture' },
  lamp: { icon: Lamp, label: 'Лампа', category: 'furniture' },
  lampDesk: { icon: LampDesk, label: 'Настольная лампа', category: 'furniture' },
  lampFloor: { icon: LampFloor, label: 'Торшер', category: 'furniture' },
  sofa: { icon: Sofa, label: 'Диван', category: 'furniture' },
  table: { icon: Table, label: 'Стол', category: 'furniture' },
  table2: { icon: Table2, label: 'Обеденный стол', category: 'furniture' },

  // Electronics
  camera: { icon: Camera, label: 'Камера', category: 'electronics' },
  cctv: { icon: Cctv, label: 'Видеонаблюдение', category: 'electronics' },
  cpu: { icon: Cpu, label: 'Процессор', category: 'electronics' },
  hardDrive: { icon: HardDrive, label: 'Жёсткий диск', category: 'electronics' },
  headphones: { icon: Headphones, label: 'Наушники', category: 'electronics' },
  keyboard: { icon: Keyboard, label: 'Клавиатура', category: 'electronics' },
  laptop: { icon: Laptop, label: 'Ноутбук', category: 'electronics' },
  mic: { icon: Mic, label: 'Микрофон', category: 'electronics' },
  mic2: { icon: Mic2, label: 'Студийный микрофон', category: 'electronics' },
  monitor: { icon: Monitor, label: 'Монитор', category: 'electronics' },
  monitorSpeaker: { icon: MonitorSpeaker, label: 'Монитор с колонкой', category: 'electronics' },
  mouse: { icon: Mouse, label: 'Мышка', category: 'electronics' },
  phone: { icon: Phone, label: 'Телефон', category: 'electronics' },
  printer: { icon: Printer, label: 'Принтер', category: 'electronics' },
  projector: { icon: Projector, label: 'Проектор', category: 'electronics' },
  radio: { icon: Radio, label: 'Радио', category: 'electronics' },
  router: { icon: Router, label: 'Роутер', category: 'electronics' },
  smartphone: { icon: Smartphone, label: 'Смартфон', category: 'electronics' },
  speaker: { icon: Speaker, label: 'Колонка', category: 'electronics' },
  tablet: { icon: Tablet, label: 'Планшет', category: 'electronics' },
  tabletSmartphone: { icon: TabletSmartphone, label: 'Гаджеты', category: 'electronics' },
  tv: { icon: Tv, label: 'Телевизор', category: 'electronics' },
  tv2: { icon: Tv2, label: 'ТВ экран', category: 'electronics' },
  video: { icon: Video, label: 'Видео', category: 'electronics' },
  webcam: { icon: Webcam, label: 'Веб-камера', category: 'electronics' },
  wifi: { icon: Wifi, label: 'Wi-Fi', category: 'electronics' },

  // Tools & Construction
  axe: { icon: Axe, label: 'Топор', category: 'tools' },
  brush: { icon: Brush, label: 'Кисть', category: 'tools' },
  cog: { icon: Cog, label: 'Шестерёнка', category: 'tools' },
  construction: { icon: Construction, label: 'Стройка', category: 'tools' },
  drill: { icon: Drill, label: 'Дрель', category: 'tools' },
  fan: { icon: Fan, label: 'Вентилятор', category: 'tools' },
  flashlight: { icon: Flashlight, label: 'Фонарик', category: 'tools' },
  hammer: { icon: Hammer, label: 'Молоток', category: 'tools' },
  hardHat: { icon: HardHat, label: 'Каска', category: 'tools' },
  paintbrush: { icon: Paintbrush, label: 'Малярная кисть', category: 'tools' },
  paintBucket: { icon: PaintBucket, label: 'Краска', category: 'tools' },
  pipette: { icon: Pipette, label: 'Пипетка', category: 'tools' },
  plug: { icon: Plug, label: 'Розетка', category: 'tools' },
  ruler: { icon: Ruler, label: 'Линейка', category: 'tools' },
  scale: { icon: Scale, label: 'Весы', category: 'tools' },
  scissors: { icon: Scissors, label: 'Ножницы', category: 'tools' },
  settings: { icon: Settings, label: 'Настройки', category: 'tools' },
  shovel: { icon: Shovel, label: 'Лопата', category: 'tools' },
  thermometer: { icon: Thermometer, label: 'Термометр', category: 'tools' },
  wrench: { icon: Wrench, label: 'Гаечный ключ', category: 'tools' },
  zap: { icon: Zap, label: 'Электричество', category: 'tools' },

  // Entertainment & Events
  cake: { icon: Cake, label: 'Торт', category: 'entertainment' },
  clapperboard: { icon: Clapperboard, label: 'Кино', category: 'entertainment' },
  drama: { icon: Drama, label: 'Театр', category: 'entertainment' },
  gamepad: { icon: Gamepad, label: 'Геймпад', category: 'entertainment' },
  gamepad2: { icon: Gamepad2, label: 'Игры', category: 'entertainment' },
  gift: { icon: Gift, label: 'Подарок', category: 'entertainment' },
  guitar: { icon: Guitar, label: 'Гитара', category: 'entertainment' },
  laugh: { icon: Laugh, label: 'Смех', category: 'entertainment' },
  megaphone: { icon: Megaphone, label: 'Мегафон', category: 'entertainment' },
  music: { icon: Music, label: 'Музыка', category: 'entertainment' },
  music2: { icon: Music2, label: 'Ноты', category: 'entertainment' },
  music3: { icon: Music3, label: 'Мелодия', category: 'entertainment' },
  music4: { icon: Music4, label: 'Песня', category: 'entertainment' },
  partyPopper: { icon: PartyPopper, label: 'Праздник', category: 'entertainment' },
  piano: { icon: Piano, label: 'Пианино', category: 'entertainment' },
  popcorn: { icon: Popcorn, label: 'Попкорн', category: 'entertainment' },
  ticket: { icon: Ticket, label: 'Билет', category: 'entertainment' },
  trophy: { icon: Trophy, label: 'Трофей', category: 'entertainment' },

  // Sports & Outdoor
  bike: { icon: Bike, label: 'Велосипед', category: 'sports' },
  dumbbell: { icon: Dumbbell, label: 'Гантели', category: 'sports' },
  footprints: { icon: Footprints, label: 'Следы', category: 'sports' },
  mountain: { icon: Mountain, label: 'Горы', category: 'sports' },
  mountainSnow: { icon: MountainSnow, label: 'Снежные горы', category: 'sports' },
  sailboat: { icon: Sailboat, label: 'Парусник', category: 'sports' },
  ship: { icon: Ship, label: 'Корабль', category: 'sports' },
  snowflake: { icon: Snowflake, label: 'Снежинка', category: 'sports' },
  sun: { icon: Sun, label: 'Солнце', category: 'sports' },
  sunrise: { icon: Sunrise, label: 'Рассвет', category: 'sports' },
  sunset: { icon: Sunset, label: 'Закат', category: 'sports' },
  tent: { icon: Tent, label: 'Палатка', category: 'sports' },
  treeDeciduous: { icon: TreeDeciduous, label: 'Дерево', category: 'sports' },
  treePine: { icon: TreePine, label: 'Ёлка', category: 'sports' },
  trees: { icon: Trees, label: 'Лес', category: 'sports' },
  umbrella: { icon: Umbrella, label: 'Зонт', category: 'sports' },
  waves: { icon: Waves, label: 'Волны', category: 'sports' },
  wind: { icon: Wind, label: 'Ветер', category: 'sports' },

  // Kitchen & Home
  airVent: { icon: AirVent, label: 'Вентиляция', category: 'kitchen' },
  alarmClock: { icon: AlarmClock, label: 'Будильник', category: 'kitchen' },
  bath: { icon: Bath, label: 'Ванна', category: 'kitchen' },
  batteryCharging: { icon: BatteryCharging, label: 'Зарядка', category: 'kitchen' },
  blinds: { icon: Blinds, label: 'Жалюзи', category: 'kitchen' },
  chefHat: { icon: ChefHat, label: 'Повар', category: 'kitchen' },
  cookingPot: { icon: CookingPot, label: 'Кастрюля', category: 'kitchen' },
  coffee: { icon: Coffee, label: 'Кофе', category: 'kitchen' },
  cupSoda: { icon: CupSoda, label: 'Напиток', category: 'kitchen' },
  droplet: { icon: Droplet, label: 'Капля', category: 'kitchen' },
  droplets: { icon: Droplets, label: 'Вода', category: 'kitchen' },
  flame: { icon: Flame, label: 'Огонь', category: 'kitchen' },
  flower: { icon: Flower, label: 'Цветок', category: 'kitchen' },
  flower2: { icon: Flower2, label: 'Цветы', category: 'kitchen' },
  heater: { icon: Heater, label: 'Обогреватель', category: 'kitchen' },
  home: { icon: Home, label: 'Дом', category: 'kitchen' },
  house: { icon: House, label: 'Домик', category: 'kitchen' },
  iceCream: { icon: IceCream, label: 'Мороженое', category: 'kitchen' },
  lightbulb: { icon: Lightbulb, label: 'Лампочка', category: 'kitchen' },
  microwave: { icon: Microwave, label: 'Микроволновка', category: 'kitchen' },
  pizza: { icon: Pizza, label: 'Пицца', category: 'kitchen' },
  refrigerator: { icon: Refrigerator, label: 'Холодильник', category: 'kitchen' },
  sandwich: { icon: Sandwich, label: 'Сэндвич', category: 'kitchen' },
  soup: { icon: Soup, label: 'Суп', category: 'kitchen' },
  utensils: { icon: Utensils, label: 'Посуда', category: 'kitchen' },
  utensilsCrossed: { icon: UtensilsCrossed, label: 'Столовые приборы', category: 'kitchen' },
  vegan: { icon: Vegan, label: 'Веган', category: 'kitchen' },
  washingMachine: { icon: WashingMachine, label: 'Стиральная машина', category: 'kitchen' },
  wine: { icon: Wine, label: 'Вино', category: 'kitchen' },

  // Fashion & Accessories
  baby: { icon: Baby, label: 'Детское', category: 'fashion' },
  backpack: { icon: Backpack, label: 'Рюкзак', category: 'fashion' },
  briefcase: { icon: Briefcase, label: 'Портфель', category: 'fashion' },
  crown: { icon: Crown, label: 'Корона', category: 'fashion' },
  gem: { icon: Gem, label: 'Драгоценность', category: 'fashion' },
  glasses: { icon: Glasses, label: 'Очки', category: 'fashion' },
  graduationCap: { icon: GraduationCap, label: 'Выпускная шапка', category: 'fashion' },
  shirt: { icon: Shirt, label: 'Одежда', category: 'fashion' },
  shoppingBag: { icon: ShoppingBag, label: 'Сумка', category: 'fashion' },
  shoppingCart: { icon: ShoppingCart, label: 'Корзина', category: 'fashion' },
  wallet: { icon: Wallet, label: 'Кошелёк', category: 'fashion' },
  watch: { icon: Watch, label: 'Часы', category: 'fashion' },

  // Transport & Vehicles
  bus: { icon: Bus, label: 'Автобус', category: 'transport' },
  car: { icon: Car, label: 'Авто', category: 'transport' },
  carFront: { icon: CarFront, label: 'Машина', category: 'transport' },
  forklift: { icon: Forklift, label: 'Погрузчик', category: 'transport' },
  fuel: { icon: Fuel, label: 'Топливо', category: 'transport' },
  gauge: { icon: Gauge, label: 'Спидометр', category: 'transport' },
  plane: { icon: Plane, label: 'Самолёт', category: 'transport' },
  planeLanding: { icon: PlaneLanding, label: 'Посадка', category: 'transport' },
  planeTakeoff: { icon: PlaneTakeoff, label: 'Взлёт', category: 'transport' },
  rocket: { icon: Rocket, label: 'Ракета', category: 'transport' },
  siren: { icon: Siren, label: 'Сирена', category: 'transport' },
  train: { icon: Train, label: 'Поезд', category: 'transport' },
  trainFront: { icon: TrainFront, label: 'Электричка', category: 'transport' },
  tractor: { icon: Tractor, label: 'Трактор', category: 'transport' },
  truck: { icon: Truck, label: 'Грузовик', category: 'transport' },

  // Medical & Health
  activity: { icon: Activity, label: 'Активность', category: 'medical' },
  ambulance: { icon: Ambulance, label: 'Скорая помощь', category: 'medical' },
  bandage: { icon: Bandage, label: 'Бинт', category: 'medical' },
  bone: { icon: Bone, label: 'Кость', category: 'medical' },
  brain: { icon: Brain, label: 'Мозг', category: 'medical' },
  cross: { icon: Cross, label: 'Крест', category: 'medical' },
  eye: { icon: Eye, label: 'Глаз', category: 'medical' },
  heart: { icon: Heart, label: 'Сердце', category: 'medical' },
  heartPulse: { icon: HeartPulse, label: 'Пульс', category: 'medical' },
  hospital: { icon: Hospital, label: 'Больница', category: 'medical' },
  pill: { icon: Pill, label: 'Таблетка', category: 'medical' },
  stethoscope: { icon: Stethoscope, label: 'Стетоскоп', category: 'medical' },
  syringe: { icon: Syringe, label: 'Шприц', category: 'medical' },

  // Office & Business
  archive: { icon: Archive, label: 'Архив', category: 'office' },
  bookmark: { icon: Bookmark, label: 'Закладка', category: 'office' },
  calculator: { icon: Calculator, label: 'Калькулятор', category: 'office' },
  calendar: { icon: Calendar, label: 'Календарь', category: 'office' },
  calendarDays: { icon: CalendarDays, label: 'Расписание', category: 'office' },
  clipboardList: { icon: ClipboardList, label: 'Список', category: 'office' },
  clock: { icon: Clock, label: 'Часы', category: 'office' },
  fileText: { icon: FileText, label: 'Документ', category: 'office' },
  folder: { icon: Folder, label: 'Папка', category: 'office' },
  folderOpen: { icon: FolderOpen, label: 'Открытая папка', category: 'office' },
  inbox: { icon: Inbox, label: 'Входящие', category: 'office' },
  mail: { icon: Mail, label: 'Почта', category: 'office' },
  mapPin: { icon: MapPin, label: 'Метка', category: 'office' },
  newspaper: { icon: Newspaper, label: 'Газета', category: 'office' },
  notebookPen: { icon: NotebookPen, label: 'Блокнот', category: 'office' },
  paperclip: { icon: Paperclip, label: 'Скрепка', category: 'office' },
  penTool: { icon: PenTool, label: 'Перо', category: 'office' },
  presentation: { icon: Presentation, label: 'Презентация', category: 'office' },

  // Photography & Media
  aperture: { icon: Aperture, label: 'Диафрагма', category: 'photo' },
  disc: { icon: Disc, label: 'Диск', category: 'photo' },
  film: { icon: Film, label: 'Плёнка', category: 'photo' },
  focus: { icon: Focus, label: 'Фокус', category: 'photo' },
  frame: { icon: Frame, label: 'Рамка', category: 'photo' },
  image: { icon: Image, label: 'Изображение', category: 'photo' },
  imagePlus: { icon: ImagePlus, label: 'Добавить фото', category: 'photo' },
  scanLine: { icon: ScanLine, label: 'Сканер', category: 'photo' },
  sliders: { icon: Sliders, label: 'Настройки', category: 'photo' },
  slidersHorizontal: { icon: SlidersHorizontal, label: 'Эквалайзер', category: 'photo' },

  // Art & Design
  crop: { icon: Crop, label: 'Обрезка', category: 'art' },
  eraser: { icon: Eraser, label: 'Ластик', category: 'art' },
  layers: { icon: Layers, label: 'Слои', category: 'art' },
  layout: { icon: Layout, label: 'Макет', category: 'art' },
  layoutGrid: { icon: LayoutGrid, label: 'Сетка', category: 'art' },
  palette: { icon: Palette, label: 'Палитра', category: 'art' },
  pen: { icon: Pen, label: 'Ручка', category: 'art' },
  pencil: { icon: Pencil, label: 'Карандаш', category: 'art' },
  penLine: { icon: PenLine, label: 'Линия', category: 'art' },
  shapes: { icon: Shapes, label: 'Фигуры', category: 'art' },
  square: { icon: Square, label: 'Квадрат', category: 'art' },
  triangle: { icon: Triangle, label: 'Треугольник', category: 'art' },
  type: { icon: Type, label: 'Текст', category: 'art' },

  // Nature & Garden
  bug: { icon: Bug, label: 'Жук', category: 'nature' },
  cat: { icon: Cat, label: 'Кошка', category: 'nature' },
  cloud: { icon: Cloud, label: 'Облако', category: 'nature' },
  cloudRain: { icon: CloudRain, label: 'Дождь', category: 'nature' },
  cloudSnow: { icon: CloudSnow, label: 'Снег', category: 'nature' },
  cloudSun: { icon: CloudSun, label: 'Облачно', category: 'nature' },
  dog: { icon: Dog, label: 'Собака', category: 'nature' },
  leaf: { icon: Leaf, label: 'Лист', category: 'nature' },
  moon: { icon: Moon, label: 'Луна', category: 'nature' },
  rabbit: { icon: Rabbit, label: 'Кролик', category: 'nature' },
  rainbow: { icon: Rainbow, label: 'Радуга', category: 'nature' },
  shell: { icon: Shell, label: 'Ракушка', category: 'nature' },
  shrub: { icon: Shrub, label: 'Куст', category: 'nature' },
  sprout: { icon: Sprout, label: 'Росток', category: 'nature' },

  // Other / General
  alertCircle: { icon: AlertCircle, label: 'Внимание', category: 'other' },
  award: { icon: Award, label: 'Награда', category: 'other' },
  badge: { icon: Badge, label: 'Бейдж', category: 'other' },
  bell: { icon: Bell, label: 'Колокольчик', category: 'other' },
  box: { icon: Box, label: 'Коробка', category: 'other' },
  boxes: { icon: Boxes, label: 'Коробки', category: 'other' },
  checkCircle: { icon: CheckCircle, label: 'Готово', category: 'other' },
  circleUser: { icon: CircleUser, label: 'Пользователь', category: 'other' },
  compass: { icon: Compass, label: 'Компас', category: 'other' },
  flag: { icon: Flag, label: 'Флаг', category: 'other' },
  globe: { icon: Globe, label: 'Глобус', category: 'other' },
  info: { icon: Info, label: 'Инфо', category: 'other' },
  key: { icon: Key, label: 'Ключ', category: 'other' },
  link: { icon: Link, label: 'Ссылка', category: 'other' },
  lock: { icon: Lock, label: 'Замок', category: 'other' },
  map: { icon: Map, label: 'Карта', category: 'other' },
  package: { icon: Package, label: 'Посылка', category: 'other' },
  qrCode: { icon: QrCode, label: 'QR-код', category: 'other' },
  scanBarcode: { icon: ScanBarcode, label: 'Штрих-код', category: 'other' },
  shield: { icon: Shield, label: 'Щит', category: 'other' },
  signal: { icon: Signal, label: 'Сигнал', category: 'other' },
  star: { icon: Star, label: 'Звезда', category: 'other' },
  tag: { icon: Tag, label: 'Тег', category: 'other' },
  target: { icon: Target, label: 'Цель', category: 'other' },
  users: { icon: Users, label: 'Люди', category: 'other' },
}

const categoryLabels: Record<string, string> = {
  furniture: 'Мебель',
  electronics: 'Электроника',
  tools: 'Инструменты',
  entertainment: 'Развлечения',
  sports: 'Спорт и отдых',
  kitchen: 'Кухня и дом',
  fashion: 'Мода и аксессуары',
  transport: 'Транспорт',
  medical: 'Медицина',
  office: 'Офис',
  photo: 'Фото и видео',
  art: 'Дизайн',
  nature: 'Природа',
  other: 'Другое',
}

interface IconPickerProps {
  value: string | null
  onChange: (iconName: string | null) => void
  onClose: () => void
}

export default function IconPicker({ value, onChange, onClose }: IconPickerProps) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const categories = Object.keys(categoryLabels)

  const filteredIcons = Object.entries(iconCatalog).filter(([name, { label, category }]) => {
    const matchesSearch = search === '' ||
      label.toLowerCase().includes(search.toLowerCase()) ||
      name.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = !selectedCategory || category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Выберите иконку</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск иконок..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="px-4 py-2 border-b flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1 text-sm rounded-full ${
              !selectedCategory
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Все
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 text-sm rounded-full ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {categoryLabels[cat]}
            </button>
          ))}
        </div>

        {/* Icons Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
            {/* No icon option */}
            <button
              onClick={() => {
                onChange(null)
                onClose()
              }}
              className={`p-3 rounded-lg border-2 flex flex-col items-center justify-center gap-1 hover:bg-gray-50 ${
                !value ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <X className="h-6 w-6 text-gray-400" />
              <span className="text-xs text-gray-500">Нет</span>
            </button>

            {filteredIcons.map(([name, { icon: Icon, label }]) => (
              <button
                key={name}
                onClick={() => {
                  onChange(name)
                  onClose()
                }}
                className={`p-3 rounded-lg border-2 flex flex-col items-center justify-center gap-1 hover:bg-gray-50 ${
                  value === name ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
                title={label}
              >
                <Icon className="h-6 w-6" />
                <span className="text-xs text-gray-500 truncate w-full text-center">
                  {label}
                </span>
              </button>
            ))}
          </div>

          {filteredIcons.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Иконки не найдены
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Helper component to render an icon by name
export function IconByName({
  name,
  className = "h-5 w-5"
}: {
  name: string | null
  className?: string
}) {
  if (!name || !iconCatalog[name]) {
    return null
  }
  const Icon = iconCatalog[name].icon
  return <Icon className={className} />
}
