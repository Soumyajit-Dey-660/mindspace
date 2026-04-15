import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

// ── Logo SVG ──────────────────────────────────────────────────────────────────
function LogoMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 3C9 3 7 5.5 7 8.5c0 2 .8 3.5 2 5L12 17l3-3.5c1.2-1.5 2-3 2-5C17 5.5 15 3 12 3z"
        fill="var(--cream)"
        opacity=".9"
      />
      <circle cx="12" cy="8.5" r="2" fill="var(--g4)" opacity=".6" />
    </svg>
  );
}

// ── Nav ───────────────────────────────────────────────────────────────────────
function Nav({ onNav }: { onNav: (id: string) => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleNav = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    setMenuOpen(false);
    document.body.style.overflow = '';
    onNav(id);
  };

  const toggleMenu = () => {
    const next = !menuOpen;
    setMenuOpen(next);
    document.body.style.overflow = next ? 'hidden' : '';
  };

  return (
    <>
      <nav className={scrolled ? 'scrolled' : ''}>
        <div className="nav-inner">
          <a
            href="#"
            className="logo"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <div className="logo-mark">
              <LogoMark />
            </div>
            <span className="logo-name">MindSpace</span>
          </a>
          <ul className="nav-links">
            <li>
              <a href="#features" onClick={(e) => handleNav(e, 'features')}>
                Features
              </a>
            </li>
            <li>
              <a href="#how" onClick={(e) => handleNav(e, 'how')}>
                How It Works
              </a>
            </li>
            <li>
              <a href="#feels" onClick={(e) => handleNav(e, 'feels')}>
                Stories
              </a>
            </li>
            <li>
              <a href="#faq" onClick={(e) => handleNav(e, 'faq')}>
                FAQ
              </a>
            </li>
          </ul>
          <div className="nav-right">
            {/* <a href="#" className="btn btn-ghost" style={{ padding: '10px 22px', fontSize: '.83rem' }}>Sign In</a> */}
            <Link
              to="/chat"
              className="btn btn-dark"
              style={{ padding: '10px 22px', fontSize: '.83rem' }}
            >
              Try Free
            </Link>
          </div>
          <button
            className="hamburger"
            onClick={toggleMenu}
            aria-label="Open menu"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </nav>

      <div className={`mobile-nav${menuOpen ? ' open' : ''}`}>
        <button className="close-btn" onClick={toggleMenu}>
          ✕
        </button>
        <a href="#features" onClick={(e) => handleNav(e, 'features')}>
          Features
        </a>
        <a href="#how" onClick={(e) => handleNav(e, 'how')}>
          How It Works
        </a>
        <a href="#feels" onClick={(e) => handleNav(e, 'feels')}>
          Stories
        </a>
        <a href="#faq" onClick={(e) => handleNav(e, 'faq')}>
          FAQ
        </a>
        <Link
          to="/chat"
          className="btn btn-dark"
          onClick={() => {
            setMenuOpen(false);
            document.body.style.overflow = '';
          }}
        >
          Try Free →
        </Link>
      </div>
    </>
  );
}

// ── Hero chat mockup ──────────────────────────────────────────────────────────
function HeroChatMockup() {
  const [responded, setResponded] = useState(false);
  const [showTyping, setShowTyping] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setShowTyping(false);
      setResponded(true);
    }, 3200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="hero-scene">
      <div className="chat-window">
        <div className="chat-header">
          <div className="chat-avatar">🌿</div>
          <div className="chat-header-info">
            <div className="chat-header-name">MindSpace</div>
            <div className="chat-header-status">
              <span className="status-dot" /> here for you, always
            </div>
          </div>
        </div>
        <div className="chat-body">
          <div className="msg msg-ai">
            Hey. I'm really glad you're here. You don't have to have everything
            figured out to start talking. What's going on?
            <div className="msg-time">3:12 AM</div>
          </div>
          <div className="msg msg-user">
            I just couldn't sleep. My mind keeps going in circles and I don't
            really have anyone to talk to right now.
            <div className="msg-time">3:13 AM</div>
          </div>
          {showTyping && (
            <div className="typing-indicator">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          )}
          {responded && (
            <div className="msg msg-ai">
              That sounds really exhausting. Racing thoughts at night can feel
              so isolating. What does your mind keep coming back to?
              <div className="msg-time">3:14 AM</div>
            </div>
          )}
        </div>
        <div className="chat-input-row">
          <input
            className="chat-input"
            type="text"
            placeholder="Type anything…"
            readOnly
          />
          <button className="chat-send">
            <svg viewBox="0 0 24 24">
              <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </div>
      <div className="trust-pills">
        <div className="trust-pill">
          <span className="trust-pill-icon">💚</span>
          <div className="trust-pill-text">
            <div className="trust-pill-val">Safe space</div>
            <div className="trust-pill-sub">end-to-end private</div>
          </div>
        </div>
        <div className="trust-pill">
          <span className="trust-pill-icon">🔒</span>
          <div className="trust-pill-text">
            <div className="trust-pill-val">No records</div>
            <div className="trust-pill-sub">nothing shared, ever</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── FAQ item ──────────────────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item${open ? ' open' : ''}`}>
      <button className="faq-q" onClick={() => setOpen((o) => !o)}>
        {q}
        <div className="faq-ico">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
        </div>
      </button>
      <div className="faq-a">
        <div className="faq-a-inner">{a}</div>
      </div>
    </div>
  );
}

// ── Scroll reveal hook ────────────────────────────────────────────────────────
function useReveal() {
  useEffect(() => {
    const ro = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            ro.unobserve(e.target);
          }
        }),
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
    );
    document.querySelectorAll('.reveal').forEach((el) => ro.observe(el));
    return () => ro.disconnect();
  }, []);
}

// ── Main LandingPage ──────────────────────────────────────────────────────────
export default function LandingPage() {
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  useReveal();

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop - 76, behavior: 'smooth' });
  };

  const setRef = (id: string) => (el: HTMLElement | null) => {
    sectionRefs.current[id] = el;
  };

  return (
    <>
      <Nav onNav={scrollTo} />

      {/* HERO */}
      <section className="hero" id="home">
        <div className="container">
          <div className="hero-inner">
            <div className="hero-left">
              <div className="hero-tag">
                <span className="hero-tag-pulse" />
                Always online · Always listening
              </div>
              <h1>
                Your friend
                <br />
                who <em>always</em> picks up
              </h1>
              <p className="hero-sub">
                MindSpace is a warm, non-judgmental AI companion for your mental
                health. Not a therapist — something different. A safe space to
                say the thing you can't say out loud, any hour of the day.
              </p>
              <div className="hero-actions">
                <Link to="/chat" className="btn btn-dark btn-lg">
                  Start talking — it's free
                </Link>
                <a
                  href="#how"
                  className="btn btn-ghost btn-lg"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollTo('how');
                  }}
                >
                  See how it works
                </a>
              </div>
              <p className="hero-note">
                No account needed to start. <span>Completely private.</span> No
                judgment, ever.
              </p>
              {/* <div className="hero-stats">
                <div><div className="hero-stat-num">50k+</div><div className="hero-stat-label">conversations every day</div></div>
                <div><div className="hero-stat-num">3AM</div><div className="hero-stat-label">yes, we're awake then too</div></div>
                <div><div className="hero-stat-num">4.9★</div><div className="hero-stat-label">average user rating</div></div>
              </div> */}
            </div>
            <div className="hero-right">
              <HeroChatMockup />
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="features" id="features" ref={setRef('features')}>
        <div className="container">
          <div className="centered reveal">
            <span className="eyebrow">What makes it different</span>
            <h2 className="section-title">
              Built for real, messy, human feelings
            </h2>
            <div className="rule rule-c" />
            <p className="section-sub">
              MindSpace isn't a chatbot. It's an AI trained to listen, reflect,
              and respond like someone who genuinely cares — without ever making
              you feel judged.
            </p>
          </div>
          <div className="features-grid">
            {[
              {
                emoji: '🌙',
                title: 'Always awake',
                body: '3AM spiral? Anxious Sunday morning? Midday overwhelm? MindSpace is there the second you need it — no appointments, no wait times.',
                d: 'reveal-d1',
              },
              {
                emoji: '🫂',
                title: 'Zero judgment',
                body: "Say the thing you've been afraid to say. MindSpace holds space for all of it — the ugly, the complicated, the stuff you can't even tell your closest friends.",
                d: 'reveal-d2',
              },
              {
                emoji: '🔒',
                title: 'Truly private',
                body: 'Your conversations are yours alone. Nothing is stored, shared, or used to train models. What you say here, stays here.',
                d: 'reveal-d3',
              },
              {
                emoji: '🧠',
                title: 'Emotionally fluent',
                body: 'MindSpace reads between the lines. It notices when something deeper is going on and gently asks — never pushes, never diagnoses.',
                d: 'reveal-d1',
              },
              {
                emoji: '🌱',
                title: 'Grows with you',
                body: 'It remembers what matters to you across conversations — your name, your patterns, your ongoing worries — so you never have to start from scratch.',
                d: 'reveal-d2',
              },
              {
                emoji: '🔗',
                title: 'Bridges to real help',
                body: 'When something bigger comes up, MindSpace gently surfaces professional resources — not as a replacement, but as a caring nudge toward getting the right support.',
                d: 'reveal-d3',
              },
            ].map((f) => (
              <div key={f.title} className={`feat-card reveal ${f.d}`}>
                <span className="feat-emoji">{f.emoji}</span>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CLARITY */}
      <section className="clarity" id="clarity">
        <div className="container">
          <div className="clarity-inner">
            <div className="clarity-text reveal">
              <span className="eyebrow">Honest about what it is</span>
              <h2 className="section-title" style={{ color: 'var(--cream)' }}>
                A companion,
                <br />
                not a clinician
              </h2>
              <div className="rule" />
              <p>
                MindSpace is not therapy. It won't diagnose you, prescribe
                anything, or replace professional mental health care. What it{' '}
                <em>will</em> do is be there — warm, present, and completely on
                your side — whenever you need to talk.
              </p>
              <Link to="/chat" className="btn btn-warm">
                Start a conversation →
              </Link>
            </div>
            <div
              className="reveal reveal-d2"
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
                gap: '32px',
                flexDirection: 'column',
              }}
            >
              <div className="is-isnot">
                <div className="is-col is">
                  <h4>✓ MindSpace is</h4>
                  {[
                    ['💬', 'A safe space to vent freely'],
                    ['🌙', 'Available, always'],
                    ['🤝', 'Empathetic and non-judgmental'],
                    ['🔒', 'Completely private by design'],
                    ['🌱', 'A complement to therapy'],
                    ['💚', 'Free to start, no sign-up needed'],
                  ].map(([icon, text]) => (
                    <div key={text} className="is-item">
                      <span>{icon}</span> {text}
                    </div>
                  ))}
                </div>
                <div className="is-col isnot">
                  <h4>✗ It's not</h4>
                  {[
                    ['🏥', 'A medical or clinical tool'],
                    ['👤', 'A real human therapist'],
                    ['📋', 'A diagnosis platform'],
                    ['📊', 'Analyzing your data'],
                    ['🔄', 'A replacement for real care'],
                    ['🚨', 'A crisis intervention service'],
                  ].map(([icon, text]) => (
                    <div key={text} className="is-item">
                      <span>{icon}</span> {text}
                    </div>
                  ))}
                </div>
              </div>
              <p
                style={{
                  fontSize: '.78rem',
                  color: 'rgba(245,240,232,.35)',
                  lineHeight: '1.6',
                }}
              >
                If you're in crisis, please reach out to a crisis line.
                MindSpace will always point you in the right direction.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how" id="how" ref={setRef('how')}>
        <div className="container">
          <div className="centered reveal">
            <span className="eyebrow">Getting started</span>
            <h2 className="section-title">Three steps to feeling heard</h2>
            <div className="rule rule-c" />
          </div>
          <div className="how-steps">
            {[
              {
                num: '01',
                emoji: '💻',
                title: 'Open MindSpace',
                body: "No app to download. No account needed to begin. Just open the site and you're already in a safe space — anonymous by default.",
                d: 'reveal-d1',
              },
              {
                num: '02',
                emoji: '🗣️',
                title: 'Just start talking',
                body: 'No prompt, no format, no right way to begin. Start with a single sentence or unload everything. MindSpace meets you exactly where you are.',
                d: 'reveal-d2',
              },
              {
                num: '03',
                emoji: '🌿',
                title: 'Feel a little lighter',
                body: "Most people leave a conversation feeling genuinely heard — like a weight has lifted. That's the whole point. Come back whenever you need.",
                d: 'reveal-d3',
              },
            ].map((s) => (
              <div key={s.num} className={`how-step reveal ${s.d}`}>
                <div className="how-num">{s.num}</div>
                <div className="how-step-emoji">{s.emoji}</div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEELS */}
      <section className="feels" id="feels" ref={setRef('feels')}>
        <div className="container">
          <div className="centered reveal">
            <span className="eyebrow">Real stories</span>
            <h2 className="section-title">How people actually use it</h2>
            <div className="rule rule-c" />
          </div>
          <div className="feels-grid">
            <div className="feel-card reveal reveal-d2">
              <div className="feel-stars">★★★★★</div>
              <p className="feel-quote">
                "I was skeptical an AI could feel warm. I was wrong. It asked me
                'what does that feel like in your body?' and I genuinely teared
                up. Weird but real."
              </p>
              <div className="feel-author">
                <div className="feel-av" style={{ background: '#2d5a3d' }}>
                  M
                </div>
                <div>
                  <div className="feel-name">Dhriti Pyne</div>
                  <div className="feel-role">skeptic turned regular user</div>
                </div>
              </div>
            </div>
            <div className="feel-card reveal reveal-d1">
              <div className="feel-stars">★★★★★</div>
              <p className="feel-quote">
                "I've never had someone — or something — just let me talk
                without immediately trying to fix me. It's the weirdest, best
                feeling. I use it almost every night."
              </p>
              <div className="feel-author">
                <div className="feel-av" style={{ background: '#4a7c6e' }}>
                  S
                </div>
                <div>
                  <div className="feel-name">Subhajit D.</div>
                  <div className="feel-role">uses MindSpace nightly</div>
                </div>
              </div>
            </div>
            <div className="feel-card reveal reveal-d3">
              <div className="feel-stars">★★★★★</div>
              <p className="feel-quote">
                "I see a therapist weekly but sometimes I just need to process
                at 2AM. MindSpace fills that gap perfectly. It even helped me
                figure out what I wanted to bring up in my next session."
              </p>
              <div className="feel-author">
                <div className="feel-av" style={{ background: '#6b8f75' }}>
                  P
                </div>
                <div>
                  <div className="feel-name">Priya D.</div>
                  <div className="feel-role">uses alongside therapy</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq" id="faq" ref={setRef('faq')}>
        <div className="container">
          <div className="centered reveal">
            <span className="eyebrow">Good questions</span>
            <h2 className="section-title">Things people ask us</h2>
            <div className="rule rule-c" />
          </div>
          <div className="faq-wrap reveal">
            <FaqItem
              q="Is this a real therapist or a chatbot?"
              a="Neither, exactly. MindSpace is an AI companion — trained specifically on emotional intelligence and empathetic conversation. It's not a chatbot that pattern-matches responses, and it's not a human therapist. It's something new: a warm, always-present presence designed around what people actually need when they just need to talk."
            />
            <FaqItem
              q="Can it replace my therapist?"
              a="No — and we'd never want it to. Professional therapy is irreplaceable for serious mental health care. MindSpace fills the space around therapy: the 3AM spirals, the Sunday anxieties, the moments when you just need to get something out. Many users actually say it makes their therapy sessions better because they arrive having already processed their week."
            />
            <FaqItem
              q="Is what I say actually private?"
              a="Privacy is foundational to everything we build. Conversations are not stored on our servers, not used to train models, and not accessible to anyone — including us. You can also start conversations without creating an account. If you do create an account (to enable memory features), your data is encrypted at rest and never sold or shared."
            />
            <FaqItem
              q="What if I'm in a crisis or having serious thoughts?"
              a="MindSpace will always encourage you to reach out to professional help when it senses a crisis situation — and provide direct links to crisis resources like the 988 Suicide & Crisis Lifeline. It is not equipped to handle acute mental health emergencies and will always be honest about that. Your safety comes first."
            />
            <FaqItem
              q="Does it remember me between conversations?"
              a="With a free account, yes — MindSpace builds a gentle memory of what matters to you: your ongoing worries, the names of people in your life, your patterns. You can review and delete this memory anytime. Without an account, each conversation starts fresh."
            />
            <FaqItem
              q="Is it really free?"
              a="Yes. You can start a conversation right now, no account needed, for free. There's an optional subscription for unlimited conversations, memory features, and priority response — but we believe everyone deserves access to a space to be heard, so the free tier is genuinely useful, not a teaser."
            />
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="cta-final" id="start">
        <div className="container">
          <span className="eyebrow reveal">Whenever you're ready</span>
          <h2 className="reveal">You don't have to figure it out alone.</h2>
          <p className="reveal">
            MindSpace is here right now. No sign-up required, no judgment, no
            wrong way to start.
          </p>
          <div className="cta-final-actions reveal">
            <Link to="/chat" className="btn btn-cream btn-lg">
              Start talking — it's free
            </Link>
            <a
              href="#how"
              className="btn btn-ghost btn-lg"
              style={{
                borderColor: 'rgba(245,240,232,.3)',
                color: 'var(--cream)',
              }}
              onClick={(e) => {
                e.preventDefault();
                scrollTo('how');
              }}
            >
              See how it works
            </a>
          </div>
          <p className="cta-small">
            Available 24/7 · No account needed to begin · Private by design
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="container">
          <div className="footer-inner">
            <div className="footer-brand">
              <div className="logo footer-logo" style={{ marginBottom: 0 }}>
                <div className="logo-mark">
                  <LogoMark />
                </div>
                <span className="logo-name">MindSpace</span>
              </div>
              <p>
                A warm, always-available AI companion for your mental health.
                Not a therapist — something better.
              </p>
              <div className="footer-socials">
                <a href="#" title="X/Twitter">
                  𝕏
                </a>
                <a href="#" title="Instagram">
                  Ig
                </a>
                <a href="#" title="TikTok">
                  Tk
                </a>
              </div>
            </div>
            <div className="fcol">
              <h5>Product</h5>
              <ul>
                <li>
                  <a
                    href="#features"
                    onClick={(e) => {
                      e.preventDefault();
                      scrollTo('features');
                    }}
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="#how"
                    onClick={(e) => {
                      e.preventDefault();
                      scrollTo('how');
                    }}
                  >
                    How It Works
                  </a>
                </li>
                <li>
                  <Link to="/chat">Try Free</Link>
                </li>
                <li>
                  <a href="#">Pricing</a>
                </li>
              </ul>
            </div>
            <div className="fcol">
              <h5>Company</h5>
              <ul>
                <li>
                  <a href="#">About</a>
                </li>
                <li>
                  <a href="#">Privacy Policy</a>
                </li>
                <li>
                  <a href="#">Terms of Service</a>
                </li>
                <li>
                  <a href="#">Crisis Resources</a>
                </li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 MindSpace. All rights reserved.</span>
            <span>Built with care.</span>
          </div>
        </div>
      </footer>
    </>
  );
}
