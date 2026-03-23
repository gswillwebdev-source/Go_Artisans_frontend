'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'

export default function ChatAssistant() {
  const { user } = useAuth({ redirectToLogin: false })
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [rateLimitRemaining, setRateLimitRemaining] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const messagesEndRef = useRef(null)

  // Initialize session ID for anonymous users
  useEffect(() => {
    if (!user && !sessionId) {
      const newSessionId = `anon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      setSessionId(newSessionId)
      localStorage.setItem('chatSessionId', newSessionId)
    }
  }, [user, sessionId])

  // Auto-scroll to latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load chat history for authenticated users
  useEffect(() => {
    if (isOpen && user && messages.length === 0) {
      loadChatHistory()
    }
  }, [isOpen, user])

  const loadChatHistory = async () => {
    try {
      const response = await fetch(`/api/chat-history?userId=${user.id}`)
      if (response.ok) {
        const data = await response.json()
        const formattedMessages = data.messages.flatMap(msg => [
          { role: 'user', content: msg.message, timestamp: msg.created_at },
          { role: 'assistant', content: msg.response, timestamp: msg.created_at }
        ])
        setMessages(formattedMessages)
      }
    } catch (error) {
      console.error('Failed to load chat history:', error)
    }
  }

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    // Add user message to display
    const userMessage = inputValue
    setInputValue('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage, timestamp: new Date().toISOString() }])
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          userId: user?.id || null,
          sessionId: sessionId || localStorage.getItem('chatSessionId')
        })
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `⚠️ ${data.error}\n\nYou can send more messages in ${Math.ceil(data.retryAfter / 3600)} hour(s).`,
            timestamp: new Date().toISOString()
          }])
        } else {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: data.error || 'Failed to process your message. Please try again.',
            timestamp: new Date().toISOString()
          }])
        }
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString()
        }])

        if (data.rateLimitRemaining !== null) {
          setRateLimitRemaining(data.rateLimitRemaining)
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, an error occurred. Please try again.',
        timestamp: new Date().toISOString()
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-lg z-40 transition-transform duration-200 hover:scale-110"
        title="Chat with assistant"
      >
        {isOpen ? (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-96 bg-white rounded-lg shadow-2xl flex flex-col z-50 border border-gray-200">
          {/* Header */}
          <div className="bg-indigo-600 text-white px-6 py-4 rounded-t-lg flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg">How can we help?</h3>
              <p className="text-xs text-indigo-100">GoArtisans Support</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-gray-200 transition"
            >
              ✕
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full text-center">
                <div className="text-gray-500">
                  <p className="text-2xl mb-2">👋</p>
                  <p>Hello! Ask me anything about GoArtisans</p>
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-gray-200 text-gray-900 rounded-bl-none'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg rounded-bl-none">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Rate Limit Warning */}
          {rateLimitRemaining !== null && rateLimitRemaining <= 2 && (
            <div className="px-4 py-2 bg-yellow-50 border-t border-yellow-200">
              <p className="text-xs text-yellow-800">
                ⚠️ {rateLimitRemaining} messages remaining today
              </p>
            </div>
          )}

          {/* Input Area */}
          <div className="border-t border-gray-200 p-4 bg-white rounded-b-lg">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your question..."
                disabled={isLoading}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm disabled:bg-gray-100"
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !inputValue.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg disabled:bg-gray-400 transition text-sm font-medium"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
