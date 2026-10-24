import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Rule-based symptom checker (works without OpenAI)
// Can be replaced/augmented with OpenAI when key is available
const SYMPTOM_DATABASE: Record<string, {
  conditions: Array<{ name: string; confidence: 'high' | 'medium' | 'low' }>
  urgency: 'emergency' | 'urgent' | 'routine'
  specialist: string
  redFlags: string[]
  selfCare: string[]
}> = {
  'chest pain': {
    conditions: [
      { name: 'Myocardial Infarction (Heart Attack)', confidence: 'high' },
      { name: 'Angina', confidence: 'medium' },
      { name: 'GERD / Acid Reflux', confidence: 'low' },
    ],
    urgency: 'emergency',
    specialist: 'Cardiologist',
    redFlags: ['Pain radiating to left arm or jaw', 'Sweating profusely', 'Difficulty breathing', 'Loss of consciousness'],
    selfCare: ['Call emergency services immediately', 'Do not drive yourself to hospital'],
  },
  'fever': {
    conditions: [
      { name: 'Viral Fever', confidence: 'high' },
      { name: 'Urinary Tract Infection', confidence: 'medium' },
      { name: 'Malaria', confidence: 'medium' },
      { name: 'Dengue', confidence: 'low' },
    ],
    urgency: 'urgent',
    specialist: 'General Physician',
    redFlags: ['Fever above 103°F (39.4°C)', 'Stiff neck', 'Severe headache', 'Rash', 'Difficulty breathing'],
    selfCare: ['Stay hydrated', 'Rest', 'Take paracetamol', 'Monitor temperature every 4 hours'],
  },
  'headache': {
    conditions: [
      { name: 'Tension Headache', confidence: 'high' },
      { name: 'Migraine', confidence: 'medium' },
      { name: 'Hypertension', confidence: 'low' },
    ],
    urgency: 'routine',
    specialist: 'General Physician / Neurologist',
    redFlags: ['Sudden severe "thunderclap" headache', 'Headache with fever and stiff neck', 'Vision changes', 'Confusion'],
    selfCare: ['Rest in a dark, quiet room', 'Stay hydrated', 'Apply cold/warm compress', 'Avoid screen time'],
  },
  'shortness of breath': {
    conditions: [
      { name: 'Asthma', confidence: 'high' },
      { name: 'COPD', confidence: 'medium' },
      { name: 'Heart Failure', confidence: 'medium' },
      { name: 'Pulmonary Embolism', confidence: 'low' },
    ],
    urgency: 'emergency',
    specialist: 'Pulmonologist / Cardiologist',
    redFlags: ['Cyanosis (blue lips/fingertips)', 'Chest pain', 'Unable to complete sentences', 'Confusion'],
    selfCare: ['Sit upright', 'Use prescribed inhaler if available', 'Seek immediate medical attention'],
  },
  'abdominal pain': {
    conditions: [
      { name: 'Gastritis', confidence: 'high' },
      { name: 'Appendicitis', confidence: 'medium' },
      { name: 'Irritable Bowel Syndrome', confidence: 'medium' },
      { name: 'Kidney Stones', confidence: 'low' },
    ],
    urgency: 'urgent',
    specialist: 'Gastroenterologist / General Surgeon',
    redFlags: ['Severe pain in lower right abdomen', 'Rigid abdomen', 'Blood in stool', 'High fever with pain'],
    selfCare: ['Avoid solid food until evaluated', 'Stay hydrated with clear fluids', 'Avoid painkillers until diagnosis'],
  },
  'cough': {
    conditions: [
      { name: 'Upper Respiratory Tract Infection', confidence: 'high' },
      { name: 'Bronchitis', confidence: 'medium' },
      { name: 'Asthma', confidence: 'medium' },
      { name: 'Tuberculosis', confidence: 'low' },
    ],
    urgency: 'routine',
    specialist: 'General Physician / Pulmonologist',
    redFlags: ['Blood in sputum', 'Cough lasting more than 3 weeks', 'Night sweats with fever', 'Significant weight loss'],
    selfCare: ['Stay hydrated', 'Honey and ginger tea', 'Steam inhalation', 'Avoid smoking/irritants'],
  },
  'dizziness': {
    conditions: [
      { name: 'Vertigo (BPPV)', confidence: 'high' },
      { name: 'Dehydration', confidence: 'medium' },
      { name: 'Anemia', confidence: 'medium' },
      { name: 'Hypotension', confidence: 'low' },
    ],
    urgency: 'routine',
    specialist: 'ENT / Neurologist',
    redFlags: ['Sudden severe dizziness with headache', 'Dizziness with chest pain', 'Loss of balance', 'Speech difficulty'],
    selfCare: ['Sit or lie down immediately', 'Drink water', 'Avoid sudden position changes', 'Avoid driving'],
  },
  'joint pain': {
    conditions: [
      { name: 'Arthritis', confidence: 'high' },
      { name: 'Gout', confidence: 'medium' },
      { name: 'Rheumatoid Arthritis', confidence: 'medium' },
      { name: 'Viral Arthralgia', confidence: 'low' },
    ],
    urgency: 'routine',
    specialist: 'Rheumatologist / Orthopedic',
    redFlags: ['Joint swelling with fever', 'Hot, red joint', 'Inability to bear weight', 'Multiple joints affected rapidly'],
    selfCare: ['RICE method (Rest, Ice, Compression, Elevation)', 'Avoid strenuous activity', 'Gentle range-of-motion exercises'],
  },
  'nausea': {
    conditions: [
      { name: 'Gastroenteritis', confidence: 'high' },
      { name: 'Food Poisoning', confidence: 'high' },
      { name: 'Migraine-related', confidence: 'medium' },
      { name: 'Medication Side Effect', confidence: 'low' },
    ],
    urgency: 'routine',
    specialist: 'General Physician',
    redFlags: ['Blood in vomit', 'Signs of dehydration', 'Severe abdominal pain', 'High fever'],
    selfCare: ['Sip clear fluids slowly', 'Try bland foods (BRAT diet)', 'Rest', 'Avoid fatty/spicy foods'],
  },
  'back pain': {
    conditions: [
      { name: 'Muscle Strain', confidence: 'high' },
      { name: 'Lumbar Disc Herniation', confidence: 'medium' },
      { name: 'Kidney Infection', confidence: 'low' },
      { name: 'Spinal Stenosis', confidence: 'low' },
    ],
    urgency: 'routine',
    specialist: 'Orthopedic / Physiotherapist',
    redFlags: ['Radiating leg pain (sciatica)', 'Bladder/bowel problems', 'Numbness in legs', 'Trauma-related'],
    selfCare: ['Apply heat/ice for 20 minutes', 'Gentle stretching', 'Maintain good posture', 'Avoid lifting heavy weights'],
  },
}

function findMatchingSymptoms(inputSymptoms: string[]): string[] {
  const keys = Object.keys(SYMPTOM_DATABASE)
  const matched: string[] = []

  for (const symptom of inputSymptoms) {
    const lower = symptom.toLowerCase()
    for (const key of keys) {
      if (lower.includes(key) || key.includes(lower)) {
        if (!matched.includes(key)) matched.push(key)
      }
    }
  }
  return matched
}

export async function POST(req: NextRequest) {
  try {
    const { symptoms, age, gender, conditions: knownConditions } = await req.json()

    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
      return NextResponse.json({ error: 'Please provide at least one symptom' }, { status: 400 })
    }

    // Try OpenAI if available
    const apiKey = process.env.OPENAI_API_KEY
    if (apiKey && apiKey !== 'your-openai-api-key') {
      try {
        const { default: OpenAI } = await import('openai')
        const openai = new OpenAI({ apiKey })

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are a medical triage assistant for Aarogya Darpan hospital system. 
Analyze symptoms and provide structured JSON response. 
IMPORTANT: Always recommend seeing a doctor. Do not diagnose definitively.`,
            },
            {
              role: 'user',
              content: `Patient: Age ${age || 'unknown'}, Gender ${gender || 'unknown'}, Known conditions: ${knownConditions?.join(', ') || 'none'}
Symptoms: ${symptoms.join(', ')}

Return ONLY valid JSON with this exact structure:
{
  "possibleConditions": [{"name": "string", "confidence": "high|medium|low", "description": "string"}],
  "urgency": "emergency|urgent|routine",
  "specialist": "string",
  "redFlags": ["string"],
  "selfCare": ["string"],
  "disclaimer": "string"
}`,
            },
          ],
          response_format: { type: 'json_object' },
          max_tokens: 800,
        })

        const data = JSON.parse(completion.choices[0].message.content || '{}')
        return NextResponse.json({ ...data, source: 'ai' })
      } catch (aiError) {
        console.error('OpenAI error, falling back to rule-based:', aiError)
      }
    }

    // Rule-based fallback
    const matched = findMatchingSymptoms(symptoms)

    if (matched.length === 0) {
      return NextResponse.json({
        possibleConditions: [
          { name: 'Unspecified condition', confidence: 'low', description: 'Symptoms do not match common patterns.' },
        ],
        urgency: 'routine' as const,
        specialist: 'General Physician',
        redFlags: ['Any severe or worsening symptoms', 'Difficulty breathing', 'Chest pain', 'Loss of consciousness'],
        selfCare: ['Monitor your symptoms', 'Stay hydrated and rest', 'Consult a doctor if symptoms persist'],
        disclaimer: 'This is an AI-assisted analysis only. Always consult a qualified healthcare professional.',
        source: 'rule-based',
      })
    }

    // Merge results from all matched symptoms
    const allConditions: Array<{ name: string; confidence: 'high' | 'medium' | 'low'; description: string }> = []
    const allRedFlags: string[] = []
    const allSelfCare: string[] = []
    let highestUrgency: 'emergency' | 'urgent' | 'routine' = 'routine'
    const specialists = new Set<string>()

    for (const key of matched) {
      const data = SYMPTOM_DATABASE[key]
      data.conditions.forEach(c => {
        if (!allConditions.find(ac => ac.name === c.name)) {
          allConditions.push({ ...c, description: `Associated with ${key}` })
        }
      })
      data.redFlags.forEach(r => { if (!allRedFlags.includes(r)) allRedFlags.push(r) })
      data.selfCare.forEach(s => { if (!allSelfCare.includes(s)) allSelfCare.push(s) })
      if (data.urgency === 'emergency') highestUrgency = 'emergency'
      else if (data.urgency === 'urgent' && highestUrgency !== 'emergency') highestUrgency = 'urgent'
      specialists.add(data.specialist)
    }

    return NextResponse.json({
      possibleConditions: allConditions.slice(0, 5),
      urgency: highestUrgency,
      specialist: Array.from(specialists).join(' / '),
      redFlags: allRedFlags.slice(0, 6),
      selfCare: allSelfCare.slice(0, 5),
      disclaimer: 'This is a rule-based analysis only. Always consult a qualified healthcare professional for proper diagnosis.',
      source: 'rule-based',
    })
  } catch (error) {
    console.error('Symptom check error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
