import type { NameGuess } from '../types'

const STOPWORDS = new Set([
  'Great',
  'Good',
  'Best',
  'Fast',
  'Quick',
  'Easy',
  'Sir',
  'Madam',
  'Highly',
  'Really',
  'Very',
  'Truly',
  'Definitely',
  'Excellent',
  'Amazing',
  'Awesome',
  'Fantastic',
  'Wonderful',
  'Brilliant',
  'Perfect',
  'Professional',
  'Super',
  'Thanks',
  'Thank',
  'Hello',
  'Hi',
  'Hey',
  'Working',
  'Would',
  'Will',
  'Such',
  'This',
  'That',
  'Job',
  'Project',
  'Client',
  'Freelancer',
  'Communication',
  'Quality',
  'Skills',
  'Deadlines',
  'Work',
  'Time',
  'Day',
  'Week',
  'Month',
  'Recommendations',
  'Recommend',
  'Hiring',
  'Again',
  'Him',
  'Her',
  'He',
  'She',
  'They',
  'Them',
  'You',
  'We',
  'My',
  'Our',
  'His',
  'Their',
  'These',
  'Those',
  'There',
  'Here',
  'What',
  'When',
  'Where',
  'How',
  'Why',
  'All',
  'Any',
  'One',
  'Two',
  'New',
  'Old',
  'However',
  'Overall',
  'Also',
  'India',
  'USA',
  'Ukraine',
  'Pakistan',
  'Bangladesh',
  'Indonesia',
  'Philippines',
  'Nigeria',
  'Kenya',
  'Russia',
  'Brazil',
  'Mexico',
  'Canada',
  'Germany',
  'France',
  'Spain',
  'Italy',
  'Poland',
  'Turkey',
  'Egypt',
  'China',
  'Japan',
  'Vietnam',
  'Australia',
  'America',
  'Britain',
  'England',
  'Europe',
  'Inc',
  'LLC',
  'Ltd',
  'Company',
  'Studio',
  'Agency',
  'Solutions',
  'Technologies',
  'Technology',
  'Labs',
  'Group',
  'Media',
  'Digital',
  'Team',
  'Developer',
  'Designer',
  'Manager',
  'Owner',
  'Founder',
  'Customer',
  'Support',
  'Service',
  'Services',
  'Budget',
  'Payment',
  'Feedback',
  'Review',
  'Experience',
  'Opportunity',
  'Position',
  'Role',
  'Task',
  'Contract',
  'Interview',
  'Meeting',
  'Deadline',
  'Requirement',
  'Feature',
  'Design',
  'Website',
  'Application',
  'Software',
  'System',
  'Platform',
  'Business'
])

const NAME_CAPTURE = '([A-Z][a-z]{2,15})'

const PATTERNS: RegExp[] = [
  new RegExp(`\\b(?:thanks|thank you)[:,\\s]+${NAME_CAPTURE}\\b`),
  new RegExp(`\\b${NAME_CAPTURE}\\s+(?:was|is|has been)\\s+(?:a|an|such a|really|so|very)?\\s*(?:great|excellent|amazing|awesome|fantastic|wonderful|brilliant|super|professional|pleasure)`),
  new RegExp(`\\bworking\\s+with\\s+${NAME_CAPTURE}\\b`),
  new RegExp(`\\bworked\\s+with\\s+${NAME_CAPTURE}\\b`),
  new RegExp(`\\b(?:with|for)\\s+${NAME_CAPTURE}\\s+(?:i|we)\\s+(?:had|felt|always)`),
  new RegExp(`\\bhighly\\s+recommend\\s+${NAME_CAPTURE}\\b`),
  new RegExp(`\\b${NAME_CAPTURE}\\s+(?:provided|gave|delivered|communicated|understood)`),
  new RegExp(`\\b${NAME_CAPTURE}\\s+(?:was|is)\\s+(?:very|so|really|super)?\\s*(?:helpful|responsive|friendly|patient|supportive)`),
  new RegExp(`\\b${NAME_CAPTURE}\\s+(?:is|was)\\s+(?:a|an|such a)\\s+(?:great|wonderful|excellent|amazing|awesome|fantastic|super)\\s+client`),
  new RegExp(`\\bgreat\\s+communication\\s+(?:with|from)\\s+${NAME_CAPTURE}\\b`),
  new RegExp(`\\bthanks[,:]?(?:\\s+go(?:es)?)?\\s+to\\s+${NAME_CAPTURE}\\b`),
  new RegExp(`\\bkudos\\s+to\\s+${NAME_CAPTURE}\\b`)
]

interface Candidate {
  display: string
  votes: number
}

function collectCandidates(feedbacks: string[]): Map<string, Candidate> {
  const counts = new Map<string, Candidate>()
  for (const text of feedbacks) {
    if (!text) continue
    for (const pattern of PATTERNS) {
      const match = pattern.exec(text)
      if (!match) continue
      const name = match[1]
      if (STOPWORDS.has(name)) continue
      const key = name.toLowerCase()
      const existing = counts.get(key)
      if (existing) {
        existing.votes += 1
      } else {
        counts.set(key, { display: name, votes: 1 })
      }
    }
  }
  return counts
}

export function extractNameCandidates(feedbacks: string[]): Candidate[] {
  return [...collectCandidates(feedbacks).values()].sort(
    (a, b) => b.votes - a.votes
  )
}

export function extractClientName(feedbacks: string[]): NameGuess | null {
  const ranked = extractNameCandidates(feedbacks)
  if (ranked.length === 0) return null

  const top = ranked[0]
  let confidence =
    top.votes >= 3 ? 0.9 : top.votes === 2 ? 0.72 : 0.45

  if (ranked.length > 1 && top.votes > ranked[1].votes) {
    confidence = Math.min(0.95, confidence + 0.05)
  }

  if (confidence < 0.6) return null

  return {
    name: top.display,
    confidence,
    votes: top.votes,
    alternates: ranked.slice(1, 4).map((c) => c.display)
  }
}
