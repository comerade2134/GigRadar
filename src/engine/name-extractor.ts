import type { NameGuess } from '../types'

const STOPWORDS = new Set([
  'great',
  'good',
  'best',
  'fast',
  'quick',
  'easy',
  'sir',
  'madam',
  'highly',
  'really',
  'very',
  'truly',
  'definitely',
  'excellent',
  'amazing',
  'awesome',
  'fantastic',
  'wonderful',
  'brilliant',
  'perfect',
  'professional',
  'super',
  'thanks',
  'thank',
  'hello',
  'hi',
  'hey',
  'working',
  'worked',
  'would',
  'will',
  'such',
  'this',
  'that',
  'job',
  'project',
  'client',
  'freelancer',
  'contractor',
  'buyer',
  'seller',
  'customer',
  'vendor',
  'employer',
  'employee',
  'founder',
  'owner',
  'manager',
  'upwork',
  'communication',
  'quality',
  'skills',
  'deadlines',
  'work',
  'time',
  'day',
  'week',
  'month',
  'year',
  'recommendations',
  'recommend',
  'hiring',
  'again',
  'him',
  'her',
  'he',
  'she',
  'they',
  'them',
  'you',
  'we',
  'my',
  'our',
  'his',
  'their',
  'these',
  'those',
  'there',
  'here',
  'what',
  'when',
  'where',
  'how',
  'why',
  'all',
  'any',
  'one',
  'two',
  'new',
  'old',
  'however',
  'overall',
  'also',
  'everyone',
  'everybody',
  'anyone',
  'anybody',
  'somebody',
  'someone',
  'guys',
  'folks',
  'mate',
  'bro',
  'dude',
  'friend',
  'friends',
  'team',
  'group',
  'staff',
  'management',
  'people',
  'person',
  'both',
  'either',
  'neither',
  'much',
  'many',
  'lots',
  'plenty',
  'first',
  'second',
  'third',
  'next',
  'last',
  'previous',
  'final',
  'please',
  'kindly',
  'cheers',
  'regards',
  'congrats',
  'congratulations',
  'kudos',
  'india',
  'usa',
  'ukraine',
  'pakistan',
  'bangladesh',
  'indonesia',
  'philippines',
  'nigeria',
  'kenya',
  'russia',
  'brazil',
  'mexico',
  'canada',
  'germany',
  'france',
  'spain',
  'italy',
  'poland',
  'turkey',
  'egypt',
  'china',
  'japan',
  'vietnam',
  'australia',
  'america',
  'britain',
  'england',
  'europe',
  'inc',
  'llc',
  'ltd',
  'company',
  'studio',
  'agency',
  'solutions',
  'technologies',
  'technology',
  'labs',
  'media',
  'digital',
  'developer',
  'designer',
  'support',
  'service',
  'services',
  'budget',
  'payment',
  'feedback',
  'review',
  'rating',
  'experience',
  'opportunity',
  'position',
  'role',
  'task',
  'contract',
  'interview',
  'meeting',
  'deadline',
  'requirement',
  'feature',
  'design',
  'website',
  'application',
  'software',
  'system',
  'platform',
  'business'
])

const NAME_CAPTURE = '([A-Z][a-z]{2,15})'

const PATTERNS: RegExp[] = [
  new RegExp(`\\b(?:[Tt]hanks|[Tt]hank\\s+you)[:,\\s]+${NAME_CAPTURE}\\b`),
  new RegExp(`\\b${NAME_CAPTURE}\\s+(?:was|is|has been)\\s+(?:a|an|such a|really|so|very)?\\s*(?:great|excellent|amazing|awesome|fantastic|wonderful|brilliant|super|professional|pleasure)`),
  new RegExp(`\\b[Ww]orking\\s+with\\s+${NAME_CAPTURE}\\b`),
  new RegExp(`\\b[Ww]orked\\s+with\\s+${NAME_CAPTURE}\\b`),
  new RegExp(`\\b(?:[Ww]ith|[Ff]or)\\s+${NAME_CAPTURE}\\s+(?:i|we)\\s+(?:had|felt|always)`),
  new RegExp(`\\b[Hh]ighly\\s+recommend\\s+${NAME_CAPTURE}\\b`),
  new RegExp(`\\b${NAME_CAPTURE}\\s+(?:provided|gave|delivered|communicated|understood)`),
  new RegExp(`\\b${NAME_CAPTURE}\\s+(?:was|is)\\s+(?:very|so|really|super)?\\s*(?:helpful|responsive|friendly|patient|supportive)`),
  new RegExp(`\\b${NAME_CAPTURE}\\s+(?:is|was)\\s+(?:a|an|such a)\\s+(?:great|wonderful|excellent|amazing|awesome|fantastic|super)\\s+client`),
  new RegExp(`\\b[Gg]reat\\s+communication\\s+(?:with|from)\\s+${NAME_CAPTURE}\\b`),
  new RegExp(`\\b[Tt]hanks[,:]?(?:\\s+go(?:es)?)?\\s+to\\s+${NAME_CAPTURE}\\b`),
  new RegExp(`\\b[Kk]udos\\s+to\\s+${NAME_CAPTURE}\\b`)
]

interface Candidate {
  display: string
  votes: number
}

function collectCandidates(feedbacks: string[]): Map<string, Candidate> {
  const counts = new Map<string, Candidate>()
  for (const text of feedbacks) {
    if (!text) continue
    const seenInThisFeedback = new Map<string, string>()
    for (const pattern of PATTERNS) {
      const match = pattern.exec(text)
      if (!match) continue
      const name = match[1]
      const key = name.toLowerCase()
      if (STOPWORDS.has(key)) continue
      if (!seenInThisFeedback.has(key)) {
        seenInThisFeedback.set(key, name)
      }
    }
    for (const [key, displayName] of seenInThisFeedback.entries()) {
      const existing = counts.get(key)
      if (existing) {
        existing.votes += 1
      } else {
        counts.set(key, { display: displayName, votes: 1 })
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
