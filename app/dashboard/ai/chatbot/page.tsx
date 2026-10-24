'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import axios from 'axios'
import { MessageCircle, Send, Loader2, Bot, User, RefreshCw, Sparkles } from 'lucide-react'
import { useLanguage } from '@/components/providers/LanguageProvider'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTED_QUESTIONS_EN = [
  'What should I do for high fever?',
  'How do I manage diabetes effectively?',
  'What is a healthy diet for heart health?',
  'How can I improve my sleep quality?',
  'When should I go to the emergency room?',
  'How do I book an appointment?',
]

const SUGGESTED_QUESTIONS_HI = [
  'तेज बुखार होने पर प्राथमिक उपचार क्या करें?',
  'डायबिटीज को आसानी से कैसे नियंत्रित करें?',
  'दिल को स्वस्थ रखने के लिए आहार क्या हो?',
  'गहरी और अच्छी नींद के लिए क्या करें?',
  'अस्पताल की इमरजेंसी कब जाना चाहिए?',
  'डॉक्टर से मिलने का अपॉइंटमेंट कैसे लें?',
]

function MarkdownText({ text }: { text: string }) {
  const formatted = text
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="underline font-semibold text-teal-600 dark:text-teal-400 hover:opacity-80">$1</a>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Bullets
    .replace(/^[-•*] (.+)$/gm, '<div class="flex gap-2 mt-1"><span class="text-teal-600 font-bold">•</span><span>$1</span></div>')
    // Numbered
    .replace(/^(\d+)\. (.+)$/gm, '<div class="flex gap-2 mt-1"><span class="font-bold text-teal-600">$1.</span><span>$2</span></div>')
    // Paragraphs & breaks
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')

  return <span dangerouslySetInnerHTML={{ __html: formatted }} />
}

export default function ChatbotPage() {
  const { language } = useLanguage()

  const getGreeting = useCallback(() => {
    if (language === 'hi') {
      return "नमस्ते! 🙏 मैं **आरोग्य** हूँ, आपका व्यक्तिगत स्वास्थ्य सहायक। मैं स्वास्थ्य संबंधी प्रश्नों, लक्षणों, दवाओं, अपॉइंटमेंट और मेडिकल रिपोर्ट्स में आपकी मदद कर सकता हूँ।\n\nआज मैं आपकी क्या सहायता कर सकता हूँ?"
    }
    return "Hello! I'm **Aarogya**, your clinical health assistant. I can help you with health questions, symptoms, medications, appointments, and diagnostic reports.\n\nHow can I assist you today?"
  }, [language])

  const [messages, setMessages] = useState<Message[]>([])

  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        content: getGreeting(),
      },
    ])
  }, [getGreeting])

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const suggestedQuestions = language === 'hi' ? SUGGESTED_QUESTIONS_HI : SUGGESTED_QUESTIONS_EN

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(msg?: string) {
    const text = (msg || input).trim()
    if (!text || loading) return

    const userMsg: Message = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const { data } = await axios.post('/api/ai/chat', {
        message: text,
        history: messages.slice(-10),
        language,
      })
      setMessages((prev) => [...prev, { role: 'assistant', content: data.response }])
    } catch {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: language === 'hi'
          ? 'क्षमा करें, प्रतिक्रिया प्राप्त करने में त्रुटि हुई। कृपया पुनः प्रयास करें।'
          : 'Sorry, I encountered an error. Please try again.',
      }])
    } finally {
      setLoading(false)
    }
  }

  function clearChat() {
    setMessages([{
      role: 'assistant',
      content: language === 'hi'
        ? "चैट रीसेट कर दी गई है। आज मैं आपकी क्या सहायता कर सकता हूँ?"
        : "Chat cleared. How can I help you today?",
    }])
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in h-[calc(100vh-8.5rem)] flex flex-col">
      {/* Header */}
      <div className="card-new p-4 mb-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-md">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-base" style={{ color: 'var(--text)' }}>
              Aarogya AI {language === 'hi' ? '(आरोग्य स्वास्थ्य सहायक)' : 'Health Assistant'}
            </p>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {language === 'hi' ? 'ऑनलाइन — AI स्वास्थ्य परामर्श एवं मार्गदर्शन' : 'Online — AI-powered healthcare guidance'}
              </p>
            </div>
          </div>
        </div>
        <button
          id="clear-chat-btn"
          onClick={clearChat}
          className="flex items-center gap-1.5 text-xs btn-secondary px-3 py-1.5 rounded-lg"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {language === 'hi' ? 'नया चैट' : 'New chat'}
        </button>
      </div>

      {/* Messages */}
      <div className="card-new flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
              msg.role === 'user'
                ? 'bg-teal-600 text-white'
                : 'bg-gradient-to-br from-teal-500 to-teal-700 text-white'
            }`}>
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={`max-w-[82%] p-4 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-teal-600 text-white rounded-tr-none shadow'
                : 'card-new text-slate-800 dark:text-slate-100 rounded-tl-none border'
            }`}>
              <MarkdownText text={msg.content} />
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white">
              <Bot className="w-4 h-4" />
            </div>
            <div className="card-new p-4 rounded-2xl rounded-tl-none border">
              <div className="flex gap-1.5 items-center">
                <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested questions */}
      {messages.length <= 1 && (
        <div className="mt-3 flex flex-wrap gap-2 flex-shrink-0">
          {suggestedQuestions.map((q) => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              className="text-xs px-3 py-1.5 rounded-full border border-teal-500/30 text-teal-700 dark:text-teal-300 bg-teal-500/5 hover:bg-teal-500/15 transition-all"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="card-new p-3 mt-3 flex gap-2 items-center flex-shrink-0">
        <input
          id="chat-input"
          className="flex-1 input-field py-2.5 px-3 text-sm"
          placeholder={language === 'hi' ? 'लक्षण, दवाएं, या स्वास्थ्य संबंधी प्रश्न पूछें...' : 'Ask me anything about your symptoms, medications, health tips...'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              sendMessage()
            }
          }}
          disabled={loading}
        />
        <button
          id="send-message-btn"
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          className="btn-primary px-4 py-2.5 flex items-center gap-1.5 flex-shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          <span className="hidden sm:inline">{language === 'hi' ? 'भेजें' : 'Send'}</span>
        </button>
      </div>
      <p className="text-[11px] text-center mt-1.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
        {language === 'hi'
          ? 'आरोग्य एआई केवल सूचनात्मक उद्देश्यों के लिए है। किसी भी गंभीर स्थिति में योग्य चिकित्सक से परामर्श लें या 112 डायल करें।'
          : 'Aarogya AI is for informational purposes only. Always consult a qualified healthcare professional. Emergency: 112.'}
      </p>
    </div>
  )
}
