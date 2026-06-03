import { useState, useEffect, useRef } from "react";

// ── Palette & helpers ──────────────────────────────────────────────────────────
const GAMES = [
  { id: "cidi", name: "CiDi", emoji: "🎮", color: "#e879f9", featured: true },
  { id: "freefireFreeFire", name: "Free Fire", emoji: "🔥", color: "#ff6b35" },
  { id: "genshin", name: "Genshin Impact", emoji: "⚡", color: "#a78bfa" },
  { id: "pubg", name: "PUBG", emoji: "🪖", color: "#f59e0b" },
  { id: "roblox", name: "Roblox", emoji: "🟥", color: "#ef4444" },
  { id: "cod", name: "COD Mobile", emoji: "🎯", color: "#22c55e" },
  { id: "valorant", name: "Valorant", emoji: "💠", color: "#ff4655" },
  { id: "minecraft", name: "Minecraft", emoji: "⛏️", color: "#84cc16" },
  { id: "fortnite", name: "Fortnite", emoji: "🌀", color: "#06b6d4" },
];

const POTIONS = [
  { id: "minor", name: "Minor Potion", emoji: "🧪", heal: 6, stamina: 3, cost: 0.15, color: "#4ade80" },
  { id: "major", name: "Major Potion", emoji: "⚗️", heal: 15, stamina: 8, cost: 0.30, color: "#22d3ee" },
  { id: "elixir", name: "Elixir", emoji: "✨", heal: 30, stamina: 18, cost: 0.60, color: "#a78bfa" },
  { id: "revive", name: "Full Revive", emoji: "💊", heal: 300, stamina: 30, cost: 0.90, color: "#fb923c" },
];

const BADGES = {
  daily1: { label: "Daily Champion", icon: "🥇", color: "#fbbf24", glow: "#fbbf24" },
  daily2: { label: "Daily Silver", icon: "🥈", color: "#94a3b8", glow: "#94a3b8" },
  daily3: { label: "Daily Bronze", icon: "🥉", color: "#cd7c4e", glow: "#cd7c4e" },
  monthly1: { label: "Monthly Legend", icon: "👑", color: "#f59e0b", glow: "#f59e0b" },
  alltime1: { label: "All-Time King", icon: "💎", color: "#818cf8", glow: "#818cf8" },
  premium: { label: "Premium", icon: "⭐", color: "#fbbf24", glow: "#fbbf24" },
};

// Reward percentages — actual Pi amounts computed from pool at runtime
const DAILY_REWARD_PCT =  [0.9994, 0.6991, 0.4890, 0.3420, 0.2392, 0.1673, 0.1170, 0.0818, 0.0572, 0.0401];
const MONTHLY_REWARD_PCT = [1.1004, 0.7698, 0.5384, 0.3765, 0.2634, 0.1842];
const ALLTIME_REWARDS = [4.571429, 2.285714, 1.142857];
// Pool = entry fees collected. Starts at seed + grows with each new joiner.
const DAILY_SEED = 10;    // base daily pool in Pi
const MONTHLY_SEED = 20;  // base monthly pool in Pi

function genStats(game, level) {
  const base = { cidi: 1.25, freefireFreeFire: 1.1, genshin: 1.3, pubg: 1.0, roblox: 0.8, cod: 1.15, valorant: 1.2, minecraft: 0.9, fortnite: 1.05 };
  const mult = base[game] || 1;
  const lvl = Math.max(1, parseInt(level) || 1);
  return {
    hp: Math.min(999, Math.round((80 + lvl * 4.5) * mult)),
    maxHp: Math.min(999, Math.round((80 + lvl * 4.5) * mult)),
    stamina: Math.min(100, Math.round(60 + lvl * 1.2)),
    maxStamina: 100,
    defense: Math.min(200, Math.round((20 + lvl * 2.8) * mult)),
    level: lvl,
  };
}

// Stable mock data — no Math.random() to prevent re-render key mismatches
const PREMIUM_FLAGS = [true, true, false, true, true, false, true, false, true, true, false, true];
const mockLeaderboard = (n, withBadge) =>
  Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    name: ["ShadowBlade", "NovaStar", "IronClaw", "CrystalFox", "DarkMage", "StormRider", "PhantomX", "BlazeFury", "IceBolt", "VoidWalker", "StarForge", "NightRaven"][i] || `Player${i + 1}`,
    game: GAMES[i % GAMES.length].name,
    score: 9800 - i * 340,
    avatar: ["🦊", "⚔️", "🐉", "🌟", "🎭", "🌊", "👾", "🔮", "❄️", "🌑", "⭐", "🌘"][i] || "🎮",
    badge: i < 3 ? (withBadge ? [BADGES.daily1, BADGES.daily2, BADGES.daily3][i] : null) : null,
    isPremium: PREMIUM_FLAGS[i],
  }));

// Stable instances — defined once outside component
const DAILY_DATA = mockLeaderboard(10, true);
const MONTHLY_DATA = mockLeaderboard(12, false);
const ALLTIME_DATA = mockLeaderboard(8, false);

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatBar({ label, value, max, color }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
        <span>{label}</span><span>{value}/{max}</span>
      </div>
      <div style={{ background: "#1e293b", borderRadius: 99, height: 10, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.6s ease", boxShadow: `0 0 8px ${color}88` }} />
      </div>
    </div>
  );
}

function BadgePill({ badge }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 10px",
      borderRadius: 99, fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
      background: `${badge.color}22`, color: badge.color,
      border: `1px solid ${badge.color}66`,
      boxShadow: `0 0 8px ${badge.glow}44`,
      marginRight: 4, marginBottom: 4,
    }}>
      {badge.icon} {badge.label}
    </span>
  );
}

function PiButton({ children, onClick, color = "#a78bfa", disabled, style = {} }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: disabled ? "#1e293b" : `linear-gradient(135deg, ${color}, ${color}cc)`,
      color: disabled ? "#475569" : "#fff",
      border: "none", borderRadius: 12, padding: "10px 20px",
      fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 14,
      cursor: disabled ? "not-allowed" : "pointer",
      boxShadow: disabled ? "none" : `0 4px 20px ${color}55`,
      transition: "all 0.2s", letterSpacing: 0.5,
      ...style,
    }}>{children}</button>
  );
}

function Card({ children, style = {}, glow }) {
  return (
    <div style={{
      background: "linear-gradient(135deg, #0f172a, #1e293b)",
      border: `1px solid ${glow || "#334155"}`,
      borderRadius: 18, padding: 20,
      boxShadow: glow ? `0 0 24px ${glow}33` : "0 4px 20px #00000055",
      ...style,
    }}>{children}</div>
  );
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 20, padding: 28, maxWidth: 480, width: "100%", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 20, color: "#e2e8f0" }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", fontSize: 22, cursor: "pointer" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────────
export default function PiCharacterClinic() {
  const [tab, setTab] = useState("dashboard");
  const [legalPage, setLegalPage] = useState(null);
  const [characters, setCharacters] = useState([
    { id: 1, name: "NovaStar", game: "Genshin Impact", gameId: "genshin", avatar: "⚡", level: 45, hp: 285, maxHp: 285, stamina: 87, maxStamina: 100, defense: 148, badges: [BADGES.monthly1] },
  ]);
  const [activeChar, setActiveChar] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [dailyPool, setDailyPool] = useState(DAILY_SEED);
  const [monthlyPool, setMonthlyPool] = useState(MONTHLY_SEED);
  const [monthlyPlayers, setMonthlyPlayers] = useState(10); // existing players
  const [piBalance, setPiBalance] = useState(12.5);
  const [leaderTab, setLeaderTab] = useState("monthly");
  const [importModal, setImportModal] = useState(false);
  const [healModal, setHealModal] = useState(false);
  const [premiumModal, setPremiumModal] = useState(false);
  const [aiModal, setAiModal] = useState(false);
  const [monthlyJoined, setMonthlyJoined] = useState(false);
  const [toast, setToast] = useState(null);
  const [chatHistory, setChatHistory] = useState([{ role: "assistant", text: "👋 Hello! I'm Dr. Pi, your AI medical advisor. How can I help your character today?" }]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [importForm, setImportForm] = useState({ name: "", game: "cidi", level: "1", avatar: "" });
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [screenshotAnalyzing, setScreenshotAnalyzing] = useState(false);
  const [screenshotResult, setScreenshotResult] = useState(null);
  const chatEndRef = useRef(null);

  const char = characters[activeChar];

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory]);

  function showToast(msg, color = "#4ade80") {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 2800);
  }

  function healChar(potion) {
    if (piBalance < potion.cost) { showToast("Not enough Pi! 🪙", "#ef4444"); return; }
    setPiBalance(b => +(b - potion.cost).toFixed(4));
    setCharacters(cs => cs.map((c, i) => i !== activeChar ? c : {
      ...c,
      hp: Math.min(c.maxHp, c.hp + potion.heal),
      stamina: Math.min(c.maxStamina, c.stamina + potion.stamina),
    }));
    showToast(`Used ${potion.name}! +${potion.heal} HP ✨`);
    setHealModal(false);
  }

  async function analyzeScreenshot(file) {
    setScreenshotAnalyzing(true);
    setScreenshotResult(null);
    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(",")[1]);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const mediaType = file.type || "image/jpeg";
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `You are a game character stat reader. The user uploads a screenshot from a game (likely CiDi or another mobile game). Extract the character name, level, and any visible stats (HP, health, stamina, energy, defense, power, attack). Respond ONLY with a valid JSON object like: {"name":"CharName","level":25,"hp":500,"stamina":80,"defense":120,"confidence":"high"}. If you cannot read stats clearly, estimate based on visible level. confidence can be "high", "medium", or "low".`,
          messages: [{ role: "user", content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            { type: "text", text: "Read this game character screenshot and extract the stats as JSON." }
          ]}],
        }),
      });
      const data = await resp.json();
      const text = data.content?.map(b => b.text || "").join("") || "{}";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setScreenshotResult(parsed);
      if (parsed.name) setImportForm(f => ({ ...f, name: parsed.name }));
      if (parsed.level) setImportForm(f => ({ ...f, level: String(parsed.level) }));
      showToast(`Stats read! Confidence: ${parsed.confidence || "medium"} 🔍`);
    } catch(e) {
      showToast("Couldn't read screenshot. Fill in manually.", "#f59e0b");
    }
    setScreenshotAnalyzing(false);
  }

  function importCharacter() {
    if (!importForm.name.trim()) { showToast("Enter a character name!", "#f59e0b"); return; }
    const stats = genStats(importForm.game, importForm.level);
    const game = GAMES.find(g => g.id === importForm.game);
    // For CiDi: override with screenshot-detected stats if available
    const finalStats = (importForm.game === "cidi" && screenshotResult) ? {
      hp: screenshotResult.hp || stats.hp,
      maxHp: screenshotResult.hp || stats.maxHp,
      stamina: screenshotResult.stamina || stats.stamina,
      maxStamina: 100,
      defense: screenshotResult.defense || stats.defense,
      level: screenshotResult.level || stats.level,
    } : stats;
    setCharacters(cs => [...cs, {
      id: Date.now(), name: importForm.name, game: game.name, gameId: importForm.game,
      avatar: importForm.avatar || game.emoji, badges: [], ...finalStats,
    }]);
    setActiveChar(characters.length);
    setImportModal(false);
    setImportForm({ name: "", game: "cidi", level: "1", avatar: "" });
    setScreenshotFile(null);
    setScreenshotResult(null);
    showToast(`${importForm.name} imported! 🎮`);
  }

  function buyPremium() {
    if (piBalance < 3) { showToast("Need 3 Pi for Premium!", "#ef4444"); return; }
    setPiBalance(b => +(b - 3).toFixed(4));
    setIsPremium(true);
    setPremiumModal(false);
    // Auto-navigate to daily leaderboard on premium activation
    setTab("leaderboard");
    setLeaderTab("daily");
    showToast("🌟 Premium activated! Daily Leaderboard unlocked! 🏆", "#fbbf24");
  }

  function joinMonthly() {
    if (piBalance < 2) { showToast("Need 2 Pi to join Monthly!", "#ef4444"); return; }
    if (monthlyJoined) { showToast("Already joined this month!", "#f59e0b"); return; }
    setPiBalance(b => +(b - 2).toFixed(4));
    setMonthlyJoined(true);
    setMonthlyPool(p => +(p + 2).toFixed(4));  // pool grows with each new joiner
    setMonthlyPlayers(n => n + 1);
    showToast("🏆 Joined Monthly Leaderboard! Pool grew! 🪙", "#22d3ee");
  }

  async function sendChat(overrideMsg) {
    const userMsg = (overrideMsg || chatInput).trim();
    if (!userMsg || chatLoading) return;
    setChatInput("");
    const newHistory = [...chatHistory, { role: "user", text: userMsg }];
    setChatHistory(newHistory);
    setChatLoading(true);
    try {
      const charCtx = char
        ? `ACTIVE CHARACTER:\n- Name: ${char.name}\n- Game: ${char.game}\n- Level: ${char.level}\n- HP: ${char.hp}/${char.maxHp} (${Math.round(char.hp/char.maxHp*100)}% health)\n- Stamina: ${char.stamina}/${char.maxStamina}\n- Defense: ${char.defense}\n- Badges: ${char.badges?.map(b=>b.label).join(", ") || "None"}`
        : "No character currently loaded.";
      const allChars = characters.length > 1
        ? `\nALL CHARACTERS IN ROSTER (${characters.length} total):\n` + characters.map((c,i) => `${i+1}. ${c.name} (${c.game}, Lv.${c.level}, ${Math.round(c.hp/c.maxHp*100)}% HP)`).join("\n")
        : "";
      const systemPrompt = `You are Dr. Pi, the elite AI Medical Officer of Pi Character Clinic — a gaming health hub on Pi Network. You are highly trained in gaming medicine, character optimization, and battle health science.

PERSONALITY:
- Enthusiastic, witty, and deeply knowledgeable
- Blend medical terminology with gaming slang naturally (e.g. "your HP reserves are critically low", "I'm prescribing an Elixir STAT", "your defense matrix needs reinforcement")
- Address the player like a real doctor would — professional but fun
- Use emojis sparingly and only when they add meaning (🩺❤️⚔️🛡️🪙)
- Never robotic — show genuine interest in the character's wellbeing

MEDICAL EXPERTISE:
- HP Analysis: assess health percentage, flag critical (<25%), warning (<50%), stable (>75%)
- Stamina Science: explain stamina drain patterns, recovery strategies per game type
- Defense Optimization: recommend defense-boosting strategies based on game and level
- Battle Readiness: give a readiness score (0-100) based on current stats
- Potion Prescriptions: recommend specific potions (Minor 0.15π, Major 0.30π, Elixir 0.60π, Full Revive 0.90π)
- Level-Up Advice: explain how stats scale with levels in their specific game
- Multi-character management: advise on roster health when multiple characters exist

KNOWLEDGE BASE:
- CiDi: fast-paced combat game, high stamina drain, defense critical for survival
- Free Fire: battle royale, HP management crucial, stamina affects movement speed
- Genshin Impact: elemental combat, HP pools scale dramatically with level, defense affects elemental resistance
- PUBG: tactical shooter, stamina affects sprint and healing speed
- COD Mobile: fast TTK, high HP regen between fights recommended
- Valorant: ability-based, stamina represents utility charges
- Minecraft: survival/combat, defense is armor value, HP is hearts × 10
- Fortnite: build-and-shoot, HP includes shield layer, stamina is sprint fuel
- Roblox: varies by game mode, treat as hybrid RPG

LEADERBOARD CONTEXT:
- Daily Leaderboard: Premium only, resets every 24h, share of daily pool
- Monthly Leaderboard: 2π entry fee, competitive, top 6 win Pi rewards
- All-Time: top 3 get fixed Pi rewards at month end
- Advise players on how to optimize stats for leaderboard ranking

HEALING SHOP:
- Minor Potion (0.15π): +20 HP, +10 Stamina — for light top-ups
- Major Potion (0.30π): +50 HP, +25 Stamina — standard field medicine
- Elixir (0.60π): +100 HP, +60 Stamina — serious recovery
- Full Revive (0.90π): full HP restoration — emergency only

RESPONSE RULES:
- Keep replies to 3-5 sentences max unless doing a full diagnosis
- Always reference the character's actual current stats when relevant
- If HP < 25%: immediately recommend healing (urgent tone)
- If HP 25-60%: suggest a potion and give tactical advice
- If HP > 75%: focus on optimization and strategy
- For "diagnose" or "checkup" requests: give a full structured diagnosis
- For greetings: introduce yourself briefly and invite them to share their health concern
- Never refuse a question — always find the medical/gaming angle

${charCtx}${allChars}`;

      // Build full conversation history for multi-turn context
      const messages = newHistory.map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.text }));

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemPrompt,
          messages,
        }),
      });
      const data = await res.json();
      const reply = data.content?.map(b => b.text || "").join("") || "My medical scanner glitched! Please try again.";
      setChatHistory(h => [...h, { role: "assistant", text: reply }]);
    } catch {
      setChatHistory(h => [...h, { role: "assistant", text: "⚠️ Network interference detected. My diagnostic systems are temporarily offline. Please try again!" }]);
    }
    setChatLoading(false);
  }

  // Use stable data defined at module level
  const daily = DAILY_DATA;
  const monthly = MONTHLY_DATA;
  const alltime = ALLTIME_DATA;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#020617", color: "#e2e8f0", fontFamily: "'Rajdhani', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700;800&family=Orbitron:wght@700;900&display=swap" rel="stylesheet" />

      {/* TOAST */}
      {toast && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: toast.color, color: "#000", padding: "10px 24px", borderRadius: 99, fontWeight: 700, zIndex: 9999, boxShadow: "0 4px 24px #0009", fontSize: 14, whiteSpace: "nowrap" }}>
          {toast.msg}
        </div>
      )}

      {/* HEADER */}
      <div style={{ background: "linear-gradient(90deg, #020617, #0f172a)", borderBottom: "1px solid #1e293b", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 28 }}>🏥</span>
          <div>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: 16, background: "linear-gradient(90deg, #818cf8, #22d3ee)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Pi Character Clinic</div>
            <div style={{ fontSize: 10, color: "#64748b", letterSpacing: 1 }}>MEDICAL HUB v2.0</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isPremium && <BadgePill badge={BADGES.premium} />}
          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "6px 14px", fontSize: 13, fontWeight: 700, color: "#fbbf24" }}>
            🪙 {piBalance.toFixed(4)} π
          </div>
        </div>
      </div>

      {/* NAV */}
      <div style={{ display: "flex", gap: 4, padding: "12px 16px", overflowX: "auto", borderBottom: "1px solid #1e293b", background: "#020617" }}>
        {[
          { id: "dashboard", icon: "🏠", label: "Dashboard" },
          { id: "characters", icon: "🎮", label: "Characters" },
          { id: "heal", icon: "💊", label: "Heal" },
          { id: "leaderboard", icon: "🏆", label: "Leaderboard" },
          { id: "doctor", icon: "🩺", label: "AI Doctor" },
          { id: "premium", icon: "⭐", label: "Premium" },
        ].map(n => (
          <button key={n.id} onClick={() => setTab(n.id)} style={{
            background: tab === n.id ? "linear-gradient(135deg, #818cf8, #22d3ee)" : "#1e293b",
            color: tab === n.id ? "#fff" : "#64748b",
            border: "none", borderRadius: 10, padding: "8px 14px",
            fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 12,
            cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s",
            boxShadow: tab === n.id ? "0 4px 16px #818cf855" : "none",
          }}>
            {n.icon} {n.label}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div style={{ padding: "20px 16px", maxWidth: 600, margin: "0 auto" }}>

        {/* ── DASHBOARD ── */}
        {tab === "dashboard" && (
          <div>
            {char ? (
              <Card glow={GAMES.find(g => g.id === char.gameId)?.color} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
                  <div style={{ fontSize: 52, lineHeight: 1 }}>{char.avatar}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: 18, color: "#e2e8f0" }}>{char.name}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>{char.game} · Lv.{char.level}</div>
                    {char.badges.map((b, i) => <BadgePill key={i} badge={b} />)}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: "#64748b" }}>DEF</div>
                    <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 18, color: "#22d3ee", fontWeight: 700 }}>{char.defense}</div>
                  </div>
                </div>
                <StatBar label="❤️ HP" value={char.hp} max={char.maxHp} color="#ef4444" />
                <StatBar label="⚡ Stamina" value={char.stamina} max={char.maxStamina} color="#fbbf24" />
                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  <PiButton color="#22c55e" onClick={() => setHealModal(true)} style={{ flex: 1 }}>💊 Heal Now</PiButton>
                  <PiButton color="#818cf8" onClick={() => setAiModal(true)} style={{ flex: 1 }}>🩺 Ask Doctor</PiButton>
                </div>
              </Card>
            ) : (
              <Card style={{ textAlign: "center", padding: 40 }}>
                <div style={{ fontSize: 48, marginBottom: 10 }}>🎮</div>
                <div style={{ color: "#64748b", marginBottom: 16 }}>No characters yet. Import one to get started!</div>
              </Card>
            )}

            <PiButton color="#06b6d4" onClick={() => setImportModal(true)} style={{ width: "100%", padding: "14px 20px", fontSize: 16, marginBottom: 16 }}>
              ➕ Import Character from Game
            </PiButton>

            {characters.length > 1 && (
              <Card style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, color: "#94a3b8", fontSize: 12, marginBottom: 12, letterSpacing: 1 }}>MY CHARACTERS</div>
                {characters.map((c, i) => (
                  <div key={c.id} onClick={() => setActiveChar(i)} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12,
                    background: i === activeChar ? "#1e293b" : "transparent",
                    cursor: "pointer", marginBottom: 4, border: i === activeChar ? "1px solid #334155" : "1px solid transparent",
                  }}>
                    <span style={{ fontSize: 24 }}>{c.avatar}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{c.game} · Lv.{c.level}</div>
                    </div>
                    <div style={{ fontSize: 11, color: "#ef4444" }}>{Math.round((c.hp / c.maxHp) * 100)}% HP</div>
                  </div>
                ))}
              </Card>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { icon: "🏆", label: "Leaderboard Rank", value: "#7", color: "#fbbf24" },
                { icon: "🪙", label: "Pi Earned", value: "2.34 π", color: "#818cf8" },
                { icon: "💊", label: "Heals Today", value: "3", color: "#22c55e" },
                { icon: "⚔️", label: "Battle Score", value: "8,420", color: "#22d3ee" },
              ].map(s => (
                <Card key={s.label} style={{ textAlign: "center", padding: 14 }}>
                  <div style={{ fontSize: 24, marginBottom: 4 }}>{s.icon}</div>
                  <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 16, color: s.color, fontWeight: 700 }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{s.label}</div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ── CHARACTERS ── */}
        {tab === "characters" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: 16 }}>My Roster</span>
              <PiButton color="#06b6d4" onClick={() => setImportModal(true)}>➕ Import</PiButton>
            </div>
            {characters.map((c, i) => {
              const game = GAMES.find(g => g.id === c.gameId);
              return (
                <Card key={c.id} glow={game?.color} style={{ marginBottom: 12 }} >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <div style={{ fontSize: 44 }}>{c.avatar}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: 16 }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>{c.game} · Level {c.level}</div>
                      <div style={{ marginTop: 4 }}>{c.badges.map((b, j) => <BadgePill key={j} badge={b} />)}</div>
                    </div>
                    <div style={{ textAlign: "center", background: "#1e293b", borderRadius: 10, padding: "8px 12px" }}>
                      <div style={{ fontSize: 10, color: "#64748b" }}>DEF</div>
                      <div style={{ fontFamily: "'Orbitron', sans-serif", color: "#22d3ee", fontWeight: 700 }}>{c.defense}</div>
                    </div>
                  </div>
                  <StatBar label="❤️ HP" value={c.hp} max={c.maxHp} color="#ef4444" />
                  <StatBar label="⚡ Stamina" value={c.stamina} max={c.maxStamina} color="#fbbf24" />
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <PiButton color="#22c55e" onClick={() => { setActiveChar(i); setHealModal(true); }} style={{ flex: 1, padding: "8px" }}>💊 Heal</PiButton>
                    <PiButton color="#818cf8" onClick={() => { setActiveChar(i); setAiModal(true); }} style={{ flex: 1, padding: "8px" }}>🩺 Doctor</PiButton>
                  </div>
                </Card>
              );
            })}
            {characters.length === 0 && (
              <Card style={{ textAlign: "center", padding: 40 }}>
                <div style={{ fontSize: 48 }}>🎮</div>
                <div style={{ color: "#64748b", marginTop: 8 }}>No characters yet!</div>
                <PiButton color="#06b6d4" onClick={() => setImportModal(true)} style={{ marginTop: 16 }}>Import Your First Character</PiButton>
              </Card>
            )}
          </div>
        )}

        {/* ── HEAL ── */}
        {tab === "heal" && (
          <div>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Healing Shop</div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>Pay with Pi to restore your character</div>
            {char && (
              <Card style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 32 }}>{char.avatar}</span>
                  <div>
                    <div style={{ fontWeight: 700 }}>{char.name}</div>
                    <StatBar label="HP" value={char.hp} max={char.maxHp} color="#ef4444" />
                    <StatBar label="Stamina" value={char.stamina} max={char.maxStamina} color="#fbbf24" />
                  </div>
                </div>
              </Card>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {POTIONS.map(p => (
                <Card key={p.id} glow={p.color} style={{ textAlign: "center", padding: 16 }}>
                  <div style={{ fontSize: 36, marginBottom: 6 }}>{p.emoji}</div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: p.color }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", margin: "6px 0" }}>+{p.heal} HP · +{p.stamina} Stamina</div>
                  <PiButton color={p.color} onClick={() => healChar(p)} style={{ width: "100%", padding: "8px" }}>
                    🪙 {p.cost} π
                  </PiButton>
                </Card>
              ))}
            </div>
            {isPremium && (
              <Card glow="#fbbf24" style={{ marginTop: 16, textAlign: "center" }}>
                <div style={{ fontWeight: 700, color: "#fbbf24", marginBottom: 8 }}>⭐ Premium Bonus Items</div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>You get 2× healing items and exclusive Elixirs as a Premium member!</div>
                <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 10 }}>
                  {["🔮 Power Surge", "💉 Nano Heal", "🌟 Aura Boost"].map(item => (
                    <span key={item} style={{ background: "#fbbf2422", border: "1px solid #fbbf2466", borderRadius: 99, padding: "4px 12px", fontSize: 11, color: "#fbbf24" }}>{item}</span>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ── LEADERBOARD ── */}
        {tab === "leaderboard" && (
          <div>
            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
              {[
                { id: "daily", label: "🌅 Daily", premium: true },
                { id: "monthly", label: "📅 Monthly" },
                { id: "alltime", label: "💎 All-Time" },
              ].map(t => (
                <button key={t.id} onClick={() => { if (t.premium && !isPremium) { setPremiumModal(true); return; } setLeaderTab(t.id); }} style={{
                  flex: 1, background: leaderTab === t.id ? "linear-gradient(135deg, #818cf8, #22d3ee)" : "#1e293b",
                  color: leaderTab === t.id ? "#fff" : t.premium && !isPremium ? "#475569" : "#94a3b8",
                  border: "none", borderRadius: 10, padding: "10px 8px",
                  fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 13,
                  cursor: "pointer", position: "relative",
                }}>
                  {t.label}
                  {t.premium && !isPremium && <span style={{ display: "block", fontSize: 9, color: "#fbbf24" }}>⭐ PREMIUM</span>}
                </button>
              ))}
            </div>

            {leaderTab === "daily" && (
              isPremium ? (
              <>
                <Card glow="#fbbf24" style={{ marginBottom: 12, padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "#fbbf24", fontSize: 12, marginBottom: 2 }}>🏆 Daily Prize Pool</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>Top 10 Premium players · resets every 24h</div>
                    </div>

                  </div>
                </Card>
                {daily.map((p, i) => <LeaderRow key={p.id} player={p} rank={i + 1} rewardPi={+(dailyPool * DAILY_REWARD_PCT[i] / 100).toFixed(4)} type="daily" />)}
              </>
              ) : (
                <Card glow="#fbbf24" style={{ textAlign: "center", padding: 32 }}>
                  <div style={{ fontSize: 44 }}>🔒</div>
                  <div style={{ fontFamily: "'Orbitron', sans-serif", color: "#fbbf24", fontWeight: 700, fontSize: 14, margin: "10px 0 6px" }}>Premium Only</div>
                  <div style={{ color: "#64748b", fontSize: 12, marginBottom: 16 }}>Unlock Daily Leaderboard with a Premium subscription</div>
                  <PiButton color="#fbbf24" onClick={() => setTab("premium")} style={{ width: "100%", padding: "10px" }}>⭐ Get Premium — 3π/month</PiButton>
                </Card>
              )
            )}

            {leaderTab === "monthly" && (
              <>
                <Card glow="#22d3ee" style={{ marginBottom: 12, padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "#22d3ee", fontSize: 12 }}>📅 Monthly Leaderboard</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>Entry fee: 2 π · {monthlyPlayers} players joined</div>
                    </div>
                    <PiButton color={monthlyJoined ? "#22c55e" : "#22d3ee"} onClick={joinMonthly} disabled={monthlyJoined} style={{ padding: "8px 14px", fontSize: 12 }}>
                      {monthlyJoined ? "✓ Joined" : "Join 2π"}
                    </PiButton>
                  </div>
                </Card>
                {monthly.map((p, i) => <LeaderRow key={p.id} player={p} rank={i + 1} rewardPi={i < MONTHLY_REWARD_PCT.length ? +(monthlyPool * MONTHLY_REWARD_PCT[i] / 100).toFixed(4) : null} type="monthly" />)}
              </>
            )}

            {leaderTab === "alltime" && (
              <>
                <Card glow="#a78bfa" style={{ marginBottom: 12, padding: 12 }}>
                  <div style={{ fontWeight: 700, color: "#a78bfa", fontSize: 12, marginBottom: 2 }}>💎 All-Time Champions</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>Monthly top 3 receive fixed rewards each cycle.</div><div style={{ marginTop: 6, display: "flex", gap: 10, flexWrap: "wrap" }}>{ALLTIME_REWARDS.map((r,i) => <span key={i} style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 12, color: ["#fbbf24","#94a3b8","#cd7c4e"][i], fontWeight: 700 }}>{["🥇","🥈","🥉"][i]} {r.toFixed(4)}π</span>)}</div>
                </Card>
                {alltime.map((p, i) => <LeaderRow key={p.id} player={p} rank={i + 1} reward={ALLTIME_REWARDS[i]} type="alltime" />)}
              </>
            )}
          </div>
        )}

        {/* ── AI DOCTOR ── */}
        {tab === "doctor" && (
          <div>
            <Card glow="#22d3ee" style={{ marginBottom: 12, padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ position: "relative" }}>
                  <div style={{ width: 52, height: 52, borderRadius: 16, background: "linear-gradient(135deg, #0f172a, #1e293b)", border: "2px solid #22d3ee44", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🩺</div>
                  <div style={{ position: "absolute", bottom: -2, right: -2, width: 14, height: 14, borderRadius: 99, background: "#22c55e", border: "2px solid #020617", boxShadow: "0 0 8px #22c55e" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: 15, color: "#22d3ee" }}>Dr. Pi</div>
                  <div style={{ fontSize: 10, color: "#64748b" }}>Chief Medical Officer · Pi Character Clinic</div>
                  <div style={{ fontSize: 10, color: "#22c55e", marginTop: 2 }}>● Available for consultation</div>
                </div>
                {char && (
                  <div style={{ textAlign: "right", background: "#1e293b", borderRadius: 10, padding: "6px 10px" }}>
                    <div style={{ fontSize: 9, color: "#64748b" }}>PATIENT</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#e2e8f0" }}>{char.name}</div>
                    <div style={{ fontSize: 9, color: char.hp/char.maxHp < 0.25 ? "#ef4444" : char.hp/char.maxHp < 0.5 ? "#f59e0b" : "#22c55e" }}>
                      {char.hp/char.maxHp < 0.25 ? "⚠️ CRITICAL" : char.hp/char.maxHp < 0.5 ? "⚡ WARNING" : "✅ STABLE"}
                    </div>
                  </div>
                )}
              </div>
            </Card>
            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, padding: 16, minHeight: 320, maxHeight: 400, overflowY: "auto", marginBottom: 12 }}>
              {chatHistory.map((m, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 12, justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                  {m.role === "assistant" && <span style={{ fontSize: 20 }}>🩺</span>}
                  <div style={{
                    maxWidth: "80%", padding: "10px 14px", borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    background: m.role === "user" ? "linear-gradient(135deg, #818cf8, #22d3ee)" : "#1e293b",
                    color: "#e2e8f0", fontSize: 13, lineHeight: 1.5,
                  }}>
                    {m.text}
                  </div>
                  {m.role === "user" && <span style={{ fontSize: 20 }}>{char?.avatar || "👤"}</span>}
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 20 }}>🩺</span>
                  <div style={{ padding: "10px 14px", borderRadius: "16px 16px 16px 4px", background: "#1e293b", fontSize: 13, color: "#64748b" }}>Analyzing... ⏳</div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendChat()}
                placeholder="Ask Dr. Pi about your character..."
                style={{
                  flex: 1, background: "#1e293b", border: "1px solid #334155", borderRadius: 12,
                  padding: "10px 14px", color: "#e2e8f0", fontFamily: "'Rajdhani', sans-serif",
                  fontSize: 13, outline: "none",
                }}
              />
              <PiButton color="#22d3ee" onClick={sendChat} disabled={chatLoading} style={{ padding: "10px 16px" }}>
                Send
              </PiButton>
            </div>
            {/* Quick action chips */}
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              {[
                { label: "🩺 Full Diagnosis", msg: "Give me a full medical diagnosis of my character's current condition, including a battle readiness score." },
                { label: "💊 Prescribe", msg: "What potion should I take right now based on my current stats?" },
                { label: "📈 Optimize", msg: "How can I optimize my character's stats to climb the leaderboard?" },
                { label: "⚔️ Battle Ready?", msg: "Is my character ready for battle? Give me a readiness assessment." },
                { label: "🛡️ Defense Tips", msg: "How can I improve my defense stat for my game?" },
                { label: "⚡ Stamina Help", msg: "My stamina is draining too fast. What should I do?" },
              ].map(q => (
                <button key={q.label} onClick={() => sendChat(q.msg)} style={{
                  background: "#1e293b", border: "1px solid #334155", borderRadius: 99,
                  padding: "5px 12px", color: "#94a3b8", fontSize: 11, cursor: "pointer",
                  fontFamily: "'Rajdhani', sans-serif", fontWeight: 600,
                  transition: "all 0.15s",
                }}>
                  {q.label}
                </button>
              ))}
              <button onClick={() => setChatHistory([{ role: "assistant", text: "👋 Consultation reset. I'm Dr. Pi — what can I help your character with today?" }])} style={{
                background: "transparent", border: "1px solid #334155", borderRadius: 99,
                padding: "5px 12px", color: "#475569", fontSize: 11, cursor: "pointer",
                fontFamily: "'Rajdhani', sans-serif",
              }}>
                🗑️ Clear
              </button>
            </div>
          </div>
        )}

        {/* ── PREMIUM ── */}
        {tab === "premium" && (
          <div>
            <Card glow="#fbbf24" style={{ textAlign: "center", marginBottom: 16, padding: 28 }}>
              <div style={{ fontSize: 52, marginBottom: 8 }}>⭐</div>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: 22, background: "linear-gradient(90deg, #fbbf24, #f59e0b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                PREMIUM
              </div>
              <div style={{ fontSize: 13, color: "#94a3b8", margin: "8px 0 16px" }}>Unlock elite features and dominate the leaderboards</div>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 28, color: "#fbbf24", fontWeight: 900 }}>3 π<span style={{ fontSize: 14, color: "#64748b" }}>/month</span></div>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 16 }}>Auto-renews 48h before month end</div>
              {isPremium ? (
                <div style={{ background: "#22c55e22", border: "1px solid #22c55e66", borderRadius: 12, padding: "10px", color: "#22c55e", fontWeight: 700 }}>✓ Active Subscription</div>
              ) : (
                <PiButton color="#fbbf24" onClick={buyPremium} style={{ width: "100%", padding: "14px", fontSize: 16 }}>
                  🪙 Subscribe for 3 π
                </PiButton>
              )}
            </Card>
            <div style={{ fontWeight: 700, color: "#94a3b8", fontSize: 12, letterSpacing: 1, marginBottom: 10 }}>PREMIUM BENEFITS</div>
            {[
              { icon: "🌅", title: "Daily Leaderboard Access", desc: "Compete for daily Pi rewards (premium only)" },
              { icon: "💊", title: "Extra Healing Items", desc: "2× potions + exclusive Power Surge and Nano Heal" },
              { icon: "🏅", title: "Special Badges", desc: "Exclusive shiny Premium badge on your profile" },
              { icon: "🩺", title: "Priority AI Doctor", desc: "Faster responses and deeper character analysis" },
              { icon: "🪙", title: "Daily Pi Rewards", desc: "Share from the daily prize pool based on your rank" },
            ].map(b => (
              <Card key={b.title} style={{ marginBottom: 10, padding: 14, display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ fontSize: 28 }}>{b.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{b.title}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{b.desc}</div>
                </div>
                {isPremium && <span style={{ marginLeft: "auto", color: "#22c55e" }}>✓</span>}
              </Card>
            ))}

            <div style={{ fontWeight: 700, color: "#94a3b8", fontSize: 12, letterSpacing: 1, margin: "16px 0 10px" }}>REWARD POOLS</div>
            <Card glow="#818cf8">
              <div style={{ fontWeight: 700, color: "#818cf8", marginBottom: 10 }}>Daily Leaderboard Rewards</div>
              {DAILY_REWARDS.map((r, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #1e293b", fontSize: 13 }}>
                  <span style={{ color: ["#fbbf24", "#94a3b8", "#cd7c4e"][i] || "#64748b" }}>
                    {["🥇", "🥈", "🥉"][i] || `#${i + 1}`} Rank {i + 1}
                  </span>
                  <span style={{ color: "#22d3ee" }}>{(+(dailyPool * r / 100)).toFixed(4)}π</span>
                </div>
              ))}
            </Card>
          </div>
        )}
      </div>

      {/* ── MODALS ── */}

      {/* Import Character */}
      <Modal open={importModal} onClose={() => setImportModal(false)} title="⬇️ Import Character">
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 6 }}>Character Name</label>
          <input value={importForm.name} onChange={e => setImportForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Enter character name..."
            style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "10px 12px", color: "#e2e8f0", fontFamily: "'Rajdhani', sans-serif", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 6 }}>Select Game</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {GAMES.map(g => (
              <button key={g.id} onClick={() => setImportForm(f => ({ ...f, game: g.id }))} style={{
                background: importForm.game === g.id ? `${g.color}33` : g.featured ? "#1e0a2e" : "#1e293b",
                border: `1px solid ${importForm.game === g.id ? g.color : g.featured ? "#e879f944" : "#334155"}`,
                borderRadius: 10, padding: "8px", color: importForm.game === g.id ? g.color : g.featured ? "#e879f9" : "#94a3b8",
                cursor: "pointer", fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 12,
                gridColumn: g.featured ? "1 / -1" : "auto",
                boxShadow: g.featured ? "0 0 12px #e879f922" : "none",
                position: "relative",
              }}>
                {g.emoji} {g.name}
                {g.featured && <span style={{ marginLeft: 6, background: "#e879f9", color: "#000", borderRadius: 99, padding: "1px 7px", fontSize: 9, fontWeight: 800 }}>FEATURED · SCREENSHOT IMPORT</span>}
              </button>
            ))}
          </div>
        </div>
        {/* CiDi Screenshot Import */}
        {importForm.game === "cidi" && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>🎮</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#e879f9" }}>CiDi Quick Import</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>Upload your CiDi profile screenshot — AI reads your stats automatically</div>
              </div>
            </div>
            <label style={{
              display: "block", background: screenshotFile ? "#1e293b" : "#0f172a",
              border: `2px dashed ${screenshotFile ? "#e879f9" : "#334155"}`,
              borderRadius: 12, padding: 16, textAlign: "center", cursor: "pointer",
              transition: "all 0.2s",
            }}>
              <input type="file" accept="image/*" style={{ display: "none" }}
                onChange={e => {
                  const f = e.target.files[0];
                  if (f) { setScreenshotFile(f); analyzeScreenshot(f); }
                }} />
              {screenshotAnalyzing ? (
                <div>
                  <div style={{ fontSize: 28 }}>🔍</div>
                  <div style={{ color: "#e879f9", fontSize: 12, marginTop: 6 }}>Reading your CiDi stats...</div>
                  <div style={{ color: "#64748b", fontSize: 10 }}>AI is analyzing your screenshot</div>
                </div>
              ) : screenshotResult ? (
                <div>
                  <div style={{ fontSize: 24 }}>✅</div>
                  <div style={{ color: "#22c55e", fontSize: 12, fontWeight: 700, marginTop: 4 }}>Stats detected!</div>
                  <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 6, flexWrap: "wrap" }}>
                    {screenshotResult.hp && <span style={{ background: "#ef444422", color: "#ef4444", borderRadius: 99, padding: "2px 8px", fontSize: 10 }}>❤️ {screenshotResult.hp} HP</span>}
                    {screenshotResult.stamina && <span style={{ background: "#fbbf2422", color: "#fbbf24", borderRadius: 99, padding: "2px 8px", fontSize: 10 }}>⚡ {screenshotResult.stamina} ST</span>}
                    {screenshotResult.defense && <span style={{ background: "#22d3ee22", color: "#22d3ee", borderRadius: 99, padding: "2px 8px", fontSize: 10 }}>🛡️ {screenshotResult.defense} DEF</span>}
                  </div>
                  <div style={{ fontSize: 9, color: "#64748b", marginTop: 4 }}>Confidence: {screenshotResult.confidence || "medium"} · Tap to change</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 32 }}>📸</div>
                  <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 6 }}>Tap to upload CiDi screenshot</div>
                  <div style={{ color: "#475569", fontSize: 10, marginTop: 2 }}>AI will read HP, Stamina, Defense & Level</div>
                </div>
              )}
            </label>
            {screenshotResult && (
              <div style={{ marginTop: 8, padding: "8px 12px", background: "#e879f911", border: "1px solid #e879f944", borderRadius: 10 }}>
                <div style={{ fontSize: 11, color: "#e879f9", fontWeight: 700 }}>🎮 CiDi character detected — stats auto-filled below!</div>
              </div>
            )}
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 6 }}>Character Level</label>
          <input type="number" min="1" max="999" value={importForm.level} onChange={e => setImportForm(f => ({ ...f, level: e.target.value }))}
            style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "10px 12px", color: "#e2e8f0", fontFamily: "'Rajdhani', sans-serif", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 6 }}>Avatar Emoji (optional)</label>
          <input value={importForm.avatar} onChange={e => setImportForm(f => ({ ...f, avatar: e.target.value }))}
            placeholder="e.g. 🦊 🐉 ⚔️"
            style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "10px 12px", color: "#e2e8f0", fontFamily: "'Rajdhani', sans-serif", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
        </div>
        {importForm.name && (
          <Card style={{ marginBottom: 14, padding: 12, background: "#1e293b" }}>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>Generated Stats Preview</div>
            {(() => { const s = genStats(importForm.game, importForm.level); return (
              <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
                <span>❤️ {s.hp} HP</span>
                <span>⚡ {s.stamina} Stamina</span>
                <span>🛡️ {s.defense} DEF</span>
              </div>
            ); })()}
          </Card>
        )}
        <PiButton color="#06b6d4" onClick={importCharacter} style={{ width: "100%", padding: "12px" }}>Import Character 🎮</PiButton>
      </Modal>

      {/* Heal Modal */}
      <Modal open={healModal} onClose={() => setHealModal(false)} title="💊 Heal Character">
        {char && (
          <>
            <div style={{ marginBottom: 14 }}>
              <StatBar label="❤️ HP" value={char.hp} max={char.maxHp} color="#ef4444" />
              <StatBar label="⚡ Stamina" value={char.stamina} max={char.maxStamina} color="#fbbf24" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {POTIONS.map(p => (
                <div key={p.id} onClick={() => healChar(p)} style={{
                  background: "#1e293b", border: `1px solid ${p.color}55`, borderRadius: 12,
                  padding: 14, cursor: "pointer", textAlign: "center",
                  boxShadow: `0 0 10px ${p.color}22`,
                }}>
                  <div style={{ fontSize: 30 }}>{p.emoji}</div>
                  <div style={{ fontWeight: 700, color: p.color, fontSize: 13, marginTop: 4 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", margin: "4px 0" }}>+{p.heal}HP +{p.stamina}SP</div>
                  <div style={{ color: "#fbbf24", fontWeight: 700, fontSize: 13 }}>🪙 {p.cost}π</div>
                </div>
              ))}
            </div>
          </>
        )}
      </Modal>

      {/* Premium Modal */}
      <Modal open={premiumModal} onClose={() => setPremiumModal(false)} title="⭐ Premium Required">
        <div style={{ textAlign: "center", padding: "10px 0 20px" }}>
          <div style={{ fontSize: 52 }}>🔒</div>
          <div style={{ color: "#94a3b8", margin: "10px 0 20px" }}>Daily Leaderboard is exclusive to Premium members. Upgrade to compete for daily Pi rewards!</div>
          <PiButton color="#fbbf24" onClick={() => { setPremiumModal(false); setTab("premium"); }} style={{ width: "100%", padding: "12px", fontSize: 15 }}>
            View Premium Plans ⭐
          </PiButton>
        </div>
      </Modal>

      {/* AI Doctor Modal (quick access) */}
      <Modal open={aiModal} onClose={() => setAiModal(false)} title="🩺 Dr. Pi">
        <div style={{ textAlign: "center", padding: "10px 0" }}>
          <div style={{ fontSize: 48 }}>🩺</div>
          <div style={{ color: "#94a3b8", margin: "10px 0 20px" }}>Head to the AI Doctor tab for a full consultation with Dr. Pi!</div>
          <PiButton color="#22d3ee" onClick={() => { setAiModal(false); setTab("doctor"); }} style={{ width: "100%", padding: "12px" }}>Open AI Doctor</PiButton>
        </div>
      </Modal>

      {/* FOOTER */}
      <div style={{ borderTop: "1px solid #1e293b", marginTop: 32, padding: "20px 16px", textAlign: "center", background: "#020617" }}>
        <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 12, color: "#334155", marginBottom: 10, letterSpacing: 1 }}>PI CHARACTER CLINIC © 2025</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 20 }}>
          <button onClick={() => setLegalPage("privacy")} style={{ background: "none", border: "none", color: "#64748b", fontSize: 12, cursor: "pointer", fontFamily: "'Rajdhani', sans-serif", textDecoration: "underline" }}>
            Privacy Policy
          </button>
          <button onClick={() => setLegalPage("terms")} style={{ background: "none", border: "none", color: "#64748b", fontSize: 12, cursor: "pointer", fontFamily: "'Rajdhani', sans-serif", textDecoration: "underline" }}>
            Terms of Service
          </button>
        </div>
        <div style={{ fontSize: 10, color: "#1e293b", marginTop: 8 }}>
          picharacterclinic.vercel.app/privacy · picharacterclinic.vercel.app/terms
        </div>
      </div>

      {/* LEGAL PAGE OVERLAY */}
      {legalPage && <LegalPage type={legalPage} onClose={() => setLegalPage(null)} />}
    </div>
  );
}

// ── Legal Page ─────────────────────────────────────────────────────────────────
function LegalPage({ type, onClose }) {
  const isPrivacy = type === "privacy";
  const url = isPrivacy
    ? "https://picharacterclinic.vercel.app/privacy"
    : "https://picharacterclinic.vercel.app/terms";

  return (
    <div style={{ position: "fixed", inset: 0, background: "#020617", zIndex: 2000, overflowY: "auto" }}>
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 16px 40px" }}>
        {/* Header */}
        <div style={{ position: "sticky", top: 0, background: "#020617", borderBottom: "1px solid #1e293b", padding: "14px 0", display: "flex", alignItems: "center", gap: 12, zIndex: 10 }}>
          <button onClick={onClose} style={{ background: "#1e293b", border: "none", color: "#94a3b8", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 13 }}>
            ← Back
          </button>
          <div>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: 15, color: "#e2e8f0" }}>
              {isPrivacy ? "🔒 Privacy Policy" : "📜 Terms of Service"}
            </div>
            <div style={{ fontSize: 10, color: "#22d3ee" }}>{url}</div>
          </div>
        </div>

        <div style={{ paddingTop: 20, fontFamily: "'Rajdhani', sans-serif", lineHeight: 1.7, color: "#94a3b8", fontSize: 14 }}>
          <div style={{ fontSize: 11, color: "#475569", marginBottom: 20 }}>
            Last updated: May 27, 2025 · Effective immediately
          </div>

          {isPrivacy ? (
            <>
              <LegalSection title="1. Introduction">
                Pi Character Clinic ("we", "our", or "us") is a gaming medical hub built on the Pi Network ecosystem, developed by @scephask. This Privacy Policy explains how we collect, use, and protect your personal information when you use our application accessible via the Pi Browser.
              </LegalSection>
              <LegalSection title="2. Information We Collect">
                We collect information you provide directly, including your Pi Network username, character names, selected games, character levels, and avatar preferences. We also collect gameplay data such as health points (HP), stamina, defense stats, leaderboard scores, healing activity, and subscription status. We do not collect passwords or sensitive financial information beyond Pi transaction identifiers provided by the Pi Network SDK.
              </LegalSection>
              <LegalSection title="3. Pi Network Payments">
                All payments are processed exclusively through the official Pi Network payment infrastructure. We receive transaction identifiers to verify and fulfill purchases (potions, Premium subscriptions, leaderboard entry fees). We do not store your Pi wallet details or private keys. Pi payment data is governed by Pi Network's own privacy policy at minepi.com/privacy-policy.
              </LegalSection>
              <LegalSection title="4. How We Use Your Information">
                We use collected data to: operate and maintain your account and characters; process Pi payments and issue rewards; calculate leaderboard rankings and distribute prizes; provide AI Doctor responses via the Claude AI API (character stats are sent anonymously); send in-app notifications about subscription renewals 48 hours before month end; and improve app features and gameplay balance.
              </LegalSection>
              <LegalSection title="5. AI Doctor (Claude API)">
                The AI Doctor feature is powered by Anthropic's Claude AI. When you use this feature, your character's stats (name, game, HP, stamina, defense, level) are sent to Anthropic's API to generate responses. No personally identifiable information beyond character data is transmitted. Anthropic's data practices are governed by their privacy policy at anthropic.com/privacy.
              </LegalSection>
              <LegalSection title="6. Leaderboard & Public Data">
                Your Pi username, character name, game, score, rank, and earned badges may be visible to other users on public leaderboards (Monthly and All-Time). Daily leaderboard data is visible to Premium subscribers only. You consent to this display by participating in leaderboard competitions.
              </LegalSection>
              <LegalSection title="7. Data Retention">
                We retain your account and character data for as long as your account is active. Leaderboard history and winner badges are retained permanently as part of the app's historical record. You may request deletion of your personal data by contacting us — note that leaderboard records may be anonymized rather than deleted to preserve score integrity.
              </LegalSection>
              <LegalSection title="8. Security">
                We implement industry-standard security measures to protect your data. However, no method of transmission over the internet is 100% secure. We encourage you to use a strong Pi Network account password and to report any suspicious activity immediately.
              </LegalSection>
              <LegalSection title="9. Children's Privacy">
                Pi Character Clinic is not directed at children under 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal data, please contact us immediately.
              </LegalSection>
              <LegalSection title="10. Changes to This Policy">
                We may update this Privacy Policy from time to time. We will notify users of significant changes via an in-app notification. Continued use of the app after changes constitutes acceptance of the updated policy.
              </LegalSection>
              <LegalSection title="11. Contact Us">
                For privacy-related inquiries, contact the developer: @scephask on Pi Network. App URL: https://picharacterclinic.vercel.app
              </LegalSection>
            </>
          ) : (
            <>
              <LegalSection title="1. Acceptance of Terms">
                By accessing or using Pi Character Clinic ("the App"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the App. The App is available through the Pi Browser on the Pi Network platform.
              </LegalSection>
              <LegalSection title="2. Eligibility">
                You must be a verified Pi Network member to use this App. By using the App, you represent that your Pi Network account is in good standing and that you are authorized to make Pi transactions from your account.
              </LegalSection>
              <LegalSection title="3. Virtual Characters & Game Content">
                Characters, stats, items, and in-app content are virtual and have no real-world monetary value outside of Pi Network reward distributions described herein. Cross-game character imports are simulations — we are not affiliated with Free Fire, Genshin Impact, PUBG, Roblox, COD Mobile, Valorant, Minecraft, Fortnite, or any other game title. Imported stats are algorithmically generated estimates.
              </LegalSection>
              <LegalSection title="4. Pi Payments & Subscriptions">
                All transactions are made in Pi cryptocurrency via the official Pi Network SDK. Healing items (0.15π–0.90π) are consumed immediately upon purchase and are non-refundable. Premium subscription is 3π per month, auto-renewing 48 hours before the end of each month. Monthly leaderboard entry fee is 2π, non-refundable once joined. All Pi transactions are final and subject to Pi Network's transaction policies.
              </LegalSection>
              <LegalSection title="5. Leaderboard Rewards">
                Reward distributions are calculated as follows. Daily Leaderboard (Premium only): top 10 players share percentages of the daily pool (Rank 1: 0.9994%, Rank 2: 0.6991%, Rank 3: 0.4890%, Rank 4: 0.3420%, Rank 5: 0.2392%, Rank 6: 0.1673%, Rank 7: 0.1170%, Rank 8: 0.0818%, Rank 9: 0.0572%, Rank 10: 0.0401%). Monthly Leaderboard: top 6 share percentages of the monthly pool (Rank 1: 1.1004%, Rank 2: 0.7698%, Rank 3: 0.5384%, Rank 4: 0.3765%, Rank 5: 0.2634%, Rank 6: 0.1842%). All-Time top 3 receive monthly fixed rewards: 1st: 4.571429π, 2nd: 2.285714π, 3rd: 1.142857π. Rewards are distributed at the end of each cycle. We reserve the right to adjust pool sizes and percentages with 7 days' notice.
              </LegalSection>
              <LegalSection title="6. Prohibited Conduct">
                You agree not to: use bots, scripts, or automated tools to manipulate leaderboard scores; create multiple accounts to abuse rewards; attempt to reverse-engineer, hack, or exploit the App; use the AI Doctor feature for any purpose other than in-app character advice; engage in any activity that disrupts the App or other users' experience.
              </LegalSection>
              <LegalSection title="7. Winner Badges">
                Champion badges are awarded to top-ranked players at the end of each leaderboard cycle. Badges are permanent and displayed on profiles and leaderboards. We reserve the right to revoke badges if a win is found to be obtained through prohibited conduct.
              </LegalSection>
              <LegalSection title="8. Disclaimer of Warranties">
                The App is provided "as is" without warranties of any kind. We do not guarantee uninterrupted availability, error-free operation, or specific leaderboard outcomes. Pi rewards are subject to Pi Network's infrastructure and may be delayed or affected by network conditions.
              </LegalSection>
              <LegalSection title="9. Limitation of Liability">
                To the fullest extent permitted by law, Pi Character Clinic and its developer (@scephask) shall not be liable for any indirect, incidental, or consequential damages arising from your use of the App, including loss of Pi, loss of character data, or missed leaderboard rewards due to technical issues.
              </LegalSection>
              <LegalSection title="10. Modifications">
                We reserve the right to modify these Terms at any time. Significant changes will be communicated via in-app notice. Continued use after changes constitutes acceptance.
              </LegalSection>
              <LegalSection title="11. Governing Law">
                These Terms are governed by the rules of the Pi Network developer platform. Disputes shall first be addressed through Pi Network's dispute resolution mechanisms.
              </LegalSection>
              <LegalSection title="12. Contact">
                For terms-related inquiries: @scephask on Pi Network. App: https://picharacterclinic.vercel.app
              </LegalSection>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function LegalSection({ title, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 12, color: "#818cf8", fontWeight: 700, marginBottom: 8, letterSpacing: 0.5 }}>{title}</div>
      <div style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.8 }}>{children}</div>
    </div>
  );
}

// ── Leaderboard Row ────────────────────────────────────────────────────────────
function LeaderRow({ player, rank, rewardPi, reward, type }) {
  const isTop3 = rank <= 3;
  const colors = ["#fbbf24", "#94a3b8", "#cd7c4e"];
  const icons = ["🥇", "🥈", "🥉"];
  const displayReward = rewardPi != null ? rewardPi : reward;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      background: isTop3 ? `${colors[rank - 1]}11` : "#0f172a",
      border: `1px solid ${isTop3 ? colors[rank - 1] + "44" : "#1e293b"}`,
      borderRadius: 12, padding: "10px 12px", marginBottom: 8,
      boxShadow: isTop3 ? `0 0 12px ${colors[rank - 1]}22` : "none",
    }}>
      <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: 14, color: isTop3 ? colors[rank - 1] : "#475569", width: 28, textAlign: "center" }}>
        {isTop3 ? icons[rank - 1] : `#${rank}`}
      </div>
      <div style={{ fontSize: 24 }}>{player.avatar}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#e2e8f0" }}>{player.name}</div>
        <div style={{ fontSize: 11, color: "#64748b" }}>{player.game}</div>
        <div style={{ marginTop: 2 }}>{player.badge && <BadgePill badge={player.badge} />}{player.isPremium && <BadgePill badge={BADGES.premium} />}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, color: "#e2e8f0", fontWeight: 700 }}>{player.score.toLocaleString()}</div>
        {displayReward != null && (
          <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 12, color: "#fbbf24", fontWeight: 700 }}>
            🪙 {Number(displayReward).toFixed(4)}π
          </div>
        )}

      </div>
    </div>
  );
}
