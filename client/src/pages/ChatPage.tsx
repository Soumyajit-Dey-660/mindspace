import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiUrl } from '../api';
import './ChatPage.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  animated: boolean; // false for history loads, true for live messages
}

interface Conversation {
  thread_id: string;
  title: string;
  preview: string;
  updated_at: string; // UTC datetime string from SQLite: "YYYY-MM-DD HH:MM:SS"
}

// ── Time helpers ──────────────────────────────────────────────────────────────

function parseUTC(dt: string): Date {
  // SQLite datetime('now') returns "YYYY-MM-DD HH:MM:SS" without timezone marker
  return new Date(dt.replace(' ', 'T') + 'Z');
}

function relativeTime(dt: string): string {
  const ms = Date.now() - parseUTC(dt).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24)    return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7)     return parseUTC(dt).toLocaleDateString([], { weekday: 'short' });
  return parseUTC(dt).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function sectionOf(dt: string): string {
  const date = parseUTC(dt);
  const now  = new Date();
  const todayStart     = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86_400_000);
  const weekStart      = new Date(todayStart.getTime() - 7 * 86_400_000);
  if (date >= todayStart)     return 'Today';
  if (date >= yesterdayStart) return 'Yesterday';
  if (date >= weekStart)      return 'This week';
  return 'Older';
}

const SUGGESTION_SETS: Record<RecordingLang, string[][]> = {
  en: [
    ["Tell me more 💭", "I'm not sure how to explain it", "Can we slow down?", "That actually helped"],
    ["What should I do?", "I've felt this before", "It's been going on a while", "I feel a bit better now"],
    ["Can I change the subject?", "I don't know where to start", "Something happened today", "I just need to sit with this"],
    ["That makes sense", "I'm still figuring it out", "What do you think?", "I needed to hear that"],
  ],
  bn: [
    ["আরেকটু বলো 💭", "কীভাবে বোঝাব বুঝতে পারছি না", "একটু ধীরে যাও", "এটা সত্যিই সাহায্য করল"],
    ["আমি কী করব?", "আগেও এরকম লেগেছিল", "এটা অনেকদিন ধরে চলছে", "একটু ভালো লাগছে এখন"],
    ["অন্য কথায় যাই?", "কোথা থেকে শুরু করব জানি না", "আজকে একটা ঘটনা হয়েছে", "শুধু বসে থাকতে চাই"],
    ["হ্যাঁ, ঠিকই বলেছ", "এখনও বুঝে উঠতে পারছি না", "তুমি কী মনে করো?", "এটা শুনতে দরকার ছিল"],
  ],
  hi: [
    ["और बताओ 💭", "समझा नहीं पा रहा/रही हूँ", "ज़रा धीरे चलो", "इससे सच में मदद मिली"],
    ["मुझे क्या करना चाहिए?", "पहले भी ऐसा लगा है", "यह काफी समय से चल रहा है", "अब थोड़ा बेहतर लग रहा है"],
    ["विषय बदल सकते हैं?", "शुरू कहाँ से करूँ पता नहीं", "आज कुछ हुआ", "बस इसके साथ बैठना है"],
    ["हाँ, समझ आया", "अभी भी समझ रहा/रही हूँ", "तुम क्या सोचते हो?", "यह सुनना ज़रूरी था"],
  ],
};

const STARTERS_BY_LANG: Record<RecordingLang, { icon: string; text: string }[]> = {
  en: [
    { icon: '😔', text: "I've been feeling really overwhelmed lately" },
    { icon: '😴', text: "I can't sleep and my mind won't stop racing" },
    { icon: '😶', text: "I just need to talk to someone right now" },
    { icon: '💭', text: "I'm not sure how I'm feeling — I just feel off" },
    { icon: '🌱', text: "I'm going through something hard right now" },
  ],
  bn: [
    { icon: '😔', text: "সম্প্রতি সত্যিই অনেক চাপ অনুভব করছি" },
    { icon: '😴', text: "ঘুম আসছে না, মন কিছুতেই থামছে না" },
    { icon: '😶', text: "এখন শুধু কারো সাথে কথা বলতে চাই" },
    { icon: '💭', text: "কেমন লাগছে বুঝতে পারছি না — শুধু ভালো নেই" },
    { icon: '🌱', text: "এখন একটা কঠিন সময়ের মধ্যে আছি" },
  ],
  hi: [
    { icon: '😔', text: "हाल ही में बहुत overwhelmed महसूस हो रहा है" },
    { icon: '😴', text: "नींद नहीं आ रही, मन रुक नहीं रहा" },
    { icon: '😶', text: "अभी बस किसी से बात करनी है" },
    { icon: '💭', text: "पता नहीं कैसा लग रहा है — बस ठीक नहीं लग रहा" },
    { icon: '🌱', text: "अभी एक मुश्किल दौर से गुज़र रहा हूँ" },
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function formatRecordingTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const MAX_RECORDING_SECONDS = 180; // 3 minutes

type RecordingLang = 'en' | 'bn' | 'hi';
const LANG_LABELS: Record<RecordingLang, string> = { en: 'EN', bn: 'বাং', hi: 'हिं' };
const LANG_NAMES: Record<RecordingLang, string>  = { en: 'English', bn: 'Bengali', hi: 'Hindi' };
const LANG_PLACEHOLDERS: Record<RecordingLang, string> = {
  en: 'Say anything — this is your safe space…',
  bn: 'যা মনে চায় বলো — এটা তোমার নিজের জায়গা…',
  hi: 'कुछ भी कहो — यह तुम्हारी अपनी जगह है…',
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const GREETINGS_BY_LANG: Record<RecordingLang, [string, string, string, string, string]> = {
  en: ['Hey, night owl', 'Good morning', 'Good afternoon', 'Good evening', 'Hey there'],
  bn: ['রাতের পাখি', 'শুভ সকাল', 'শুভ বিকেল', 'শুভ সন্ধ্যা', 'হ্যালো'],
  hi: ['रात के उल्लू', 'शुभ प्रभात', 'नमस्ते', 'शुभ संध्या', 'नमस्ते'],
};

function greeting(lang: RecordingLang = 'en') {
  const h = new Date().getHours();
  const [night, morning, afternoon, evening, hey] = GREETINGS_BY_LANG[lang];
  if (h < 5)  return night;
  if (h < 12) return morning;
  if (h < 17) return afternoon;
  if (h < 21) return evening;
  return hey;
}

function todayLabel() {
  return new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

// ── Sub-components ─────────────────────────────────────────────────────���──────

function LogoMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M12 3C9 3 7 5.5 7 8.5c0 2 .8 3.5 2 5L12 17l3-3.5c1.2-1.5 2-3 2-5C17 5.5 15 3 12 3z" fill="var(--cream)" opacity=".9"/>
      <circle cx="12" cy="8.5" r="2" fill="var(--g4)" opacity=".6"/>
    </svg>
  );
}

function TypingIndicator() {
  return (
    <div className="typing-row">
      <div className="msg-avatar">🌿</div>
      <div className="typing-bubble">
        <div className="t-dot" /><div className="t-dot" /><div className="t-dot" />
      </div>
    </div>
  );
}

interface MessageRowProps {
  msg: Message;
  isFirstInGroup: boolean;
  onReadAloud: (id: string, text: string) => void;
  speakingMsgId: string | null;
  loadingMsgId: string | null;
}

function MessageRow({ msg, isFirstInGroup, onReadAloud, speakingMsgId, loadingMsgId }: MessageRowProps) {
  const isAi = msg.role === 'ai';
  const isSpeaking = speakingMsgId === msg.id;
  const isLoading  = loadingMsgId  === msg.id;

  const rowClass = [
    'msg-row',
    msg.role,
    isFirstInGroup ? 'new-group' : '',
  ].filter(Boolean).join(' ');

  const bubbleClass = [
    'msg-bubble',
    !isFirstInGroup ? 'tail-hidden' : '',
    msg.animated ? `msg-animate-${msg.role}` : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={rowClass}>
      {isAi && (
        <div className={`msg-avatar${isFirstInGroup ? '' : ' hidden'}`}>🌿</div>
      )}
      <div className="msg-content">
        <div className={bubbleClass}>{msg.text}</div>
        {isAi && (
          <button
            className={`read-aloud-btn${isSpeaking ? ' speaking' : ''}${isLoading ? ' loading' : ''}`}
            onClick={() => onReadAloud(msg.id, msg.text)}
            title={isSpeaking ? 'Stop reading' : isLoading ? 'Loading audio…' : 'Read aloud'}
          >
            {isSpeaking ? (
              <svg viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" rx="1"/>
                <rect x="14" y="4" width="4" height="16" rx="1"/>
              </svg>
            ) : isLoading ? (
              <svg viewBox="0 0 24 24" className="tts-spinner">
                <circle cx="12" cy="12" r="9" fill="none" strokeWidth="2" strokeLinecap="round" strokeDasharray="28 56"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
              </svg>
            )}
            <span>{isSpeaking ? 'Stop' : isLoading ? 'Loading…' : 'Read aloud'}</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

function getOrCreateUserId(): string {
  let id = localStorage.getItem('mindspace_user_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('mindspace_user_id', id);
  }
  return id;
}

export default function ChatPage() {
  const [messages, setMessages]       = useState<Message[]>([]);
  const [input, setInput]             = useState('');
  const [isTyping, setIsTyping]       = useState(false);
  const [hasStarted, setHasStarted]   = useState(false);
  const [activeConvo, setActiveConvo] = useState('new');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [menuOpen, setMenuOpen]       = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 768);

  // Memory: stable user identity across sessions, new thread per conversation
  const [userId]    = useState<string>(getOrCreateUserId);
  const [threadId, setThreadId] = useState<string>(() => crypto.randomUUID());

  // Rate limiting
  const [remainingTrials, setRemainingTrials] = useState<number | null>(null);
  const [resetsAt, setResetsAt]               = useState<string | null>(null);

  // Past conversations (sidebar)
  const [conversations, setConversations] = useState<Conversation[]>([]);

  // Stable ref to sendMessage so transcribeAudio can call it without a circular dependency
  const sendMessageRef = useRef<(text: string) => void>(() => {});

  // Voice recording
  const [isRecording, setIsRecording]       = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<BlobPart[]>([]);
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef        = useRef<MediaStream | null>(null);

  // Voice language selector
  const [recordingLang, setRecordingLang] = useState<RecordingLang>('en');

  // Text-to-speech
  const [speakingMsgId, setSpeakingMsgId]   = useState<string | null>(null);
  const [loadingMsgId,  setLoadingMsgId]    = useState<string | null>(null);
  const ttsAudioRef    = useRef<HTMLAudioElement | null>(null);
  const ttsAbortRef    = useRef<AbortController | null>(null);

  const messagesAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const textareaRef     = useRef<HTMLTextAreaElement>(null);
  const menuRef         = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages or typing indicator appear
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Close dropdown on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  // Fetch remaining trials on mount
  useEffect(() => {
    fetch(apiUrl(`/api/usage/${userId}`))
      .then(r => r.json())
      .then(d => {
        setRemainingTrials(d.remaining);
        setResetsAt(d.resets_at);
      })
      .catch(() => {}); // non-critical — UI degrades gracefully
  }, [userId]);

  // Fetch conversation list (called on mount and after each AI reply)
  const fetchConversations = useCallback(() => {
    fetch(apiUrl(`/api/conversations/${userId}`))
      .then(r => r.ok ? r.json() : [])
      .then(setConversations)
      .catch(() => {});
  }, [userId]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // Auto-resize textarea as user types
  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  // ── Voice recording ───────────────────────────────────────────────────────

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop(); // triggers onstop → transcribeAudio
    }
  }, []);

  // Auto-stop at 3 minutes
  useEffect(() => {
    if (recordingSeconds >= MAX_RECORDING_SECONDS && isRecording) {
      stopRecording();
    }
  }, [recordingSeconds, isRecording, stopRecording]);

  const transcribeAudio = useCallback(async (blob: Blob, mimeType: string, lang: RecordingLang) => {
    setIsTranscribing(true);
    try {
      const ext = mimeType.includes('webm') ? 'webm'
        : mimeType.includes('ogg') ? 'ogg'
        : mimeType.includes('mp4') ? 'mp4'
        : 'webm';
      const file = new File([blob], `recording.${ext}`, { type: mimeType });
      const formData = new FormData();
      formData.append('audio', file);
      formData.append('lang', lang);

      const res = await fetch(apiUrl('/api/transcribe'), { method: 'POST', body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || 'Transcription failed');
      }
      const data = await res.json();
      if (data.transcript) {
        if (!data.valid) {
          const tryAgain: Record<RecordingLang, string> = {
            en: "Couldn't understand that — please try speaking again.",
            bn: "বোঝা যায়নি — আবার বলার চেষ্টা করুন।",
            hi: "समझ नहीं आया — कृपया फिर से बोलें।",
          };
          setError(tryAgain[lang]);
          setTimeout(() => setError(null), 5000);
          return;
        }
        // Auto-send the transcript directly to the LLM
        sendMessageRef.current(data.transcript);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Couldn't transcribe audio.";
      setError(msg);
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (isTyping || remainingTrials === 0) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000, // Whisper is trained at 16kHz — match it
        },
      });
      streamRef.current = stream;
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
        ? 'audio/ogg;codecs=opus'
        : 'audio/mp4';

      // Higher bitrate = better recognition accuracy for non-Latin scripts
      const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 128000 });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        setIsRecording(false);
        transcribeAudio(blob, mimeType, recordingLang);
      };

      recorder.start(100);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } catch {
      setError("Couldn't access microphone. Please allow microphone access and try again.");
      setTimeout(() => setError(null), 5000);
    }
  }, [isTyping, remainingTrials, transcribeAudio, recordingLang]);

  // ── Text-to-speech ────────────────────────────────────────────────────────

  const speakMessage = useCallback(async (id: string, text: string) => {
    // Toggle off if already speaking or loading this message
    if (speakingMsgId === id || loadingMsgId === id) {
      ttsAbortRef.current?.abort();
      ttsAbortRef.current = null;
      ttsAudioRef.current?.pause();
      ttsAudioRef.current = null;
      setSpeakingMsgId(null);
      setLoadingMsgId(null);
      return;
    }
    // Cancel any in-flight TTS request and stop current playback
    ttsAbortRef.current?.abort();
    ttsAbortRef.current = null;
    ttsAudioRef.current?.pause();
    ttsAudioRef.current = null;
    setSpeakingMsgId(null);
    setLoadingMsgId(id);

    const controller = new AbortController();
    ttsAbortRef.current = controller;

    try {
      const res = await fetch(apiUrl('/api/tts'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error('TTS request failed');
      const blob = await res.blob();
      ttsAbortRef.current = null;
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      ttsAudioRef.current = audio;
      const cleanup = () => {
        URL.revokeObjectURL(url);
        ttsAudioRef.current = null;
        setSpeakingMsgId(null);
      };
      audio.onended = cleanup;
      audio.onerror = cleanup;
      setLoadingMsgId(null);
      setSpeakingMsgId(id);
      await audio.play();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setLoadingMsgId(null);
      // Fallback to browser speechSynthesis if server is unavailable
      if (!('speechSynthesis' in window)) { setSpeakingMsgId(null); return; }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.92;
      utterance.onend   = () => setSpeakingMsgId(null);
      utterance.onerror = () => setSpeakingMsgId(null);
      setSpeakingMsgId(id);
      window.speechSynthesis.speak(utterance);
    }
  }, [speakingMsgId, loadingMsgId]);

  // Stop any TTS playback when navigating away or closing
  useEffect(() => {
    return () => {
      ttsAbortRef.current?.abort();
      ttsAudioRef.current?.pause();
      window.speechSynthesis?.cancel();
    };
  }, []);


  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping || remainingTrials === 0) return;

    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setHasStarted(true);
    setSuggestions([]);
    setError(null);

    const userMsg: Message = { id: uid(), role: 'user', text: trimmed, animated: true };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const res = await fetch(apiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          thread_id: threadId,
          user_id: userId,
        }),
      });

      if (res.status === 429) {
        const body = await res.json().catch(() => ({}));
        const detail = body.detail ?? {};
        setRemainingTrials(0);
        if (detail.resets_at) setResetsAt(detail.resets_at);
        // Remove the optimistically-added user message
        setMessages(prev => prev.filter(m => m.id !== userMsg.id));
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Server error ${res.status}`);
      }

      const data = await res.json();
      const aiMsg: Message = { id: uid(), role: 'ai', text: data.reply, animated: true };
      setMessages(prev => [...prev, aiMsg]);
      setSuggestions(pickRandom(SUGGESTION_SETS[recordingLang]));
      if (data.remaining_trials != null) setRemainingTrials(data.remaining_trials);
      // Re-fetch sidebar after a short delay so background title task has time to finish
      setTimeout(fetchConversations, 1800);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Couldn't reach the server.";
      setError(msg);
      setTimeout(() => setError(null), 6000);
    } finally {
      setIsTyping(false);
    }
  }, [isTyping, remainingTrials, threadId, userId, fetchConversations, recordingLang]);

  // Keep ref in sync so transcribeAudio can call sendMessage without a circular dep
  sendMessageRef.current = sendMessage;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    autoResize(e.target);
  };

  const startNewChat = () => {
    ttsAbortRef.current?.abort();
    ttsAbortRef.current = null;
    ttsAudioRef.current?.pause();
    ttsAudioRef.current = null;
    window.speechSynthesis?.cancel();
    setSpeakingMsgId(null);
    setMessages([]);
    setHasStarted(false);
    setInput('');
    setSuggestions([]);
    setMenuOpen(false);
    setActiveConvo('new');
    setThreadId(crypto.randomUUID()); // new thread = fresh short-term memory context
    if (window.innerWidth <= 768) setSidebarOpen(false);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const clearChat = () => {
    ttsAbortRef.current?.abort();
    ttsAbortRef.current = null;
    ttsAudioRef.current?.pause();
    ttsAudioRef.current = null;
    window.speechSynthesis?.cancel();
    setSpeakingMsgId(null);
    setMessages([]);
    setHasStarted(false);
    setSuggestions([]);
    setMenuOpen(false);
  };

  const loadConvo = useCallback(async (conv: Conversation) => {
    setActiveConvo(conv.thread_id);
    setThreadId(conv.thread_id); // continue this thread on new messages
    setSuggestions([]);
    setIsTyping(false);
    setError(null);

    try {
      const res = await fetch(apiUrl(`/api/conversations/${userId}/${conv.thread_id}`));
      if (res.ok) {
        const data = await res.json();
        const loaded: Message[] = (data.messages as { role: string; text: string }[]).map(m => ({
          id: uid(),
          role: m.role as 'user' | 'ai',
          text: m.text,
          animated: false,
        }));
        setMessages(loaded);
        setHasStarted(loaded.length > 0);
      }
    } catch {
      setError("Couldn't load that conversation.");
      setTimeout(() => setError(null), 4000);
    }

    requestAnimationFrame(() => {
      if (messagesAreaRef.current) {
        messagesAreaRef.current.scrollTop = messagesAreaRef.current.scrollHeight;
      }
    });

    if (window.innerWidth <= 768) setSidebarOpen(false);
  }, [userId]);

  const exportChat = () => {
    if (messages.length === 0) return;
    const lines = messages.map(m =>
      `${m.role === 'ai' ? 'MindSpace' : 'You'}: ${m.text}`
    );
    const blob = new Blob([lines.join('\n\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mindspace-chat.txt';
    a.click();
    URL.revokeObjectURL(url);
    setMenuOpen(false);
  };

  const toggleSidebar = () => {
    setSidebarOpen(o => !o);
  };

  // Sidebar: filter past conversations (exclude currently active thread)
  const q = searchQuery.toLowerCase();
  const pastConversations = conversations
    .filter(c => c.thread_id !== threadId)
    .filter(c => !q || c.title.toLowerCase().includes(q) || c.preview.toLowerCase().includes(q));

  // Group past conversations by time section
  const SECTIONS = ['Today', 'Yesterday', 'This week', 'Older'] as const;

  // Current conversation header — use stored title once generated, else derive from messages
  const activeConvMeta  = conversations.find(c => c.thread_id === threadId);
  const firstUserMsg    = messages.find(m => m.role === 'user');
  const lastUserMsg     = [...messages].reverse().find(m => m.role === 'user');
  const currentTitle    = activeConvMeta?.title
    ?? (firstUserMsg ? firstUserMsg.text.slice(0, 28) + (firstUserMsg.text.length > 28 ? '…' : '') : 'New conversation');
  const currentPreview  = lastUserMsg
    ? lastUserMsg.text.slice(0, 40) + (lastUserMsg.text.length > 40 ? '…' : '')
    : 'Just getting started…';

  // topbar-center left offset: align past sidebar on desktop
  const topbarCenterStyle = { left: sidebarOpen ? '272px' : '0' };

  return (
    <div className="chat-page">

      {/* ── TOP BAR ── */}
      <header className="chat-topbar">
        <div className="chat-topbar-left">
          <button className="sidebar-toggle-btn" onClick={toggleSidebar} aria-label="Toggle sidebar">
            <svg viewBox="0 0 24 24"><path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round"/></svg>
          </button>
          <div className="topbar-divider" />
          <Link to="/" className="topbar-back" title="Back to home">
            <svg viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span>Home</span>
          </Link>
          <div className="topbar-divider" />
          <Link to="/" className="topbar-logo">
            <div className="topbar-logo-mark"><LogoMark /></div>
            <span className="topbar-logo-name">MindSpace</span>
          </Link>
        </div>

        <div className="topbar-center" style={topbarCenterStyle}>
          <div className="topbar-ai-avatar">🌿</div>
          <div className="topbar-ai-info">
            <div className="topbar-ai-name">Your MindSpace</div>
            <div className="topbar-status">
              <span className="topbar-status-dot" />
              here for you, always
            </div>
          </div>
        </div>

        <div className="topbar-right" ref={menuRef}>
          <button className="topbar-btn topbar-btn-new" title="New conversation" onClick={startNewChat}>
            <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" strokeLinecap="round"/></svg>
          </button>
          <button className="topbar-btn" title="More options" onClick={() => setMenuOpen(o => !o)}>
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="5"  r="1.2" fill="currentColor"/>
              <circle cx="12" cy="12" r="1.2" fill="currentColor"/>
              <circle cx="12" cy="19" r="1.2" fill="currentColor"/>
            </svg>
          </button>
          <div className={`topbar-dropdown ${menuOpen ? 'open' : ''}`}>
            <button className="dropdown-item" onClick={startNewChat}>
              <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" strokeLinecap="round"/></svg>
              New conversation
            </button>
            <button className="dropdown-item" onClick={clearChat}>
              <svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round"/></svg>
              Clear conversation
            </button>
            <button className="dropdown-item" onClick={exportChat} disabled={messages.length === 0}>
              <svg viewBox="0 0 24 24"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round"/></svg>
              Export chat
            </button>
            <div className="dropdown-divider" />
            <button className="dropdown-item danger" onClick={() => setMenuOpen(false)}>
              <svg viewBox="0 0 24 24">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round"/>
                <line x1="12" y1="9"  x2="12"   y2="13" strokeLinecap="round"/>
                <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round"/>
              </svg>
              Crisis resources
            </button>
          </div>
        </div>
      </header>

      {/* Mobile overlay — tap to close sidebar */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ── LAYOUT ── */}
      <div className="chat-layout">

        {/* ── SIDEBAR ── */}
        <aside className={`chat-sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
          <div className="sidebar-header">
            <span className="sidebar-header-title">Conversations</span>
            <button className="sidebar-new-btn" onClick={startNewChat}>
              <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" strokeLinecap="round"/></svg>
              New
            </button>
          </div>

          <div className="sidebar-search">
            <div className="sidebar-search-wrap">
              <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35" strokeLinecap="round"/></svg>
              <input
                className="sidebar-search-input"
                type="text"
                placeholder="Search conversations…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="sidebar-list">
            {/* Current / active conversation */}
            {/* Active / current conversation */}
            <button
              className={`convo-item ${activeConvo === threadId ? 'active' : ''}`}
              onClick={startNewChat}
            >
              <div className="convo-icon">💬</div>
              <div className="convo-info">
                <div className="convo-title">{currentTitle}</div>
                <div className="convo-preview">{currentPreview}</div>
              </div>
              <div className="convo-time">now</div>
            </button>

            {/* Past conversations grouped by recency */}
            {SECTIONS.map(section => {
              const items = pastConversations.filter(c => sectionOf(c.updated_at) === section);
              if (items.length === 0) return null;
              return (
                <div key={section}>
                  <div className="sidebar-section-label">{section}</div>
                  {items.map(c => (
                    <button
                      key={c.thread_id}
                      className={`convo-item ${activeConvo === c.thread_id ? 'active' : ''}`}
                      onClick={() => loadConvo(c)}
                    >
                      <div className="convo-icon">💬</div>
                      <div className="convo-info">
                        <div className="convo-title">{c.title}</div>
                        <div className="convo-preview">{c.preview}</div>
                      </div>
                      <div className="convo-time">{relativeTime(c.updated_at)}</div>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>

          <div className="sidebar-footer">
            <div className="sidebar-privacy-note">
              <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round"/></svg>
              Conversations are private and never stored on our servers.
            </div>
          </div>
        </aside>

        {/* ── MAIN CHAT ── */}
        <main className="chat-main">

          {!hasStarted ? (
            /* ── WELCOME STATE ── */
            <div className="welcome-state">
              <div className="welcome-icon">🌿</div>
              <div className="welcome-greeting">{greeting(recordingLang)}</div>
              <h2>{{
                en: "Hey, I'm here.",
                bn: 'হ্যাঁ, আমি এখানে আছি।',
                hi: 'हाँ, मैं यहाँ हूँ।',
              }[recordingLang]}</h2>
              <p>{{
                en: "This is your space. You can say anything — I won't judge, I won't rush you. What's on your mind right now?",
                bn: 'এটা তোমার জায়গা। যা মনে চায় বলো — আমি বিচার করব না, তাড়া দেব না। এখন কী মাথায় ঘুরছে?',
                hi: 'यह तुम्हारी जगह है। जो मन में आए कहो — मैं जज नहीं करूँगा, जल्दी नहीं करूँगा। अभी मन में क्या चल रहा है?',
              }[recordingLang]}</p>
              <div className="welcome-starters">
                {STARTERS_BY_LANG[recordingLang].map(s => (
                  <button key={s.text} className="starter-btn" onClick={() => sendMessage(s.text)}>
                    <span className="starter-btn-icon">{s.icon}</span>
                    <span className="starter-btn-text">{s.text}</span>
                    <span className="starter-btn-arrow">→</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* ── CONVERSATION VIEW ── */
            <div className="messages-area" ref={messagesAreaRef}>
              <div className="messages-inner">
                <div className="day-divider">
                  <span className="day-divider-text">
                    {activeConvMeta
                      ? parseUTC(activeConvMeta.updated_at).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
                      : todayLabel()}
                  </span>
                </div>
                {messages.map((msg, i) => (
                  <MessageRow
                    key={msg.id}
                    msg={msg}
                    isFirstInGroup={i === 0 || messages[i - 1].role !== msg.role}
                    onReadAloud={speakMessage}
                    speakingMsgId={speakingMsgId}
                    loadingMsgId={loadingMsgId}
                  />
                ))}
                {isTyping && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}

          {/* ── SUGGESTIONS ── */}
          {suggestions.length > 0 && (
            <div className="suggestions">
              <div className="suggestions-chips">
                {suggestions.map(s => (
                  <button
                    key={s}
                    className="chip"
                    onClick={() => sendMessage(s)}
                    disabled={isTyping}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── LIMIT REACHED BANNER ── */}
          {remainingTrials === 0 && (
            <div className="limit-banner">
              <div className="limit-banner-icon">🌙</div>
              <div className="limit-banner-body">
                <strong>You've used all 5 free messages for today.</strong>
                <span>
                  Come back after midnight UTC
                  {resetsAt ? ` — resets at ${new Date(resetsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}` : ''}.
                </span>
              </div>
            </div>
          )}

          {/* ── INPUT ── */}
          <div className="input-area">
            <div className="input-wrap-outer">
              <div className={`input-wrap${remainingTrials === 0 ? ' input-wrap-locked' : ''}`}>

                {isRecording ? (
                  /* ── Recording state ── */
                  <div className="recording-state">
                    <div className="recording-indicator">
                      <span className="rec-dot" />
                      <span className="rec-label">Recording</span>
                    </div>
                    <div className="recording-timer-wrap">
                      <span className="recording-timer">{formatRecordingTime(recordingSeconds)}</span>
                      <span className="recording-limit">/ 3:00</span>
                    </div>
                    <button className="stop-btn" onClick={stopRecording} title="Stop recording">
                      <svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
                    </button>
                  </div>
                ) : isTranscribing ? (
                  /* ── Transcribing state ── */
                  <div className="transcribing-state">
                    <span className="transcribing-spinner" />
                    <span>Transcribing your voice…</span>
                  </div>
                ) : (
                  /* ── Normal input state ── */
                  <>
                    <textarea
                      ref={textareaRef}
                      className="input-textarea"
                      placeholder={remainingTrials === 0 ? "You've reached today's limit — see you tomorrow…" : LANG_PLACEHOLDERS[recordingLang]}
                      rows={1}
                      value={input}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      disabled={isTyping || remainingTrials === 0}
                    />
                    <div className="input-actions">
                      <div className="lang-selector">
                        {(Object.entries(LANG_LABELS) as [RecordingLang, string][]).map(([code, label]) => (
                          <button
                            key={code}
                            className={`lang-btn${recordingLang === code ? ' active' : ''}`}
                            onClick={() => setRecordingLang(code)}
                            disabled={isTyping || remainingTrials === 0}
                            title={LANG_NAMES[code]}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <button
                        className="mic-btn"
                        onClick={startRecording}
                        disabled={isTyping || remainingTrials === 0}
                        title={`Record voice in ${LANG_NAMES[recordingLang]} (up to 3 min)`}
                      >
                        <svg viewBox="0 0 24 24">
                          <rect x="9" y="2" width="6" height="11" rx="3"/>
                          <path d="M5 10a7 7 0 0 0 14 0"/>
                          <line x1="12" y1="19" x2="12" y2="23"/>
                          <line x1="9"  y1="23" x2="15" y2="23"/>
                        </svg>
                      </button>
                      <button
                        className="send-btn"
                        onClick={() => sendMessage(input)}
                        disabled={!input.trim() || isTyping || remainingTrials === 0}
                        title="Send (Enter)"
                      >
                        <svg viewBox="0 0 24 24"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" fill="white"/></svg>
                      </button>
                    </div>
                  </>
                )}

              </div>
              <div className="input-footer">
                {remainingTrials !== null && remainingTrials > 0 && (
                  <span className="trial-counter">
                    {remainingTrials} of 5 free message{remainingTrials !== 1 ? 's' : ''} remaining today
                    <span className="trial-divider">·</span>
                  </span>
                )}
                MindSpace is not a crisis service. In an emergency, call&nbsp;
                <a href="tel:988">988</a>&nbsp;or your local emergency services.
              </div>
            </div>
          </div>

        </main>
      </div>

      {/* ── ERROR TOAST ── */}
      {error && <div className="error-toast">{error}</div>}
    </div>
  );
}
