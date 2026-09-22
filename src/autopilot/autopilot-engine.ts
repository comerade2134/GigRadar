import { detectTargetDiscipline, cleanProjectRef } from '../engine/templates'
import { matchCaseStudiesForJob } from './case-studies'
import {
  cleanBannedPhrases,
  loadVoiceProfile
} from './voice-profile'
import { loadByok, polishHook } from '../engine/byok'
import type {
  AutopilotProposal,
  PortfolioCaseStudy,
  VoiceProfile
} from '../types'

export interface AutopilotInput {
  jobMeta: {
    jobId: string
    title: string
    descriptionSnippet: string
    url?: string
  }
  clientName?: string | null
  techStack?: string[]
  voiceProfile?: VoiceProfile
  caseStudy?: PortfolioCaseStudy | null
}

export function interpolateTemplate(template: string, vars: Record<string, string>): string {
  let result = template
  for (const [key, val] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi'), val)
  }
  return result
}

export async function generateAutopilotProposal(
  input: AutopilotInput
): Promise<AutopilotProposal> {
  const profile = input.voiceProfile ?? (await loadVoiceProfile())
  const name = input.clientName?.trim() ? input.clientName.trim() : 'there'

  let matchedStudy = input.caseStudy
  if (matchedStudy === undefined) {
    const match = await matchCaseStudiesForJob({
      title: input.jobMeta.title,
      description: input.jobMeta.descriptionSnippet,
      techStack: input.techStack
    })
    matchedStudy = match.matched
  }

  const focus = detectTargetDiscipline(
    input.jobMeta.title,
    input.jobMeta.descriptionSnippet,
    input.techStack
  )
  const projRef = cleanProjectRef(input.jobMeta.title)
  const projClause = projRef ? ` for your ${projRef}` : ''

  // 1. Hook generation based on voice tone or custom template
  let hook = ''
  const templateVars: Record<string, string> = {
    client_name: name,
    subject: focus.subject,
    challenge: focus.challenge,
    solution_type: focus.solutionType,
    project_ref: projRef || focus.subject,
    case_study_title: matchedStudy?.title || 'proven delivery benchmarks',
    case_study_metrics: matchedStudy?.metricsOutcome || '',
    tech_stack: (input.techStack || []).join(', ')
  }

  if (profile.customTemplate?.enabled && profile.customTemplate.hookFormat) {
    hook = interpolateTemplate(profile.customTemplate.hookFormat, templateVars)
  } else {
    switch (profile.tone) {
      case 'consultative_partner':
        hook =
          `Hi ${name}, the biggest challenge with ${focus.subject} projects like this is usually ${focus.challenge}. ` +
          `Here is how we tackle this cleanly without technical debt or unexpected scope creep.`
        break
      case 'velocity_exec':
        hook =
          `Hi ${name}, saw your requirements${projClause}. I specialize in ${focus.subject} ` +
          `and can jump in immediately with fast turnaround and daily production updates.`
        break
      case 'custom':
        if (profile.customInstructions) {
          hook = `Hi ${name}, reviewing your requirements${projClause} — ${profile.customInstructions.slice(0, 140)}`
        } else {
          hook = `Hi ${name}, saw your posting${projClause}. I specialize in ${focus.subject} and have delivered comparable implementations.`
        }
        break
      case 'direct_engineer':
      default:
        hook =
          `Hi ${name}, saw you need help with ${focus.subject}${projClause}. ` +
          `Having delivered similar ${focus.solutionType} recently, I can take ownership of this build from day one.`
        break
    }
  }

  // 2. Case study proof injection
  let caseStudyInjection = ''
  if (matchedStudy) {
    caseStudyInjection =
      `Relevant implementation: I previously delivered "${matchedStudy.title}" ` +
      `(${matchedStudy.problemSolved}). Outcome: ${matchedStudy.metricsOutcome}` +
      (matchedStudy.proofLink ? ` [${matchedStudy.proofLink}]` : '') +
      '.'
  } else {
    caseStudyInjection =
      `I've engineered comparable ${focus.solutionType} with strict attention to performance, automated testing, and reliable architecture.`
  }

  templateVars.case_study = caseStudyInjection

  // 3. 3-Step Execution Plan
  let planStep1 = `Audit existing requirements, technical dependencies, and edge cases.`
  let planStep2 = `Implement ${focus.subject} architecture with milestone demos and automated verification.`
  let planStep3 = `Production deployment, documentation, and zero-downtime handoff.`

  if (profile.customTemplate?.enabled) {
    if (profile.customTemplate.planStep1) {
      planStep1 = interpolateTemplate(profile.customTemplate.planStep1, templateVars)
    }
    if (profile.customTemplate.planStep2) {
      planStep2 = interpolateTemplate(profile.customTemplate.planStep2, templateVars)
    }
    if (profile.customTemplate.planStep3) {
      planStep3 = interpolateTemplate(profile.customTemplate.planStep3, templateVars)
    }
  }
  const executionPlan = [planStep1, planStep2, planStep3]

  // 4. Low-commitment CTA
  let closingCta =
    `What does your target milestone timeline look like? ` +
    `If you'd like, I can walk you through the technical approach or jump on a brief 10-minute scope alignment call tomorrow.`

  if (profile.customTemplate?.enabled && profile.customTemplate.ctaFormat) {
    closingCta = interpolateTemplate(profile.customTemplate.ctaFormat, templateVars)
  }

  // Combine full text
  const fullRaw = [
    hook,
    caseStudyInjection,
    `Proposed roadmap:\n1. ${planStep1}\n2. ${planStep2}\n3. ${planStep3}`,
    closingCta
  ].join('\n\n')

  const sanitizedText = cleanBannedPhrases(fullRaw, profile.bannedPhrases)

  return {
    hook: cleanBannedPhrases(hook, profile.bannedPhrases),
    caseStudyInjection: cleanBannedPhrases(caseStudyInjection, profile.bannedPhrases),
    executionPlan,
    closingCta: cleanBannedPhrases(closingCta, profile.bannedPhrases),
    fullText: sanitizedText,
    matchedCaseStudyId: matchedStudy?.id,
    matchedCaseStudyTitle: matchedStudy?.title
  }
}

export async function generateAiAutopilotProposal(
  input: AutopilotInput
): Promise<{ ok: boolean; proposal: AutopilotProposal; polishedByAi: boolean }> {
  const baseProposal = await generateAutopilotProposal(input)
  const byok = await loadByok()

  if (!byok.enabled || !byok.apiKey) {
    return { ok: true, proposal: baseProposal, polishedByAi: false }
  }

  try {
    const profile = input.voiceProfile ?? (await loadVoiceProfile())
    const extraContext = [
      input.jobMeta.descriptionSnippet.slice(0, 600),
      profile.customInstructions ? `Voice Guidelines: ${profile.customInstructions}` : '',
      `Voice Tone: ${profile.tone}`
    ].filter(Boolean).join('\n')

    const result = await polishHook(baseProposal.hook, {
      title: input.jobMeta.title,
      description: extraContext,
      clientName: input.clientName,
      techStack: input.techStack
    })

    if (result.ok && result.text) {
      const polishedProposal: AutopilotProposal = {
        ...baseProposal,
        hook: result.text,
        fullText: `${result.text}\n\n${baseProposal.caseStudyInjection}\n\nProposed roadmap:\n1. ${baseProposal.executionPlan[0]}\n2. ${baseProposal.executionPlan[1]}\n3. ${baseProposal.executionPlan[2]}\n\n${baseProposal.closingCta}`
      }
      return { ok: true, proposal: polishedProposal, polishedByAi: true }
    }
  } catch {
    // Fallback to deterministic proposal
  }

  return { ok: true, proposal: baseProposal, polishedByAi: false }
}
