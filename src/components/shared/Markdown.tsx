// filepath: src/components/shared/Markdown.tsx
// Жеңіл әрі ҚАУІПСІЗ Markdown көрсеткіші — AI жауаптарына арналған.
// dangerouslySetInnerHTML қолданбайды (XSS қаупі жоқ): мәтінді React
// элементтеріне тікелей айналдырады. Қолдайтыны: тақырыптар (#, ##, ###),
// қалың (**), көлбеу (*), кодтық (`), тізімдер (-, *, 1.), абзацтар.

import type { ReactNode } from "react";

// Инлайн белгілеу: **қалың**, *көлбеу*, `код`
function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`)/g;
  let last = 0, m: RegExpExecArray | null, k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) out.push(<strong key={k++}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("`")) out.push(<code key={k++} className="px-1 py-0.5 rounded bg-[rgba(127,127,127,0.15)] text-[0.9em]">{tok.slice(1, -1)}</code>);
    else out.push(<em key={k++}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export default function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let listItems: { ordered: boolean; content: string }[] = [];
  let k = 0;

  const flushList = () => {
    if (!listItems.length) return;
    const ordered = listItems[0].ordered;
    const items = listItems.map((li, i) => <li key={i}>{renderInline(li.content)}</li>);
    blocks.push(ordered
      ? <ol key={k++} className="list-decimal pl-5 space-y-1 my-1.5">{items}</ol>
      : <ul key={k++} className="list-disc pl-5 space-y-1 my-1.5">{items}</ul>);
    listItems = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const h = line.match(/^(#{1,4})\s+(.*)/);
    const bullet = line.match(/^\s*[-*•]\s+(.*)/);
    const num = line.match(/^\s*\d+[.)]\s+(.*)/);
    if (h) {
      flushList();
      const level = h[1].length;
      const cls = level === 1 ? "text-base font-bold mt-3 mb-1" : level === 2 ? "text-[0.95rem] font-bold mt-2.5 mb-1" : "text-sm font-semibold mt-2 mb-0.5";
      blocks.push(<p key={k++} className={cls}>{renderInline(h[2])}</p>);
    } else if (bullet && !line.match(/^\s*\*\S/)) {
      // "* сөз*" тәрізді көлбеу емес, нақты "- " / "* " тізім екеніне көз жеткіземіз
      listItems.push({ ordered: false, content: bullet[1] });
    } else if (num) {
      listItems.push({ ordered: true, content: num[1] });
    } else if (line.trim() === "") {
      flushList();
    } else {
      flushList();
      blocks.push(<p key={k++} className="my-1 leading-relaxed">{renderInline(line)}</p>);
    }
  }
  flushList();
  return <div className="text-sm">{blocks}</div>;
}
