// filepath: src/lib/procurementDocs.ts
// САТЫП АЛУ ҚҰЖАТТАРЫНЫҢ ГЕНЕРАТОРЫ — мектептерге жіберілетін ресми қағаздар:
//   1) Техникалық спецификация — ҚР Үкіметінің 06.05.2019 № 261 қаулысындағы
//      типтік нысан бойынша (Типовая конкурсная документация, Приложение 3);
//   2) Коммерциялық ұсыныс (КП) — стандартты іскерлік нысан.
// Әкімші панелінде мектеп атауы мен тарифті толтырып, бір батырмамен басып
// шығаруға (PDF) немесе Word (.doc) күйінде жүктеуге болады. ЖК реквизиттері
// бір рет енгізіліп, браузерде сақталады.
import { PLANS, LAUNCH_PROMO, formatKzt, effectivePrice, type PlanId } from "@/lib/plans";
import { PAYMENT } from "@/lib/payment";

// ── ЖК реквизиттері (бір рет толтырылып, сақталады) ──
export interface DocRequisites {
  ipName: string;   // ЖК атауы: Абдильдин Д.
  iinBin: string;   // ЖСН/БИН
  address: string;
  iik: string;      // KZ... шот
  bank: string;     // банк атауы
  bik: string;
  signer: string;   // қол қоюшының аты-жөні
}

const REQ_KEY = "raspis-doc-requisites";
export function loadRequisites(): DocRequisites {
  try {
    return { ipName: "", iinBin: "", address: "", iik: "", bank: "", bik: "", signer: "", ...JSON.parse(localStorage.getItem(REQ_KEY) || "{}") };
  } catch {
    return { ipName: "", iinBin: "", address: "", iik: "", bank: "", bik: "", signer: "" };
  }
}
export function saveRequisites(r: DocRequisites) {
  try { localStorage.setItem(REQ_KEY, JSON.stringify(r)); } catch { /* толса — елеусіз */ }
}

// ── Құжат параметрлері (әр мектепке жеке) ──
export interface DocParams {
  schoolName: string;   // «Общеобразовательная школа № 104»
  directorName: string; // директордың аты-жөні (бос болса — сызық)
  plan: PlanId;
  price: number;        // нақты ұсынылатын баға (өзгертуге болады)
  outNo: string;        // шығыс №
  date: string;         // «12» июля 2026 г. форматындағы күн бөлігі
}

// Тариф мерзімін ресми орысша жазу
const DURATION_RU: Record<PlanId, string> = {
  free: "—",
  pro: "6 (шесть) месяцев",
  premium: "36 месяцев (3 года)",
  super: "84 месяца (7 лет)",
};
const MONTHS_RU: Record<PlanId, string> = { free: "—", pro: "6 месяцев", premium: "36 месяцев", super: "84 месяца" };

const fill = (v: string, w = 20) => (v && v.trim() ? v : "_".repeat(w));

// Ортақ CSS (Times New Roman, A4, ресми түр)
const BASE_CSS = `
  @page { size: A4; margin: 20mm 15mm 20mm 25mm; }
  body { font-family: "Times New Roman", "Liberation Serif", serif; font-size: 12pt; color: #000; line-height: 1.45; margin: 24px; }
  @media print { body { margin: 0; } }
  table { border-collapse: collapse; width: 100%; font-size: 11.5pt; }
  ul { margin: 4px 0 6px 18px; padding: 0; }
  li { margin-bottom: 3px; }
  .sign { margin-top: 36px; }
`;

// ── 1. ТЕХНИКАЛЫҚ СПЕЦИФИКАЦИЯ ──
export function tehSpecHtml(req: DocRequisites, p: DocParams): string {
  const plan = PLANS[p.plan];
  return `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>Техническая спецификация</title><style>${BASE_CSS}
  .corner { text-align: right; font-size: 11pt; line-height: 1.35; }
  h1 { font-size: 13pt; text-align: center; font-weight: bold; margin: 22px 0 4px; }
  .sub { text-align: center; font-size: 11pt; margin: 0 0 16px; }
  td { border: 1px solid #000; padding: 6px 8px; vertical-align: top; }
  td.k { width: 38%; }
  .sec { font-weight: bold; }
  </style></head><body>
  <div class="corner">Приложение 2<br>к постановлению Правительства<br>Республики Казахстан<br>от «6» мая 2019 года № 261<br><br>Приложение 3<br>к Типовой конкурсной документации</div>
  <h1>Техническая спецификация закупаемых услуг</h1>
  <p class="sub">(представляется потенциальным поставщиком на каждый лот в отдельности)</p>
  <p>№ закупки (конкурса) ___________________________________<br>
  Наименование закупки: <b>Услуги по предоставлению доступа к программному обеспечению для автоматизированного составления школьного расписания</b><br>
  Заказчик: <b>${fill(p.schoolName, 40)}</b></p>
  <table>
    <tr><td class="k">№ лота</td><td>____________</td></tr>
    <tr><td class="k">Наименование лота</td><td>Услуги по предоставлению доступа к программному обеспечению для автоматизированного составления школьного расписания</td></tr>
    <tr><td class="k">Наименование услуги (с указанием марки, модели, типа и/или товарного знака либо знака обслуживания и т.д.)</td>
      <td>Предоставление доступа к автоматизированной веб-системе составления школьного расписания <b>«РАСПИС»</b> (raspis-full-product-ug2s.vercel.app), тарифный план <b>«${plan.name}»</b>, срок доступа — <b>${DURATION_RU[p.plan]}</b></td></tr>
    <tr><td class="k">Страна происхождения</td><td>Республика Казахстан</td></tr>
    <tr><td class="k">Производитель (поставщик)</td><td>ИП «${fill(req.ipName)}», ИИН/БИН ${fill(req.iinBin)}</td></tr>
    <tr><td class="k">Год выпуска (версия)</td><td>2026 год (веб-платформа, обновления предоставляются автоматически в течение всего срока доступа)</td></tr>
    <tr><td class="k">Гарантийный срок (при наличии) (в месяцах)</td><td>${MONTHS_RU[p.plan]} — техническая поддержка и обновления включены в стоимость на весь срок доступа</td></tr>
    <tr><td class="k">Описание функциональных, технических, качественных и эксплуатационных характеристик</td><td>
      <span class="sec">1. Функциональные характеристики:</span>
      <ul>
        <li>автоматическая генерация недельного расписания уроков без конфликтов (учитель/класс/кабинет) за секунды;</li>
        <li>соблюдение 18 жёстких правил составления и норм СанПиН: дневные лимиты уроков и баллов учебной нагрузки, кривая трудности, размещение сложных предметов (математика, алгебра, геометрия — в первых 4 уроках);</li>
        <li>режим «глубокого поиска»: построение до 300 вариантов расписания и автоматический выбор лучшего;</li>
        <li>режим «умного обновления»: при изменениях (учитель ушёл/пришёл, класс добавлен, часы изменены) пересобираются только затронутые классы, расписание остальных сохраняется;</li>
        <li>поддержка деления классов на группы (два преподавателя одновременно), сдвоенных уроков, двух смен, закреплённых кабинетов начальных классов, классного часа;</li>
        <li>модуль замен отсутствующих учителей с автоматическим подбором;</li>
        <li>импорт данных школы из Excel по готовому шаблону; экспорт расписания в Excel и PDF, печать по классам, учителям и кабинетам;</li>
        <li>отчёт качества расписания по каждому классу, стресс-тесты, QR-сертификат качества;</li>
        <li>хранение версий расписания с возможностью возврата и сравнения;</li>
        <li>интерфейс на казахском, русском и английском языках.</li>
      </ul>
      <span class="sec">2. Технические характеристики:</span>
      <ul>
        <li>веб-приложение: работает в браузере (Chrome, Safari, Edge и др.) на компьютере, планшете и смартфоне; установка ПО не требуется;</li>
        <li>авторизация через защищённый Google-аккаунт;</li>
        <li>облачное хранение данных на инфраструктуре Google (Firebase) с разграничением доступа: данные школы доступны только её учётной записи;</li>
        <li>доступ с любого устройства, автоматическая синхронизация.</li>
      </ul>
      <span class="sec">3. Качественные характеристики:</span>
      <ul>
        <li>каждое сформированное расписание автоматически проходит 12 контрольных стресс-тестов (отсутствие конфликтов, «окон», соответствие нормам);</li>
        <li>система заранее диагностирует ошибки исходных данных и указывает способ их исправления.</li>
      </ul>
      <span class="sec">4. Эксплуатационные характеристики:</span>
      <ul>
        <li>тарифный план «${plan.name}»: ${plan.quickGenerations} быстрых генераций и ${plan.deepSearches} глубоких поисков; все функции системы открыты;</li>
        <li>срок доступа — ${DURATION_RU[p.plan]} с даты активации.</li>
      </ul>
      <span class="sec">5. Сопутствующие услуги:</span>
      <ul>
        <li>демонстрация системы и обучение ответственного сотрудника (завуча);</li>
        <li>помощь при первичном вводе данных школы;</li>
        <li>руководство пользователя (37 страниц, на казахском языке);</li>
        <li>консультационная поддержка по WhatsApp и во встроенном чате на весь срок доступа.</li>
      </ul>
    </td></tr>
    <tr><td class="k">Иные сведения, подтверждающие соответствие услуги требованиям конкурсной документации (технической спецификации)</td>
      <td>Услуга оказывается дистанционно, в электронной форме. Доступ предоставляется в течение 1 (одного) рабочего дня после оплаты. Национальные и межгосударственные стандарты на данный вид услуг отсутствуют; в связи с этим указаны требуемые функциональные, технические, качественные и эксплуатационные характеристики.</td></tr>
  </table>
  <div class="sign">
    Поставщик: ИП «${fill(req.ipName)}»<br><br>
    ______________________ / ${fill(req.signer, 28)} /<br>
    <span style="font-size:10.5pt">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(подпись)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(Ф.И.О.)</span><br><br>
    «____» ______________ 2026 г.&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;М.П.
  </div>
  </body></html>`;
}

// ── 2. КОММЕРЦИЯЛЫҚ ҰСЫНЫС ──
export function kpHtml(req: DocRequisites, p: DocParams): string {
  const plan = PLANS[p.plan];
  const priceStr = formatKzt(p.price).replace(" ₸", "");
  const isPromo = LAUNCH_PROMO.active && p.price === effectivePrice(plan.price, true) && plan.price > 0;
  return `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>Коммерческое предложение</title><style>${BASE_CSS}
  body { line-height: 1.5; }
  .head { border-bottom: 2px solid #1e3a5f; padding-bottom: 10px; margin-bottom: 6px; }
  .head b { font-size: 15pt; color: #1e3a5f; letter-spacing: 1px; }
  .head .req { font-size: 10.5pt; line-height: 1.4; margin-top: 3px; }
  .to { text-align: right; margin: 14px 0 20px; }
  h1 { font-size: 14pt; text-align: center; font-weight: bold; margin: 8px 0 16px; letter-spacing: .5px; }
  th, td { border: 1px solid #000; padding: 6px 8px; vertical-align: top; }
  th { font-weight: bold; text-align: center; background: #f2f2f2; }
  td.c { text-align: center; } td.r { text-align: right; }
  .cond p { margin: 4px 0; }
  </style></head><body>
  <div class="head"><b>ИП «${fill(req.ipName)}»</b>
    <div class="req">ИИН/БИН: ${fill(req.iinBin)} · Адрес: ${fill(req.address, 40)}<br>
    ИИК: ${fill(req.iik, 24)} в ${fill(req.bank, 16)}, БИК: ${fill(req.bik, 12)}<br>
    Тел.: ${PAYMENT.kaspiPhone} · Сайт: raspis-full-product-ug2s.vercel.app</div></div>
  <p style="font-size:11pt">Исх. № ${fill(p.outNo, 6)} от ${fill(p.date, 26)}</p>
  <div class="to">Директору<br>${fill(p.schoolName, 40)}<br>${fill(p.directorName, 32)}</div>
  <h1>КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ</h1>
  <p>Настоящим предлагаем Вам услуги по предоставлению доступа к автоматизированной веб-системе составления школьного расписания <b>«РАСПИС»</b> — казахстанской разработке, формирующей недельное расписание уроков без конфликтов за секунды, с соблюдением норм СанПиН и педагогических требований.</p>
  <table>
    <tr><th style="width:6%">№</th><th>Наименование услуги</th><th style="width:9%">Ед. изм.</th><th style="width:9%">Кол-во</th><th style="width:15%">Цена, тенге</th><th style="width:15%">Сумма, тенге</th></tr>
    <tr><td class="c">1</td>
      <td>Предоставление доступа к системе автоматизированного составления школьного расписания «РАСПИС», тарифный план «${plan.name}», срок доступа ${DURATION_RU[p.plan]} (обновления, техническая поддержка, обучение и руководство пользователя включены)</td>
      <td class="c">услуга</td><td class="c">1</td><td class="r">${priceStr}</td><td class="r">${priceStr}</td></tr>
    <tr><td colspan="5" class="r"><b>Итого:</b></td><td class="r"><b>${priceStr}</b></td></tr>
  </table>
  ${isPromo ? `<p style="font-size:11pt">Цена указана с учётом скидки ${LAUNCH_PROMO.percent}% в рамках акции для первых школ (полная стоимость — ${formatKzt(plan.price).replace(" ₸", "")} тенге). НДС не предусмотрен (поставщик не является плательщиком НДС).</p>` : `<p style="font-size:11pt">НДС не предусмотрен (поставщик не является плательщиком НДС).</p>`}
  <div class="cond">
    <p><b>В стоимость включено:</b></p>
    <ul>
      <li>автоматическая генерация расписания без конфликтов, глубокий поиск лучшего варианта, «умное обновление» при изменениях в течение учебного года;</li>
      <li>импорт данных из Excel, экспорт в Excel/PDF, печать, отчёт качества и QR-сертификат;</li>
      <li>демонстрация системы, обучение ответственного сотрудника, помощь при вводе данных;</li>
      <li>руководство пользователя (37 стр.) и поддержка по WhatsApp на весь срок доступа.</li>
    </ul>
    <p><b>Условия оплаты:</b> 100% предоплата на расчётный счёт поставщика на основании счёта на оплату.</p>
    <p><b>Срок предоставления доступа:</b> в течение 1 (одного) рабочего дня с момента поступления оплаты.</p>
    <p><b>Срок действия предложения:</b> 30 календарных дней с даты составления.</p>
  </div>
  <div class="sign">
    ИП «${fill(req.ipName)}»<br><br>
    ______________________ / ${fill(req.signer, 28)} /<br>
    <span style="font-size:10.5pt">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(подпись)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(Ф.И.О.)</span><br><br>
    «____» ______________ 2026 г.&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;М.П.
  </div>
  </body></html>`;
}

// Жаңа терезеде ашып, баспа диалогын шақыру (PDF етіп сақтауға болады)
export function printDoc(html: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}

// Word (.doc) күйінде жүктеу — Word HTML-ді ашып, өңдеуге мүмкіндік береді
export function downloadDoc(html: string, filename: string) {
  const blob = new Blob([html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
