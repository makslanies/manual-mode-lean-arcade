export interface OverlayContent {
  title: {
    tag: string;
    heading: string;
    description: string;
    startBtn: string;
  };
  supply: {
    tag: string;
    heading: string;
    description: string;
    zoneLabel: string;
    mountBtn: (selected: number, budget: number) => string;
    autoMount: (seconds: number) => string;
  };
  rules: {
    tag: string;
    heading: string;
    description: string;
    ifPrefix: string;
    thenPrefix: string;
    wireBtn: (selected: number) => string;
    noSensors: string;
    autoStart: (seconds: number) => string;
  };
  end: {
    tag: string;
    titleWin: string;
    titleFallback: string;
    act1Label: string;
    act2Label: string;
    act3Label: string;
    tripsLabel: string;
    preventedLabel: string;
    cashLabel: string;
    footer: string;
    againBtn: string;
  };
}

export const ru: OverlayContent = {
  title: {
    tag: 'Аркада для тех, кто управляет производством',
    heading: 'РУЧНОЙ РЕЖИМ',
    description:
      'Ты — директор. Станок греется, пресс ждёт деталей, сырьё тает, люди засыпают, ' +
      'склад теплеет, энергощит на пределе, а рейсы горят по графику. Кликай по зонам и успевай везде. ' +
      'Спойлер: не успеешь — и это нормально.',
    startBtn: 'НАЧАТЬ СМЕНУ',
  },
  supply: {
    tag: 'Пауза снабжения',
    heading: 'Бюджета хватит на 3 датчика',
    description:
      'Датчик не работает за тебя — он снимает туман и предупреждает заранее. Выбери, где болело сильнее.',
    zoneLabel: 'Зона:',
    mountBtn: (selected, budget) => `СМОНТИРОВАТЬ (${selected}/${budget})`,
    autoMount: (seconds) => `Автомонтаж через ${seconds} с`,
  },
  rules: {
    tag: 'Инженерная пауза',
    heading: 'Соедини датчики с действиями',
    description:
      'Кликни по строке — протянешь кабель ЕСЛИ→ТО через щит логики. ' +
      'Правило срабатывает само, без директора. Доступны только зоны с датчиками.',
    ifPrefix: 'ЕСЛИ',
    thenPrefix: 'ТО',
    wireBtn: (selected) => `ЗАПУСТИТЬ ЛОГИКУ (${selected})`,
    noSensors: 'Без датчиков соединять нечего — логика строится на данных.',
    autoStart: (seconds) => `Автозапуск через ${seconds} с`,
  },
  end: {
    tag: 'Конец смены',
    titleWin: 'Логика окупилась',
    titleFallback: 'Хаос силён — попробуй ещё',
    act1Label: 'Акт 1 · вручную — потери',
    act2Label: 'Акт 2 · с датчиками — потери',
    act3Label: 'Акт 3 · с логикой — потери',
    tripsLabel: 'Рейсы вовремя / всего',
    preventedLabel: 'Предотвращено · автоматикой',
    cashLabel: 'Касса смены',
    footer:
      'Так работает лестница: наблюдаемость → автоматизация. Реальная платформа делает ' +
      'то же с настоящим заводом.',
    againBtn: 'ЕЩЁ СМЕНА',
  },
};
