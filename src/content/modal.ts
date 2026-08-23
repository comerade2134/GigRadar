import { extractClientName } from '../engine/name-extractor'
import { generateHookVariants } from '../engine/templates'
import type { HookVariant } from '../engine/templates'
import { loadByok, polishHook } from '../engine/byok'
import { getCachedLicense } from '../monetization/extpay-core'
import type { EnrichmentData } from '../types'

const MODAL_STYLES = `
  :host { all: initial; }
  * { box-sizing: border-box; }
  .backdrop {
    position: absolute; inset: 0;
    background: rgba(2, 6, 23, 0);
    pointer-events: auto;
    transition: background .22s ease;
  }
  .open .backdrop { background: rgba(2, 6, 23, .55); }
  .panel {
    position: absolute; top: 0; right: 0; bottom: 0;
    width: min(420px, 94vw);
    background: #0D0F12;
    border-left: 1px solid #1F242D;
    box-shadow: -16px 0 48px rgba(0, 0, 0, .55);
    display: flex; flex-direction: column;
    transform: translateX(102%);
    transition: transform .24s cubic-bezier(.2,.8,.2,1);
    pointer-events: auto;
    font-family: Inter, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #F3F4F6;
  }
  .open .panel { transform: translateX(0); }
  .head {
    padding: 18px 20px 16px;
    border-bottom: 1px solid #1F242D;
    display: flex; align-items: flex-start; gap: 14px;
    background: linear-gradient(135deg, #12161E, #0E1116);
  }
  .score-ring {
    flex: none;
    width: 64px; height: 64px;
    border-radius: 16px;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    font-weight: 800; font-size: 22px; line-height: 1;
    font-variant-numeric: tabular-nums;
    color: #F3F4F6;
    border: 1px solid;
  }
  .score-ring small { font-size: 8.5px; font-weight: 700; letter-spacing: .12em; margin-top: 3px; opacity: .65; }
  .tier-high   { background: rgba(16,185,129,.10); border-color: rgba(16,185,129,.45); box-shadow: 0 0 22px rgba(16,185,129,.18); }
  .tier-medium { background: rgba(245,158,11,.10); border-color: rgba(245,158,11,.45); box-shadow: 0 0 22px rgba(245,158,11,.15); }
  .tier-low    { background: rgba(239,68,68,.10); border-color: rgba(239,68,68,.45); box-shadow: 0 0 22px rgba(239,68,68,.15); }
  .tier-nodata {
    background: #12151C;
    border-color: #262C37;
    color: #9CA3AF;
    box-shadow: none;
  }
  .job-title { font-size: 14px; font-weight: 700; line-height: 1.35; margin: 0 0 5px; color: #F3F4F6; }
  .job-sub { font-size: 12px; color: #9CA3AF; margin: 0; }
  .close-btn {
    margin-left: auto; flex: none;
    width: 30px; height: 30px;
    border-radius: 9px; border: 1px solid #262C37;
    background: #161A22; cursor: pointer;
    font-size: 14px; line-height: 1; color: #9CA3AF;
    transition: all .15s ease;
  }
  .close-btn:hover { background: #1D222C; color: #F3F4F6; border-color: #3A4250; }
  .body { overflow-y: auto; padding: 18px 20px 28px; flex: 1; }
  .body::-webkit-scrollbar { width: 8px; }
  .body::-webkit-scrollbar-thumb { background: #262C37; border-radius: 999px; }
  h3.sec {
    font-size: 10px; font-weight: 800; letter-spacing: .12em;
    text-transform: uppercase; color: #6B7280;
    margin: 20px 0 9px;
  }
  table.signals { width: 100%; border-collapse: collapse; border-radius: 10px; overflow: hidden; border: 1px solid #171C25; }
  table.signals td { padding: 9px 12px; font-size: 13px; border-bottom: 1px solid #171C25; vertical-align: middle; background: #10141B; }
  table.signals tr:last-child td { border-bottom: none; }
  table.signals td:first-child { color: #CBD5E1; font-weight: 600; width: 36%; }
  .bar { height: 5px; border-radius: 999px; background: #1F242D; overflow: hidden; }
  .bar > i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, #059669, #34D399); box-shadow: 0 0 8px rgba(16,185,129,.4); }
  .val { text-align: right; font-weight: 700; white-space: nowrap; font-variant-numeric: tabular-nums; width: 24%; }
  .na { color: #4B5563; font-weight: 500; font-size: 11.5px; }
  ul.flags { list-style: none; margin: 0; padding: 0; display: grid; gap: 7px; }
  ul.flags li {
    font-size: 12.5px; line-height: 1.45;
    padding: 9px 12px; border-radius: 10px;
    display: flex; gap: 8px; align-items: baseline;
    border: 1px solid;
  }
  .flag-danger { background: rgba(239,68,68,.08); color: #FCA5A5; border-color: rgba(239,68,68,.28); }
  .flag-warn   { background: rgba(245,158,11,.08); color: #FCD34D; border-color: rgba(245,158,11,.28); }
  .flag-ok     { background: rgba(16,185,129,.08); color: #6EE7B7; border-color: rgba(16,185,129,.28); }
  .gate { position: relative; border-radius: 12px; }
  .gate.locked > *:not(.lock-overlay) { filter: blur(5px); pointer-events: none; user-select: none; opacity: .55; }
  .lock-overlay {
    position: absolute; inset: -4px;
    display: flex; align-items: center; justify-content: center; gap: 10px;
    background: rgba(13,15,18,.45);
    border-radius: 12px;
  }
  .pro-btn {
    padding: 10px 18px;
    border: 1px solid rgba(245,158,11,.4); border-radius: 10px;
    background: linear-gradient(180deg, rgba(245,158,11,.16), rgba(245,158,11,.08));
    color: #FCD34D;
    font-family: inherit;
    font-size: 12.5px; font-weight: 700; letter-spacing: -.01em; cursor: pointer;
    box-shadow: 0 0 24px rgba(245,158,11,.14);
    transition: all .15s ease;
  }
  .pro-btn:hover { background: linear-gradient(180deg, rgba(245,158,11,.24), rgba(245,158,11,.12)); border-color: rgba(245,158,11,.6); transform: translateY(-1px); }
  .name-chip {
    display: inline-flex; align-items: center; gap: 8px;
    background: rgba(16,185,129,.09);
    border: 1px solid rgba(16,185,129,.35);
    color: #6EE7B7;
    font-size: 13px; font-weight: 800;
    padding: 8px 14px; border-radius: 999px;
  }
  .conf { font-size: 10.5px; font-weight: 700; opacity: .75; }
  .hint { font-size: 12.5px; color: #9CA3AF; line-height: 1.55; margin: 0; }
  .name-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .mini-copy {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 7px 13px; border-radius: 999px;
    border: 1px solid rgba(16,185,129,.4);
    background: rgba(16,185,129,.08);
    color: #6EE7B7;
    font-family: inherit; font-size: 11px; font-weight: 800;
    cursor: pointer;
    transition: all .15s ease;
  }
  .mini-copy:hover { background: rgba(16,185,129,.16); transform: translateY(-1px); }
  .mini-copy.copied,
  .act.copied {
    background: rgba(16,185,129,.18) !important;
    border-color: rgba(16,185,129,.45) !important;
    color: #6EE7B7 !important;
  }
  .ho-toolbar { justify-content: space-between; }
  .hook-opt {
    margin-top: 8px;
    padding: 11px 12px;
    border: 1px solid #171C25;
    background: #10141B;
    border-radius: 10px;
  }
  .ho-head {
    display: flex; align-items: center; gap: 7px;
    font-size: 10px; letter-spacing: .06em; text-transform: uppercase;
  }
  .ho-head b { color: #6EE7B7; font-size: 10.5px; }
  .ho-head span { color: #64748B; font-weight: 600; }
  .ho-text { margin: 8px 0 0; font-size: 12.5px; line-height: 1.55; color: #E5E7EB; white-space: pre-wrap; }
  .ho-foot { display: flex; gap: 8px; margin-top: 9px; }
  textarea.hook {
    width: 100%; min-height: 96px;
    resize: vertical;
    border: 1px solid #262C37; border-radius: 10px;
    background: #0B0E13;
    padding: 11px 13px;
    font-family: inherit; font-size: 13px; line-height: 1.55;
    color: #F3F4F6;
    transition: border-color .15s ease;
  }
  textarea.hook::placeholder { color: #4B5563; }
  textarea.hook:focus { outline: none; border-color: rgba(16,185,129,.55); box-shadow: 0 0 0 3px rgba(16,185,129,.12); }
  .row { display: flex; gap: 8px; margin-top: 9px; flex-wrap: wrap; }
  .act {
    padding: 8px 14px; border-radius: 9px;
    border: 1px solid #262C37; background: #161A22;
    font-family: inherit;
    font-size: 12.5px; font-weight: 700; color: #E5E7EB; cursor: pointer;
    transition: all .15s ease;
  }
  .act:hover { background: #1D222C; border-color: #3A4250; }
  .act:active { transform: scale(.97); }
  .act.primary {
    background: linear-gradient(180deg, #34D399, #059669);
    border-color: transparent; color: #0D0F12;
    box-shadow: 0 4px 16px rgba(16,185,129,.25), inset 0 1px 0 rgba(255,255,255,.2);
  }
  .act.primary:hover { filter: brightness(1.08); }
  .act[disabled] { opacity: .45; cursor: not-allowed; transform: none !important; }
  .err { margin-top: 8px; font-size: 12px; color: #F87171; }
  .guest-note {
    display: flex; align-items: center; gap: 10px;
    margin: 14px 0 2px;
    padding: 11px 12px;
    border-radius: 10px;
    background: rgba(59,130,246,.09);
    border: 1px solid rgba(59,130,246,.30);
    color: #93C5FD;
    font-size: 12px; line-height: 1.5;
  }
  .guest-note b { color: #BFDBFE; }
  .guest-link {
    margin-left: auto; flex: none;
    padding: 6px 12px; border-radius: 8px;
    background: #2563EB; border: none; cursor: pointer;
    color: #fff; font-family: inherit;
    font-size: 11.5px; font-weight: 700;
    transition: filter .15s ease, transform .12s ease;
  }
  .guest-link:hover { filter: brightness(1.12); }
  .guest-link:active { transform: scale(.97); }
  .panel.docked {
    top: 64px;
    bottom: auto;
    max-height: calc(100vh - 88px);
    border-radius: 14px 0 0 14px;
    border: 1px solid #262C37;
    border-right: none;
    box-shadow: -18px 12px 48px rgba(0, 0, 0, .55), inset 0 1px 0 rgba(255,255,255,.04);
    transform: translateX(104%);
  }
  .wrap.docked.open .panel { transform: translateX(0); }
  .activity-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; }
  .act-cell {
    background: #10141B;
    border: 1px solid #171C25;
    border-radius: 10px;
    padding: 9px 6px;
    text-align: center;
  }
  .act-cell span {
    display: block;
    font-size: 16px; font-weight: 800;
    font-variant-numeric: tabular-nums;
    color: #F3F4F6; line-height: 1.1;
  }
  .act-cell small {
    display: block;
    margin-top: 3px;
    font-size: 8px; font-weight: 700;
    letter-spacing: .08em; text-transform: uppercase;
    color: #6B7280;
  }
  .tr-block {
    border: 1px solid rgba(16,185,129,.25);
    background: linear-gradient(180deg, rgba(16,185,129,.05), rgba(16,185,129,.01)), #10141B;
    border-radius: 12px;
    padding: 12px 13px;
    display: grid; gap: 9px;
  }
  .tr-row { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; font-size: 12.5px; }
  .tr-row b { color: #CBD5E1; font-weight: 600; }
  .tr-row em { font-style: normal; font-weight: 800; color: #34D399; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .tr-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip {
    padding: 3.5px 9px; border-radius: 999px;
    font-size: 10px; font-weight: 700; border: 1px solid;
    max-width: 100%;
  }
  .chip.c-danger { background: rgba(239,68,68,.08); color: #FCA5A5; border-color: rgba(239,68,68,.30); }
  .chip.c-warn   { background: rgba(245,158,11,.08); color: #FCD34D; border-color: rgba(245,158,11,.30); }
  .chip.c-ok     { background: rgba(16,185,129,.08); color: #6EE7B7; border-color: rgba(16,185,129,.30); }
`

const INLINE_STYLES = `
  :host { all: initial; display: block; width: 100%; }
  * { box-sizing: border-box; font-family: Inter, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  .card {
    margin: 10px 0;
    padding: 14px;
    background: #0D0F12;
    color: #F3F4F6;
    border: 1px solid rgba(16,185,129,.30);
    border-radius: 14px;
    box-shadow: 0 6px 24px rgba(0,0,0,.35);
    font-size: 12px; line-height: 1.45;
  }
  .top { display: flex; align-items: center; gap: 10px; }
  .tile {
    flex: none; width: 46px; height: 46px; border-radius: 12px;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    font-weight: 800; font-size: 17px; line-height: 1; font-variant-numeric: tabular-nums;
    border: 1px solid;
  }
  .tile small { font-size: 7px; font-weight: 700; letter-spacing: .1em; margin-top: 2px; opacity: .65; }
  .t-high   { background: rgba(16,185,129,.10); border-color: rgba(16,185,129,.45); box-shadow: 0 0 16px rgba(16,185,129,.20); }
  .t-medium { background: rgba(245,158,11,.10); border-color: rgba(245,158,11,.45); box-shadow: 0 0 16px rgba(245,158,11,.15); }
  .t-low    { background: rgba(239,68,68,.10); border-color: rgba(239,68,68,.45); box-shadow: 0 0 16px rgba(239,68,68,.15); }
  .t-nodata {
    background: #12151C;
    border-color: #262C37;
    color: #9CA3AF;
    box-shadow: none;
  }
  .brandline { min-width: 0; }
  .brandline b {
    display: block; font-size: 11px; letter-spacing: -.01em;
    background: linear-gradient(90deg, #34D399, #10B981);
    -webkit-background-clip: text; background-clip: text; color: transparent;
  }
  .brandline span { font-size: 10px; color: #9CA3AF; }
  .expand {
    margin-left: auto; flex: none;
    padding: 7px 12px; border-radius: 8px;
    background: linear-gradient(180deg, #34D399, #059669);
    border: none; cursor: pointer;
    color: #0D0F12; font-family: inherit;
    font-size: 11px; font-weight: 800;
    transition: all .15s ease;
    box-shadow: 0 3px 12px rgba(16,185,129,.28), inset 0 1px 0 rgba(255,255,255,.2);
  }
  .expand:hover { filter: brightness(1.08); transform: translateY(-1px); }
  .flags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 11px; }
  .chip {
    padding: 3.5px 9px; border-radius: 999px;
    font-size: 10px; font-weight: 700; border: 1px solid;
    max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .c-danger { background: rgba(239,68,68,.08); color: #FCA5A5; border-color: rgba(239,68,68,.30); }
  .c-warn   { background: rgba(245,158,11,.08); color: #FCD34D; border-color: rgba(245,158,11,.30); }
  .c-ok     { background: rgba(16,185,129,.08); color: #6EE7B7; border-color: rgba(16,185,129,.30); }
  .rows { margin-top: 10px; border-top: 1px solid #171C25; }
  .r { display: flex; align-items: center; gap: 8px; padding: 6px 2px; border-bottom: 1px solid #171C25; }
  .r:last-child { border-bottom: none; }
  .r b:first-child { color: #CBD5E1; font-weight: 600; }
  .r .bar { height: 4px; border-radius: 999px; background: #1F242D; overflow: hidden; flex: 1; }
  .r .bar > i { display: block; height: 100%; background: linear-gradient(90deg, #059669, #34D399); }
  .r em { font-style: normal; font-weight: 700; font-variant-numeric: tabular-nums; color: #E5E7EB; }
  .r .na { color: #4B5563; font-size: 10.5px; }
  .name { margin-top: 10px; }
  .name span {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 6px 12px; border-radius: 999px;
    background: rgba(16,185,129,.09); border: 1px solid rgba(16,185,129,.35);
    color: #6EE7B7; font-size: 12px; font-weight: 800;
  }
  .name small { font-weight: 700; opacity: .75; font-size: 10px; }
  .note {
    margin-top: 10px; padding-top: 9px;
    border-top: 1px solid #171C25;
    color: #93C5FD; font-size: 10.5px; line-height: 1.5;
  }
`

export interface PanelOptions {
  docked?: boolean
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

let host: HTMLElement | null = null
let shadow: ShadowRoot | null = null
let panelEl: HTMLElement | null = null
let contentEl: HTMLElement | null = null
let escHandler: ((event: KeyboardEvent) => void) | null = null

function closePanel(): void {
  if (!host || !panelEl) return
  panelEl.parentElement?.classList.remove('open')
  const node = host
  window.setTimeout(() => node.remove(), 260)
  if (escHandler) {
    window.removeEventListener('keydown', escHandler)
    escHandler = null
  }
  host = null
  shadow = null
  panelEl = null
  contentEl = null
}

function ensurePanel(docked: boolean): void {
  if (host && shadow && document.body.contains(host)) return
  if (host) host.remove()

  const root = document.createElement('div')
  root.dataset.gigradarModal = ''
  root.style.cssText = 'position:fixed;inset:0;z-index:2147483646;pointer-events:none'
  shadow = root.attachShadow({ mode: 'closed' })

  const style = document.createElement('style')
  style.textContent = MODAL_STYLES

  const wrap = document.createElement('div')
  wrap.className = 'wrap' + (docked ? ' docked' : '')

  if (!docked) {
    const backdrop = document.createElement('div')
    backdrop.className = 'backdrop'
    backdrop.addEventListener('click', () => closePanel())
    wrap.appendChild(backdrop)
  }

  panelEl = document.createElement('aside')
  panelEl.className = 'panel' + (docked ? ' docked' : '')

  contentEl = document.createElement('div')
  contentEl.className = 'body'

  panelEl.appendChild(contentEl)
  wrap.appendChild(panelEl)
  shadow.append(style, wrap)
  document.body.appendChild(root)

  host = root
  requestAnimationFrame(() => wrap.classList.add('open'))

  escHandler = (event: KeyboardEvent) => {
    if (event.key === 'Escape') closePanel()
  }
  window.addEventListener('keydown', escHandler)
}

function signalRows(data: EnrichmentData): string {
  return data.score.components
    .map((component) => {
      const pct =
        component.value == null ? null : `${Math.round(component.value * 100)}%`
      return `
        <tr>
          <td>${component.label}</td>
          <td>
            ${
              pct
                ? `<div class="bar"><i style="width:${pct}"></i></div>`
                : '<span class="na">no data on page</span>'
            }
          </td>
          <td class="val ${component.display == null ? 'na' : ''}">
            ${component.display ?? '—'}
          </td>
        </tr>`
    })
    .join('')
}

function flagItems(data: EnrichmentData): string {
  if (data.flags.length === 0) {
    return '<li class="flag-ok">No red flags detected on this page.</li>'
  }
  return data.flags
    .map(
      (flag) =>
        `<li class="flag-${flag.level === 'danger' ? 'danger' : 'warn'}">• ${flag.text}</li>`
    )
    .join('')
}

function activitySection(data: EnrichmentData): string {
  const a = data.activity
  if (!a) return ''
  const cell = (label: string, value: number | null): string => `
    <div class="act-cell"><span>${value ?? '—'}</span><small>${label}</small></div>`
  return `
    <h3 class="sec">Activity radar</h3>
    <div class="activity-grid">
      ${cell('Proposals', a.proposalsCount)}
      ${cell('Interviewing', a.interviewingCount)}
      ${cell('Invites sent', a.invitesSentCount)}
      ${cell('Unanswered', a.unansweredInvitesCount)}
    </div>`
}

function trueRateSection(data: EnrichmentData): string {
  const tr = data.trueRate
  const budget = data.budget
  if (!tr || (tr.medianHourlyUsd == null && tr.avgFixedUsd == null)) return ''

  const rows: string[] = []
  const chips: string[] = []

  if (tr.medianHourlyUsd != null) {
    rows.push(
      `<div class="tr-row"><b>True Median Rate</b><em>$${tr.medianHourlyUsd.toFixed(2)}/hr</em></div>`
    )
    if (budget?.type === 'hourly' && budget.maxUsd != null && budget.maxUsd > 0) {
      chips.push(
        budget.maxUsd >= tr.medianHourlyUsd * 1.5
          ? `<span class="chip c-danger">⚠ Listed $${budget.maxUsd % 1 === 0 ? budget.maxUsd.toFixed(0) : budget.maxUsd.toFixed(2)}/hr is inflated vs what they actually pay</span>`
          : `<span class="chip c-ok">Listed rate in line with payout history</span>`
      )
    }
  }
  if (tr.avgFixedUsd != null) {
    rows.push(
      `<div class="tr-row"><b>Avg Fixed Payout</b><em>$${Math.round(tr.avgFixedUsd).toLocaleString('en-US')}</em></div>`
    )
  }

  const sample =
    tr.sampleCount > 0
      ? `<div class="tr-chips"><span class="chip c-ok">${tr.sampleCount} past contract${tr.sampleCount === 1 ? '' : 's'} analyzed</span>${chips.join('')}</div>`
      : chips.length > 0
        ? `<div class="tr-chips">${chips.join('')}</div>`
        : ''

  return `
    <h3 class="sec">True Rate benchmark</h3>
    <div class="tr-block">${rows.join('')}${sample}</div>`
}

function renderNameSection(data: EnrichmentData): string {
  if (data.meta.feedbacks.length === 0) {
    return `<p class="hint">Open the full job post to scan past client feedback for the client's first name.</p>`
  }
  if (!data.nameGuess) {
    return `<p class="hint">Feedback scanned (${data.meta.feedbacks.length} entries) — no confident name match found. Better skip the personalization than guess wrong.</p>`
  }
  const confPct = Math.round(data.nameGuess.confidence * 100)
  const alternates =
    data.nameGuess.alternates.length > 0
      ? ` <span class="conf">also seen: ${data.nameGuess.alternates.join(', ')}</span>`
      : ''
  return `
    <div class="name-row">
      <span class="name-chip">👤 ${escapeHtml(data.nameGuess.name)}
        <span class="conf">${confPct}% confidence · ${data.nameGuess.votes} mention${data.nameGuess.votes === 1 ? '' : 's'}</span>
      </span>
      <button id="gr-name-copy" class="mini-copy" type="button">📋 Copy</button>
    </div>${alternates}`
}

async function refreshAiState(button: HTMLButtonElement): Promise<void> {
  try {
    const byok = await loadByok()
    button.hidden = !(byok.enabled && !!byok.apiKey)
  } catch {
    button.hidden = true
  }
}

function wireHookActions(scope: HTMLElement, data: EnrichmentData): void {
  const listEl = scope.querySelector<HTMLElement>('#gr-hooks')
  const aiBtn = scope.querySelector<HTMLButtonElement>('#gr-ai')
  const errEl = scope.querySelector<HTMLElement>('#gr-hook-err')
  if (!listEl || !aiBtn || !errEl) return

  let hooks: HookVariant[] = []
  let lastCopiedIndex = -1

  function hookTextEl(index: number): HTMLElement | null {
    return listEl!.querySelector<HTMLElement>(
      `.hook-opt:nth-of-type(${index + 1}) .ho-text`
    )
  }

  function build(): void {
    hooks = generateHookVariants({
      jobId: data.meta.jobId,
      title: data.meta.title,
      description: data.meta.descriptionSnippet,
      clientName: data.nameGuess?.name ?? null
    })
    listEl!.innerHTML = hooks
      .map(
        (hook, index) => `
        <div class="hook-opt">
          <div class="ho-head"><b>Option ${hook.label}</b><span>${hook.style}</span></div>
          <p class="ho-text"></p>
          <div class="ho-foot">
            <button class="act primary ho-copy" data-i="${index}" type="button">📋 Copy Hook</button>
          </div>
        </div>`
      )
      .join('')
    hooks.forEach((hook, index) => {
      const textEl = hookTextEl(index)
      if (textEl) textEl.textContent = hook.text
    })
    bindCopyButtons()
  }

  function bindCopyButtons(): void {
    listEl!.querySelectorAll<HTMLButtonElement>('.ho-copy').forEach((button) => {
      button.addEventListener('click', async () => {
        const index = Number(button.dataset.i)
        const hook = hooks[index]
        if (!hook) return
        lastCopiedIndex = index
        try {
          await navigator.clipboard.writeText(hook.text)
          button.textContent = '✓ Copied!'
          button.classList.add('copied')
          window.setTimeout(() => {
            button.textContent = '📋 Copy Hook'
            button.classList.remove('copied')
          }, 1400)
        } catch {
          errEl!.textContent = 'Clipboard blocked by browser permissions.'
        }
      })
    })
  }

  aiBtn.addEventListener('click', async () => {
    const index = Math.max(lastCopiedIndex, 0)
    const hook = hooks[index]
    if (!hook) return
    errEl!.textContent = ''
    aiBtn.disabled = true
    const previousLabel = aiBtn.textContent
    aiBtn.textContent = 'Polishing…'
    try {
      const result = await polishHook(hook.text, data.meta.title)
      if (result.ok) {
        hook.text = result.text
        const textEl = hookTextEl(index)
        if (textEl) textEl.textContent = result.text
      } else {
        errEl!.textContent = result.text
      }
    } catch (error) {
      errEl!.textContent = String(error instanceof Error ? error.message : error)
    } finally {
      aiBtn.disabled = false
      aiBtn.textContent = previousLabel
    }
  })

  void refreshAiState(aiBtn)
  build()
}

const GUEST_LOGIN_URL = 'https://www.upwork.com/ab/account/security/login'

function detectGuestMode(): boolean {
  const markers =
    'a[href*="/account/login"], a[href*="/users/login"], a[href*="/users/signup"], a[data-qa="nav-login"], [data-qa*="login" i]'
  try {
    return document.querySelector(markers) != null
  } catch {
    return false
  }
}

export function openDetailModal(
  data: EnrichmentData,
  options: PanelOptions = {}
): void {
  if (data.meta.feedbacks.length > 0 && !data.nameGuess) {
    data.nameGuess = extractClientName(data.meta.feedbacks)
  }

  ensurePanel(!!options.docked)
  if (!contentEl || !panelEl || !shadow) return

  panelEl.querySelector('.gr-head')?.remove()
  contentEl.innerHTML = ''

  const scored = data.score.scored
  const ringClass = scored
    ? `tier-${data.score.tier.toLowerCase()}`
    : 'tier-nodata'
  const ringValue = scored ? `${data.score.score}` : '--'
  const ringLabel = scored ? 'SCORE' : 'NO DATA'

  const head = document.createElement('div')
  head.className = 'gr-head head'
  head.innerHTML = `
    <div class="score-ring ${ringClass}">
      ${ringValue}<small>${ringLabel}</small>
    </div>
    <div style="min-width:0">
      <p class="job-title"></p>
      <p class="job-sub">${escapeHtml(metaSubline(data))}</p>
    </div>
    <button class="close-btn" title="Close">✕</button>`
  head.querySelector('.job-title')!.textContent = data.meta.title
  head.querySelector('.close-btn')!.addEventListener('click', () => closePanel())
  panelEl.insertBefore(head, contentEl)

  const guestNote =
    !data.score.scored && detectGuestMode()
      ? `<div class="guest-note"><span><b>Guest mode detected</b> — log in to Upwork so client history becomes visible.</span><button id="gr-guest-login" class="guest-link" type="button">Log in</button></div>`
      : ''

  contentEl.innerHTML = `
    ${guestNote}
    <h3 class="sec">Intent signals</h3>
    <table class="signals"><tbody>${signalRows(data)}</tbody></table>

    ${activitySection(data)}
    ${trueRateSection(data)}

    <h3 class="sec">Red flags</h3>
    <ul class="flags">${flagItems(data)}</ul>

    <h3 class="sec">Client name</h3>
    <div id="gr-name" class="gate">${renderNameSection(data)}</div>

    <h3 class="sec">⚡ 1-Click Proposal Hook</h3>
    <div id="gr-hook" class="gate">
      <div class="row ho-toolbar">
        <span class="hint">Three ready-to-send openers, built from the job's signals.</span>
        <button id="gr-ai" class="act" hidden>✨ AI Polish</button>
      </div>
      <div id="gr-hooks"></div>
      <div id="gr-hook-err" class="err"></div>
</div>`

  contentEl.querySelector('#gr-guest-login')?.addEventListener('click', () => {
    window.location.href = GUEST_LOGIN_URL
  })

  const nameCopy = contentEl.querySelector<HTMLButtonElement>('#gr-name-copy')
  if (nameCopy && data.nameGuess) {
    const nameValue = data.nameGuess.name
    nameCopy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(nameValue)
        nameCopy.textContent = '✓ Copied!'
        nameCopy.classList.add('copied')
        window.setTimeout(() => {
          nameCopy.textContent = '📋 Copy'
          nameCopy.classList.remove('copied')
        }, 1200)
      } catch {
        window.setTimeout(() => {
          nameCopy.textContent = '📋 Copy'
        }, 600)
      }
    })
  }

  wireHookActions(contentEl, data)

  const proSections = [contentEl.querySelector('#gr-name'), contentEl.querySelector('#gr-hook')]
  void getCachedLicense().then((paid) => {
    for (const section of proSections) {
      if (!section) continue
      if (paid) continue
      section.classList.add('locked')
      const overlay = document.createElement('div')
      overlay.className = 'lock-overlay'
      const btn = document.createElement('button')
      btn.className = 'pro-btn'
      btn.textContent = 'Unlock with GigRadar Pro — $29 lifetime'
      btn.addEventListener('click', (event) => {
        event.stopPropagation()
        void chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' })
        closePanel()
      })
      overlay.appendChild(btn)
      section.appendChild(overlay)
    }
  })
}

function metaSubline(data: EnrichmentData): string {
  const parts: string[] = []
  if (data.meta.postedText) parts.push(data.meta.postedText)
  if (data.meta.proposalCount != null) parts.push(`${data.meta.proposalCount}+ proposals`)
  return parts.join(' · ')
}

export function mountInlineCard(
  container: HTMLElement,
  data: EnrichmentData,
  onExpand: () => void
): HTMLElement {
  if (data.meta.feedbacks.length > 0 && !data.nameGuess) {
    data.nameGuess = extractClientName(data.meta.feedbacks)
  }

  const existing = container.querySelector('[data-gigradar-inline]')
  const inlineHost = document.createElement('div')
  inlineHost.dataset.gigradarInline = ''
  inlineHost.style.cssText = 'display:block;width:100%'

  const shadow = inlineHost.attachShadow({ mode: 'closed' })
  const style = document.createElement('style')
  style.textContent = INLINE_STYLES

  const card = document.createElement('div')
  card.className = 'card'

  const flagsHtml =
    data.flags.length > 0
      ? `<div class="flags">${data.flags
          .slice(0, 3)
          .map(
            (flag) =>
              `<span class="chip c-${flag.level}" title="${escapeHtml(flag.text)}">${
                flag.level === 'danger' ? '⚠' : '•'
              } ${escapeHtml(flag.text)}</span>`
          )
          .join('')}</div>`
      : '<div class="flags"><span class="chip c-ok">No red flags detected</span></div>'

  const rowsHtml = data.score.components
    .map((component) => {
      const pct =
        component.value == null ? null : `${Math.round(component.value * 100)}%`
      return `
        <div class="r">
          <b>${component.label}</b>
          ${
            pct
              ? `<span class="bar"><i style="width:${pct}"></i></span><em>${component.display ?? ''}</em>`
              : `<span class="na">no data on page</span><em>—</em>`
          }
        </div>`
    })
    .join('')

  const nameHtml =
    data.nameGuess != null
      ? `<div class="name"><span>${escapeHtml(data.nameGuess.name)}<small>${Math.round(
          data.nameGuess.confidence * 100
        )}% · ${data.nameGuess.votes}×</small></span></div>`
      : ''

  const guestNoteInline =
    !data.score.scored && detectGuestMode()
      ? '<div class="note">Guest mode — log in to Upwork for client intel</div>'
      : ''

  const inlineScored = data.score.scored
  const tileClass = inlineScored
    ? `t-${data.score.tier.toLowerCase()}`
    : 't-nodata'
  const tileValue = inlineScored ? `${data.score.score}` : '--'
  const tileLabel = inlineScored ? 'SCORE' : 'NO DATA'

  card.innerHTML = `
    <div class="top">
      <div class="tile ${tileClass}">
        ${tileValue}<small>${tileLabel}</small>
      </div>
      <div class="brandline">
        <b>GigRadar Client Intel</b>
        <span>${escapeHtml(data.score.tier)} intent${data.meta.proposalCount != null ? ` · ${data.meta.proposalCount}+ proposals` : ''}</span>
      </div>
      <button class="expand" type="button">Full Intel ▸</button>
    </div>
    ${flagsHtml}
    <div class="rows">${rowsHtml}</div>
    ${nameHtml}
    ${guestNoteInline}`

  card.querySelector('.expand')!.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    onExpand()
  })

  shadow.append(style, card)

  if (existing) existing.replaceWith(inlineHost)
  else container.appendChild(inlineHost)

  return inlineHost
}
