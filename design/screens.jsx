/* global React */
const { useState, useEffect, useRef, useMemo } = React;
const { parseList, fmtPrice, initials } = window.Junkpile;

const SAMPLE = `Franken Facemask
Franken Chestplate
Flashbacks Hoodie
Fish Roadsign Pants
Flashbacks Pants
Bombshell Boots`;

// ===== Icons (small, inline) =====
const Icon = {
  paste: (p={}) => (
    <svg className="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}>
      <rect x="3.5" y="2.5" width="9" height="11" rx="1.5"/>
      <path d="M6 2.5V1.5h4v1"/>
      <path d="M5.5 7h5M5.5 9.5h5M5.5 12h3" strokeLinecap="round"/>
    </svg>
  ),
  arrow: (p={}) => (
    <svg className="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  pencil: (p={}) => (
    <svg className="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}>
      <path d="M2.5 13.5l1-3L11 3l2 2-7.5 7.5-3 1z" strokeLinejoin="round"/>
    </svg>
  ),
  external: (p={}) => (
    <svg className="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}>
      <path d="M9 3h4v4M13 3l-6 6" strokeLinecap="round"/>
      <path d="M11 9.5V13H3V5h3.5" strokeLinecap="round"/>
    </svg>
  ),
  check: (p={}) => (
    <svg className="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M3 8.5l3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  copy: (p={}) => (
    <svg className="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}>
      <rect x="5" y="5" width="8" height="9" rx="1.5"/>
      <path d="M3 11V3.5A1.5 1.5 0 014.5 2H10"/>
    </svg>
  ),
  refresh: (p={}) => (
    <svg className="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}>
      <path d="M3 8a5 5 0 018.5-3.5L13 6M13 3v3h-3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13 8a5 5 0 01-8.5 3.5L3 10M3 13v-3h3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

// ===== Thumb =====
function Thumb({ name }) {
  return (
    <div className="thumb">
      <div className="stripes"/>
      <div className="mono">{initials(name)}</div>
    </div>
  );
}

// ===== Tag / Header =====
function Header() {
  return (
    <>
      <span className="tag"><span className="dot"/> Junkpile · Skin Pricer</span>
      <h1 className="headline">
        Price your
        <span className="accent">skin set</span>
      </h1>
    </>
  );
}

// ===== Input screen =====
function InputScreen({ onSubmit, initialText }) {
  const [text, setText] = useState(initialText || "");
  const ref = useRef(null);

  const lines = useMemo(() => {
    return text.split(/[\n,]+/g).map(s => s.trim()).filter(Boolean);
  }, [text]);

  const onPaste = async () => {
    let pasted = "";
    try {
      pasted = await navigator.clipboard.readText();
    } catch {
      // fallback to sample
      pasted = SAMPLE;
    }
    if (!pasted || pasted.trim().length === 0) pasted = SAMPLE;
    setText(prev => (prev ? prev + "\n" + pasted : pasted));
    setTimeout(() => ref.current?.focus(), 0);
  };

  const submit = () => {
    if (lines.length === 0) return;
    onSubmit(text);
  };

  return (
    <div className="app fade-in">
      <Header/>

      <div className="surface" style={{maxWidth: 560}}>
        <textarea
          ref={ref}
          className="editor"
          placeholder={"Franken Facemask\nFlashbacks Hoodie\nBombshell Boots\n…"}
          value={text}
          onChange={e => setText(e.target.value)}
          spellCheck={false}
        />
        <div className="parse-row">
          <span className="count"><b>{lines.length}</b> · {lines.length === 1 ? "item" : "items"} detected</span>
          <span>One per line · or comma-separated</span>
        </div>
        <div className="action-row">
          <button className="btn ghost" onClick={onPaste}>
            <Icon.paste/> Paste
          </button>
          <button className="btn primary" onClick={submit} disabled={lines.length === 0}>
            Get Prices <Icon.arrow/>
          </button>
        </div>
      </div>

      <div className="helper">
        Pulls live community-market medians · refreshed every 5 min
      </div>
    </div>
  );
}

// ===== Results screen =====
function ResultsScreen({ items, onEdit, onReset, currency, setCurrency }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 850);
    return () => clearTimeout(t);
  }, [items]);

  const resolved = items.filter(it => it.resolved);
  const unresolved = items.filter(it => !it.resolved);
  const total = resolved.reduce((s, it) => s + (it.resolved.price || 0), 0);
  const trend = resolved.reduce((s, it) => s + (it.resolved.trend || 0), 0);
  const max = resolved.reduce((m, it) => Math.max(m, it.resolved.price), 0);
  const mostValued = resolved.find(it => it.resolved.price === max);

  const refresh = () => {
    setRefreshing(true);
    setLoading(true);
    setTimeout(() => { setLoading(false); setRefreshing(false); }, 700);
  };

  const copyTotal = async () => {
    try {
      await navigator.clipboard.writeText(`Junkpile total: ${fmtPrice(total, currency)} (${resolved.length} items)`);
    } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="app fade-in">
      <Header/>

      <div className="meta-strip" style={{maxWidth: 560}}>
        <div className="left">
          <span className="pulse"/>
          <span>{resolved.length} resolved {unresolved.length > 0 && `· ${unresolved.length} unknown`}</span>
        </div>
        <div className="seg">
          <button className={currency === "USD" ? "on" : ""} onClick={() => setCurrency("USD")}>USD</button>
          <button className={currency === "EUR" ? "on" : ""} onClick={() => setCurrency("EUR")}>EUR</button>
        </div>
      </div>

      <div className="surface" style={{maxWidth: 560}}>
        <div className="list">
          {items.map((it, i) => (
            <ItemRow key={it.id} item={it} loading={loading} currency={currency} />
          ))}
        </div>

        <div className="stats">
          <div className="stat">
            <span className="k">Items</span>
            <span className="v">{resolved.length}</span>
          </div>
          <div className="stat">
            <span className="k">Top Item</span>
            <span className="v" style={{fontSize: 12}}>
              {mostValued ? mostValued.resolved.name.split(" ")[0] : "—"}
            </span>
          </div>
          <div className="stat">
            <span className="k">24h Δ</span>
            <span className="v" style={{color: trend >= 0 ? "var(--good)" : "var(--bad)"}}>
              {trend >= 0 ? "+" : ""}{fmtPrice(trend, currency).replace(/^[$€]/, currency === "EUR" ? "€" : "$")}
            </span>
          </div>
        </div>

        <div className="total">
          <span className="label">Total</span>
          <span className="amount">
            {loading ? <span className="skel" style={{display:"inline-block", width: 90, height: 22}}/> : fmtPrice(total, currency)}
          </span>
        </div>

        <div className="action-row" style={{gridTemplateColumns: "1fr 1fr 1fr"}}>
          <button className="btn ghost" onClick={refresh} title="Refresh prices">
            <Icon.refresh style={{transform: refreshing ? "rotate(180deg)" : "none", transition: "transform 600ms ease"}}/>
            Refresh
          </button>
          <button className="btn ghost" onClick={copyTotal}>
            {copied ? <Icon.check/> : <Icon.copy/>}
            {copied ? "Copied" : "Copy"}
          </button>
          <button className="btn primary" onClick={onEdit}>
            <Icon.pencil/> Edit List
          </button>
        </div>
      </div>

      <button className="foothint" onClick={onReset} style={{background:"none", border:0, cursor:"pointer", letterSpacing:"0.16em"}}>
        ← New list
      </button>
    </div>
  );
}

function ItemRow({ item, loading, currency }) {
  const r = item.resolved;
  if (!r) {
    return (
      <div className="row unresolved">
        <Thumb name={item.raw}/>
        <div className="name">
          {item.raw}
          <span className="meta">Unmatched</span>
        </div>
        <div className="price">not found</div>
      </div>
    );
  }
  return (
    <div className={`row ${loading ? "row-loading" : ""}`}>
      <Thumb name={r.name}/>
      <div className="name">
        {r.name}
        <span className="meta">{r.slot}</span>
      </div>
      <div className="price">
        {loading
          ? <span className="skel" style={{display:"inline-block", width: 56, height: 14}}/>
          : <>
              {fmtPrice(r.price, currency)}
              {r.trend !== 0 && (
                <span className={`delta ${r.trend > 0 ? "up" : "down"}`}>
                  {r.trend > 0 ? "▲" : "▼"} {fmtPrice(Math.abs(r.trend), currency).replace(/^[$€]/, "")}
                </span>
              )}
            </>
        }
      </div>
    </div>
  );
}

// ===== Edit screen =====
function EditScreen({ items, onCancel, onSave }) {
  const [draft, setDraft] = useState(() => items.map(it => ({
    id: it.id,
    raw: it.resolved ? it.resolved.name : it.raw,
  })));
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);

  const updateAt = (i, v) => setDraft(d => d.map((x, j) => j === i ? {...x, raw: v} : x));
  const removeAt = (i) => setDraft(d => d.filter((_, j) => j !== i));
  const addRow = () => setDraft(d => [...d, {id: `new-${Date.now()}`, raw: ""}]);

  const save = () => {
    const text = draft.map(d => d.raw).filter(s => s.trim()).join("\n");
    onSave(text);
  };

  const onDragStart = (i) => setDragIdx(i);
  const onDragOver = (e, i) => { e.preventDefault(); setOverIdx(i); };
  const onDrop = (i) => {
    if (dragIdx == null || dragIdx === i) return;
    setDraft(d => {
      const next = [...d];
      const [m] = next.splice(dragIdx, 1);
      next.splice(i, 0, m);
      return next;
    });
    setDragIdx(null);
    setOverIdx(null);
  };

  return (
    <div className="app fade-in">
      <Header/>

      <div className="meta-strip" style={{maxWidth: 560}}>
        <div className="left">
          <span style={{color: "var(--accent)"}}>● editing</span>
          <span>drag to reorder · enter to add row</span>
        </div>
        <div className="seg">
          <button className="on">{draft.length} rows</button>
        </div>
      </div>

      <div className="surface" style={{maxWidth: 560}}>
        {draft.map((d, i) => (
          <div
            key={d.id}
            className="edit-row"
            draggable
            onDragStart={() => onDragStart(i)}
            onDragOver={(e) => onDragOver(e, i)}
            onDrop={() => onDrop(i)}
            style={{
              background: overIdx === i && dragIdx !== i ? "var(--accent-soft)" : undefined,
              opacity: dragIdx === i ? 0.4 : 1,
              transition: "background 120ms ease, opacity 120ms ease",
            }}
          >
            <span className="handle" title="Drag">⋮⋮</span>
            <Thumb name={d.raw}/>
            <input
              value={d.raw}
              onChange={e => updateAt(i, e.target.value)}
              placeholder="Item name…"
              onKeyDown={e => {
                if (e.key === "Enter") { e.preventDefault(); addRow(); }
                if (e.key === "Backspace" && d.raw === "") { e.preventDefault(); removeAt(i); }
              }}
              autoFocus={i === draft.length - 1 && d.raw === ""}
            />
            <button className="x" onClick={() => removeAt(i)} title="Remove">×</button>
          </div>
        ))}
        <button className="add-row" onClick={addRow}>+ Add item</button>
        <div className="action-row">
          <button className="btn ghost" onClick={onCancel}>Cancel</button>
          <button className="btn primary" onClick={save}>
            <Icon.check/> Save & Reprice
          </button>
        </div>
      </div>

      <div className="foothint">
        Tip: paste items into any row · backspace on empty row removes it
      </div>
    </div>
  );
}

window.Screens = { InputScreen, ResultsScreen, EditScreen, SAMPLE };
