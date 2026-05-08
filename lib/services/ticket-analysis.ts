import { prisma } from '@/lib/prisma'
import { Ticket, TicketStatus, KnowledgeBaseSuggestion, TargetAudience, SuggestionStatus } from '@/lib/generated/prisma/client' // enums are re-exported
import { generateWithDefaultLLM, isLlmConfigured, LlmResponse } from './llm-service'

interface TicketWithText extends Ticket {
  text: string // title + description
}

interface TicketCluster {
  id: string
  tickets: TicketWithText[]
  commonKeywords: string[]
  category?: string
  complexityScore: number
  targetAudience: TargetAudience
}

interface SuggestionDraft {
  title: string
  targetAudience: TargetAudience
  problemSummary: string
  draftResolution: string
  ticketIds: string[]
  clusterMetadata: any
}

/**
 * Fetch closed tickets (RESOLVED or CLOSED) with a limit
 */
export async function fetchClosedTickets(limit: number = 100): Promise<TicketWithText[]> {
  const tickets = await prisma.ticket.findMany({
    where: {
      status: {
        in: [TicketStatus.RESOLVED, TicketStatus.CLOSED]
      }
    },
    take: limit,
    orderBy: { createdAt: 'desc' }
  })

  return tickets.map(ticket => ({
    ...ticket,
    text: `${ticket.title} ${ticket.description}`.toLowerCase()
  }))
}

/**
 * Simple tokenization and stopword removal
 */
function tokenize(text: string): string[] {
  // Remove punctuation, split by spaces, filter out stopwords and short words
  const words = text.replace(/[^\w\s]/g, ' ').split(/\s+/)
  return words.filter(word => word.length > 2 && !STOPWORDS.has(word))
}

// Basic English stopwords
const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
  'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were', 'will', 'with'
])

/**
 * Cluster tickets by common keywords
 */
export function clusterTickets(tickets: TicketWithText[], minClusterSize: number = 3): TicketCluster[] {
  const ticketKeywords = tickets.map(ticket => ({
    ticket,
    keywords: tokenize(ticket.text)
  }))

  // Build word frequency across all tickets
  const wordFrequency = new Map<string, number>()
  ticketKeywords.forEach(({ keywords }) => {
    keywords.forEach(word => {
      wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1)
    })
  })

  // Filter out words that appear in too many tickets (common words) or too few
  const significantWords = Array.from(wordFrequency.entries())
    .filter(([word, count]) => count >= 2 && count <= tickets.length / 2)
    .map(([word]) => word)

  // Group tickets by shared significant words
  const clusters: TicketCluster[] = []
  const assignedTicketIds = new Set<string>()

  // For each ticket not yet assigned, create a cluster with tickets sharing at least 2 significant keywords
  for (const { ticket, keywords } of ticketKeywords) {
    if (assignedTicketIds.has(ticket.id)) continue

    const sharedKeywords = keywords.filter(k => significantWords.includes(k))
    if (sharedKeywords.length === 0) continue

    // Find other tickets with overlapping keywords
    const similarTickets = ticketKeywords.filter(({ ticket: other, keywords: otherKeywords }) => {
      if (assignedTicketIds.has(other.id)) return false
      const overlap = sharedKeywords.filter(k => otherKeywords.includes(k))
      return overlap.length >= 2
    })

    if (similarTickets.length >= minClusterSize - 1) { // plus current ticket
      const clusterTickets = [ticket, ...similarTickets.map(t => t.ticket)]
      clusterTickets.forEach(t => assignedTicketIds.add(t.id))

      // Determine common keywords across cluster
      const allKeywords = clusterTickets.flatMap(t => tokenize(t.text))
      const commonKeywordCount = new Map<string, number>()
      allKeywords.forEach(word => commonKeywordCount.set(word, (commonKeywordCount.get(word) || 0) + 1))
      const commonKeywords = Array.from(commonKeywordCount.entries())
        .filter(([word, count]) => count >= clusterTickets.length * 0.7) // appear in at least 70% of tickets
        .map(([word]) => word)

      clusters.push({
        id: `cluster_${clusters.length}`,
        tickets: clusterTickets,
        commonKeywords,
        category: ticket.category || undefined,
        complexityScore: 0, // to be computed later
        targetAudience: TargetAudience.END_USER // default
      })
    }
  }

  return clusters
}

/**
 * Classify complexity and determine target audience
 */
export function classifyComplexity(cluster: TicketCluster): TargetAudience {
  const itKeywords = [
    'cli', 'registry', 'admin', 'command', 'server', 'network', 'firewall', 'database',
    'script', 'shell', 'terminal', 'root', 'permission', 'access', 'security', 'encryption',
    'api', 'endpoint', 'log', 'debug', 'error', 'exception', 'stack', 'trace', 'deploy',
    'migrate', 'schema', 'query', 'sql', 'backend', 'frontend', 'docker', 'kubernetes'
  ]
  const endUserKeywords = [
    'password', 'printer', 'setup', 'install', 'how', 'to', 'reset', 'configure', 'connect',
    'email', 'outlook', 'teams', 'vpn', 'wifi', 'internet', 'browser', 'chrome', 'edge',
    'mouse', 'keyboard', 'screen', 'display', 'sound', 'audio', 'microphone', 'camera',
    'update', 'upgrade', 'license', 'account', 'login', 'logout', 'signin', 'signout'
  ]

  const allText = cluster.tickets.map(t => t.text).join(' ').toLowerCase()
  let itScore = 0
  let endUserScore = 0

  itKeywords.forEach(word => {
    if (allText.includes(word)) itScore++
  })
  endUserKeywords.forEach(word => {
    if (allText.includes(word)) endUserScore++
  })

  // Weighted scoring
  const totalScore = itScore + endUserScore
  if (totalScore === 0) return TargetAudience.END_USER // default

  const itRatio = itScore / totalScore
  cluster.complexityScore = itRatio // store complexity score (0 = low complexity, 1 = high complexity)

  return itRatio > 0.5 ? TargetAudience.IT_SUPPORT : TargetAudience.END_USER
}

/**
 * Generate a suggestion draft from a cluster
 */
export function generateSuggestionDraft(cluster: TicketCluster): SuggestionDraft {
  const targetAudience = classifyComplexity(cluster)
  const firstTicket = cluster.tickets[0]
  const keywordStr = cluster.commonKeywords.slice(0, 5).join(', ')

  // Generate a title based on common keywords and category
  const categoryPart = cluster.category ? ` (${cluster.category})` : ''
  const title = `How to resolve ${keywordStr} issues${categoryPart}`

  // Problem summary
  const problemSummary = `Multiple users have reported issues related to ${keywordStr}. This problem occurs when ${cluster.tickets.length} tickets have been created with similar descriptions.`

  // Draft resolution template based on target audience
  let draftResolution: string
  if (targetAudience === TargetAudience.END_USER) {
    draftResolution = `To resolve this issue, follow these steps:\n\n1. Identify the specific symptom described in the ticket.\n2. Check the common solutions listed below:\n   - Restart the application\n   - Clear cache and cookies\n   - Verify network connectivity\n3. If the problem persists, contact IT support for further assistance.`
  } else {
    draftResolution = `IT Support resolution steps:\n\n1. Investigate the underlying cause by checking logs and system metrics.\n2. Apply appropriate fixes such as configuration changes or patches.\n3. Test the resolution in a staging environment before deploying to production.\n4. Document the resolution for future reference.`
  }

  return {
    title,
    targetAudience,
    problemSummary,
    draftResolution,
    ticketIds: cluster.tickets.map(t => t.id),
    clusterMetadata: {
      commonKeywords: cluster.commonKeywords,
      complexityScore: cluster.complexityScore,
      category: cluster.category
    }
  }
}

/**
 * Generate a suggestion draft from a cluster using LLM
 */
export async function generateSuggestionDraftWithLLM(cluster: TicketCluster): Promise<SuggestionDraft | null> {
  try {
    // Prepare the ticket data for the LLM
    const ticketData = cluster.tickets.map(t => ({
      title: t.title,
      description: t.description,
      category: t.category,
      status: t.status
    }));

    const systemPrompt = `You are an IT support knowledge base expert. Your task is to analyze support tickets and create a comprehensive knowledge base article suggestion.

Analyze the provided tickets and generate a JSON response with the following structure:
{
  "title": "A clear, concise title for the knowledge base article (max 100 chars)",
  "targetAudience": "Either 'END_USER' or 'IT_SUPPORT'",
  "problemSummary": "A brief description of the common problem (2-3 sentences)",
  "draftResolution": "Detailed step-by-step resolution instructions appropriate for the target audience"
}

Guidelines:
- For END_USER: Use simple language, avoid technical jargon, provide clear step-by-step instructions
- For IT_SUPPORT: Include technical details, commands, configuration steps, troubleshooting tips
- The title should be actionable (e.g., "How to...", "Resolving...", "Fixing...")
- The draft resolution should be comprehensive and practical`;

    const userPrompt = `Please analyze the following ${cluster.tickets.length} related support tickets and generate a knowledge base article suggestion:

Tickets:
${JSON.stringify(ticketData, null, 2)}

Common keywords found: ${cluster.commonKeywords.join(', ')}

Generate a JSON response with the knowledge base article suggestion.`;

    const llmResponse = await generateWithDefaultLLM(userPrompt, systemPrompt, {
      temperature: 0.7,
      maxTokens: 2000
    });

    // Parse the LLM response
    const content = llmResponse.content.trim();
    
    // Try to extract JSON from the response (it might be wrapped in markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsedResponse = JSON.parse(jsonStr);

    // Validate the response structure
    if (!parsedResponse.title || !parsedResponse.targetAudience || !parsedResponse.problemSummary || !parsedResponse.draftResolution) {
      console.error('LLM response missing required fields:', parsedResponse);
      return null;
    }

    // Validate target audience
    const targetAudience = parsedResponse.targetAudience === 'IT_SUPPORT' 
      ? TargetAudience.IT_SUPPORT 
      : TargetAudience.END_USER;

    return {
      title: parsedResponse.title.substring(0, 200),
      targetAudience,
      problemSummary: parsedResponse.problemSummary,
      draftResolution: parsedResponse.draftResolution,
      ticketIds: cluster.tickets.map(t => t.id),
      clusterMetadata: {
        commonKeywords: cluster.commonKeywords,
        complexityScore: targetAudience === TargetAudience.IT_SUPPORT ? 0.7 : 0.3,
        category: cluster.category,
        generatedBy: 'LLM'
      }
    };
  } catch (error) {
    console.error('Error generating suggestion with LLM:', error);
    return null;
  }
}

/**
 * Main function to analyze tickets and generate suggestions in database
 * @param userId The ID of the user triggering the generation (author)
 */
export async function analyzeTicketsAndGenerateSuggestions(userId: string): Promise<KnowledgeBaseSuggestion[]> {
  try {
    // Check if LLM is configured
    const llmAvailable = await isLlmConfigured();
    if (llmAvailable) {
      console.log('Using LLM for suggestion generation');
    } else {
      console.log('LLM not configured, using fallback method for suggestion generation');
    }

    const tickets = await fetchClosedTickets(200)
    if (tickets.length === 0) {
      console.log('No closed tickets found for analysis')
      return []
    }

    const clusters = clusterTickets(tickets, 3)
    if (clusters.length === 0) {
      console.log('No significant clusters found')
      return []
    }

    const suggestions: KnowledgeBaseSuggestion[] = []
    for (const cluster of clusters) {
      // Try to generate with LLM first if available
      let draft: SuggestionDraft | null = null;
      
      if (llmAvailable) {
        draft = await generateSuggestionDraftWithLLM(cluster);
      }
      
      // Fallback to rule-based generation if LLM fails or is not available
      if (!draft) {
        draft = generateSuggestionDraft(cluster);
      }

      // Check if a similar suggestion already exists (by title similarity)
      const existing = await prisma.knowledgeBaseSuggestion.findFirst({
        where: {
          title: { contains: draft.title.substring(0, 50) }
        }
      })
      if (existing) {
        console.log(`Suggestion with similar title already exists: ${existing.title}`)
        continue
      }

      const suggestion = await prisma.knowledgeBaseSuggestion.create({
        data: {
          title: draft.title,
          targetAudience: draft.targetAudience,
          problemSummary: draft.problemSummary,
          draftResolution: draft.draftResolution,
          status: SuggestionStatus.PENDING_REVIEW,
          ticketCluster: draft.clusterMetadata,
          ticketIds: JSON.stringify(draft.ticketIds),
          complexityScore: draft.clusterMetadata.complexityScore,
          authorId: userId
        }
      })
      suggestions.push(suggestion)
    }

    console.log(`Generated ${suggestions.length} knowledge base suggestions`)
    return suggestions
  } catch (error) {
    console.error('Error analyzing tickets and generating suggestions:', error)
    throw error
  }
}