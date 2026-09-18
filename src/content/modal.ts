import { extractClientName } from '../engine/name-extractor'
import { generateHookVariants } from '../engine/templates'
import type { HookVariant } from '../engine/templates'
import { loadByok, saveByok, polishHook, generateClientDossierSummary } from '../engine/byok'
import { buildClientDossier } from '../engine/client-dossier'
import { extensionContextValid } from '../context'
import { getCachedLicense, PRO_PRICE } from '../monetization/extpay-core'
import { makeBidDecision } from '../engine/bid-decision'
import { getConnectsSaved, DOLLARS_PER_CONNECT } from '../engine/metrics'
import type { EnrichmentData } from '../types'
import { t, getLanguage, subscribeLanguageChange, type SupportedLocale } from '../i18n'
import {
  checkTeamCollision,
  claimJobForTeam,
  releaseJobClaim,
  formatTimeAgo
} from '../cloud/team-tracker'
import { getAccountTier } from '../cloud/account'
import { generateAutopilotProposal, generateAiAutopilotProposal } from '../autopilot/autopilot-engine'
import { loadVoiceProfile, DEFAULT_VOICE_PROFILE } from '../autopilot/voice-profile'
import { matchCaseStudiesForJob } from '../autopilot/case-studies'
import { calculateBidIntelligence, estimateDealValue } from '../engine/bid-intelligence'
import { dispatchWebhooks } from '../engine/webhooks'
import type { AutopilotProposal, VoiceTone } from '../types'

let activeModalLocale: SupportedLocale = 'en'
void getLanguage().then((l) => {
  activeModalLocale = l
})
subscribeLanguageChange((newLocale) => {
  activeModalLocale = newLocale
})

const MODAL_STYLES = `
  :host { all: initial; }
  * { box-sizing: border-box; }
  .backdrop {
    position: absolute; inset: 0;
    background: rgba(2, 6, 23, 0);
    pointer-events: auto;
    transition: background 0.28s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .open .backdrop { background: rgba(2, 6, 23, .65); backdrop-filter: blur(2px); }
  .panel {
    position: absolute; top: 0; right: 0; bottom: 0;
    width: min(420px, 94vw);
    background: #0A0E14;
    border-left: 1px solid #1E2530;
    box-shadow: -16px 0 48px rgba(0, 0, 0, .65);
    display: flex; flex-direction: column;
    transform: translateX(102%);
    transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1);
    will-change: transform;
    pointer-events: auto;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, Helvetica, Arial, sans-serif;
    color: #F3F4F6;
  }
  .open .panel { transform: translateX(0); }
  .head {
    padding: 18px 20px 16px;
    border-bottom: 1px solid #1E2530;
    display: flex; align-items: flex-start; gap: 14px;
    background: linear-gradient(135deg, #0E131C, #0A0E14);
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
    border: 1px solid #1E2530;
  }
  .score-ring small { font-size: 8.5px; font-weight: 700; letter-spacing: .12em; margin-top: 3px; opacity: .75; }
  .tier-high   { background: rgba(16,185,129,.10); border-color: rgba(52,211,153,.45); box-shadow: 0 0 22px rgba(16,185,129,.18); }
  .tier-medium { background: rgba(245,158,11,.10); border-color: rgba(245,158,11,.45); box-shadow: 0 0 22px rgba(245,158,11,.15); }
  .tier-low    { background: rgba(239,68,68,.10); border-color: rgba(239,68,68,.45); box-shadow: 0 0 22px rgba(239,68,68,.15); }
  .tier-nodata {
    background: #0E1218;
    border-color: #1E2530;
    color: #94A3B8;
    box-shadow: none;
  }
  .job-title { font-size: 14px; font-weight: 700; line-height: 1.35; margin: 0 0 5px; color: #F3F4F6; }
  .job-sub { font-size: 12px; color: #94A3B8; margin: 0; }
  .head-actions {
    margin-left: auto; flex: none;
    display: flex; align-items: center; gap: 6px;
  }
  .settings-btn {
    width: 30px; height: 30px;
    border-radius: 9px; border: 1px solid #1E2530;
    background: #121620; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    color: #94A3B8;
    transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .settings-btn svg { width: 14px; height: 14px; display: block; }
  .settings-btn:hover { background: #1A202C; color: #34D399; border-color: #2E3846; transform: scale(1.05); }
  .settings-btn:active { transform: scale(0.95); }
  .close-btn {
    width: 30px; height: 30px;
    border-radius: 9px; border: 1px solid #1E2530;
    background: #121620; cursor: pointer;
    font-size: 14px; line-height: 1; color: #94A3B8;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .close-btn:hover { background: #1A202C; color: #F3F4F6; border-color: #2E3846; transform: scale(1.05); }
  .close-btn:active { transform: scale(0.95); }
  .body { overflow-y: auto; padding: 18px 20px 28px; flex: 1; }
  .body::-webkit-scrollbar { width: 6px; }
  .body::-webkit-scrollbar-track { background: transparent; }
  .body::-webkit-scrollbar-thumb { background: #1E2530; border-radius: 999px; }
  .body::-webkit-scrollbar-thumb:hover { background: #2E3846; }
  h3.sec {
    font-size: 10px; font-weight: 800; letter-spacing: .12em;
    text-transform: uppercase; color: #64748B;
    margin: 20px 0 9px;
  }
  table.signals { width: 100%; border-collapse: collapse; border-radius: 10px; overflow: hidden; border: 1px solid #1E2530; }
  table.signals td { padding: 9px 12px; font-size: 13px; border-bottom: 1px solid #171C25; vertical-align: middle; background: #0E1218; }
  table.signals tr:last-child td { border-bottom: none; }
  table.signals td:first-child { color: #CBD5E1; font-weight: 600; width: 36%; }
  .bar { height: 5px; border-radius: 999px; background: #1E2530; overflow: hidden; }
  .bar > i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, #059669, #34D399); box-shadow: 0 0 8px rgba(16,185,129,.4); }
  .val { text-align: right; font-weight: 700; white-space: nowrap; font-variant-numeric: tabular-nums; width: 24%; }
  .na { color: #475569; font-weight: 500; font-size: 11.5px; }
  ul.flags { list-style: none; margin: 0; padding: 0; display: grid; gap: 7px; }
  ul.flags li {
    font-size: 12.5px; line-height: 1.45;
    padding: 9px 12px; border-radius: 9px;
    display: flex; gap: 8px; align-items: baseline;
    border: 1px solid;
  }
  .flag-danger { background: rgba(239,68,68,.08); color: #FCA5A5; border-color: rgba(239,68,68,.28); }
  .flag-warn   { background: rgba(245,158,11,.08); color: #FCD34D; border-color: rgba(245,158,11,.28); }
  .flag-ok     { background: rgba(16,185,129,.08); color: #6EE7B7; border-color: rgba(16,185,129,.28); }
  .gate { position: relative; border-radius: 12px; }
  .gate.locked { min-height: 110px; }
  .gate.locked > *:not(.lock-overlay) { filter: blur(5px); pointer-events: none; user-select: none; opacity: .50; }
  .lock-overlay {
    position: absolute; inset: -4px;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    background: rgba(10,14,20,.65);
    backdrop-filter: blur(4px);
    border-radius: 12px;
  }
  .paywall-note {
    display: block;
    margin-top: 6px;
    margin-bottom: 16px;
    line-height: 1.4;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: .01em;
    text-align: center;
    color: #94A3B8;
  }
  .pro-btn {
    padding: 10px 18px;
    border: 1px solid rgba(245,158,11,.45); border-radius: 10px;
    background: linear-gradient(180deg, rgba(245,158,11,.20), rgba(245,158,11,.10));
    color: #FCD34D;
    font-family: inherit;
    font-size: 12.5px; font-weight: 700; letter-spacing: -.01em; cursor: pointer;
    box-shadow: 0 0 24px rgba(245,158,11,.16);
    transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, border-color 0.2s ease, background 0.2s ease;
  }
  .pro-btn:hover {
    background: linear-gradient(180deg, rgba(245,158,11,.28), rgba(245,158,11,.15));
    border-color: rgba(245,158,11,.7);
    transform: translateY(-1px) scale(1.02);
    box-shadow: 0 0 32px rgba(245,158,11,.28);
  }
  .pro-btn:active { transform: translateY(0) scale(.98); }
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
    padding: 11px 13px;
    border: 1px solid #1E2530;
    background: #0E1218;
    border-radius: 10px;
  }
  .ho-head {
    display: flex; align-items: center; gap: 7px;
    font-size: 10px; letter-spacing: .06em; text-transform: uppercase;
  }
  .ho-head b { color: #34D399; font-size: 10.5px; }
  .ho-head span { color: #64748B; font-weight: 600; }
  .ho-text { margin: 8px 0 0; font-size: 12.5px; line-height: 1.55; color: #E2E8F0; white-space: pre-wrap; }
  .ho-foot { display: flex; gap: 8px; margin-top: 9px; }
  textarea.hook {
    width: 100%; min-height: 96px;
    resize: vertical;
    border: 1px solid #1E2530; border-radius: 10px;
    background: #080A0E;
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
    border: 1px solid #1E2530; background: #121620;
    font-family: inherit;
    font-size: 12.5px; font-weight: 700; color: #E5E7EB; cursor: pointer;
    transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .act:hover { background: #1A202C; border-color: #2E3846; }
  .act:active { transform: scale(.97); }
  .act.primary {
    background: linear-gradient(180deg, #34D399, #059669);
    border-color: transparent; color: #07090C;
    box-shadow: 0 4px 16px rgba(16,185,129,.28), inset 0 1px 0 rgba(255,255,255,.2);
    transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), filter 0.15s ease, box-shadow 0.18s ease;
  }
  .act.primary:hover { filter: brightness(1.08); transform: translateY(-1px); box-shadow: 0 6px 20px rgba(16,185,129,.38); }
  .act.primary:active { transform: translateY(0) scale(.97); }
  .act[disabled] { opacity: .45; cursor: not-allowed; transform: none !important; }
  .err { margin-top: 8px; font-size: 12px; color: #F87171; }
  .scan-note {
    display: flex; align-items: center; gap: 8px;
    margin: 0 0 12px;
    padding: 9px 12px;
    border-radius: 10px;
    background: rgba(245,158,11,.07);
    border: 1px solid rgba(245,158,11,.25);
    color: #FCD34D;
    font-size: 12px; line-height: 1.45;
  }
  .scan-note i {
    width: 7px; height: 7px; border-radius: 999px; flex: none;
    background: #F59E0B;
    animation: grScanPulse 1.1s ease-in-out infinite;
  }
  @keyframes grScanPulse {
    0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(245,158,11,.5); }
    50% { opacity: .5; box-shadow: 0 0 0 4px rgba(245,158,11,0); }
  }
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
  .decision {
    margin: 0 0 14px;
    padding: 11px 12px;
    border: 1px solid;
    border-radius: 10px;
  }
  .decision-bid { background: rgba(16,185,129,.08); border-color: rgba(16,185,129,.35); }
  .decision-consider { background: rgba(245,158,11,.08); border-color: rgba(245,158,11,.30); }
  .decision-skip { background: rgba(239,68,68,.08); border-color: rgba(239,68,68,.30); }
  .decision-top { display: flex; align-items: baseline; gap: 8px; }
  .decision-top strong { font-size: 12px; letter-spacing: .08em; color: #F3F4F6; }
  .decision-top span { color: #CBD5E1; font-size: 11.5px; line-height: 1.35; }
  .decision-reasons { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 7px; }
  .decision-reasons span { padding: 3px 7px; border-radius: 999px; background: rgba(255,255,255,.06); color: #9CA3AF; font-size: 10px; }
  .decision p { margin: 8px 0 0; color: #E5E7EB; font-size: 11.5px; line-height: 1.4; }
  .roi-card {
    margin: 0 0 14px;
    padding: 10px 12px;
    border-radius: 10px;
    background: linear-gradient(135deg, rgba(16,185,129,.08), rgba(15,23,42,.45));
    border: 1px solid rgba(16,185,129,.25);
    display: flex; flex-direction: column; gap: 4px;
  }
  .roi-header {
    display: flex; align-items: center; justify-content: space-between;
  }
  .roi-title {
    font-size: 11px; font-weight: 800; letter-spacing: .06em;
    text-transform: uppercase; color: #34D399;
  }
  .roi-badge {
    font-size: 10px; font-weight: 800;
    padding: 2px 7px; border-radius: 999px;
    background: rgba(16,185,129,.15);
    border: 1px solid rgba(16,185,129,.35);
    color: #6EE7B7;
  }
  .roi-stat {
    margin: 0; font-size: 12px; line-height: 1.4; color: #CBD5E1;
  }
  .roi-stat b { color: #F3F4F6; font-weight: 700; }
  .roi-stat .roi-highlight { color: #34D399; font-weight: 700; }
  .pro-hook-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 6px; font-size: 10.5px; font-weight: 700; color: #FCD34D;
    letter-spacing: .04em; text-transform: uppercase;
  }
  .pro-hook-tag {
    font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px;
    background: rgba(245,158,11,.15); border: 1px solid rgba(245,158,11,.3);
    color: #FCD34D;
  }
  .autopilot-card {
    margin: 14px 0 10px;
    padding: 12px 14px;
    border-radius: 12px;
    background: linear-gradient(135deg, rgba(99,102,241,.09), rgba(15,23,42,.65));
    border: 1px solid rgba(99,102,241,.32);
    display: flex; flex-direction: column; gap: 10px;
  }
  .ap-header {
    display: flex; align-items: center; justify-content: space-between;
  }
  .ap-title {
    font-size: 11px; font-weight: 800; letter-spacing: .06em;
    text-transform: uppercase; color: #A5B4FC; display: flex; align-items: center; gap: 6px;
  }
  .ap-badge {
    font-size: 9px; font-weight: 800; padding: 2px 7px; border-radius: 999px;
    background: rgba(99,102,241,.2); border: 1px solid rgba(99,102,241,.45); color: #C7D2FE;
  }
  .ap-case-chip {
    padding: 8px 10px; border-radius: 8px; font-size: 11.5px;
    background: #0D1117; border: 1px solid #1E2530; color: #E2E8F0;
    line-height: 1.4;
  }
  .ap-case-chip small { color: #94A3B8; font-size: 10.5px; display: block; margin-bottom: 2px; }
  .ap-case-chip b { color: #A5B4FC; font-weight: 700; display: block; margin-bottom: 2px; }
  .ap-case-chip span { color: #CBD5E1; font-size: 11px; }
  .ap-tone-bar {
    display: flex; align-items: center; justify-content: space-between; gap: 8px;
  }
  .ap-tone-select {
    flex: 1; background: #0E1218; border: 1px solid #1E2530; border-radius: 8px;
    padding: 6px 8px; color: #F3F4F6; font-size: 11.5px; outline: none; cursor: pointer;
  }
  .ap-proposal-preview {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 11.5px; line-height: 1.5; color: #CBD5E1; background: #070A0F;
    border: 1px solid #1E2530; border-radius: 8px; padding: 10px;
    max-height: 150px; overflow-y: auto; white-space: pre-wrap; word-break: break-word;
    margin: 0;
  }
  .ap-proposal-preview::-webkit-scrollbar { width: 5px; }
  .ap-proposal-preview::-webkit-scrollbar-thumb { background: #1E2530; border-radius: 4px; }
  .ap-actions {
    display: flex; gap: 8px; align-items: center;
  }
  .ap-btn-copy {
    flex: 1; padding: 7px 12px; border-radius: 8px; font-weight: 700; font-size: 11.5px;
    background: #4F46E5; border: 1px solid #6366F1; color: #fff; cursor: pointer;
    transition: all 0.16s ease; display: flex; align-items: center; justify-content: center; gap: 6px;
  }
  .ap-btn-copy:hover { background: #4338CA; border-color: #818CF8; }
  .ap-btn-polish {
    padding: 7px 12px; border-radius: 8px; font-weight: 700; font-size: 11.5px;
    background: #121620; border: 1px solid #2E3846; color: #C7D2FE; cursor: pointer;
    transition: all 0.16s ease; display: flex; align-items: center; gap: 5px;
  }
  .ap-btn-polish:hover { background: #1A202C; border-color: #6366F1; color: #fff; }
  .panel.docked {
    top: var(--gr-top-offset, 64px);
    bottom: auto;
    max-height: calc(100vh - var(--gr-top-offset, 64px) - 20px);
    width: min(400px, 92vw);
    border-radius: 14px 0 0 14px;
    border: 1px solid #1E2530;
    border-right: none;
    box-shadow: -18px 12px 48px rgba(0, 0, 0, .65), inset 0 1px 0 rgba(255,255,255,.05);
    transform: translateX(104%);
    transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1);
    will-change: transform;
  }
  .wrap.docked.open .panel { transform: translateX(0); }
  .wrap.docked.open .panel.docked.collapsed {
    transform: translateX(calc(100% + 20px));
    pointer-events: none;
  }
  @media (max-width: 1440px) {
    .panel,
    .panel.docked {
      width: min(380px, 42vw);
      max-height: calc(100vh - var(--gr-top-offset, 60px) - 16px);
      top: var(--gr-top-offset, 60px);
    }
  }
  @media (max-width: 1024px) {
    .panel,
    .panel.docked {
      width: min(360px, 92vw);
    }
  }
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
  .company-pill-row {
    display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px;
  }
  .company-tag {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 2.5px 8px; border-radius: 6px;
    background: rgba(52,211,153,.12); border: 1px solid rgba(52,211,153,.35);
    color: #34D399; font-size: 11px; font-weight: 700;
  }
  .domain-tag {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 2.5px 8px; border-radius: 6px;
    background: rgba(56,189,248,.12); border: 1px solid rgba(56,189,248,.35);
    color: #38BDF8; font-size: 11px; font-weight: 700;
    text-decoration: none; transition: all 0.15s ease;
  }
  .domain-tag:hover {
    border-color: #38BDF8; background: rgba(56,189,248,.2); text-decoration: none;
  }
  .watchout-box {
    margin: 14px 0; padding: 12px 14px; border-radius: 12px;
    background: linear-gradient(180deg, rgba(239,68,68,.10) 0%, rgba(10,14,20,.65) 100%);
    border: 1px solid rgba(239,68,68,.35);
    box-shadow: 0 4px 18px rgba(239,68,68,.08);
  }
  .watchout-box.clean {
    background: rgba(16,185,129,.06);
    border-color: rgba(52,211,153,.25);
    box-shadow: none;
  }
  .watchout-header {
    display: flex; flex-direction: column; gap: 2px; margin-bottom: 10px;
  }
  .watchout-badge {
    font-size: 11px; font-weight: 800; color: #F87171; letter-spacing: .05em; text-transform: uppercase;
  }
  .watchout-sub {
    font-size: 11px; color: #94A3B8;
  }
  .watchout-list {
    display: flex; flex-direction: column; gap: 8px;
  }
  .watchout-card {
    background: #0E131C; border: 1px solid #1E2530; border-radius: 8px;
    padding: 9px 12px; border-left: 3px solid #EF4444;
  }
  .watchout-card-top {
    display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;
  }
  .watchout-cat {
    font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; color: #F87171;
  }
  .watchout-star {
    font-size: 11px; font-weight: 700; color: #F59E0B;
  }
  .watchout-quote {
    margin: 0; font-size: 12px; line-height: 1.45; color: #E2E8F0; font-style: italic;
  }
  .watchout-clean-text {
    display: flex; align-items: center; gap: 8px; font-size: 12px; color: #34D399;
  }
  .clean-icon { font-weight: 900; font-size: 14px; }
  .tech-stack-row, .praise-row {
    display: flex; flex-wrap: wrap; gap: 6px; margin: 4px 0 14px;
  }
  .tech-chip {
    padding: 3.5px 9px; border-radius: 8px; font-size: 11px; font-weight: 600;
    background: #111622; border: 1px solid #1E2530; color: #E2E8F0;
  }
  .praise-chip {
    padding: 3.5px 9px; border-radius: 8px; font-size: 11px; font-weight: 600;
    background: rgba(16,185,129,.08); border: 1px solid rgba(16,185,129,.25); color: #6EE7B7;
  }
  .dossier-card {
    margin: 6px 0 16px; padding: 13px 14px; border-radius: 12px;
    background: #0E131C; border: 1px solid #1E2530;
  }
  .dossier-intro {
    display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 12px; color: #94A3B8;
  }
  .dossier-btn {
    flex: none; padding: 6px 12px; border-radius: 8px;
    background: linear-gradient(180deg, #38BDF8, #0284C7);
    border: none; cursor: pointer; color: #07090C;
    font-size: 11.5px; font-weight: 800; font-family: inherit;
    transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .dossier-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
  .dossier-btn:active { transform: translateY(0) scale(.97); }
  .dossier-btn[disabled] { opacity: .5; cursor: not-allowed; transform: none !important; }
  .dossier-content {
    margin-top: 10px; padding-top: 10px; border-top: 1px solid #1E2530;
    font-size: 12px; line-height: 1.6; color: #E2E8F0; white-space: pre-wrap;
  }
  .dossier-gate-box {
    margin-top: 10px; padding: 10px 12px; border-radius: 8px;
    background: rgba(56,189,248,.06); border: 1px solid rgba(56,189,248,.2);
    font-size: 11.5px; color: #94A3B8; line-height: 1.45;
  }
  .dossier-gate-box b { color: #38BDF8; }
  .dossier-settings-btn {
    display: inline-block; margin-top: 7px; padding: 4px 10px; border-radius: 6px;
    background: #1E2530; border: 1px solid #2E3846; color: #F3F4F6;
    font-size: 11px; font-weight: 700; cursor: pointer;
  }
  .dossier-settings-btn:hover { background: #2A3444; }
  .team-banner {
    margin-bottom: 14px;
    padding: 12px 14px;
    border-radius: 12px;
    background: rgba(139, 92, 246, 0.12);
    border: 1px solid rgba(139, 92, 246, 0.45);
    box-shadow: 0 4px 18px rgba(0, 0, 0, 0.35), 0 0 14px rgba(139, 92, 246, 0.15);
  }
  .team-banner.collision {
    background: rgba(225, 29, 72, 0.14);
    border-color: rgba(244, 63, 94, 0.55);
    box-shadow: 0 4px 18px rgba(0, 0, 0, 0.35), 0 0 16px rgba(244, 63, 94, 0.25);
  }
  .team-banner-head {
    display: flex; align-items: center; justify-content: space-between;
    font-size: 11.5px; font-weight: 800; letter-spacing: -0.01em;
    color: #DDD6FE; margin-bottom: 5px;
  }
  .team-banner.collision .team-banner-head { color: #FECDD3; }
  .team-banner-desc {
    font-size: 11px; line-height: 1.45; color: #94A3B8; margin-bottom: 10px;
  }
  .team-banner-desc b { color: #F3F4F6; }
  .team-actions-row {
    display: flex; gap: 6px; flex-wrap: wrap; align-items: center;
  }
  .team-btn {
    padding: 5px 10px;
    border-radius: 7px;
    font-size: 11px; font-weight: 700;
    cursor: pointer; border: 1px solid transparent;
    transition: all 0.15s ease;
    font-family: inherit; line-height: 1.2;
  }
  .team-btn-claim {
    background: linear-gradient(180deg, #8B5CF6, #7C3AED);
    color: #FFFFFF;
    box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
  }
  .team-btn-claim:hover { filter: brightness(1.1); transform: translateY(-1px); }
  .team-btn-applied {
    background: #10B981; color: #0A0E14; font-weight: 800;
  }
  .team-btn-applied:hover { filter: brightness(1.1); transform: translateY(-1px); }
  .team-btn-pass {
    background: #1E2530; color: #94A3B8; border-color: #2E3846;
  }
  .team-btn-pass:hover { background: #2A3444; color: #F3F4F6; }
  .team-status-chip {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 8px; border-radius: 6px;
    font-size: 10.5px; font-weight: 700;
    background: rgba(139, 92, 246, 0.2); border: 1px solid rgba(139, 92, 246, 0.4);
    color: #C4B5FD;
  }
  .bid-intel-card {
    border-radius: 12px;
    background: #0E1218;
    border: 1px solid #1E2530;
    padding: 12px 14px;
    margin-top: 6px;
  }
  .bi-head {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 10px;
  }
  .bi-title {
    font-size: 12px; font-weight: 800; color: #F3F4F6;
  }
  .bi-badge {
    font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 6px;
    border: 1px solid;
  }
  .bi-badge.c-brand { background: rgba(99,102,241,.15); color: #A5B4FC; border-color: rgba(99,102,241,.4); }
  .bi-badge.c-warn { background: rgba(245,158,11,.15); color: #FCD34D; border-color: rgba(245,158,11,.4); }
  .bi-badge.c-ok { background: rgba(16,185,129,.15); color: #6EE7B7; border-color: rgba(16,185,129,.4); }
  .bi-badge.c-danger { background: rgba(239,68,68,.15); color: #FCA5A5; border-color: rgba(239,68,68,.4); }
  .bi-stats-grid {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;
    margin-bottom: 8px;
  }
  .bi-stat {
    background: #131720; border: 1px solid #1C2330; border-radius: 8px;
    padding: 6px 8px; text-align: center;
  }
  .bi-stat small {
    display: block; font-size: 9px; font-weight: 700; color: #64748B; text-transform: uppercase;
  }
  .bi-stat b {
    font-size: 13px; font-weight: 900; color: #F1F5F9; font-family: ui-monospace, monospace;
  }
  .bi-desc {
    font-size: 11.5px; line-height: 1.4; color: #94A3B8; margin: 0;
  }
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
  .decision {
    margin-top: 11px; padding: 8px 10px; border: 1px solid; border-radius: 9px;
    display: flex; align-items: baseline; gap: 7px; flex-wrap: wrap;
    font-size: 10.5px; line-height: 1.35;
  }
  .decision-bid { background: rgba(16,185,129,.08); border-color: rgba(16,185,129,.35); color: #6EE7B7; }
  .decision-consider { background: rgba(245,158,11,.08); border-color: rgba(245,158,11,.30); color: #FCD34D; }
  .decision-skip { background: rgba(239,68,68,.08); border-color: rgba(239,68,68,.30); color: #FCA5A5; }
  .decision strong { letter-spacing: .08em; color: #F3F4F6; }
  .decision span { color: #CBD5E1; }
`

export interface PanelOptions {
  docked?: boolean
  scanning?: boolean
  expanded?: boolean
  collapsed?: boolean
  locale?: SupportedLocale
  /**
   * Set only when every lazy-refresh retry has exhausted and the client is
   * confirmed to have zero visible stats. Until then an unscored panel shows
   * the SCANNING state instead of jumping straight to "-- NO DATA".
   */
  settled?: boolean
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
let outsideHandler: ((event: PointerEvent) => void) | null = null
let previousFocusedElement: HTMLElement | null = null

function closePanel(): void {
  if (!host || !panelEl) return
  panelEl.parentElement?.classList.remove('open')
  const node = host
  window.setTimeout(() => node.remove(), 260)
  if (escHandler) {
    window.removeEventListener('keydown', escHandler)
    escHandler = null
  }
  if (outsideHandler) {
    document.removeEventListener('pointerdown', outsideHandler, true)
    outsideHandler = null
  }
  if (previousFocusedElement && typeof previousFocusedElement.focus === 'function') {
    try {
      previousFocusedElement.focus()
    } catch {
      // Ignored if detached
    }
  }
  previousFocusedElement = null
  host = null
  shadow = null
  panelEl = null
  contentEl = null
}

export function isDetailModalOpen(): boolean {
  return host != null && document.body.contains(host)
}

export function closeDetailModal(): void {
  closePanel()
}

function getTopNavOffset(): number {
  try {
    const nav =
      document.querySelector('header') ??
      document.querySelector('[data-qa="nav-bar"]') ??
      document.querySelector('.nav-container') ??
      document.querySelector('nav')
    if (nav) {
      const rect = nav.getBoundingClientRect()
      if (rect.bottom > 30 && rect.bottom < 160) {
        return Math.round(rect.bottom)
      }
    }
  } catch {
    // fallback
  }
  return 64
}

function ensurePanel(docked: boolean, collapsed: boolean): void {
  if (host && shadow && document.body.contains(host)) {
    panelEl?.classList.toggle('collapsed', collapsed)
    return
  }
  if (host) host.remove()

  previousFocusedElement = (document.activeElement as HTMLElement) ?? null

  const topOffset = getTopNavOffset()
  const root = document.createElement('div')
  root.dataset.gigradarModal = ''
  root.style.cssText = `position:fixed;inset:0;z-index:99999;pointer-events:none;--gr-top-offset:${topOffset}px;`
  shadow = root.attachShadow({ mode: 'closed' })

  const style = document.createElement('style')
  style.textContent = MODAL_STYLES

  const wrap = document.createElement('div')
  wrap.className =
    'wrap' + (docked ? ' docked' : '') + (collapsed ? ' collapsed' : '')

  if (!docked) {
    const backdrop = document.createElement('div')
    backdrop.className = 'backdrop'
    backdrop.addEventListener('click', () => closePanel())
    wrap.appendChild(backdrop)
  }

  panelEl = document.createElement('aside')
  panelEl.className =
    'panel' + (docked ? ' docked' : '') + (collapsed ? ' collapsed' : '')
  panelEl.setAttribute('role', 'dialog')
  panelEl.setAttribute('aria-modal', 'true')
  panelEl.setAttribute('aria-label', 'GigRadar Client Intel')

  contentEl = document.createElement('div')
  contentEl.className = 'body'

  panelEl.appendChild(contentEl)
  wrap.appendChild(panelEl)
  shadow.append(style, wrap)
  document.body.appendChild(root)

  host = root
  requestAnimationFrame(() => wrap.classList.add('open'))

  escHandler = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      const activeInside = shadow?.activeElement
      if (
        activeInside &&
        (activeInside.tagName === 'INPUT' || activeInside.tagName === 'TEXTAREA')
      ) {
        ;(activeInside as HTMLElement).blur()
        return
      }
      closePanel()
      return
    }

    if (event.key === 'Tab' && shadow && panelEl) {
      const focusables = Array.from(
        shadow.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [tabindex="0"]:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])'
        )
      ).filter((el) => el.offsetParent !== null)
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (event.shiftKey && shadow.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && shadow.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
  }
  window.addEventListener('keydown', escHandler)

  outsideHandler = (event: PointerEvent) => {
    if (docked) return
    if (host && !event.composedPath().includes(host)) closePanel()
  }
  document.addEventListener('pointerdown', outsideHandler, true)
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
    return '<li class="flag-ok">✓ No red flags detected on this page.</li>'
  }
  return data.flags
    .map(
      (flag) =>
        `<li class="flag-${flag.level === 'danger' ? 'danger' : 'warn'}">${
          flag.level === 'danger' ? '🚨 ' : '⚠️ '
        }${escapeHtml(flag.text)}</li>`
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

function renderCompanyPills(data: EnrichmentData): string {
  const company = data.dossier?.company
  if (!company || (!company.name && !company.domain)) return ''
  return `
    <div class="company-pill-row">
      ${company.name ? `<span class="company-tag" title="Identified Organization">🏢 ${escapeHtml(company.name)}</span>` : ''}
      ${company.domain ? `<a href="https://${escapeHtml(company.domain)}" target="_blank" rel="noopener noreferrer" class="domain-tag" title="Visit Website">🌐 ${escapeHtml(company.domain)} ↗</a>` : ''}
    </div>`
}

function watchoutSection(data: EnrichmentData): string {
  const dossier = data.dossier
  if (!dossier) return ''
  const flags = dossier.reviewRedFlags
  if (flags.length > 0) {
    return `
      <div class="watchout-box">
        <div class="watchout-header">
          <span class="watchout-badge">⚠ WATCH OUT (${flags.length} Review Red Flag${flags.length === 1 ? '' : 's'})</span>
          <span class="watchout-sub">Direct quotes from past freelancer feedback</span>
        </div>
        <div class="watchout-list">
          ${flags
            .map(
              (rf) => `
            <div class="watchout-card">
              <div class="watchout-card-top">
                <span class="watchout-cat">${escapeHtml(rf.label)}</span>
                ${rf.rating != null ? `<span class="watchout-star">★ ${rf.rating.toFixed(1)}</span>` : ''}
              </div>
              <p class="watchout-quote">"${escapeHtml(rf.snippet)}"</p>
            </div>`
            )
            .join('')}
        </div>
      </div>`
  }

  if (data.meta.feedbacks.length > 0) {
    return `
      <div class="watchout-box clean">
        <div class="watchout-clean-text">
          <span class="clean-icon">✓</span>
          <span><b>Clean Review Record:</b> 0 disputes or red flags across ${data.meta.feedbacks.length} client feedback entries.</span>
        </div>
      </div>`
  }

  return ''
}

function techAndPraiseSection(data: EnrichmentData): string {
  const dossier = data.dossier
  if (!dossier) return ''
  const techHtml =
    dossier.techStack.length > 0
      ? `
        <h3 class="sec">Tech Stack & Tools</h3>
        <div class="tech-stack-row">
          ${dossier.techStack
            .map((t) => `<span class="tech-chip">⚙ ${escapeHtml(t)}</span>`)
            .join('')}
        </div>`
      : ''

  const praiseHtml =
    dossier.praiseHighlights.length > 0
      ? `
        <h3 class="sec">Client Strengths & Praise</h3>
        <div class="praise-row">
          ${dossier.praiseHighlights
            .map((p) => `<span class="praise-chip">${escapeHtml(p)}</span>`)
            .join('')}
        </div>`
      : ''

  return `${techHtml}${praiseHtml}`
}

function aiDossierSection(): string {
  return `
    <h3 class="sec">✨ AI Client Dossier</h3>
    <div id="gr-dossier-card" class="dossier-card">
      <div class="dossier-intro">
        <span>Instant tactical briefing synthesized directly via your BYOK key.</span>
        <button id="gr-dossier-btn" class="dossier-btn" type="button">✨ Synthesize Dossier</button>
      </div>
      <div id="gr-dossier-content" class="dossier-content" style="display: none;"></div>
      <div id="gr-dossier-gate" style="display: none;"></div>
      <div id="gr-dossier-err" class="err"></div>
    </div>`
}

function wireDossierActions(scope: HTMLElement, data: EnrichmentData): void {
  const btn = scope.querySelector<HTMLButtonElement>('#gr-dossier-btn')
  const content = scope.querySelector<HTMLElement>('#gr-dossier-content')
  const gate = scope.querySelector<HTMLElement>('#gr-dossier-gate')
  const err = scope.querySelector<HTMLElement>('#gr-dossier-err')
  if (!btn || !content || !gate || !err) return

  const runSynthesis = async () => {
    btn.disabled = true
    const prevText = btn.textContent
    btn.textContent = 'Synthesizing…'

    try {
      const result = await generateClientDossierSummary({
        title: data.meta.title,
        description: data.meta.descriptionSnippet,
        hireRatePct: data.signals.hireRatePct,
        totalSpendUsd: data.signals.totalSpendUsd,
        ratingAvg: data.rating?.avg ?? null,
        ratingCount: data.rating?.count ?? null,
        companyName: data.dossier?.company?.name ?? null,
        companyDomain: data.dossier?.company?.domain ?? null,
        techStack: data.dossier?.techStack ?? [],
        feedbacks: data.meta.feedbacks
      })

      if (result.ok) {
        content.style.display = 'block'
        content.innerHTML = escapeHtml(result.text).replace(/\n/g, '<br>')
      } else {
        err.textContent = result.text
      }
    } catch (error) {
      err.textContent = String(error instanceof Error ? error.message : error)
    } finally {
      btn.disabled = false
      btn.textContent = prevText
    }
  }

  btn.addEventListener('click', async () => {
    err.textContent = ''
    gate.style.display = 'none'

    const byok = await loadByok()
    if (!byok.enabled || !byok.apiKey) {
      gate.style.display = 'block'
      btn.style.display = 'none'
      gate.innerHTML = `
        <div class="dossier-gate-box">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
            <b style="color:#38BDF8;font-size:11.5px;">⚡ Quick AI Key Setup</b>
            <div style="display:flex;align-items:center;gap:6px;">
              <button type="button" class="dossier-settings-btn" style="margin:0;padding:2px 7px;font-size:10px;">Full Settings ↗</button>
              <button type="button" id="gr-inline-cancel" title="Cancel" style="background:transparent;border:none;color:#64748B;cursor:pointer;font-size:12px;padding:0 3px;line-height:1;">✕</button>
            </div>
          </div>
          <div style="color:#94A3B8;font-size:10.5px;line-height:1.4;margin-bottom:8px;">
            Paste your OpenAI or Anthropic API key to synthesize instant client briefings with zero credit fees.
          </div>
          <div style="display:flex;gap:5px;align-items:center;">
            <select id="gr-inline-provider" style="background:#090C10;border:1px solid #232D3F;color:#E2E8F0;border-radius:6px;padding:5px 6px;font-size:11px;font-family:inherit;">
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
            <input id="gr-inline-key" type="password" placeholder="Paste sk-..." autocomplete="off" spellcheck="false" style="flex:1;min-width:0;background:#090C10;border:1px solid #232D3F;color:#E2E8F0;border-radius:6px;padding:5px 8px;font-size:11px;font-family:monospace;" />
            <button id="gr-inline-save" type="button" style="background:linear-gradient(180deg,#34D399,#059669);border:none;border-radius:6px;padding:5px 11px;font-size:11px;font-weight:800;color:#07090C;cursor:pointer;white-space:nowrap;">
              Save & Run
            </button>
          </div>
          <div id="gr-inline-err" style="color:#F87171;font-size:10px;margin-top:4px;display:none;"></div>
        </div>`

      gate.querySelector('#gr-inline-cancel')?.addEventListener('click', () => {
        gate.style.display = 'none'
        btn.style.display = 'inline-flex'
      })

      gate.querySelector('.dossier-settings-btn')?.addEventListener('click', () => {
        void chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' })
      })

      const inlineSave = gate.querySelector<HTMLButtonElement>('#gr-inline-save')
      const inlineKey = gate.querySelector<HTMLInputElement>('#gr-inline-key')
      const inlineProv = gate.querySelector<HTMLSelectElement>('#gr-inline-provider')
      const inlineErr = gate.querySelector<HTMLElement>('#gr-inline-err')

      window.setTimeout(() => inlineKey?.focus(), 50)

      inlineKey?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          inlineSave?.click()
        }
      })

      inlineSave?.addEventListener('click', async () => {
        const key = inlineKey?.value.trim() ?? ''
        const prov = (inlineProv?.value as 'openai' | 'anthropic') ?? 'openai'
        if (key.length < 10) {
          if (inlineErr) {
            inlineErr.style.display = 'block'
            inlineErr.textContent = 'Please paste a valid API key (e.g. sk-...)'
          }
          return
        }
        await saveByok({ enabled: true, provider: prov, apiKey: key })
        gate.style.display = 'none'
        btn.style.display = 'inline-flex'
        await runSynthesis()
      })
      return
    }

    await runSynthesis()
  })
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
      ? `<small>Also mentioned: ${escapeHtml(data.nameGuess.alternates.join(', '))}</small>`
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
  const freeListEl = scope.querySelector<HTMLElement>('#gr-hooks-free')
  const proListEl = scope.querySelector<HTMLElement>('#gr-hooks-pro-list')
  const aiBtn = scope.querySelector<HTMLButtonElement>('#gr-ai-polish')
  const errEl = scope.querySelector<HTMLElement>('#gr-hooks-err')
  if (!freeListEl || !proListEl || !aiBtn || !errEl) return

  let hooks: HookVariant[] = []
  let lastCopiedIndex = 0

  function hookTextEl(index: number): HTMLElement | null {
    if (index === 0) {
      return freeListEl!.querySelector<HTMLElement>('.ho-text')
    }
    return proListEl!.querySelector<HTMLElement>(
      `.hook-opt:nth-of-type(${index}) .ho-text`
    )
  }

  function build(): void {
    hooks = generateHookVariants({
      jobId: data.meta.jobId,
      title: data.meta.title,
      description: data.meta.descriptionSnippet,
      clientName: data.nameGuess?.name ?? null,
      techStack: data.dossier?.techStack ?? []
    })

    if (hooks.length > 0) {
      const freeHook = hooks[0]
      freeListEl!.innerHTML = `
        <div class="hook-opt">
          <div class="ho-head"><b>Option ${escapeHtml(freeHook.label)}</b><span>${escapeHtml(freeHook.style)} · Free</span></div>
          <p class="ho-text"></p>
          <div class="ho-foot">
            <button class="act primary ho-copy" data-i="0" type="button">📋 Copy Hook</button>
          </div>
        </div>`
      const textEl = freeListEl!.querySelector<HTMLElement>('.ho-text')
      if (textEl) textEl.textContent = freeHook.text
    } else {
      freeListEl!.innerHTML = ''
    }

    const proHooks = hooks.slice(1)
    if (proHooks.length > 0) {
      proListEl!.innerHTML = proHooks
        .map(
          (hook, idx) => `
          <div class="hook-opt">
            <div class="ho-head"><b>Option ${escapeHtml(hook.label)}</b><span>${escapeHtml(hook.style)}</span></div>
            <p class="ho-text"></p>
            <div class="ho-foot">
              <button class="act primary ho-copy" data-i="${idx + 1}" type="button">📋 Copy Hook</button>
            </div>
          </div>`
        )
        .join('')
      proHooks.forEach((hook, idx) => {
        const textEl = proListEl!.querySelector<HTMLElement>(
          `.hook-opt:nth-of-type(${idx + 1}) .ho-text`
        )
        if (textEl) textEl.textContent = hook.text
      })
    } else {
      proListEl!.innerHTML = ''
    }

    bindCopyButtons()
  }

  function bindCopyButtons(): void {
    scope.querySelectorAll<HTMLButtonElement>('.ho-copy').forEach((button) => {
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
      const result = await polishHook(hook.text, {
        title: data.meta.title,
        description: data.meta.descriptionSnippet,
        clientName: data.nameGuess?.name ?? null,
        techStack: data.dossier?.techStack ?? [],
        budget: data.budget ? (data.budget.type === 'hourly' ? `$${data.budget.minUsd}-$${data.budget.maxUsd}/hr` : `$${data.budget.maxUsd} fixed`) : null,
        trueRate: data.trueRate?.medianHourlyUsd ?? null
      })
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

export function detectGuestMode(): boolean {
  const markers = [
    'a[href*="/account/security/login"]',
    'a[href*="/account/login"]',
    'a[href*="/users/login"]',
    'a[href*="/users/signup"]',
    'a[data-qa="nav-login"]',
    '[data-qa*="login" i]',
    '[data-qa*="sign-up" i]',
    '[data-qa*="signup" i]',
    '[data-test*="login" i]'
  ].join(', ')
  try {
    if (document.querySelector(markers) != null) return true

    // Upwork reshuffles guest-nav markup regularly — fall back to scanning
    // header/nav controls for the login/signup labels themselves.
    const controls = document.querySelectorAll<HTMLElement>(
      'header a, header button, nav a, nav button, [role="banner"] a, [role="banner"] button'
    )
    for (const el of Array.from(controls)) {
      const label = (el.textContent ?? '').trim().toLowerCase()
      if (label === 'log in' || label === 'sign in' || label === 'sign up') {
        return true
      }
    }
  } catch {
    return false
  }
  return false
}

function wireTeamCollision(
  scope: HTMLElement,
  data: EnrichmentData,
  locale: SupportedLocale
): void {
  const container = scope.querySelector<HTMLElement>('#gr-team-collision-container')
  if (!container || !data.meta.jobId) return

  const renderBanner = async () => {
    const tier = await getAccountTier()
    const collision = await checkTeamCollision(data.meta.jobId)

    // Show if on agency tier OR if another teammate has claimed this job
    if (tier !== 'agency' && !collision.isClaimed) {
      container.innerHTML = ''
      container.style.display = 'none'
      return
    }

    container.style.display = 'block'

    if (collision.isClaimed && !collision.isCurrentMember) {
      const act = collision.activity!
      const timeAgo = formatTimeAgo(act.updatedAt)
      const statusKey =
        act.status === 'applied'
          ? 'team_member_applied'
          : act.status === 'drafting'
            ? 'team_member_drafting'
            : 'team_member_viewing'
      const statusText = t(statusKey, locale)

      container.innerHTML = `
        <div class="team-banner collision">
          <div class="team-banner-head">
            <span>🚨 ${t('team_collision_warning', locale)}</span>
            <span class="team-status-chip">${act.status.toUpperCase()}</span>
          </div>
          <div class="team-banner-desc">
            Teammate <b>${escapeHtml(act.memberName)}</b> ${escapeHtml(statusText)} (${escapeHtml(timeAgo)}).
            Submitting another proposal will double-spend Connects.
          </div>
          <div class="team-actions-row">
            <button type="button" id="gr-team-claim-btn" class="team-btn team-btn-claim">
              ${t('claim_job_btn', locale)}
            </button>
            <button type="button" id="gr-team-applied-btn" class="team-btn team-btn-applied">
              ${t('mark_applied_btn', locale)}
            </button>
            <button type="button" id="gr-team-pass-btn" class="team-btn team-btn-pass">
              ${t('pass_job_btn', locale)}
            </button>
          </div>
        </div>`
    } else if (collision.isClaimed && collision.isCurrentMember) {
      const act = collision.activity!
      const timeAgo = formatTimeAgo(act.updatedAt)
      container.innerHTML = `
        <div class="team-banner">
          <div class="team-banner-head">
            <span>👥 Team Lead Tracker: Claimed by You</span>
            <span class="team-status-chip">${act.status.toUpperCase()}</span>
          </div>
          <div class="team-banner-desc">
            You marked this job as <b>${escapeHtml(act.status)}</b> (${escapeHtml(timeAgo)}). Other team members see you are active.
          </div>
          <div class="team-actions-row">
            ${
              act.status !== 'applied'
                ? `<button type="button" id="gr-team-applied-btn" class="team-btn team-btn-applied">
                    ${t('mark_applied_btn', locale)}
                  </button>`
                : ''
            }
            <button type="button" id="gr-team-pass-btn" class="team-btn team-btn-pass">
              ${t('pass_job_btn', locale)}
            </button>
          </div>
        </div>`
    } else {
      // Unclaimed in agency tier
      container.innerHTML = `
        <div class="team-banner">
          <div class="team-banner-head">
            <span>👥 Agency Team Pipeline</span>
            <span style="font-size:10px;color:#94A3B8;font-weight:600;">UNASSIGNED</span>
          </div>
          <div class="team-banner-desc">
            Claim this job to notify teammates and prevent duplicate proposals.
          </div>
          <div class="team-actions-row">
            <button type="button" id="gr-team-claim-btn" class="team-btn team-btn-claim">
              ${t('claim_job_btn', locale)}
            </button>
            <button type="button" id="gr-team-applied-btn" class="team-btn team-btn-applied">
              ${t('mark_applied_btn', locale)}
            </button>
            <button type="button" id="gr-team-webhook-btn" class="team-btn" style="background:#4F46E5;color:#FFFFFF;">
              📡 ${t('sync_webhook_btn', locale)}
            </button>
          </div>
        </div>`
    }

    container.querySelector('#gr-team-claim-btn')?.addEventListener('click', async (e) => {
      e.stopPropagation()
      await claimJobForTeam({
        jobId: data.meta.jobId,
        jobTitle: data.meta.title,
        status: 'drafting',
        jobUrl: data.meta.url,
        clientName: data.nameGuess?.name ?? undefined,
        dealValueUsd: estimateDealValue(data.budget),
        budget: data.budget,
        hireRatePct: data.signals.hireRatePct,
        totalSpendUsd: data.signals.totalSpendUsd,
        paymentVerified: data.signals.paymentVerified
      })
      await renderBanner()
    })

    container.querySelector('#gr-team-applied-btn')?.addEventListener('click', async (e) => {
      e.stopPropagation()
      await claimJobForTeam({
        jobId: data.meta.jobId,
        jobTitle: data.meta.title,
        status: 'applied',
        jobUrl: data.meta.url,
        clientName: data.nameGuess?.name ?? undefined,
        dealValueUsd: estimateDealValue(data.budget),
        budget: data.budget,
        hireRatePct: data.signals.hireRatePct,
        totalSpendUsd: data.signals.totalSpendUsd,
        paymentVerified: data.signals.paymentVerified
      })
      await renderBanner()
    })

    container.querySelector('#gr-team-webhook-btn')?.addEventListener('click', async (e) => {
      e.stopPropagation()
      const btn = e.currentTarget as HTMLButtonElement
      btn.disabled = true
      const origText = btn.textContent
      btn.textContent = '⏳ Syncing...'
      await dispatchWebhooks({
        eventType: estimateDealValue(data.budget) >= 1000 ? 'high_value_lead' : 'job_claimed',
        jobId: data.meta.jobId,
        jobTitle: data.meta.title,
        jobUrl: data.meta.url,
        clientName: data.nameGuess?.name ?? undefined,
        dealValueUsd: estimateDealValue(data.budget),
        budget: data.budget,
        hireRatePct: data.signals.hireRatePct,
        totalSpendUsd: data.signals.totalSpendUsd,
        paymentVerified: Boolean(data.signals.paymentVerified),
        memberName: 'You (Agency BD)',
        status: collision.activity?.status || 'drafting',
        timestamp: Date.now()
      })
      btn.textContent = '✅ Synced!'
      setTimeout(() => {
        btn.textContent = origText
        btn.disabled = false
      }, 1800)
    })

    container.querySelector('#gr-team-pass-btn')?.addEventListener('click', async (e) => {
      e.stopPropagation()
      await releaseJobClaim(data.meta.jobId)
      await renderBanner()
    })
  }

  void renderBanner()
}

function bidIntelligenceSection(data: EnrichmentData, locale: SupportedLocale): string {
  const intel = calculateBidIntelligence({
    budget: data.budget,
    clientHireRatePct: data.signals.hireRatePct,
    clientPaymentVerified: data.signals.paymentVerified,
    clientTotalSpendUsd: data.signals.totalSpendUsd,
    proposalCount: data.meta.proposalCount
  })

  const badgeClass =
    intel.strategy === 'AGGRESSIVE_TOP_SLOT'
      ? 'c-warn'
      : intel.strategy === 'TACTICAL_BOOST'
        ? 'c-brand'
        : intel.strategy === 'ORGANIC_SWEET_SPOT'
          ? 'c-ok'
          : 'c-danger'

  const strategyKey =
    intel.strategy === 'AGGRESSIVE_TOP_SLOT'
      ? 'bid_strategy_aggressive'
      : intel.strategy === 'TACTICAL_BOOST'
        ? 'bid_strategy_tactical'
        : intel.strategy === 'ORGANIC_SWEET_SPOT'
          ? 'bid_strategy_organic'
          : 'bid_strategy_skip'

  return `
    <h3 class="sec">📈 ${t('bid_intel_title', locale)}</h3>
    <div class="bid-intel-card">
      <div class="bi-head">
        <span class="bi-title">🎯 ${t(strategyKey, locale)}</span>
        <span class="bi-badge ${badgeClass}">${intel.roiRatio}x ROI</span>
      </div>
      <div class="bi-stats-grid">
        <div class="bi-stat">
          <small>${t('win_probability_label', locale)}</small>
          <b>${intel.winProbabilityPct}%</b>
        </div>
        <div class="bi-stat">
          <small>${t('expected_value_label', locale)}</small>
          <b style="color:#60A5FA;">+${intel.expectedValueUsd > 0 ? '$' : ''}${intel.expectedValueUsd.toFixed(0)}</b>
        </div>
        <div class="bi-stat">
          <small>${t('optimal_bid_label', locale)}</small>
          <b style="color:#A5B4FC;">${intel.recommendedBid}c</b>
        </div>
      </div>
      <p class="bi-desc">${escapeHtml(intel.verdictSummary)}</p>
    </div>`
}

function autopilotSection(locale: SupportedLocale): string {
  return `
    <div id="gr-autopilot-card" class="autopilot-card">
      <div class="ap-header">
        <span class="ap-title">🚀 ${t('autopilot_title', locale)}</span>
        <span class="ap-badge">AUTOPILOT</span>
      </div>
      <div id="gr-ap-case-chip" class="ap-case-chip">
        <small>${t('matched_case_study_label', locale)}:</small>
        <b id="gr-ap-study-title">Searching portfolio…</b>
        <span id="gr-ap-study-metrics"></span>
      </div>
      <div class="ap-tone-bar">
        <select id="gr-ap-tone-select" class="ap-tone-select">
          <option value="direct_engineer">${t('tone_direct', locale)}</option>
          <option value="consultative_partner">${t('tone_consultative', locale)}</option>
          <option value="velocity_exec">${t('tone_velocity', locale)}</option>
          <option value="custom">${t('tone_custom', locale)}</option>
        </select>
      </div>
      <pre id="gr-ap-preview" class="ap-proposal-preview">Generating 4-part proposal…</pre>
      <div class="ap-actions">
        <button id="gr-ap-copy-btn" class="ap-btn-copy" type="button">📋 ${t('copy_full_proposal_btn', locale)}</button>
        <button id="gr-ap-polish-btn" class="ap-btn-polish" type="button" title="${t('ai_polish_proposal_btn', locale)}">${t('ai_polish_proposal_btn', locale)}</button>
      </div>
    </div>`
}

function wireAutopilotSection(scope: HTMLElement, data: EnrichmentData, locale: SupportedLocale): void {
  const card = scope.querySelector<HTMLElement>('#gr-autopilot-card')
  const studyTitleEl = scope.querySelector<HTMLElement>('#gr-ap-study-title')
  const studyMetricsEl = scope.querySelector<HTMLElement>('#gr-ap-study-metrics')
  const toneSelect = scope.querySelector<HTMLSelectElement>('#gr-ap-tone-select')
  const previewEl = scope.querySelector<HTMLPreElement>('#gr-ap-preview')
  const copyBtn = scope.querySelector<HTMLButtonElement>('#gr-ap-copy-btn')
  const polishBtn = scope.querySelector<HTMLButtonElement>('#gr-ap-polish-btn')
  if (!card || !studyTitleEl || !studyMetricsEl || !toneSelect || !previewEl || !copyBtn || !polishBtn) return

  let currentProposal: AutopilotProposal | null = null
  let activeProfile = { ...DEFAULT_VOICE_PROFILE }

  const renderProposal = async (selectedTone?: VoiceTone): Promise<void> => {
    try {
      activeProfile = await loadVoiceProfile()
      if (selectedTone) {
        activeProfile.tone = selectedTone
      }
      toneSelect.value = activeProfile.tone

      const match = await matchCaseStudiesForJob({
        title: data.meta.title,
        description: data.meta.descriptionSnippet,
        techStack: data.dossier?.techStack ?? []
      })

      if (match.matched) {
        studyTitleEl.textContent = `💼 ${match.matched.title}`
        studyMetricsEl.textContent = match.matched.metricsOutcome
      } else {
        studyTitleEl.textContent = `⚡ ${t('no_case_study_matched', locale)}`
        studyMetricsEl.textContent = 'Injecting proven enterprise delivery benchmarks.'
      }

      currentProposal = await generateAutopilotProposal({
        jobMeta: {
          jobId: data.meta.jobId,
          title: data.meta.title,
          descriptionSnippet: data.meta.descriptionSnippet
        },
        clientName: data.nameGuess?.name ?? null,
        techStack: data.dossier?.techStack ?? [],
        voiceProfile: activeProfile,
        caseStudy: match.matched
      })

      previewEl.textContent = currentProposal.fullText
    } catch {
      previewEl.textContent = 'Ready to generate full proposal.'
    }
  }

  toneSelect.addEventListener('change', () => {
    void renderProposal(toneSelect.value as VoiceTone)
  })

  copyBtn.addEventListener('click', async () => {
    if (!currentProposal) return
    try {
      await navigator.clipboard.writeText(currentProposal.fullText)
      copyBtn.textContent = `✓ ${t('proposal_copied', locale)}`
      copyBtn.classList.add('copied')
      setTimeout(() => {
        copyBtn.textContent = `📋 ${t('copy_full_proposal_btn', locale)}`
        copyBtn.classList.remove('copied')
      }, 1500)
    } catch {
      // ignore
    }
  })

  polishBtn.addEventListener('click', async () => {
    if (!currentProposal) return
    polishBtn.disabled = true
    polishBtn.textContent = 'Polishing…'
    try {
      const result = await generateAiAutopilotProposal({
        jobMeta: {
          jobId: data.meta.jobId,
          title: data.meta.title,
          descriptionSnippet: data.meta.descriptionSnippet
        },
        clientName: data.nameGuess?.name ?? null,
        techStack: data.dossier?.techStack ?? [],
        voiceProfile: activeProfile,
        caseStudy: currentProposal.matchedCaseStudyId ? {
          id: currentProposal.matchedCaseStudyId,
          title: currentProposal.matchedCaseStudyTitle ?? '',
          tags: [],
          problemSolved: '',
          metricsOutcome: currentProposal.caseStudyInjection,
          updatedAt: 0
        } : null
      })
      if (result.ok && result.proposal) {
        currentProposal = result.proposal
        previewEl.textContent = result.proposal.fullText
        polishBtn.textContent = '✓ Polished'
      } else {
        polishBtn.textContent = 'AI Key Needed'
      }
    } catch {
      polishBtn.textContent = 'AI Key Needed'
    } finally {
      setTimeout(() => {
        polishBtn.disabled = false
        polishBtn.textContent = '✨ Polish'
      }, 1800)
    }
  })

  void renderProposal()
}

export function openDetailModal(
  data: EnrichmentData,
  options: PanelOptions = {}
): void {
  const locale = options.locale || activeModalLocale
  if (data.meta.feedbacks.length > 0 && !data.nameGuess) {
    data.nameGuess = extractClientName(data.meta.feedbacks)
  }
  if (!data.dossier) {
    data.dossier = buildClientDossier({
      feedbacks: data.meta.feedbacks,
      description: `${data.meta.title}\n${data.meta.descriptionSnippet}`,
      contractTitles: [data.meta.title]
    })
  }

  const docked = options.docked === true
  const collapsed =
    docked && (options.collapsed === true || (window.innerWidth < 1024 && options.expanded !== true))
  ensurePanel(docked, collapsed)
  if (!contentEl || !panelEl || !shadow) return

  // Re-renders happen when lazy drawer merges land — keep the user's
  // scroll position stable across them instead of jumping back to the top.
  const prevScrollTop = contentEl.scrollTop

  panelEl.querySelector('.gr-head')?.remove()
  contentEl.innerHTML = ''

  const scored = data.score.scored
  const scanning = options.scanning === true
  const decision = makeBidDecision({
    signals: data.signals,
    score: data.score,
    flags: data.flags,
    proposalCount: data.meta.proposalCount
  })
  const pending = !scored && !options.settled
  const ringClass = !scanning && scored
    ? `tier-${data.score.tier.toLowerCase()}`
    : 'tier-nodata'
  const ringValue = !scanning && scored ? `${data.score.score}` : '--'
  const ringLabel = scanning ? 'SCANNING' : scored ? 'SCORE' : pending ? 'SCANNING' : 'NO DATA'

  const head = document.createElement('div')
  head.className = 'gr-head head'
  head.innerHTML = `
    <div class="score-ring ${ringClass}">
      ${ringValue}<small>${ringLabel}</small>
    </div>
    <div style="min-width:0;flex:1;">
      <p class="job-title"></p>
      <p class="job-sub">${escapeHtml(metaSubline(data))}</p>
      ${renderCompanyPills(data)}
    </div>
    <div class="head-actions">
      <button class="settings-btn" title="Open Extension Settings" aria-label="Open Extension Settings">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      </button>
      <button class="close-btn" title="Close" aria-label="Close">✕</button>
    </div>`
  head.querySelector('.job-title')!.textContent = data.meta.title
  head.querySelector('.close-btn')!.addEventListener('click', () => closePanel())
  head.querySelector('.settings-btn')!.addEventListener('click', () => {
    void chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' })
  })
  panelEl.insertBefore(head, contentEl)

  const guestNote =
    !data.score.scored && detectGuestMode()
      ? `<div class="guest-note"><span><b>Guest mode detected</b> — log in to Upwork so client history becomes visible.</span><button id="gr-guest-login" class="guest-link" type="button">Log in</button></div>`
      : ''

  const pendingScanNote = pending
    ? `<div class="scan-note"><i></i>Reading the client sidebar — live numbers land here in a moment…</div>`
    : ''

  contentEl.innerHTML = `
    ${guestNote}
    ${pendingScanNote}
    <div id="gr-team-collision-container"></div>
    ${scanning ? '' : `<div class="decision decision-${decision.action.toLowerCase()}" aria-live="polite">
      <div class="decision-top"><strong>${decision.action}</strong><span>${escapeHtml(decision.summary)}</span></div>
      <div class="decision-reasons">${decision.reasons.map((reason) => `<span>${escapeHtml(reason)}</span>`).join('')}</div>
      <p>${escapeHtml(decision.recommendation)}</p>
    </div>`}

    <div id="gr-roi-card" class="roi-card">
      <div class="roi-header">
        <span class="roi-title">🛡️ ${t('connects_saved_roi_title', locale)}</span>
        <span id="gr-roi-badge" class="roi-badge"></span>
      </div>
      <p id="gr-roi-stat" class="roi-stat"></p>
    </div>

    ${watchoutSection(data)}

    <h3 class="sec">${t('drawer_signals', locale)}</h3>
    <table class="signals"><tbody>${signalRows(data)}</tbody></table>

    ${activitySection(data)}
    ${trueRateSection(data)}

    <h3 class="sec">${t('red_flags_title', locale)}</h3>
    <ul class="flags">${flagItems(data)}</ul>

    <h3 class="sec">${t('drawer_client_name', locale)}</h3>
    <div id="gr-name" class="gate">${renderNameSection(data)}</div>

    ${techAndPraiseSection(data)}

    <h3 class="sec">⚡ ${t('drawer_proposal_hooks', locale)}</h3>
    <div class="row ho-toolbar">
      <span class="hint">${t('hooks_subtitle', locale)}</span>
      <button id="gr-ai" class="act" hidden>✨ AI Polish</button>
    </div>
    <div id="gr-hooks-free"></div>
    <div id="gr-hooks-pro" class="gate" style="margin-top: 10px;">
      <div class="pro-hook-header">
        <span>${t('pro_variants_title', locale)}</span>
        <span class="pro-hook-tag">PRO</span>
      </div>
      <div id="gr-hooks-pro-list"></div>
    </div>
    <div id="gr-hook-err" class="err"></div>

    ${autopilotSection(locale)}

    ${bidIntelligenceSection(data, locale)}

    ${aiDossierSection()}`

  const currentContentEl = contentEl
  void getConnectsSaved().then((saved) => {
    if (!currentContentEl) return
    const roiBadge = currentContentEl.querySelector<HTMLElement>('#gr-roi-badge')
    const roiStat = currentContentEl.querySelector<HTMLElement>('#gr-roi-stat')
    if (!roiBadge || !roiStat) return

    const dollarsSaved = saved * DOLLARS_PER_CONNECT
    const isSkipJob = decision.action === 'SKIP'

    if (saved > 0) {
      if (dollarsSaved >= 9.99) {
        const mult = (dollarsSaved / 9.99).toFixed(1)
        roiBadge.textContent = `⚡ ${mult}x ROI`
        roiStat.innerHTML = `Protected <b>${saved} Connects</b> (<span class="roi-highlight">~$${dollarsSaved.toFixed(2)}</span> saved). Paid for Pro <b>${mult}x over</b>.`
      } else {
        const pct = Math.round((dollarsSaved / 9.99) * 100)
        roiBadge.textContent = `⚡ ${pct}% of Pro`
        roiStat.innerHTML = `Protected <b>${saved} Connects</b> (<span class="roi-highlight">~$${dollarsSaved.toFixed(2)}</span> saved) — <b>${pct}%</b> of the $9.99 Pro license recovered.`
      }
    } else {
      roiBadge.textContent = isSkipJob ? '+$1.20 Value' : '$0.15/Connect'
      if (isSkipJob) {
        roiStat.innerHTML = `Skipping this low-intent job protects <b>~8 Connects</b> (<span class="roi-highlight">~$1.20</span>) from being wasted.`
      } else {
        roiStat.innerHTML = `Skipping flagged ghost jobs protects <b>~8 Connects ($1.20)</b> each. ROI updates as you browse.`
      }
    }
  })

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
  wireAutopilotSection(contentEl, data, locale)
  wireDossierActions(contentEl, data)
  wireTeamCollision(contentEl, data, locale)

  contentEl.scrollTop = prevScrollTop

  const proSections = [contentEl.querySelector('#gr-name'), contentEl.querySelector('#gr-hooks-pro')]
  getCachedLicense()
    .then((paid) => {
      for (const section of proSections) {
        if (!section) continue
        if (paid) continue
        section.classList.add('locked')
        const overlay = document.createElement('div')
        overlay.className = 'lock-overlay'
        const btn = document.createElement('button')
        btn.className = 'pro-btn'
        btn.textContent = `${t('drawer_pro_required', locale)} — ${PRO_PRICE} ${t('early_bird', locale)}`
        btn.addEventListener('click', (event) => {
          event.stopPropagation()
          if (extensionContextValid()) {
            void chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' }).catch(() => undefined)
          }
          closePanel()
        })
        const note = document.createElement('span')
        note.className = 'paywall-note'
        note.textContent = t('pro_price_note', locale)
        overlay.appendChild(btn)
        overlay.appendChild(note)
        section.appendChild(overlay)
      }
    })
    .catch(() => undefined)
}

function cleanSublinePosted(raw: string | null): string {
  if (!raw) return ''
  return raw
    .replace(/\s*[-–—]?\s*proposals?:?.*$/i, '')
    .replace(/\s*[-–—]\s*$/, '')
    .trim()
}

function metaSubline(data: EnrichmentData): string {
  const parts: string[] = []
  if (data.rating) {
    parts.push(`★ ${data.rating.avg.toFixed(2)} (${data.rating.count} reviews)`)
  }
  const cleanPosted = cleanSublinePosted(data.meta.postedText)
  if (cleanPosted) {
    parts.push(cleanPosted)
  }

  const rawProp = /[^\n]*\bproposals?:?\s*([0-9]+(?:\s*(?:to|-|–)\s*[0-9]+|\+)?)/i.exec(
    data.meta.postedText ?? ''
  )
  if (rawProp?.[1]) {
    parts.push(`Proposals: ${rawProp[1].trim()}`)
  } else if (data.meta.proposalCount != null) {
    parts.push(`${data.meta.proposalCount}+ proposals`)
  }
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
  if (!data.dossier) {
    data.dossier = buildClientDossier({
      feedbacks: data.meta.feedbacks,
      description: `${data.meta.title}\n${data.meta.descriptionSnippet}`,
      contractTitles: [data.meta.title]
    })
  }

  const existing = container.querySelector('[data-gigradar-inline]')
  const inlineHost = document.createElement('div')
  inlineHost.dataset.gigradarInline = ''
  inlineHost.dataset.gigradarJobId = data.meta.jobId
  inlineHost.style.cssText = 'display:block;width:100%'

  const shadow = inlineHost.attachShadow({ mode: 'closed' })
  const style = document.createElement('style')
  style.textContent = INLINE_STYLES

  const card = document.createElement('div')
  card.className = 'card'

  const reviewFlagChip =
    data.dossier?.reviewRedFlags && data.dossier.reviewRedFlags.length > 0
      ? `<span class="chip c-danger" title="Disputes or issues flagged in reviews">⚠ ${data.dossier.reviewRedFlags.length} Review Flag${data.dossier.reviewRedFlags.length === 1 ? '' : 's'}</span>`
      : ''

  const flagsHtml =
    data.flags.length > 0 || reviewFlagChip
      ? `<div class="flags">${reviewFlagChip}${data.flags
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
  const decision = makeBidDecision({
    signals: data.signals,
    score: data.score,
    flags: data.flags,
    proposalCount: data.meta.proposalCount
  })
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
        <span>${escapeHtml(data.score.tier)} intent${
          data.rating ? ` · ★ ${data.rating.avg.toFixed(2)} (${data.rating.count})` : ''
        }${data.meta.proposalCount != null ? ` · ${data.meta.proposalCount}+ proposals` : ''}</span>
        ${data.dossier?.company?.name || data.dossier?.company?.domain ? `
          <div style="font-size:10px;font-weight:700;color:#34D399;margin-top:2px;">
            🏢 ${escapeHtml(data.dossier.company.name || data.dossier.company.domain!)}
          </div>` : ''}
      </div>
      <button class="expand" type="button">Full Intel ▸</button>
    </div>
    <div class="decision decision-${decision.action.toLowerCase()}">
      <strong>${decision.action}</strong><span>${escapeHtml(decision.summary)}</span>
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
