import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

const HEALTH_RESPONSES: Record<string, string[]> = {
  'hello|hi|hey|greetings': [
    "Hello! I'm **Aarogya**, your personal health assistant at Aarogya Darpan. How can I assist you with your health today? You can ask me about symptoms, medications, appointments, reports, or general wellness advice.",
  ],
  'appointment|book|schedule': [
    "To book an appointment, head over to the **[Appointments](/dashboard/appointments)** section in your dashboard. You can pick your hospital, select an available doctor, choose your preferred slot, and submit your request in seconds.",
  ],
  'report|lab|test|investigation': [
    "Your laboratory investigation reports are securely organized in the **[Lab Reports](/dashboard/labs)** section. Abnormal values are flagged for prompt clinical review. Always share new reports with your consulting physician.",
  ],
  'prescription|medicine|medication|dose': [
    "You can view your active prescriptions and drug regimens under **[Prescriptions](/dashboard/prescriptions)**. Always take medicines precisely as directed by your physician and never discontinue antibiotics early.",
  ],
  'blood pressure|bp|hypertension': [
    "Normal resting blood pressure is generally under 120/80 mmHg. For readings consistently above 130/80, reduce dietary sodium, exercise for 30 minutes daily, minimize stress, and consult your doctor for personalized management.",
  ],
  'diabetes|sugar|glucose|hba1c': [
    "Managing blood glucose involves a balanced low-glycemic diet, regular physical exercise, taking prescribed medications consistently, and monitoring HbA1c every 3 months. Let your physician know if you experience frequent hypoglycemia symptoms.",
  ],
  'diet|nutrition|food|calories': [
    "A healthy balanced diet consists of abundant vegetables, fruits, whole grains, lean protein, and adequate hydration (8–10 glasses of water daily). Try to limit ultra-processed snacks, high sodium, and refined sugars.",
  ],
  'exercise|workout|physical activity': [
    "The WHO recommends at least 150 minutes of moderate aerobic activity (like brisk walking, swimming, or cycling) per week, supplemented by 2 days of muscle-strengthening exercises.",
  ],
  'sleep|insomnia|rest': [
    "Quality sleep is vital for immune and cardiovascular health. Adults generally need 7–9 hours per night. Avoid screens 1 hour before bed, keep the room cool and dark, and maintain consistent sleeping hours.",
  ],
  'stress|anxiety|mental health': [
    "Chronic stress impacts physical well-being. Deep diaphragmatic breathing, mindfulness, daily physical activity, and speaking with a counselor can bring meaningful relief. If anxiety persists, consult a qualified mental health practitioner.",
  ],
}

function getRuleBasedResponse(message: string): string {
  const lower = message.toLowerCase()

  for (const [pattern, responses] of Object.entries(HEALTH_RESPONSES)) {
    const keywords = pattern.split('|')
    if (keywords.some(kw => lower.includes(kw))) {
      return responses[Math.floor(Math.random() * responses.length)]
    }
  }

  return "I'm here to help you navigate your health concerns, understand symptoms, manage medication schedules, or guide you through your hospital dashboard. Could you tell me a bit more about what you're experiencing?\n\n*Note: For acute medical emergencies, please immediately visit the nearest emergency department or call your local emergency hotline.*"
}

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json()

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (apiKey && apiKey !== 'your-openai-api-key') {
      try {
        const openai = new OpenAI({ apiKey })

        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
          {
            role: 'system',
            content: `You are Aarogya, the clinical AI Health Assistant for Aarogya Darpan — a modern digital hospital and health management system.
Your mission is to provide accurate, empathetic, and clear healthcare guidance to patients and medical staff.

Guidelines:
1. Provide helpful medical information, lifestyle advice, symptom explanations, and triage recommendations.
2. Emphasize when conditions warrant seeing a doctor, visiting the emergency room, or booking an appointment in the dashboard (/dashboard/appointments).
3. Do not formulate definitive diagnoses or prescribe prescription drugs; recommend clinical consultation.
4. Format responses cleanly using Markdown (bullet points, bold text for key terms). Keep explanations structured and easy to read.
5. If the user asks about system features, guide them to the appropriate dashboard section (Appointments, Prescriptions, Lab Reports, Family Members, Billing).`,
          },
          ...(Array.isArray(history)
            ? history.slice(-8).map((m: any) => ({
                role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
                content: String(m.content || ''),
              }))
            : []),
          { role: 'user', content: message.trim() },
        ]

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages,
          max_tokens: 600,
          temperature: 0.7,
        })

        const reply = response.choices?.[0]?.message?.content
        if (reply) {
          return NextResponse.json({ response: reply, source: 'openai' })
        }
      } catch (aiError: any) {
        console.error('[OpenAI Chat API Error]:', aiError?.message || aiError)
        // Graceful fallback to rule-based engine
      }
    }

    const ruleResponse = getRuleBasedResponse(message)
    return NextResponse.json({ response: ruleResponse, source: 'rule-based' })
  } catch (error: any) {
    console.error('[Chat API Error]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
