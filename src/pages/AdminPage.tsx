// filepath: src/pages/AdminPage.tsx
import { useState, useEffect } from "react";
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
  loadRequisites, saveRequisites, tehSpecHtml, kpHtml, printDoc, downloadDoc,
  type DocRequisites, type DocParams,
} from "@/lib/procurementDocs";
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
  const setReqField = (k: keyof DocRequisites, v: string) => {
    const next = { ...req, [k]: v };
    setReq(next);
    saveRequisites(next);
  };
  const docDate = () => {
    const m = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
    const d = new Date();
    return `«${d.getDate()}» ${m[d.getMonth()]} ${d.getFullYear()} г.`;
  };
  const docParams = (): DocParams => ({
    schoolName: docSchool, directorName: docDirector,
    plan: docPlan, price: docPrice, outNo: docOutNo, date: docDate(),
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
              <b>Коммерциялық ұсыныс</b>. Реквизиттер бір рет толтырылып, осы браузерде сақталады.
            </p>
            {/* ЖК реквизиттері */}
            <div>
              <p className="text-xs font-semibold text-strong-c mb-2">ЖК реквизиттері (бір рет)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input className={docInput} placeholder="ЖК атауы (ИП «...»)" value={req.ipName} onChange={(e) => setReqField("ipName", e.target.value)} />
                <input className={docInput} placeholder="ЖСН/БИН" value={req.iinBin} onChange={(e) => setReqField("iinBin", e.target.value)} />
                <input className={docInput} placeholder="Мекенжай" value={req.address} onChange={(e) => setReqField("address", e.target.value)} />
                <input className={docInput} placeholder="ИИК (KZ...)" value={req.iik} onChange={(e) => setReqField("iik", e.target.value)} />
                <input className={docInput} placeholder="Банк (АО «...»)" value={req.bank} onChange={(e) => setReqField("bank", e.target.value)} />
                <input className={docInput} placeholder="БИК" value={req.bik} onChange={(e) => setReqField("bik", e.target.value)} />
                <input className={docInput + " sm:col-span-2"} placeholder="Қол қоюшы (Ф.И.О.)" value={req.signer} onChange={(e) => setReqField("signer", e.target.value)} />
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
            {/* Батырмалар */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="rounded-xl border border-soft-c p-3">
                <p className="text-sm font-medium text-strong-c mb-2">Техникалық спецификация</p>
                <div className="flex gap-2">
                  <button onClick={() => printDoc(tehSpecHtml(req, docParams()))} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg gradient-primary text-white text-xs font-medium hover:opacity-90">
                    <Printer className="w-3.5 h-3.5" /> Басып шығару / PDF
                  </button>
                  <button onClick={() => downloadDoc(tehSpecHtml(req, docParams()), "РАСПИС_Техническая_спецификация.doc")} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-input-c border border-soft-c text-xs font-medium text-soft-c hover:border-[var(--accent)]">
                    <FileDown className="w-3.5 h-3.5" /> Word (.doc)
                  </button>
                </div>
              </div>
              <div className="rounded-xl border border-soft-c p-3">
                <p className="text-sm font-medium text-strong-c mb-2">Коммерциялық ұсыныс</p>
                <div className="flex gap-2">
                  <button onClick={() => printDoc(kpHtml(req, docParams()))} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg gradient-primary text-white text-xs font-medium hover:opacity-90">
                    <Printer className="w-3.5 h-3.5" /> Басып шығару / PDF
                  </button>
                  <button onClick={() => downloadDoc(kpHtml(req, docParams()), "РАСПИС_Коммерческое_предложение.doc")} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-input-c border border-soft-c text-xs font-medium text-soft-c hover:border-[var(--accent)]">
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
