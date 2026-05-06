# Planning Index

Task tracking by status: what's in progress, what's available, and what's optional.
See [rules/planning.md](../rules/planning.md) for selection rules.

**Token estimates** are in `K` for the **preferred model** shown in brackets. Haiku's 44K / 5h limit is the reference budget for Haiku tasks; Sonnet/Opus tasks are sized for their own session budgets.

## Grand total — **227K**

---

## In Progress — **23K**

**Set loading** — **23K**
1. ✓ [set-last-loaded-timestamp](set-last-loaded-timestamp.md) — **8K (Haiku)**
2. [recent-sets-on-input](recent-sets-on-input.md) — **15K (Haiku)**

---

## Available — **188K**

### Chains — **112K**

**Slot priorities** — **90K**
1. [move-item-priority-to-db](move-item-priority-to-db.md) — **25K (Sonnet)**
2. ↳ [slot-keyword-agent-script](slot-keyword-agent-script.md) — **35K (Sonnet)**
3. ↳ [slot-keyword-review](slot-keyword-review.md) — **30K (Sonnet)**

**Price/total** — **40K**
1. [set-cached-total](set-cached-total.md) — **18K (Sonnet)**
2. ↳ [price-trend-and-staleness](price-trend-and-staleness.md) — **22K (Sonnet)**

### Independent — **76K**

- [snackbar-confirm](snackbar-confirm.md) — **15K (Haiku)**
- [sets-count-bar](sets-count-bar.md) — **8K (Haiku)**
- [localization](localization.md) — **20K (Sonnet)**
- [inline-edit-list](inline-edit-list.md) — **25K (Sonnet)**
- [results-all-sets-button](results-all-sets-button.md) — **5K (Haiku)**
- [input-hint-accuracy](input-hint-accuracy.md) — **3K (Haiku)**

---

## Optional — **6K**

- Ops: `.env.example` — **3K (Haiku)** _(inline in todo.md)_
- Ops: server container healthcheck — **3K (Haiku)** _(inline in todo.md)_

---

## Notes

Match the task's preferred model when starting work. Haiku-tagged tasks ≤ 15K fit comfortably in a single Haiku 44K session. Sonnet-tagged tasks are sized for Sonnet usage; running them on Haiku will likely overflow the 44K window.
