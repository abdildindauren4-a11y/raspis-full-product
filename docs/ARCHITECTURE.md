# РАСПИС — Техникалық архитектура (әзірлеуші құжаттамасы)

> **Мақсаты:** жобаны басқа әзірлеуші немесе AI-агент жалғастыра алатындай
> жүйенің ішкі құрылымын түсіндіру. Бұл файл ішкі құжат — клиентке берілмейді.
>
> **Соңғы жаңарту:** шілде 2026 · **Нұсқа:** 1.0

---

## 1. Жалпы шолу

РАСПИС — мектеп кестесін автоматты құратын **клиенттік (frontend-only) SPA**.
Жеке backend сервері **жоқ**: бүкіл кесте құру логикасы браузерде (Web Worker-де)
орындалады, ал деректер сақтау мен аутентификация Firebase (BaaS) арқылы жүреді.

| Қабат | Технология |
|-------|-----------|
| UI фреймворк | React 19 + TypeScript |
| Билд құралы | Vite 7 |
| Роутинг | react-router-dom 7 (BrowserRouter) |
| Жаһандық күй | Zustand 5 (`persist` middleware-мен) |
| Стиль | Tailwind CSS 3 + CSS айнымалылары (тақырып) |
| Анимация | Framer Motion |
| Аутентификация | Firebase Auth (тек Google провайдері) |
| Дерекқор | Cloud Firestore |
| Ауыр есептеу | Web Workers (кесте генерациясы) |
| Экспорт | ExcelJS (.xlsx), jsPDF + autotable (.pdf), QRCode |
| AI кеңесші | Google Gemini API (`gemini-2.5-flash`) |
| Деплой | Vercel (статикалық хостинг) |

> **Ескерту:** `package.json`-да `@radix-ui/*` және `components/ui/*` (shadcn/ui
> стиліндегі) компоненттер көп, бірақ өнімде іс жүзінде **қолданылмайды** —
> олар бастапқы шаблоннан қалған. Нақты UI `components/shared/*` мен
> `pages/*` арқылы құрылған. Жаңа мүмкіндік жазғанда `components/shared/`-ті
> үлгі ретінде алыңыз, `components/ui/`-ге тәуелді болмаңыз.

---

## 2. Каталог құрылымы

```
src/
├── main.tsx                  # Провайдерлер ағашы + рендер нүктесі
├── App.tsx                   # Роутинг, layout, қорғалған беттер (Protected)
├── index.css                 # Tailwind + тақырып CSS айнымалылары + @keyframes
│
├── algorithm/
│   ├── engine.ts             # ⭐ КЕСТЕ ГЕНЕРАЦИЯСЫНЫҢ ӨЗЕГІ (~1820 жол)
│   └── diagnostics.ts        # Дайын кестені талдау (QualityPage + notify қолданады)
│
├── workers/
│   ├── scheduler.worker.ts       # generate() шақыратын жалғыз worker
│   └── multiScheduler.worker.ts  # generateMulti() — терең іздеу worker-і
│
├── store/
│   ├── dataStore.ts          # Zustand: мектеп деректері + нұсқалар (persist)
│   └── schedulerStore.ts     # Zustand: Worker референсі + прогресс (persist ЕМЕС)
│
├── contexts/
│   ├── AuthContext.tsx       # Firebase Auth күйі, рөл, квота жазбасы
│   ├── LangContext.tsx       # Тіл (kk/ru/en)
│   └── ThemeContext.tsx      # Тақырып (dark/light)
│
├── hooks/
│   ├── useScheduler.ts       # schedulerStore-дың жалғыз генерация қабығы
│   ├── useMultiScheduler.ts  # терең іздеу қабығы
│   └── useCloudSync.ts       # dataStore ↔ Firestore автосинхрон
│
├── lib/
│   ├── firebase.ts           # Firebase инициализациясы (кілттер осында)
│   ├── roles.ts              # ⭐ Рөлдер, тарифтік квота, Firestore CRUD
│   ├── plans.ts              # Тарифтік жоспарлар анықтамасы
│   ├── payment.ts            # Kaspi/WhatsApp төлем реквизиттері
│   ├── demoCode.ts           # Демо-режим ашу коды
│   ├── cloudStore.ts         # schools/{uid} деректерін оқу/жазу
│   ├── dataBudget.ts         # ТІРІ ТЕКСЕРУ: норма/сыйымдылық/кабинет есептеу
│   ├── seed.ts / bigSeed.ts  # Демо мектеп деректері (кіші/үлкен)
│   ├── curriculumTemplates.ts# ҚР үлгілік оқу жоспары
│   ├── excelExport.ts        # Кәсіби .xlsx экспорты (ExcelJS)
│   ├── excelTemplate.ts      # Импорт үлгісі + parseWorkbook
│   ├── pdfExport.ts          # .pdf экспорты (jsPDF)
│   ├── certificate.ts        # QR сапа сертификаты (base64 URL кодтау)
│   ├── gemini.ts             # Gemini AI чат + автоталдау
│   └── aiKnowledge.ts        # AI кеңесшісіне жүйе туралы контекст
│
├── i18n/
│   └── translations.ts       # Барлық аударма кілттері (kk/ru/en)
│
├── components/
│   ├── layout/               # Sidebar, TopBar, NotificationBell
│   └── shared/               # ⭐ НАҚТЫ ҚОЛДАНЫЛАТЫН компоненттер
│       ├── Form.tsx          #   Modal, Field, inputCls, btnP/btnG/btnD
│       ├── GlassCard.tsx     #   Негізгі карточка контейнері
│       ├── AIRobot.tsx       #   Генерациядағы робот анимациясы
│       ├── DataGuard.tsx     #   Деректер бетінің құлыбы (демо/7 күн)
│       ├── UpgradeModal.tsx  #   Квота таусылғанда шығатын терезе
│       └── PaymentModal.tsx  #   Kaspi төлем нұсқауы
│
├── pages/                    # Әр маршрутқа бір бет компоненті
└── assets/                   # Логотип, робот, қаріптер (Noto Sans), QR суреттер
```

---

## 3. Провайдерлер ағашы және маршруттау

`main.tsx` провайдерлерді осы ретпен орайды (сырттан ішке):

```
ThemeProvider → LangProvider → AuthProvider → BrowserRouter → App
```

`App.tsx` ішінде:
- **`Protected`** — қорғалған беттер орауышы. Екі шартты тексереді:
  1. `dataStore.loggedIn` (жергілікті кіру белгісі) — false болса `/login`-ге;
  2. Firebase қосулы, бірақ `user === null` (ескі жергілікті сессия) — сол
     сәтте де `/login`-ге (квота/рөл тексерусіз қалмас үшін — маңызды түзету).
- **`AppLayout`** — Sidebar + TopBar + мазмұн. `useCloudSync()` осында шақырылады.
- **`DataGuard`** — деректер енгізу беттерін (`/classes`, `/teachers`, `/rooms`,
  `/subjects`, `/groups`, `/import`) орайды.

Барлық бет `pages/` ішінде, `App.tsx`-тегі `pages` массивінде тіркелген.
`/login`, `/certificate` — қорғалмаған (Protected-сыз).

> **SPA роутинг:** `vercel.json` барлық жолды `/index.html`-ге rewrite етеді
> (клиенттік роутинг үшін). Vite `base: '/'`.

---

## 4. Күй басқару (state)

### 4.1 `dataStore` (Zustand + persist)

Мектеп деректері мен кесте нұсқаларын ұстайды. **localStorage-та** сақталады
(`persist`, кілт: `raspis-store`, `version: 2`), сондықтан бет жаңартылса да
жоғалмайды.

Ұстайтындары: `school`, `settings`, `subjects[]`, `classes[]`, `teachers[]`,
`rooms[]`, `versions[]` (сақталған кестелер), `activeVersionId`, `substitutions[]`,
`loggedIn`, `userName`.

Бастапқы мәндер `lib/seed.ts`-тегі демо мектептен келеді (22 сынып).
`resetSeed()` / `resetBigSeed()` — демо деректерді қайтару.

### 4.2 `schedulerStore` (Zustand, persist ЕМЕС)

Web Worker референсі мен генерация прогресін модуль деңгейінде (React ағашынан
тыс) ұстайды. **Себебі маңызды:** бұрын Worker GeneratePage ішіндегі hook-та
тұратын да, пайдаланушы басқа бетке өткенде компонент unmount болып, Worker
нәтижесі ешкімге жетпей қалатын. Енді Worker жаһандық store-да — бет ауысса да
генерация жалғасады.

Екі тәуелсіз ағын:
- **жалғыз генерация:** `running`, `pct`, `stage`, `result`, `worker`;
- **терең іздеу (multi):** `multiRunning`, `multiDone`, `multiTotal`,
  `multiBestQuality`, `multiResult`, `multiWorker`.

`useScheduler()` / `useMultiScheduler()` hook-тары — осы store-дың жұқа қабығы.

---

## 5. Кесте генерациясының өзегі (`algorithm/engine.ts`)

Бұл — жобаның **коммерциялық құпиясы әрі ең күрделі бөлігі** (~1820 жол).
Таза функция: `generate(input: AlgoInput, onProgress?): AlgoResult`. Сыртқы
тәуелділігі жоқ, Web Worker-де орындалады (UI қатпайды).

### 5.1 Негізгі типтер

- **`Subject`** — пән: `score` (ауырлық 1-11), `ideal[]` (қолайлы слоттар),
  `room` (арнайы кабинет түрі), `black[]` (қара тізім слоттар), `canDouble`
  (қос сабақ), `elective` (таңдау пәні — квота есебіне кірмейді).
- **`Teacher`** — `norm` (апталық сағат шегі), `gradeMin/Max`, `shift` (1/2/3),
  `unavailable[]` (қолжетімсіз слоттар), `noInterShift`.
- **`Klass`** — `grade`, `students`, `shift`, `curriculum[]` (оқу жоспары:
  `CurItem` — пән + мұғалім + сағат + топ бөлу).
- **`Slot`** — кестедегі бір орналасқан сабақ: `classId`, `subjectId`,
  `teacherId`, `roomId`, `day` (1-5), `slot` (1-8), `shift`, `groupId` (Г1/Г2),
  `dpart` (қос сабақтың бөлігі).
- **`AlgoResult`** — `success`, `slots[]`, `quality` (0-100), `classScores`,
  `tests[]` (стресс-тест), `unplaced[]`, `warnings[]`, `gaps[]`, `stats`.

### 5.2 Генерация фазалары (реті бойынша)

`generate()` ішінде фазалар `prog(pct, stage)` арқылы прогресс жібереді:

| Фаза | Атауы | Не істейді |
|------|-------|-----------|
| ЭТАП 0 | Precheck | Кіріс деректерді валидациялау |
| ЭТАП 1 | Матрицалар | Бос/бос емес күйдің тор құрылымдарын құру |
| ЭТАП 2 | Приоритет кезегі | Сабақтарды орналастыру ретіне сұрыптау |
| ЭТАП 3-4 | Greedy | Ашкөз орналастыру (ең қиынын алдымен) |
| ЭТАП 5.5 | Repair | Кедергі сабақты жылжытып, дефицитті қою |
| ЭТАП 5.7 | Soft Fill | (softFill қосулы болса) ережелерді босаңсытып бәрін орналастыру |
| ЭТАП 6 | Maximin | Кэшпен максимин теңгерімі |
| ЭТАП 7 | Мұғалім терезелері | Терезелерді азайту |
| ЭТАП 7.5 | Backtracking | Күнішілік тесіксіз орналастыру |
| ЭТАП 7.7 | Мінсіз Swap | Мұғалім терезелерін 4 деңгейлі ақылды азайту |
| ЭТАП 7.8 | Апталық теңгерім | Мұғалім сағатын күндерге тең бөлу |
| ЭТАП 8 | Стресс-тесттер | Дайын кестені автотексеру |
| ЭТАП 9 | Сапа | Сапа балын (0-100) есептеу |
| соңы | Homeroom инъекциясы | Сынып сағаты слоттарын қосу (барлық тексеруден кейін) |

> **Homeroom (сынып сағаты)** — `HOMEROOM_SUBJECT_ID` sentinel-мен белгіленген
> синтетикалық слот. Мұғалім/кабинет талап етпейді, квота есебіне кірмейді,
> **бүкіл гэп/сапа тексеруден кейін** қосылады (сол тексерулерге тимеу үшін).
> Оны тұтынатын әр бетте (`SchedulePage`, `AIAdvisorPage`, т.б.) арнайы кейс
> ретінде өңделеді — жаңа бет жазсаңыз, осыны ескеріңіз.

### 5.3 `generateMulti()` (терең іздеу)

`generateMulti(input, count, onProgress)` — `generate()`-ті `count` рет әртүрлі
кездейсоқтықпен шақырып, нәтижелерді салыстырады. Таңдау критерийі: алдымен
**тесіксіздік** (аз gap), сосын **сапа**. `MultiResult` — ең жақсы нұсқа +
статистика (`triedCount`, `cleanCount`, `qualityRange`).

### 5.4 `dataBudget.ts` — тірі тексеру (генерацияға дейін)

Генерацияға дейін-ақ мәселені ұстайтын есептеулер (UI осыны Басты беттегі
«Деректер денсаулығы» мен формалардағы ескертулерге шығарады):
- `teacherBudgets()` — әр мұғалімнің тағайындалған/норма сағаты;
- `teacherSpread()` — мұғалімнің тым көп сыныпқа шашырауы (тарылу қаупі);
- `classBudget()` — сыныптың жиынтық сағаты vs сыйымдылық;
- `roomThroughputs()` / `shiftCapacity()` — кабинет/ауысым тапшылығы.

---

## 6. Аутентификация, рөлдер, тарифтік квота

### 6.1 `AuthContext.tsx`

Firebase Auth (тек Google popup) күйін ұстайды. `onAuthStateChanged` арқылы:
1. Пайдаланушы кірсе — `registerUser()` шақырып, Firestore-дан жазбасын оқиды/жасайды;
2. `ADMIN_EMAILS`-тегі email әрқашан `admin` рөлін алады;
3. `refreshRecord()` — генерациядан кейін квотаны бұлттан қайта оқу.

Экспорттайды: `user`, `role`, `record` (тариф + квота), `configured`,
`refreshRecord`, `signInGoogle`, `logout`.

### 6.2 Рөлдер (`lib/roles.ts`)

```
type Role = "admin" | "paid" | "free" | "demo"
```

- **admin** — бәріне шексіз рұқсат (тек `ADMIN_EMAILS`, `roles.ts`-те қатты жазылған);
- **demo** — сатушының көрсетілім аккаунты: генерация мен экспорт шексіз, бірақ
  деректер енгізу жабық (код арқылы уақытша ашылады, `lib/demoCode.ts`);
- **paid / free** — қарапайым пайдаланушы (тариф квотасымен шектеулі).

Firestore құрылымы (үш коллекция):
- `users/{uid}` — `UserRecord`: рөл, тариф, квоталар, мерзімдер;
- `schools/{uid}` — пайдаланушының мектеп деректері (`cloudStore.ts`);
- `config/{doc}` — жаһандық баптаулар (қазір қолданылмайды).

### 6.3 Тарифтік жүйе (`lib/plans.ts` + `roles.ts`)

Тарифтер `plans.ts`-те бір жерде анықталған (жаңа тариф қосу үшін тек осы файлды
өзгертіңіз):

| Тариф | Жылдам ген. | Терең талдау | Баға |
|-------|------------|--------------|------|
| free | 0 | 0 | 0 ₸ |
| pro | 10 | 5 | 49 900 ₸ / 6 ай |
| premium | 30 | 10 | 99 900 ₸ / 6 ай |
| super | 100 | 40 | 249 900 ₸ / 6 ай |

- `PLAN_DURATION_MS` — тариф мерзімі (183 күн); өткенде `withPlanDefaults()`
  жазбаны автоматты `free`-ге түсіреді.
- `DATA_ENTRY_WINDOW_MS` — тариф қосылғандағы деректер енгізу терезесі (7 күн).
  Қайта сатудан қорғау тетігі: `canEditData()` осы мерзімді тексереді.

**Квота тұтыну — маңызды қауіпсіздік тұсы (`consumeGeneration()`):**
- Firestore **транзакциясымен** атомды тексеру+азайту (жарыс жағдайынан қорғау);
- **Fail-CLOSED**: жазба жоқ, ережелер тыйым салды немесе желі қатесі болса —
  генерация **ЖҮРМЕЙДІ** (бұрын fail-open болып, тарифсіз шексіз генерацияға
  тесік ашылатын — түзетілді);
- Тек Firestore мүлдем қосылмаса ғана (локал әзірлеу) ашық.

GeneratePage `run()` ішінде: `configured && !isAdmin` болса, `user` жоқ болса
`/login`-ге, әйтпесе `consumeGeneration()` шақырады.

### 6.4 Firestore қауіпсіздік ережелері

Firestore Rules Firebase Console-да орнатылады (кодта емес). Дұрыс ережелер
`docs/`-та немесе чат тарихында сақталған. Қысқаша қағида:
- `users` — кірген адам оқи алады (админ панелі үшін), тек өзін не админ өзгертеді;
- `schools/{uid}` — тек иесі оқып/жазады;
- `config` — тек админ жазады.

> **Диагностика:** ережелер дұрыс па тексеру үшін кірмеген күйде
> `firestore.googleapis.com/.../documents/users?key=API_KEY` GET жасаңыз —
> `403 PERMISSION_DENIED` дұрыс (ережелер жұмыс істеп тұр), ал бос `200`
> қауіпсіздік ашық дегенді білдіреді.

---

## 7. Бұлтпен синхрондау (`useCloudSync.ts`)

`dataStore` мен Firestore арасын байланыстырады (екеуін де бұзбай):
1. **Кіргенде** — `schools/{uid}`-тан деректерді жүктеп, `dataStore`-ға жазады
   (әр пайдаланушыға бір рет);
2. **Дерек өзгергенде** — 2 секунд debounce-пен бұлтқа сақтайды.

Кесте нұсқалары (`versions`) бұлтқа **сақталмайды** — тек localStorage-та (өлшемі
үлкен). Тек шикі мектеп деректері (school/settings/subjects/classes/teachers/rooms)
синхрондалады.

---

## 8. Экспорт және сертификат

- **`excelExport.ts`** (ExcelJS) — кәсіби .xlsx: мұқаба парағы, мазмұны
  (гиперсілтемелермен), әр сынып/мұғалім парағы, жүктеме қорытындысы, шартты
  форматтау (data bars). QR **жоқ** (әдейі алынған).
- **`pdfExport.ts`** (jsPDF + autotable) — әр сыныпқа бір бет. **Маңызды:**
  jsPDF стандарт қаріптері кириллицаны қолдамайды, сондықтан `assets/fonts/`-тен
  **Noto Sans** TTF жүктеліп, `addFileToVFS`/`addFont` арқылы ендірілген.
- **`certificate.ts`** — QR сапа сертификаты. Дерек серверге жіберілмейді:
  `CertData` JSON → base64 (юникод-қауіпсіз) → `/certificate?d=...` URL-іне
  кодталады. `CertificatePage` оны декодтап көрсетеді. QR сол URL-ге сілтейді.

---

## 9. AI кеңесші (`lib/gemini.ts`)

Google Gemini API (`gemini-2.5-flash`) тікелей браузерден шақырылады.
- API кілті пайдаланушыда (localStorage: `raspis-gemini-key`), Баптаулар бетінен
  енгізіледі — сервер жоқ болғандықтан әркім өз кілтін қолданады;
- `explainSchedule()` — генерациядан кейін кестені автоталдау;
- `askGemini()` — РАСПИС AI чаты;
- `aiKnowledge.ts` — модельге жүйе туралы контекст береді (нақты деректермен
  жауап беру үшін).

> Gemini кілтінсіз де жүйе толық жұмыс істейді — тек AI чат/автоталдау өшулі болады.

---

## 10. Интернационализация мен тақырып

- **`i18n/translations.ts`** — барлық мәтін кілттері `{ kk, ru, en }` пішінінде.
  `useLang().t("key")` арқылы қолданылады. `TransKey` типі — барлық кілттердің
  бірігуі (typo-дан қорғайды).
- **`ThemeContext`** — dark/light. CSS айнымалылары `index.css`-те
  (`:root` / `:root[data-theme]`). `--accent: #4A90D9` — негізгі бренд түсі.
- Анимациялар `index.css`-те `@keyframes` арқылы (glow-pulse, shimmer, robot-bob,
  scan-sweep, grid-pop, seesaw, badge-pop, sparkle-rise).

---

## 11. Билд және деплой

```bash
npm install
npm run dev      # http://localhost:3000 (Vite)
npm run build    # tsc -b && vite build → dist/
npm run preview  # өндірістік сборканы алдын ала қарау
```

- **TypeScript қатаң:** `tsconfig.app.json`-да `noUnusedLocals` мен
  `noUnusedParameters` қосулы — қолданылмайтын импорт/айнымалы билдті құлатады.
  Функция дұрыс жойылса, тәуелді импорттарды да тазалаңыз.
- **Деплой:** Vercel `master` тармағына push болғанда автоматты деплой жасайды.
  `vercel.json` SPA rewrite береді. Билд командасы: `npm run build`, шығыс: `dist/`.
- **Firebase кілттері** `lib/firebase.ts`-те `FALLBACK` объектісінде тікелей
  жазылған (Firebase apiKey ашық болуға арналған — қауіпсіздік Firestore
  ережелерімен қамтамасыз етіледі). `.env` (`VITE_FIREBASE_*`) болса, ол басым.

> **Тұрақтылық ескертуі:** `vite.config.ts`-те `kimi-plugin-inspect-react`
> плагині бар (бастапқы шаблоннан). Ол өндіріске зиянсыз, бірақ керек болмаса
> алып тастауға болады.

---

## 12. Жалпы жұмыс ағыны (пайдаланушы жолы)

```
Кіру (Google)
  → Деректер енгізу (Сыныптар/Мұғалімдер/Кабинеттер/Пәндер/Топ) немесе Excel импорт
  → (тірі тексеру: dataBudget → «Деректер денсаулығы»)
  → Алгоритм баптаулары (қажет болса)
  → Генерация (quota тексеру → Worker → engine.generate)
  → Нәтиже + сапа балы → Нұсқа ретінде сақтау
  → Расписание/Сапа есебі/РАСПИС AI-да қарау
  → Экспорт (Excel/PDF/басып шығару) + QR сертификат
```

---

## 13. Жиі өзгертілетін тұстар («мен мынаны қайдан өзгертемін?»)

| Не өзгерту керек | Қай файл |
|------------------|----------|
| Тариф бағасы/лимиті | `lib/plans.ts` |
| Демо-режим ашу коды | `lib/demoCode.ts` |
| Kaspi/WhatsApp нөмірі | `lib/payment.ts` |
| Әкімші email(дер)і | `lib/roles.ts` → `ADMIN_EMAILS` |
| Firebase жобасы | `lib/firebase.ts` → `FALLBACK` |
| Мәтін/аударма | `i18n/translations.ts` |
| Кесте құру ережесі/фазасы | `algorithm/engine.ts` |
| Тірі тексеру ескертулері | `lib/dataBudget.ts` |
| Демо мектеп деректері | `lib/seed.ts` / `lib/bigSeed.ts` |
| Excel экспорт пішіні | `lib/excelExport.ts` |
| Тақырып түсі/анимация | `index.css` |

---

## 14. Ескертулер мен техникалық қарыз

- `components/ui/*` (60+ файл) мен көптеген `@radix-ui/*` тәуелділіктер
  **қолданылмайды** — бастапқы шаблон қалдығы. Тазалауға болады, бірақ билдке
  зиянсыз.
- `xlsx` (SheetJS) мен `exceljs` екеуі де **қолданылады**: **экспорт** `exceljs`-те
  (`excelExport.ts` — кәсіби пішін), ал **импорт оқу** `xlsx`-те
  (`excelTemplate.ts` → `parseWorkbook`). Екеуі де керек, шатастырмаңыз.
- Негізгі бандл ~3 МБ (gzip ~940 КБ) — `engine.ts` + `exceljs` + `firebase`
  салмағы. Керек болса `manualChunks`-пен бөлуге болады (қазір бір чанк).
- Кесте нұсқалары бұлтта сақталмайды — құрылғы ауысса, нұсқалар жоғалады
  (тек шикі деректер синхрондалады). Болашақ жақсарту нүктесі.

---

*Бұл құжат — РАСПИС жүйесінің ішкі техникалық құжаттамасы. Автор: ABDILDIN DAUREN.*
