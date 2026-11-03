import type { ReactNode } from "react";
import Link from "next/link";

/** Inline: **bold** and [text](url). Everything else is plain text (no HTML is ever injected). */
function inline(s: string, key = 0): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0, m: RegExpExecArray | null, k = key;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    if (m[1]) out.push(<b key={k++}>{m[1]}</b>);
    else {
      const href = m[3];
      const safe = /^(\/|https?:\/\/|mailto:)/.test(href) ? href : "#";
      out.push(safe.startsWith("/") ? <Link key={k++} href={safe}>{m[2]}</Link> : <a key={k++} href={safe} target="_blank" rel="noopener noreferrer nofollow">{m[2]}</a>);
    }
    last = re.lastIndex;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

export const slugifyHeading = (t: string) => t.trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").toLowerCase();

/** Renders the small markdown dialect used by blog posts. */
export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.replace(/\r/g, "").split("\n");
  let i = 0, k = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    if (l.startsWith("### ")) { blocks.push(<h3 key={k++}>{inline(l.slice(4))}</h3>); i++; continue; }
    if (l.startsWith("## ")) { const t = l.slice(3); blocks.push(<h2 key={k++} id={slugifyHeading(t)}>{inline(t)}</h2>); i++; continue; }
    if (l.startsWith("> ")) { blocks.push(<blockquote key={k++}>{inline(l.slice(2))}</blockquote>); i++; continue; }
    if (/^[-*] /.test(l)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*] /.test(lines[i])) items.push(lines[i++].slice(2));
      blocks.push(<ul key={k++}>{items.map((t, j) => <li key={j}>{inline(t)}</li>)}</ul>);
      continue;
    }
    if (/^\d+[.)] /.test(l)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+[.)] /.test(lines[i])) items.push(lines[i++].replace(/^\d+[.)] /, ""));
      blocks.push(<ol key={k++}>{items.map((t, j) => <li key={j}>{inline(t)}</li>)}</ol>);
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{2,3} |> |[-*] |\d+[.)] )/.test(lines[i])) para.push(lines[i++]);
    blocks.push(<p key={k++}>{inline(para.join(" "))}</p>);
  }
  return <>{blocks}</>;
}
