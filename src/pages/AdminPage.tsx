// filepath: src/pages/AdminPage.tsx
import { useState, useEffect, useRef } from "react";
import { Shield, Users, Search, Crown, CreditCard, User as UserIcon, Loader2, Eye, CalendarPlus, Flame, AlertTriangle, FileText, Printer, FileDown, ChevronDown } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";
import { inputCls } from "@/components/shared/Form";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import type { TransKey } from "@/i18n/translations";
import {
  getAllUsers, setUserRole, setUserPlan, extendDataEntry,
  type UserRecord, type Role,
} from "@/lib/roles";
import { PLAN_ORDER, PLANS, LAUNCH_PROMO, type PlanId } from "@/lib/plans";
import { getPromoState, type PromoState } from "@/lib/promo";
import { resolveSwapAlert } from "@/lib/antiResale";
import {
  loadRequisites, saveRequisites, tehSpecHtml, kpHtml, printDoc, downloadDoc, docDateStr,
  type DocRequisites, type DocParams, type DocLang,
} from "@/lib/procurementDocs";
import { removeSignatureBackground } from "@/lib/signatureBg";
import { loadDocRequisitesCloud, saveDocRequisitesCloud } from "@/lib/docRequisitesCloud";
import { effectivePrice } from "@/lib/plans";

const ROLE_INFO: Record<Role, { label: string; icon: typeof Crown; cls: string }> = {
  admin: { label: "role.admin", icon: Crown, cls: "status-warn" },
  paid: { label: "role.paid", icon: CreditCard, cls: "status-good" },
  free: { label: "role.free", icon: UserIcon, cls: "text-muted-c" },
  demo: { label: "role.demo", icon: Eye, cls: "accent-c" },
};

export default function AdminPage() {
  const { role, configured } = useAuth();
  const { t } = useLang();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [promo, setPromo] = useState<PromoState | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setUsers(await getAllUsers());
      getPromoState().then(setPromo);
      setLoading(false);
    })();
  }, []);

  // Тек админге рұқсат
  if (role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Shield className="w-12 h-12 text-faint-c mb-3" />
        <p className="text-muted-c">{t("adm.onlyAdmin")}</p>
      </div>
    );
  }

  const changeRole = async (uid: string, newRole: Role) => {
    const ok = await setUserRole(uid, newRole);
    if (ok) setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, role: newRole } : u)));
  };

  const changePlan = async (uid: string, plan: PlanId) => {
    const ok = await setUserPlan(uid, plan);
    if (ok) {
      // Жаңартылған мерзімдерді бұлттан қайта оқымай-ақ жергілікті есептейміз
      const limits = PLANS[plan];
      const paid = plan !== "free";
      const now = Date.now();
      setUsers((prev) => prev.map((u) => (u.uid === uid ? {
        ...u, plan,
        quickRemaining: limits.quickGenerations, deepRemaining: limits.deepSearches,
        planExpiresAt: paid ? now + limits.durationMs : 0,
        dataEntryUntil: paid ? now + 7 * 86400000 : 0,
      } : u)));
      if (paid) getPromoState().then(setPromo); // акция санауышы жаңарды — қайта оқимыз
    }
  };

  const extendData = async (uid: string) => {
    const ok = await extendDataEntry(uid, 7);
    if (ok) setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, dataEntryUntil: Date.now() + 7 * 86400000 } : u)));
  };

  // Күдікті белгіні жабу: жаңа дерек заңды деп қабылданады (базалық із ауысады)
  const acceptSwap = async (uid: string) => {
    const ok = await resolveSwapAlert(uid);
    if (ok) setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, swapAlert: null } : u)));
  };

  const swapAlerts = users.filter((u) => u.swapAlert);

  // ── Сатып алу құжаттарының генераторы (мектептерге ресми қағаздар) ──
  const [docsOpen, setDocsOpen] = useState(false);
  const [req, setReq] = useState<DocRequisites>(loadRequisites);
  const [docSchool, setDocSchool] = useState("");
  const [docDirector, setDocDirector] = useState("");
  const [docPlan, setDocPlan] = useState<PlanId>("premium");
  const [docPrice, setDocPrice] = useState<number>(effectivePrice(PLANS.premium.price));
  const [docOutNo, setDocOutNo] = useState("");
  const [docLang, setDocLang] = useState<DocLang>("ru"); // құжат тілі
  const [sigBusy, setSigBusy] = useState(false); // қолтаңба фоны өңделуде
  const [sigMenuOpen, setSigMenuOpen] = useState(false); // қолтаңба таңдау тізімі ашық па
  const [cloudSaved, setCloudSaved] = useState(false); // бұлтқа сақталды белгісі
  const setReqField = (k: keyof DocRequisites, v: string | boolean | number) => {
    const next = { ...req, [k]: v };
    setReq(next);
    saveRequisites(next);
  };

  // Реквизиттер мен қолтаңбаларды БҰЛТПЕН синхрондау (кез келген құрылғыдан).
  // Кіргенде бұлттан оқимыз; өзгерген сайын кідіріспен (debounce) сақтаймыз.
  const reqCloudTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqLoaded = useRef(false);
  useEffect(() => {
    (async () => {
      const cloud = await loadDocRequisitesCloud();
      if (cloud) {
        const merged = { ...loadRequisites(), ...cloud } as DocRequisites;
        setReq(merged);
        saveRequisites(merged); // жергілікті кэшті де жаңартамыз
      }
      reqLoaded.current = true;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!reqLoaded.current) return; // алғашқы жүктеуден кейін ғана
    if (reqCloudTimer.current) clearTimeout(reqCloudTimer.current);
    reqCloudTimer.current = setTimeout(async () => {
      const ok = await saveDocRequisitesCloud(req);
      if (ok) { setCloudSaved(true); setTimeout(() => setCloudSaved(false), 2000); }
    }, 1200);
    return () => { if (reqCloudTimer.current) clearTimeout(reqCloudTimer.current); };
  }, [req]);
  const docParams = (): DocParams => ({
    schoolName: docSchool, directorName: docDirector,
    plan: docPlan, price: docPrice, outNo: docOutNo, date: docDateStr(docLang),
  });
  const docInput = "px-3 py-2 rounded-lg bg-input-c border border-soft-c text-sm text-strong-c placeholder:text-faint-c focus:outline-none focus:border-[var(--accent)] w-full";

  const filtered = users.filter((u) =>
    u.email.toLowerCase().includes(query.toLowerCase()) || u.name.toLowerCase().includes(query.toLowerCase())
  );

  const stats = {
    total: users.length,
    admin: users.filter((u) => u.role === "admin").length,
    paid: users.filter((u) => u.role === "paid").length,
    free: users.filter((u) => u.role === "free").length,
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center"><Shield className="w-5 h-5 text-white" /></div>
        <div>
          <h1 className="font-['IBM_Plex_Sans'] text-2xl sm:text-3xl font-bold text-strong-c">{t("adm.title")}</h1>
          <p className="text-muted-c mt-0.5 text-sm">{t("adm.subtitle")}</p>
        </div>
      </div>

      {/* ҚАЙТА САТУ КҮДІГІ: тариф иесінің деректері түбегейлі ауысқан аккаунттар */}
      {swapAlerts.length > 0 && (
        <div className="space-y-2">
          {swapAlerts.map((u) => (
            <div key={u.uid} className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3">
              <p className="text-sm font-semibold status-bad flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {t("adm.swapTitle")}: {u.name} ({u.email})
              </p>
              <p className="text-xs text-soft-c mt-1.5">
                {t("adm.swapDetail")
                  .replace("{old}", u.swapAlert!.oldSchool || "—")
                  .replace("{new}", u.swapAlert!.newSchool || "—")
                  .replace("{p}", String(u.swapAlert!.overlap))
                  .replace("{a}", String(u.swapAlert!.oldCount))
                  .replace("{b}", String(u.swapAlert!.newCount))}
                {" · "}{new Date(u.swapAlert!.at).toLocaleString()}
              </p>
              <button
                onClick={() => acceptSwap(u.uid)}
                className="mt-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-c border border-soft-c text-soft-c hover:bg-[rgba(127,127,127,0.08)] transition-all"
              >
                {t("adm.swapAccept")}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ҚҰЖАТ ГЕНЕРАТОРЫ: мектептерге ресми тех. спецификация мен КП */}
      <GlassCard hover={false}>
        <button onClick={() => setDocsOpen(!docsOpen)} className="w-full flex items-center justify-between gap-2">
          <h3 className="font-semibold text-strong-c flex items-center gap-2">
            <FileText className="w-4 h-4 accent-c" /> Сатып алу құжаттары (мектепке)
          </h3>
          <ChevronDown className={`w-4 h-4 text-muted-c transition-transform ${docsOpen ? "" : "-rotate-90"}`} />
        </button>
        {docsOpen && (
          <div className="mt-4 space-y-4">
            <p className="text-xs text-muted-c">
              Ресми үлгідегі <b>Техникалық спецификация</b> (ҚР Үкіметінің 06.05.2019 № 261 қаулысы) және{" "}
              <b>Коммерциялық ұсыныс</b>. Реквизиттер мен қолтаңбалар <b>бұлтта сақталады</b> — кез келген құрылғыдан қолжетімді.
            </p>
            {/* ЖК реквизиттері */}
            <div>
              <p className="text-xs font-semibold text-strong-c mb-2 flex items-center gap-2">
                ЖК реквизиттері (бір рет)
                {cloudSaved && <span className="text-[10px] font-normal status-good">✓ бұлтқа сақталды</span>}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input className={docInput} placeholder="ЖК атауы (ИП «...»)" value={req.ipName} onChange={(e) => setReqField("ipName", e.target.value)} />
                <input className={docInput} placeholder="ЖСН/БИН" value={req.iinBin} onChange={(e) => setReqField("iinBin", e.target.value)} />
                <input className={docInput} placeholder="Мекенжай" value={req.address} onChange={(e) => setReqField("address", e.target.value)} />
                <input className={docInput} placeholder="ИИК (KZ...)" value={req.iik} onChange={(e) => setReqField("iik", e.target.value)} />
                <input className={docInput} placeholder="Банк (АО «...»)" value={req.bank} onChange={(e) => setReqField("bank", e.target.value)} />
                <input className={docInput} placeholder="БИК" value={req.bik} onChange={(e) => setReqField("bik", e.target.value)} />
                <input className={docInput} placeholder="КБе" value={req.kbe} onChange={(e) => setReqField("kbe", e.target.value)} />
                <input className={docInput + " sm:col-span-2"} placeholder="Қол қоюшы (Ф.И.О.)" value={req.signer} onChange={(e) => setReqField("signer", e.target.value)} />
              </div>
              {/* Сенімхат негізінде қол қою (иесі емес адам қол қойса) */}
              <label className="flex items-center gap-2 mt-3 text-sm text-soft-c cursor-pointer">
                <input type="checkbox" checked={!!req.byProxy} onChange={(e) => setReqField("byProxy", e.target.checked)} />
                Сенімхат (доверенность) негізінде қол қою
              </label>
              {req.byProxy && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  <input className={docInput} placeholder="Сенімхат №" value={req.proxyNo || ""} onChange={(e) => setReqField("proxyNo", e.target.value)} />
                  <input className={docInput} placeholder="Сенімхат күні (мыс. 01.07.2026)" value={req.proxyDate || ""} onChange={(e) => setReqField("proxyDate", e.target.value)} />
                  <p className="text-xs text-faint-c sm:col-span-2">
                    Құжатта «ЖК ... атынан, № ... сенімхат негізінде әрекет етуші {req.signer || "[Ф.И.О.]"}» деп шығады. Сенімхаттың өзін құжатқа қоса тіркеңіз.
                  </p>
                </div>
              )}
              {/* Қолтаңба (факсимиле) — ашылмалы тізімнен таңдау */}
              <div className="mt-3">
                <p className="text-xs font-semibold text-strong-c mb-1">Қол қою</p>
                <div className="relative" style={{ maxWidth: 320 }}>
                  {/* Таңдау батырмасы: ағымдағы қолтаңбаны көрсетеді, басқанда астыға ашылады */}
                  <button onClick={() => setSigMenuOpen((o) => !o)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-input-c border border-soft-c hover:border-[var(--accent)] transition-colors">
                    {req.signatureImg
                      ? <img src={req.signatureImg} alt="" className="h-8 bg-white rounded px-1" />
                      : <span className="text-xs text-muted-c">Қолтаңба таңдаңыз</span>}
                    <ChevronDown className={`w-4 h-4 text-muted-c ml-auto shrink-0 transition-transform ${sigMenuOpen ? "rotate-180" : ""}`} />
                  </button>

                  {/* Ашылмалы тізім */}
                  {sigMenuOpen && (
                    <div className="absolute z-20 mt-1 w-full rounded-lg border border-soft-c bg-surface-c shadow-lg p-2 space-y-1">
                      {(req.signatures || []).length === 0 && (
                        <p className="text-xs text-faint-c px-1 py-2">Қолтаңба жоқ — төменнен қосыңыз.</p>
                      )}
                      {(req.signatures || []).map((sig, i) => (
                        <div key={i} onClick={() => { setReqField("signatureImg", sig); setSigMenuOpen(false); }}
                          className={`flex items-center gap-2 rounded-lg px-2 py-1 cursor-pointer border ${
                            req.signatureImg === sig ? "border-[var(--accent)] bg-input-c" : "border-transparent hover:bg-input-c"}`}>
                          <img src={sig} alt={`қолтаңба ${i + 1}`} className="h-8 bg-white rounded px-1" />
                          {req.signatureImg === sig && <span className="text-[10px] status-good">✓ таңдалды</span>}
                          <button onClick={(ev) => {
                            ev.stopPropagation();
                            const list = (req.signatures || []).filter((_, j) => j !== i);
                            const next = { ...req, signatures: list, signatureImg: req.signatureImg === sig ? (list[0] || "") : req.signatureImg };
                            setReq(next); saveRequisites(next);
                          }} className="ml-auto w-5 h-5 rounded-full bg-red-500/15 status-bad text-xs flex items-center justify-center hover:bg-red-500/30" title="Өшіру">×</button>
                        </div>
                      ))}
                      {/* Жаңа қолтаңба қосу */}
                      <label className="flex items-center justify-center gap-1.5 text-xs px-2 py-2 rounded-lg gradient-primary text-white cursor-pointer mt-1">
                        {sigBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} Жаңа қолтаңба қосу
                        <input type="file" accept="image/png,image/jpeg" className="hidden" disabled={sigBusy}
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            setSigBusy(true);
                            try {
                              const raw = await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(f); });
                              const clean = await removeSignatureBackground(raw); // фонды автоматты жою
                              const list = [...((req.signatures || [])), clean];
                              const next = { ...req, signatures: list, signatureImg: clean };
                              setReq(next); saveRequisites(next); setSigMenuOpen(false);
                            } finally { setSigBusy(false); e.target.value = ""; }
                          }} />
                      </label>
                    </div>
                  )}
                </div>
                <p className="text-xs text-faint-c mt-1">Батырманы басып тізімнен таңдаңыз. Жаңа сурет қосқанда фоны автоматты жойылады, таңдалғаны құжатқа қойылады.</p>

                {/* Қолтаңба орнын дәлдеу — құжаттағыдай алдын ала көрініс + жылжыту */}
                {req.signatureImg && (
                  <div className="mt-3 rounded-lg border border-soft-c bg-app-c p-3">
                    <p className="text-xs font-semibold text-strong-c mb-2">Қолтаңба орнын дәлдеу (жүктер алдында)</p>
                    <div className="flex items-end gap-4 flex-wrap">
                      {/* Құжаттағы сызықтың дәл көшірмесі */}
                      <div style={{ position: "relative", width: 210, height: 56, flexShrink: 0 }}>
                        <img src={req.signatureImg} alt="" style={{
                          position: "absolute", left: `calc(50% + ${req.sigDX ?? 0}px)`, transform: "translateX(-50%)",
                          bottom: `${(req.sigDY ?? 0) + 6}px`, width: (req.sigW ?? 180), height: "auto", maxHeight: 80, objectFit: "contain",
                        }} />
                        <div style={{ position: "absolute", bottom: 6, left: 0, right: 0, borderBottom: "1px solid #000" }} />
                        <span style={{ position: "absolute", bottom: -12, left: 0, right: 0, textAlign: "center", fontSize: 9, color: "#64748b" }}>(подпись)</span>
                      </div>
                      {/* Басқару батырмалары */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-c w-14">Орны:</span>
                          {([["←", "sigDX", -3], ["→", "sigDX", 3], ["↑", "sigDY", -3], ["↓", "sigDY", 3]] as [string, "sigDX"|"sigDY", number][]).map(([lbl, f, d]) => (
                            <button key={lbl + f + d} onClick={() => setReqField(f, (req[f] ?? 0) + d)}
                              className="w-7 h-7 rounded-lg bg-input-c border border-soft-c text-strong-c hover:border-[var(--accent)] text-sm">{lbl}</button>
                          ))}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-c w-14">Өлшемі:</span>
                          <button onClick={() => setReqField("sigW", Math.max(80, (req.sigW ?? 180) - 12))} className="w-7 h-7 rounded-lg bg-input-c border border-soft-c text-strong-c hover:border-[var(--accent)] text-sm">−</button>
                          <button onClick={() => setReqField("sigW", Math.min(300, (req.sigW ?? 180) + 12))} className="w-7 h-7 rounded-lg bg-input-c border border-soft-c text-strong-c hover:border-[var(--accent)] text-sm">+</button>
                          <button onClick={() => { const next = { ...req, sigDX: 0, sigDY: 0, sigW: 180 }; setReq(next); saveRequisites(next); }}
                            className="ml-2 text-xs px-2 py-1 rounded-lg bg-input-c border border-soft-c text-muted-c hover:text-strong-c">Әдепкі</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* Мектеп деректері */}
            <div>
              <p className="text-xs font-semibold text-strong-c mb-2">Мектеп (әр жолы жаңа)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input className={docInput} placeholder="Мектеп атауы (КГУ «ОШ № 104»...)" value={docSchool} onChange={(e) => setDocSchool(e.target.value)} />
                <input className={docInput} placeholder="Директордың аты-жөні (қаласаңыз)" value={docDirector} onChange={(e) => setDocDirector(e.target.value)} />
                <select
                  className={docInput}
                  value={docPlan}
                  onChange={(e) => {
                    const pl = e.target.value as PlanId;
                    setDocPlan(pl);
                    setDocPrice(effectivePrice(PLANS[pl].price));
                  }}
                >
                  {PLAN_ORDER.filter((x) => x !== "free").map((x) => (
                    <option key={x} value={x}>{PLANS[x].name} — {PLANS[x].durationLabel}</option>
                  ))}
                </select>
                <input className={docInput} type="number" placeholder="Баға (тенге)" value={docPrice} onChange={(e) => setDocPrice(Number(e.target.value) || 0)} />
                <input className={docInput} placeholder="Шығыс № (қаласаңыз)" value={docOutNo} onChange={(e) => setDocOutNo(e.target.value)} />
              </div>
            </div>
            {/* Құжат тілі */}
            <div>
              <p className="text-xs font-semibold text-strong-c mb-2">Құжат тілі</p>
              <div className="flex gap-2">
                {([["ru", "Орысша"], ["kk", "Қазақша"], ["en", "English"]] as [DocLang, string][]).map(([code, label]) => (
                  <button key={code} onClick={() => setDocLang(code)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                      docLang === code ? "gradient-primary text-white border-transparent" : "bg-input-c border-soft-c text-muted-c hover:border-[var(--accent)]"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {/* Батырмалар */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="rounded-xl border border-soft-c p-3">
                <p className="text-sm font-medium text-strong-c mb-2">Техникалық спецификация</p>
                <div className="flex gap-2">
                  <button onClick={() => printDoc(tehSpecHtml(req, docParams(), docLang))} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg gradient-primary text-white text-xs font-medium hover:opacity-90">
                    <Printer className="w-3.5 h-3.5" /> Басып шығару / PDF
                  </button>
                  <button onClick={() => downloadDoc(tehSpecHtml(req, docParams(), docLang), `RASPIS_TechSpec_${docLang}.doc`)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-input-c border border-soft-c text-xs font-medium text-soft-c hover:border-[var(--accent)]">
                    <FileDown className="w-3.5 h-3.5" /> Word (.doc)
                  </button>
                </div>
              </div>
              <div className="rounded-xl border border-soft-c p-3">
                <p className="text-sm font-medium text-strong-c mb-2">Коммерциялық ұсыныс</p>
                <div className="flex gap-2">
                  <button onClick={() => printDoc(kpHtml(req, docParams(), docLang))} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg gradient-primary text-white text-xs font-medium hover:opacity-90">
                    <Printer className="w-3.5 h-3.5" /> Басып шығару / PDF
                  </button>
                  <button onClick={() => downloadDoc(kpHtml(req, docParams(), docLang), `RASPIS_Offer_${docLang}.doc`)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-input-c border border-soft-c text-xs font-medium text-soft-c hover:border-[var(--accent)]">
                    <FileDown className="w-3.5 h-3.5" /> Word (.doc)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Іске қосу акциясының санауышы: орындар толғанда сайтта автоматты өшеді */}
      {LAUNCH_PROMO.active && promo && (
        <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${promo.active ? "border-[rgba(217,164,65,0.4)] bg-[rgba(217,164,65,0.1)]" : "border-soft-c bg-input-c"}`}>
          <Flame className={`w-5 h-5 shrink-0 ${promo.active ? "status-warn" : "text-faint-c"}`} />
          <p className="text-sm text-strong-c">
            {t("adm.promoCounter").replace("{u}", String(promo.used)).replace("{n}", String(promo.seats))}
            {!promo.active && <span className="text-muted-c"> — {t("adm.promoOver")}</span>}
          </p>
        </div>
      )}

      {/* Статистика */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t("adm.statAll"), value: stats.total, icon: Users },
          { label: t("role.admin"), value: stats.admin, icon: Crown },
          { label: t("role.paid"), value: stats.paid, icon: CreditCard },
          { label: t("role.free"), value: stats.free, icon: UserIcon },
        ].map((s) => (
          <GlassCard key={s.label} hover={false}>
            <div className="flex items-center gap-3">
              <s.icon className="w-5 h-5 accent-c" />
              <div>
                <p className="text-2xl font-bold text-strong-c">{s.value}</p>
                <p className="text-xs text-muted-c">{s.label}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-c py-10 justify-center"><Loader2 className="w-5 h-5 animate-spin accent-c" /> {t("adm.loading")}</div>
      ) : (
        <GlassCard hover={false}>
          {/* Іздеу */}
          <div className="relative mb-4">
            <Search className="w-4 h-4 text-faint-c absolute left-3 top-2.5" />
            <input className={inputCls + " !pl-9"} placeholder={t("adm.searchUser")} value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          {filtered.length === 0 ? (
            <div className="text-center py-10 px-4">
              <Users className="w-10 h-10 text-faint-c mx-auto mb-3" />
              {!configured ? (
                <>
                  <p className="text-strong-c font-medium mb-1">{t("adm.notConfigured")}</p>
                  <p className="text-sm text-muted-c max-w-md mx-auto">{t("adm.notConfiguredDesc")}</p>
                </>
              ) : query ? (
                <p className="text-muted-c text-sm">{t("adm.noMatch")}</p>
              ) : (
                <>
                  <p className="text-strong-c font-medium mb-1">{t("adm.noUsersYet")}</p>
                  <p className="text-sm text-muted-c max-w-md mx-auto">{t("adm.noUsersDesc")}</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((u) => {
                const info = ROLE_INFO[u.role];
                return (
                  <div key={u.uid} className="flex flex-col gap-3 p-3 rounded-lg bg-input-c border border-soft-c">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <info.icon className={`w-4 h-4 shrink-0 ${info.cls}`} />
                          <span className="font-medium text-strong-c truncate">{u.name}</span>
                        </div>
                        <p className="text-xs text-muted-c truncate mt-0.5">{u.email}</p>
                        <p className="text-xs text-faint-c mt-0.5">
                          {t("plan.quickRemaining")}: {u.quickRemaining} · {t("plan.deepRemaining")}: {u.deepRemaining}
                        </p>
                        {u.plan !== "free" && !!u.planExpiresAt && (
                          <p className="text-xs text-faint-c mt-0.5">
                            {t("plan.expires")}: {new Date(u.planExpiresAt).toLocaleDateString()} ·{" "}
                            {u.dataEntryUntil && Date.now() <= u.dataEntryUntil
                              ? `${t("adm.dataUntil")}: ${new Date(u.dataEntryUntil).toLocaleDateString()}`
                              : t("adm.dataClosed")}
                          </p>
                        )}
                      </div>
                      {/* Рөл таңдау */}
                      <div className="flex gap-1.5 shrink-0">
                        {(["free", "paid", "demo", "admin"] as Role[]).map((r) => (
                          <button
                            key={r}
                            onClick={() => changeRole(u.uid, r)}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${u.role === r ? "gradient-primary text-white" : "bg-surface-c text-muted-c border border-soft-c hover:bg-[rgba(127,127,127,0.08)]"}`}
                          >
                            {t(ROLE_INFO[r].label as TransKey)}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Тариф таңдау + деректер терезесін ашу */}
                    <div className="flex flex-wrap gap-1.5">
                      {PLAN_ORDER.map((p) => (
                        <button
                          key={p}
                          onClick={() => changePlan(u.uid, p)}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${u.plan === p ? "gradient-primary text-white" : "bg-surface-c text-muted-c border border-soft-c hover:bg-[rgba(127,127,127,0.08)]"}`}
                        >
                          {PLANS[p].name}
                        </button>
                      ))}
                      {u.plan !== "free" && (
                        <button
                          onClick={() => extendData(u.uid)}
                          className="px-2.5 py-1 rounded-md text-xs font-medium transition-all bg-surface-c status-good border border-emerald-400/30 hover:bg-emerald-500/10 flex items-center gap-1"
                        >
                          <CalendarPlus className="w-3.5 h-3.5" /> {t("adm.extendData")}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>
      )}
    </div>
  );
}
