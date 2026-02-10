'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Locale = 'ru' | 'kk';

type Dictionary = Record<string, string>;

const ru: Dictionary = {
  'meta.title': 'Adapto Digital TV — Онлайн телевидение онлайн',
  'meta.description': 'Смотрите телеканалы онлайн бесплатно. Прямой эфир 24/7.',
  
  // Navigation
  'nav.channels': 'Каналы',
  'nav.schedule': 'Программа',
  'nav.back': 'Назад',

  // Home page
  'home.title': 'Телеканалы',
  'home.subtitle': 'Выберите канал и наслаждайтесь просмотром',
  'home.loading': 'Загрузка каналов...',
  'home.error.title': 'Не удалось загрузить',
  'home.error.retry': 'Попробовать снова',
  'home.empty': 'Каналы не найдены',
  'home.viewAll': 'Показать все',

  // Hero section
  'hero.live': 'Прямой эфир',
  'hero.title.line1': 'Онлайн',
  'hero.title.line2': 'телеканалы онлайн',
  'hero.subtitle': 'Смотрите любимые телеканалы бесплатно на любом устройстве. Прямой эфир 24 часа в сутки.',
  'hero.watchNow': 'Смотреть',
  'hero.downloadApp': 'Приложение',
  'hero.scroll': 'Каналы',
  'hero.stats.channels': 'Каналов',
  'hero.stats.live': 'Прямой эфир',
  'hero.stats.free': 'Бесплатно',

  // Features section
  'features.title': 'Почему Adapto Digital TV?',
  'features.subtitle': 'Современная платформа для просмотра телеканалов',
  'features.free.title': '100% Бесплатно',
  'features.free.description': 'Все телеканалы доступны без подписки, регистрации и скрытых платежей.',
  'features.live.title': '24/7 Прямой эфир',
  'features.live.description': 'Круглосуточное вещание телеканалов в реальном времени.',
  'features.devices.title': 'Любое устройство',
  'features.devices.description': 'Смотрите на смартфоне, планшете, компьютере или Smart TV.',

  // App Promotion
  'appPromo.badge': 'Мобильное приложение',
  'appPromo.title': 'Adapto Digital TV в кармане',
  'appPromo.subtitle': 'Скачайте приложение и смотрите телеканалы где угодно — в метро, в дороге или дома.',
  'appPromo.downloadOn': 'Загрузить в',
  'appPromo.getItOn': 'Доступно в',
  'appPromo.feature1': 'Без рекламы',
  'appPromo.feature2': 'Офлайн режим',
  'appPromo.feature3': 'HD качество',

  // Channel Card
  'card.onair': 'Сейчас в эфире',
  'card.unknownProgram': 'Программа не определена',
  'card.unknownTime': 'Время не определено',

  // Player
  'player.loading.title': 'Загрузка...',
  'player.loading.subtitle': 'Подключение к серверу',
  'player.error.title': 'Ошибка воспроизведения',
  'player.error.retry': 'Повторить',
  'player.onair': 'ЭФИР',
  'player.reload': 'Перезагрузить',
  'player.error.network': 'Проверьте подключение к интернету.',
  'player.error.media': 'Попробуйте обновить страницу.',
  'player.error.fatal': 'Критическая ошибка.',
  'player.error.unsupported': 'Браузер не поддерживается.',
  'player.play': 'Воспроизвести',
  'player.pause': 'Пауза',
  'player.mute': 'Выключить звук',
  'player.unmute': 'Включить звук',
  'player.fullscreen': 'На весь экран',
  'player.exitFullscreen': 'Выйти',
  'live.label': 'LIVE',

  // Schedule
  'schedule.title': 'Программа передач',
  'schedule.subtitle': 'Расписание телеканалов',
  'schedule.today': 'Сегодня',
  'schedule.tomorrow': 'Завтра',
  'schedule.afterTomorrow': 'Послезавтра',
  'schedule.loading': 'Загрузка...',
  'schedule.error.title': 'Ошибка загрузки',
  'schedule.error.retry': 'Повторить',
  'schedule.table.channel': 'Канал',
  'schedule.table.empty': 'Нет данных',
  'schedule.empty': 'Расписание не найдено',
  'schedule.local.disabled': 'Расписание недоступно',

  // Channel page
  'channel.error.notFound': 'Канал не найден',
  'channel.error.unavailable': 'Канал временно недоступен',
  'channel.error.loadFailed': 'Не удалось загрузить',
  'channel.back': 'Назад',
  'channel.live': 'Прямой эфир',
  'channel.current': 'Сейчас',
  'channel.program.unknown': 'Программа не определена',
  'channel.program.desc.unknown': 'Описание недоступно',
  'channel.time.unknown': '—',
  'channel.next': 'Далее',
  'channel.whatsnext': 'Следующее',
  'channel.about': 'О канале',
  'channel.share': 'Поделиться',
  'channel.other': 'Другие каналы',
  'channel.viewFullSchedule': 'Программа передач',
  'channel.backToChannel': 'К каналу',
  'common.close': 'Закрыть',

  // Program
  'program.time': 'Время',
  'program.duration': 'Длительность',
  'program.minutes_short': 'мин',
  'program.error.notFound': 'Не найдено',
  'program.noDescription': 'Описание недоступно',
  'program.watchChannel': 'Смотреть',
  'program.viewSchedule': 'Расписание',
  'program.unavailable': 'Недоступно',
  'program.unavailable.desc': 'Информация недоступна',
  'program.next.title': 'Следующая программа',
  
  'schedule.backToSchedule': 'К расписанию',
  'schedule.backToDay': 'Назад',
  
  // Admin
  'admin.login.title': 'Вход',
  'admin.login.description': 'Введите логин и пароль',
  'admin.login.username': 'Логин',
  'admin.login.password': 'Пароль',
  'admin.login.submit': 'Войти',
  'admin.login.loading': 'Проверка...',
  'admin.login.error.invalid': 'Неверные данные',
  'admin.user.default': 'Администратор',
  'admin.channel.select': 'Выбрать канал',
  'admin.nav.content': 'Контент',
  'admin.nav.schedule': 'Расписание',
  'admin.logout': 'Выйти',

  // Footer
  'footer.description': 'Онлайн телевидение онлайн. Смотрите телеканалы в прямом эфире бесплатно.',
  'footer.channels': 'Каналы',
  'footer.allChannels': 'Все каналы',
  'footer.schedule': 'Программа',
  'footer.popular': 'Популярные',
  'footer.company': 'Компания',
  'footer.about': 'О нас',
  'footer.contacts': 'Контакты',
  'footer.faq': 'FAQ',
  'footer.apps': 'Приложения',
  'footer.legal': 'Правовая информация',
  'footer.privacy': 'Конфиденциальность',
  'footer.terms': 'Условия',
  'footer.copyright': '© {year} Adapto Digital TV',
  'footer.social': 'Соцсети',

  // About
  'about.title': 'О нас',
  'about.subtitle': 'Adapto Digital TV — платформа онлайн-телевидения',
  'about.mission.title': 'Миссия',
  'about.mission.text': 'Доступ к телевидению для всех.',
  'about.features.title': 'Преимущества',
  'about.features.free': 'Бесплатно',
  'about.features.free.desc': 'Без подписки и оплаты',
  'about.features.quality': 'HD качество',
  'about.features.quality.desc': 'На любом устройстве',
  'about.features.devices': 'Везде',
  'about.features.devices.desc': 'Веб, мобильные, Smart TV',
  'about.features.schedule': 'Программа',
  'about.features.schedule.desc': 'Актуальное расписание',

  // Contacts
  'contacts.title': 'Контакты',
  'contacts.subtitle': 'Свяжитесь с нами',
  'contacts.form.name': 'Имя',
  'contacts.form.email': 'Email',
  'contacts.form.message': 'Сообщение',
  'contacts.form.submit': 'Отправить',
  'contacts.form.success': 'Отправлено!',
  'contacts.info.email': 'Email',
  'contacts.info.phone': 'Телефон',
  'contacts.info.address': 'Адрес',

  // FAQ
  'faq.title': 'Вопросы и ответы',
  'faq.subtitle': 'Частые вопросы',
  'faq.q1': 'Это бесплатно?',
  'faq.a1': 'Да, все каналы бесплатны.',
  'faq.q2': 'Как смотреть на Smart TV?',
  'faq.a2': 'Откройте example.com в браузере.',
  'faq.q3': 'Какие каналы доступны?',
  'faq.a3': 'Все основные доступные каналы.',
  'faq.q4': 'Где скачать приложение?',
  'faq.a4': 'App Store и Google Play.',
  'faq.q5': 'Почему не работает?',
  'faq.a5': 'Проверьте интернет.',

  // Apps
  'apps.title': 'Приложения',
  'apps.subtitle': 'Смотрите на любом устройстве',
  'apps.mobile.title': 'Мобильное',
  'apps.mobile.desc': 'iPhone и Android',
  'apps.smarttv.title': 'Smart TV',
  'apps.smarttv.desc': 'Samsung и LG',
  'apps.web.title': 'Веб',
  'apps.web.desc': 'example.com',
  'apps.features': 'Возможности',
  'apps.feature.live': 'Прямой эфир',
  'apps.feature.schedule': 'Программа',
  'apps.feature.favorites': 'Избранное',
  'apps.feature.notifications': 'Уведомления',

  // Search
  'search.placeholder': 'Поиск...',
  'search.noResults': 'Не найдено',
  'search.results': 'Найдено: {count}',

  // Favorites
  'favorites.title': 'Избранное',
  'favorites.empty': 'Добавьте каналы',
  'favorites.add': 'В избранное',
  'favorites.remove': 'Убрать',

  // Share
  'share.title': 'Поделиться',
  'share.telegram': 'Telegram',
  'share.whatsapp': 'WhatsApp',
  'share.copy': 'Копировать',
  'share.copied': 'Скопировано!',
};

const kk: Dictionary = {
  'meta.title': 'Adapto Digital TV — Онлайн теледидар',
  'meta.description': 'Телеарналарды онлайн тегін көріңіз. 24/7 тікелей эфир.',
  
  // Navigation
  'nav.channels': 'Арналар',
  'nav.schedule': 'Бағдарлама',
  'nav.back': 'Артқа',

  // Home page
  'home.title': 'Телеарналар',
  'home.subtitle': 'Арнаны таңдап, көруді бастаңыз',
  'home.loading': 'Жүктелуде...',
  'home.error.title': 'Жүктелмеді',
  'home.error.retry': 'Қайталау',
  'home.empty': 'Арналар табылмады',
  'home.viewAll': 'Барлығын көру',

  // Hero section
  'hero.live': 'Тікелей эфир',
  'hero.title.line1': 'Онлайн',
  'hero.title.line2': 'телеарналар онлайн',
  'hero.subtitle': 'Сүйікті телеарналарды кез келген құрылғыда тегін көріңіз. Тәулік бойы тікелей эфир.',
  'hero.watchNow': 'Көру',
  'hero.downloadApp': 'Қосымша',
  'hero.scroll': 'Арналар',
  'hero.stats.channels': 'Арна',
  'hero.stats.live': 'Тікелей эфир',
  'hero.stats.free': 'Тегін',

  // Features section
  'features.title': 'Неге Adapto Digital TV?',
  'features.subtitle': 'Телеарналарды көрудің заманауи платформасы',
  'features.free.title': '100% Тегін',
  'features.free.description': 'Барлық арналар жазылымсыз, тіркеусіз және жасырын төлемсіз қолжетімді.',
  'features.live.title': '24/7 Тікелей эфир',
  'features.live.description': 'Телеарналардың тәулік бойы нақты уақытта хабар таратуы.',
  'features.devices.title': 'Кез келген құрылғы',
  'features.devices.description': 'Смартфон, планшет, компьютер немесе Smart TV-де көріңіз.',

  // App Promotion
  'appPromo.badge': 'Мобильді қосымша',
  'appPromo.title': 'Adapto Digital TV қалтаңызда',
  'appPromo.subtitle': 'Қосымшаны жүктеп алып, телеарналарды кез келген жерде көріңіз — метрода, жолда немесе үйде.',
  'appPromo.downloadOn': 'Жүктеу',
  'appPromo.getItOn': 'Қолжетімді',
  'appPromo.feature1': 'Жарнамасыз',
  'appPromo.feature2': 'Офлайн режим',
  'appPromo.feature3': 'HD сапа',

  // Channel Card
  'card.onair': 'Қазір эфирде',
  'card.unknownProgram': 'Бағдарлама анықталмады',
  'card.unknownTime': 'Уақыт белгісіз',

  // Player
  'player.loading.title': 'Жүктелуде...',
  'player.loading.subtitle': 'Серверге қосылу',
  'player.error.title': 'Ойнату қатесі',
  'player.error.retry': 'Қайталау',
  'player.onair': 'ЭФИР',
  'player.reload': 'Қайта жүктеу',
  'player.error.network': 'Интернет байланысын тексеріңіз.',
  'player.error.media': 'Бетті жаңартып көріңіз.',
  'player.error.fatal': 'Критикалық қате.',
  'player.error.unsupported': 'Браузер қолдау көрсетілмейді.',
  'player.play': 'Ойнату',
  'player.pause': 'Тоқтату',
  'player.mute': 'Дыбысты өшіру',
  'player.unmute': 'Дыбысты қосу',
  'player.fullscreen': 'Толық экран',
  'player.exitFullscreen': 'Шығу',
  'live.label': 'LIVE',

  // Schedule
  'schedule.title': 'Бағдарламалар кестесі',
  'schedule.subtitle': 'Телеарналар кестесі',
  'schedule.today': 'Бүгін',
  'schedule.tomorrow': 'Ертең',
  'schedule.afterTomorrow': 'Бүрсігүні',
  'schedule.loading': 'Жүктелуде...',
  'schedule.error.title': 'Жүктелмеді',
  'schedule.error.retry': 'Қайталау',
  'schedule.table.channel': 'Арна',
  'schedule.table.empty': 'Дерек жоқ',
  'schedule.empty': 'Кесте табылмады',
  'schedule.local.disabled': 'Кесте қолжетімсіз',

  // Channel page
  'channel.error.notFound': 'Арна табылмады',
  'channel.error.unavailable': 'Арна уақытша қолжетімсіз',
  'channel.error.loadFailed': 'Жүктелмеді',
  'channel.back': 'Артқа',
  'channel.live': 'Тікелей эфир',
  'channel.current': 'Қазір',
  'channel.program.unknown': 'Бағдарлама анықталмады',
  'channel.program.desc.unknown': 'Сипаттама жоқ',
  'channel.time.unknown': '—',
  'channel.next': 'Келесі',
  'channel.whatsnext': 'Әрі қарай',
  'channel.about': 'Арна туралы',
  'channel.share': 'Бөлісу',
  'channel.other': 'Басқа арналар',
  'channel.viewFullSchedule': 'Бағдарлама',
  'channel.backToChannel': 'Арнаға',
  'common.close': 'Жабу',

  // Program
  'program.time': 'Уақыт',
  'program.duration': 'Ұзақтығы',
  'program.minutes_short': 'мин',
  'program.error.notFound': 'Табылмады',
  'program.noDescription': 'Сипаттама жоқ',
  'program.watchChannel': 'Көру',
  'program.viewSchedule': 'Кесте',
  'program.unavailable': 'Қолжетімсіз',
  'program.unavailable.desc': 'Ақпарат жоқ',
  'program.next.title': 'Келесі бағдарлама',
  
  'schedule.backToSchedule': 'Кестеге',
  'schedule.backToDay': 'Артқа',
  
  // Admin
  'admin.login.title': 'Кіру',
  'admin.login.description': 'Логин мен құпиясөзді енгізіңіз',
  'admin.login.username': 'Логин',
  'admin.login.password': 'Құпиясөз',
  'admin.login.submit': 'Кіру',
  'admin.login.loading': 'Тексеру...',
  'admin.login.error.invalid': 'Қате деректер',
  'admin.user.default': 'Әкімші',
  'admin.channel.select': 'Арнаны таңдау',
  'admin.nav.content': 'Контент',
  'admin.nav.schedule': 'Кесте',
  'admin.logout': 'Шығу',

  // Footer
  'footer.description': 'Онлайн теледидар. Телеарналарды тікелей эфирде тегін көріңіз.',
  'footer.channels': 'Арналар',
  'footer.allChannels': 'Барлық арналар',
  'footer.schedule': 'Бағдарлама',
  'footer.popular': 'Танымал',
  'footer.company': 'Компания',
  'footer.about': 'Біз туралы',
  'footer.contacts': 'Байланыс',
  'footer.faq': 'Сұрақтар',
  'footer.apps': 'Қосымшалар',
  'footer.legal': 'Құқықтық ақпарат',
  'footer.privacy': 'Құпиялылық',
  'footer.terms': 'Шарттар',
  'footer.copyright': '© {year} Adapto Digital TV',
  'footer.social': 'Әлеуметтік желілер',

  // About
  'about.title': 'Біз туралы',
  'about.subtitle': 'Adapto Digital TV — онлайн теледидар платформасы',
  'about.mission.title': 'Миссия',
  'about.mission.text': 'Теледидарға қол жетімділік.',
  'about.features.title': 'Артықшылықтар',
  'about.features.free': 'Тегін',
  'about.features.free.desc': 'Жазылымсыз',
  'about.features.quality': 'HD сапа',
  'about.features.quality.desc': 'Кез келген құрылғыда',
  'about.features.devices': 'Барлық жерде',
  'about.features.devices.desc': 'Веб, мобильді, Smart TV',
  'about.features.schedule': 'Бағдарлама',
  'about.features.schedule.desc': 'Өзекті кесте',

  // Contacts
  'contacts.title': 'Байланыс',
  'contacts.subtitle': 'Бізбен байланысыңыз',
  'contacts.form.name': 'Аты',
  'contacts.form.email': 'Email',
  'contacts.form.message': 'Хабарлама',
  'contacts.form.submit': 'Жіберу',
  'contacts.form.success': 'Жіберілді!',
  'contacts.info.email': 'Email',
  'contacts.info.phone': 'Телефон',
  'contacts.info.address': 'Мекен-жай',

  // FAQ
  'faq.title': 'Сұрақтар мен жауаптар',
  'faq.subtitle': 'Жиі қойылатын сұрақтар',
  'faq.q1': 'Бұл тегін бе?',
  'faq.a1': 'Иә, барлық арналар тегін.',
  'faq.q2': 'Smart TV-де қалай көру керек?',
  'faq.a2': 'Браузерде example.com ашыңыз.',
  'faq.q3': 'Қандай арналар бар?',
  'faq.a3': 'Барлық негізгі қолжетімді арналар.',
  'faq.q4': 'Қосымшаны қайдан жүктеу керек?',
  'faq.a4': 'App Store және Google Play.',
  'faq.q5': 'Неге жұмыс істемейді?',
  'faq.a5': 'Интернетті тексеріңіз.',

  // Apps
  'apps.title': 'Қосымшалар',
  'apps.subtitle': 'Кез келген құрылғыда көріңіз',
  'apps.mobile.title': 'Мобильді',
  'apps.mobile.desc': 'iPhone және Android',
  'apps.smarttv.title': 'Smart TV',
  'apps.smarttv.desc': 'Samsung және LG',
  'apps.web.title': 'Веб',
  'apps.web.desc': 'example.com',
  'apps.features': 'Мүмкіндіктер',
  'apps.feature.live': 'Тікелей эфир',
  'apps.feature.schedule': 'Бағдарлама',
  'apps.feature.favorites': 'Таңдаулылар',
  'apps.feature.notifications': 'Хабарландырулар',

  // Search
  'search.placeholder': 'Іздеу...',
  'search.noResults': 'Табылмады',
  'search.results': 'Табылды: {count}',

  // Favorites
  'favorites.title': 'Таңдаулылар',
  'favorites.empty': 'Арналар қосыңыз',
  'favorites.add': 'Таңдаулыларға',
  'favorites.remove': 'Алып тастау',

  // Share
  'share.title': 'Бөлісу',
  'share.telegram': 'Telegram',
  'share.whatsapp': 'WhatsApp',
  'share.copy': 'Көшіру',
  'share.copied': 'Көшірілді!',
};

const dictionaries: Record<Locale, Dictionary> = { ru, kk };

interface I18nContextValue {
  locale: Locale;
  t: (key: string, vars?: Record<string, string | number>) => string;
  setLocale: (l: Locale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function detectInitialLocale(): Locale {
  // 1) Cookie has priority
  if (typeof document !== 'undefined') {
    const m = document.cookie.match(/(?:^|; )lang=(ru|kk)/);
    if (m) return m[1] as Locale;
  }
  // 2) Navigator language
  if (typeof navigator !== 'undefined') {
    const lang = navigator.language.toLowerCase();
    if (lang.startsWith('kk')) return 'kk';
  }
  return 'kk';
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectInitialLocale());

  useEffect(() => {
    // Keep <html lang> in sync
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
      document.documentElement.setAttribute('dir', 'ltr');
      // Update document title and meta description for current locale
      const dict = dictionaries[locale] || {};
      const title = dict['meta.title'];
      if (title) {
        document.title = title;
      }
      const desc = dict['meta.description'];
      if (desc) {
        let meta = document.querySelector("meta[name='description']") as HTMLMetaElement | null;
        if (!meta) {
          meta = document.createElement('meta');
          meta.name = 'description';
          document.head.appendChild(meta);
        }
        meta.content = desc;
      }
    }
  }, [locale]);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    // Persist to cookie for future sessions
    if (typeof document !== 'undefined') {
      document.cookie = `lang=${l}; path=/; max-age=31536000`;
    }
  };

  const t = useMemo(() => {
    return (key: string, vars?: Record<string, string | number>) => {
      const dict = dictionaries[locale] || {};
      let value = dict[key] || key;
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          value = value.replace(`{${k}}`, String(v));
        });
      }
      return value;
    };
  }, [locale]);

  const value = useMemo(() => ({ locale, t, setLocale }), [locale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
