import { useState, useEffect, useRef, useMemo } from "react";

// ————————————————————————————————————————————————
// Working Set v11 — in-workout companion prototype
// v11 change:
//  - The precision scroller now also works with a mouse on
//    desktop: vertical wheel scrubs it horizontally, click-and-
//    drag scrubs it, and arrow / Page / Home-End keys nudge it.
//    Touch on phones is unchanged (native horizontal swipe).
// v10: replaced the weight/minutes slider with a 1-unit
//     precision scroll ruler (last-time grey / PB amber ticks).
// v9: mid-workout adds slot in right after the current exercise.
// v8: removed sparklines; add-exercise sheet; full set detail in
//     summary/history, no deltas.
// v7: Change sheet spans all muscle groups (others collapsed).
// v6: bodyweight support (0 = BW) with falsy-zero fixes.
// v5: stripped all remaining prescription; duration = first-to-
//     last logged set.
// All data lives in memory for this prototype.
// ————————————————————————————————————————————————

const C = {
  floor: "#171512",
  surface: "#211E1A",
  raised: "#2B2620",
  line: "#3A342C",
  chalk: "#EFE9DD",
  dust: "#9C9284",
  cobalt: "#4E79E8",
  amber: "#E3A93C",
  amberDim: "#2A2312",
  sage: "#8CB474",
  sageDim: "#1E2418",
};

const PATTERNS = [
  [-4, -3, -2, -1, 0],
  [-3, -2, -2, -1, 0],
  [-2, -2, -1, -1, 0],
  [-3, -3, -2, -1, 0],
];
const mkHist = (lastV, step, seed) =>
  PATTERNS[seed % PATTERNS.length].map((k) => Math.max(step, lastV + k * step));

// Weights: [name, min, max, step, lastSession, reps, rest, cues]
// Cardio:  [name, min, max, step, lastSession, cues]
const GROUP_DEFS = [
  {
    id: "back", label: "Back", hint: "Rows, pulldowns, hinges",
    items: [
      ["Lat pulldown", 40, 200, 5, 100, 10, 90, ["Drive elbows down to your ribs", "Chest up, slight lean back"]],
      ["Seated cable row", 40, 200, 5, 105, 10, 90, ["Pull to your belly button", "Squeeze shoulder blades, don't shrug"]],
      ["Barbell bent-over row", 45, 225, 5, 115, 8, 120, ["Flat back, hinge at the hips", "Pull the bar to your lower ribs"]],
      ["One-arm dumbbell row", 15, 110, 5, 50, 10, 75, ["Pull with your elbow, not your hand", "Keep hips square to the bench"]],
      ["T-bar row", 25, 180, 5, 90, 10, 90, ["Chest up, neutral spine", "Drive elbows back, squeeze at the top"]],
      ["Chest-supported row", 20, 160, 5, 70, 10, 90, ["Keep your chest glued to the pad", "Pause and squeeze at the top"]],
      ["Close-grip pulldown", 40, 200, 5, 95, 10, 75, ["Elbows tight to your sides", "Full stretch at the top"]],
      ["Straight-arm pulldown", 20, 100, 5, 50, 12, 60, ["Soft elbows, locked in place", "Sweep the bar to your thighs"]],
      ["Deadlift", 95, 405, 5, 185, 6, 180, ["Bar over mid-foot, lats tight", "Push the floor away", "Lock out with glutes, don't lean back"]],
      ["Weighted back extension", 10, 90, 5, 25, 12, 60, ["Hinge at hips, not lower back", "Squeeze glutes at the top"]],
    ],
  },
  {
    id: "chest", label: "Chest", hint: "Presses and flys",
    items: [
      ["Barbell bench press", 45, 315, 5, 135, 8, 120, ["Arch your back, plant your feet", "Bar to mid-chest, wrists stacked", "Drive through the floor"]],
      ["Incline barbell press", 45, 275, 5, 115, 8, 120, ["Touch just below the collarbone", "Tuck elbows about 45 degrees"]],
      ["Dumbbell bench press", 15, 120, 5, 60, 10, 90, ["Elbows at 45, not flared", "Press up and slightly together"]],
      ["Incline dumbbell press", 15, 110, 5, 55, 10, 90, ["Pin shoulder blades back", "Lower to upper chest, full stretch"]],
      ["Machine chest press", 20, 250, 10, 110, 10, 75, ["Set handles at mid-chest height", "Don't lock elbows at the top"]],
      ["Smith machine press", 45, 225, 5, 105, 10, 90, ["Feet planted, glutes on the bench", "Control the bar down, no bounce"]],
      ["Cable fly", 10, 90, 5, 35, 12, 60, ["Lock a soft bend in your elbows", "Hug a barrel, squeeze at center"]],
      ["Pec deck", 10, 200, 5, 90, 12, 60, ["Elbows slightly below shoulders", "Open slowly, feel the stretch"]],
      ["Dumbbell fly", 10, 60, 5, 30, 12, 60, ["Soft elbows locked throughout", "Stop at chest level on the way down"]],
      ["Decline barbell press", 45, 275, 5, 125, 8, 120, ["Grip slightly wider than flat bench", "Touch the lower chest, drive up"]],
    ],
  },
  {
    id: "shoulders", label: "Shoulders", hint: "Presses and raises",
    items: [
      ["Barbell overhead press", 45, 185, 5, 85, 8, 120, ["Squeeze glutes, ribs down", "Push your head through at lockout"]],
      ["Seated dumbbell press", 10, 100, 5, 45, 10, 90, ["Back flat against the pad", "Lower to ear level, no lower"]],
      ["Arnold press", 10, 80, 5, 35, 10, 90, ["Rotate palms as you press", "Keep the arc smooth, no jerk"]],
      ["Machine shoulder press", 20, 200, 10, 80, 10, 75, ["Handles level with ears to start", "Don't slam the lockout"]],
      ["Lateral raise", 5, 50, 5, 20, 12, 60, ["Lead with elbows, not hands", "Stop at shoulder height", "No swinging from the hips"]],
      ["Cable lateral raise", 5, 40, 5, 15, 12, 60, ["Slight lean away from the stack", "Control the negative"]],
      ["Front raise", 5, 50, 5, 20, 12, 60, ["Raise to eye level only", "Keep your torso still"]],
      ["Rear-delt fly", 5, 60, 5, 25, 12, 60, ["Hinge forward, chest proud", "Lead with elbows out wide"]],
      ["Face pull", 10, 80, 5, 40, 15, 60, ["Pull the rope to your forehead", "End with thumbs pointing back"]],
      ["Cable upright row", 20, 100, 5, 50, 10, 75, ["Elbows above wrists always", "Pull to chest height, not chin"]],
    ],
  },
  {
    id: "biceps", label: "Biceps", hint: "Curls of every kind",
    items: [
      ["Barbell curl", 20, 110, 5, 50, 10, 60, ["Pin elbows to your sides", "No swinging, control the negative"]],
      ["EZ-bar curl", 20, 100, 5, 45, 10, 60, ["Wrists neutral on the angle", "Squeeze hard at the top"]],
      ["Dumbbell curl", 10, 60, 5, 25, 10, 60, ["Rotate pinky up as you curl", "Full extension at the bottom"]],
      ["Hammer curl", 10, 60, 5, 30, 12, 60, ["Neutral grip the whole way", "Elbows stay still, no drift"]],
      ["Incline dumbbell curl", 10, 50, 5, 20, 10, 60, ["Let arms hang fully back", "Curl without moving the upper arm"]],
      ["Preacher curl", 20, 90, 5, 40, 10, 60, ["Armpits tight to the pad", "Don't slam the bottom stretch"]],
      ["Cable curl", 10, 100, 5, 45, 12, 60, ["Step back for constant tension", "Elbows fixed at your sides"]],
      ["Concentration curl", 10, 50, 5, 20, 12, 45, ["Brace elbow on inner thigh", "Slow twist and squeeze at the top"]],
    ],
  },
  {
    id: "triceps", label: "Triceps", hint: "Pushdowns, extensions",
    items: [
      ["Triceps pushdown", 10, 110, 5, 50, 12, 60, ["Elbows pinned to your sides", "Full lockout, pause at the bottom"]],
      ["Rope pushdown", 10, 100, 5, 45, 12, 60, ["Split the rope at the bottom", "Shoulders down and back"]],
      ["Overhead cable extension", 10, 80, 5, 40, 12, 60, ["Elbows close to your head", "Full stretch behind, then extend"]],
      ["Skull crushers", 20, 100, 5, 50, 10, 75, ["Lower to forehead or just behind", "Keep upper arms vertical"]],
      ["Close-grip bench press", 45, 225, 5, 105, 8, 90, ["Hands just inside shoulder width", "Elbows track along your ribs"]],
      ["Single-arm pushdown", 5, 50, 5, 20, 12, 45, ["Square hips and shoulders", "Turn the palm down at lockout"]],
      ["Dumbbell kickback", 5, 40, 5, 15, 12, 45, ["Upper arm parallel to the floor", "Lock out fully, pause a beat"]],
      ["Machine dip", 20, 200, 10, 90, 10, 75, ["Shoulders down away from ears", "Lean slightly forward, press through"]],
    ],
  },
  {
    id: "legs", label: "Legs", hint: "Squats, hinges, machines",
    items: [
      ["Back squat", 45, 405, 5, 165, 8, 150, ["Brace hard before you descend", "Knees track over toes", "Drive up through mid-foot"]],
      ["Leg press", 90, 630, 10, 320, 10, 120, ["Lower until thighs hit 90", "Never lock your knees at the top"]],
      ["Romanian deadlift", 45, 315, 5, 145, 10, 120, ["Push hips back, soft knees", "Bar stays close to your legs", "Stop at the hamstring stretch"]],
      ["Front squat", 45, 275, 5, 115, 8, 150, ["Elbows high, chest proud", "Sit straight down between your heels"]],
      ["Hack squat", 45, 360, 10, 180, 10, 120, ["Back flat against the pad", "Full depth, controlled tempo"]],
      ["Hip thrust", 45, 405, 5, 185, 10, 90, ["Chin tucked, ribs down", "Squeeze glutes hard at lockout"]],
      ["Bulgarian split squat", 10, 80, 5, 35, 10, 90, ["Front foot well forward", "Drop straight down, load the front heel"]],
      ["Walking lunge", 10, 80, 5, 30, 12, 75, ["Torso tall, core braced", "Push through the front heel"]],
      ["Leg extension", 20, 200, 5, 90, 12, 75, ["Pause and squeeze at the top", "Lower slow, don't drop the stack"]],
      ["Lying leg curl", 20, 160, 5, 85, 12, 75, ["Hips stay pinned to the pad", "Curl to full contraction"]],
      ["Seated leg curl", 20, 180, 5, 95, 12, 75, ["Thigh pad locked down tight", "Squeeze hard at full bend"]],
      ["Standing calf raise", 20, 200, 5, 115, 15, 60, ["Full stretch at the bottom", "Pause one second at the top"]],
      ["Seated calf raise", 10, 140, 5, 70, 15, 60, ["Slow negatives, deep stretch", "Drive through the balls of your feet"]],
    ],
  },
  {
    id: "core", label: "Core", hint: "Loaded ab work",
    items: [
      ["Cable crunch", 20, 120, 5, 60, 15, 60, ["Round your spine, hips still", "Pull with abs, not arms"]],
      ["Machine crunch", 20, 160, 5, 70, 15, 60, ["Exhale hard as you crunch", "Control the return, no slamming"]],
      ["Cable woodchop", 10, 80, 5, 35, 12, 60, ["Rotate from your torso", "Arms stay long and straight"]],
      ["Weighted Russian twist", 10, 60, 5, 25, 20, 45, ["Lean back, chest up", "Rotate shoulders, not just arms"]],
      ["Torso rotation machine", 20, 140, 5, 60, 15, 45, ["Slow and controlled both ways", "Keep hips locked forward"]],
      ["Weighted decline sit-up", 10, 70, 5, 25, 15, 60, ["Hug the plate to your chest", "Lower slow, no flopping"]],
    ],
  },
  {
    id: "cardio", label: "Light cardio", hint: "Minutes-based finisher", cardio: true,
    items: [
      ["Bike (steady pace)", 5, 40, 1, 20, ["Easy conversational pace", "Zone 2, nose breathing"]],
      ["Incline treadmill walk", 5, 40, 1, 20, ["No holding the handles", "Tall posture, steady stride"]],
      ["Rowing machine", 5, 30, 1, 15, ["Legs, then body, then arms", "Damper low, smooth strokes"]],
      ["Elliptical", 5, 40, 1, 20, ["Push and pull the handles", "Steady cadence throughout"]],
      ["Stair climber", 5, 30, 1, 12, ["Light grip, stand tall", "Step with the full foot, not toes"]],
    ],
  },
];

const EX = {};
const INITIAL_LISTS = {};
const GROUPS = GROUP_DEFS.map((g) => {
  INITIAL_LISTS[g.id] = g.items.map((it, i) => {
    const id = `${g.id}${i}`;
    const seed = i + g.id.length;
    if (g.cardio) {
      const [name, min, max, step, lastV, cues] = it;
      const hist = mkHist(lastV, 2, seed).map((v) => Math.max(min, v));
      EX[id] = { name, min, max, step, history: hist, reps: 0, rest: 0, kind: "cardio", group: g.id, pb: Math.max(...hist) + (seed % 2) * 3, cues: cues || [] };
    } else {
      const [name, min, max, step, lastV, reps, rest, cues] = it;
      const hist = mkHist(lastV, step, seed);
      EX[id] = { name, min, max, step, history: hist, reps, rest, kind: "weight", group: g.id, pb: Math.max(...hist) + (seed % 2) * step, cues: cues || [] };
    }
    return id;
  });
  return { id: g.id, label: g.label, hint: g.hint, cardio: !!g.cardio };
});
const GROUP_BY_ID = Object.fromEntries(GROUPS.map((g) => [g.id, g]));

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const last = (arr) => arr[arr.length - 1];
const fmtClock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const fmtW = (v) => (v === 0 ? "BW" : `${v} lb`); // 0 lb = bodyweight
const fmtSet = (s) => ("min" in s ? `${s.min} min` : `${s.w === 0 ? "BW" : s.w} x ${s.r}`);
const fmtDate = (iso) => {
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y}`;
};
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// ——— mock past workouts (power History + "last time" highlighting) ———
const mkSets = (id) => {
  const ex = EX[id];
  const lv = last(ex.history);
  if (ex.kind === "cardio") return [{ min: lv }];
  return [
    { w: Math.max(ex.step, lv - ex.step), r: ex.reps },
    { w: lv, r: ex.reps },
    { w: lv, r: Math.max(1, ex.reps - 2) },
  ];
};
const H = (date, groups, durMin, ids) => ({
  date, groups, durMin,
  entries: ids.map((id) => ({ id, name: EX[id].name, kind: EX[id].kind, sets: mkSets(id) })),
});
const MOCK_HISTORY = [
  H("2026-09-03", ["back", "biceps"], 48, ["back0", "back1", "back3", "biceps0", "biceps3"]),
  H("2026-09-01", ["chest", "triceps"], 52, ["chest0", "chest3", "chest6", "triceps0", "triceps3"]),
  H("2026-08-30", ["legs"], 55, ["legs0", "legs1", "legs2", "legs9", "legs11"]),
  H("2026-08-28", ["shoulders", "cardio"], 45, ["shoulders0", "shoulders1", "shoulders4", "shoulders8", "cardio0"]),
  H("2026-08-26", ["back", "biceps"], 44, ["back0", "back4", "back6", "biceps1", "biceps6"]),
];

// Horizontal precision scroller (tape/ruler). Thumb-scroll to a 1-unit
// value; last-time (grey) and PB (amber) render as ticks you can land on.
function WeightScroller({ value, min, max, step, isCardio, lastVal, pb, onChange, height = 88 }) {
  const ref = useRef(null);
  const scrollingRef = useRef(false);
  const timerRef = useRef(null);
  const dragRef = useRef(null);
  const TICK = 16; // px between 1-unit ticks
  const count = Math.max(1, Math.round((max - min) / step) + 1);
  const idxOf = (v) => Math.round((v - min) / step);
  const valOf = (i) => min + i * step;

  // Align the strip to the value when it changes from outside (buttons,
  // exercise switch). Skip while the user is actively scrolling.
  useEffect(() => {
    const el = ref.current;
    if (!el || scrollingRef.current) return;
    const target = idxOf(value) * TICK;
    if (Math.abs(el.scrollLeft - target) > 1) el.scrollLeft = target;
  }, [value, min, max, step]);

  // Desktop: translate a vertical wheel/trackpad gesture into horizontal
  // scrubbing (touch already scrolls the strip natively).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e) => {
      const d = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (!d) return;
      el.scrollLeft += d;
      e.preventDefault();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const handleScroll = () => {
    const el = ref.current;
    if (!el) return;
    scrollingRef.current = true;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { scrollingRef.current = false; }, 140);
    const i = clamp(Math.round(el.scrollLeft / TICK), 0, count - 1);
    const v = valOf(i);
    if (v !== value) onChange(v);
  };

  // Desktop: click-and-drag to scrub (touch keeps native scrolling).
  const onPointerDown = (e) => {
    if (e.pointerType === "touch") return;
    const el = ref.current;
    if (!el) return;
    dragRef.current = { x: e.clientX, left: el.scrollLeft };
    if (el.setPointerCapture) el.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    const el = ref.current;
    if (!el || !dragRef.current) return;
    el.scrollLeft = dragRef.current.left - (e.clientX - dragRef.current.x);
  };
  const endDrag = (e) => {
    dragRef.current = null;
    const el = ref.current;
    if (el && el.releasePointerCapture && e.pointerId != null) {
      try { el.releasePointerCapture(e.pointerId); } catch (_) {}
    }
  };

  // Keyboard: arrows nudge by one, Page keys by ten, Home/End to the ends.
  const onKeyDown = (e) => {
    let d = 0;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") d = -step;
    else if (e.key === "ArrowRight" || e.key === "ArrowUp") d = step;
    else if (e.key === "PageDown") d = -10 * step;
    else if (e.key === "PageUp") d = 10 * step;
    else if (e.key === "Home") { e.preventDefault(); onChange(min); return; }
    else if (e.key === "End") { e.preventDefault(); onChange(max); return; }
    else return;
    e.preventDefault();
    onChange(clamp(value + d, min, max));
  };

  // Ticks depend only on the exercise's range/markers, not the live value,
  // so memoize them — scrolling then only updates aria + the readout above.
  const ticks = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const v = valOf(i);
        const major = v % 10 === 0;
        const atLast = lastVal != null && v === lastVal;
        const atPb = pb != null && v === pb;
        const color = atPb ? C.amber : atLast ? C.dust : major ? C.chalk : C.line;
        const h = atPb || atLast ? 44 : major ? 30 : 18;
        return (
          <div key={i} className="flex flex-col items-center justify-end" style={{ width: TICK, flex: "0 0 auto", height: "100%", paddingBottom: 10, scrollSnapAlign: "center" }}>
            {major && (
              <span className="tabular-nums" style={{ fontSize: 11, fontWeight: 700, color: C.dust, marginBottom: 5, whiteSpace: "nowrap" }}>{v}</span>
            )}
            <div style={{ width: atPb || atLast ? 3 : 2, height: h, background: color, borderRadius: 1 }} />
          </div>
        );
      }),
    [count, min, max, step, lastVal, pb]
  );

  const pad = `calc(50% - ${TICK / 2}px)`;
  const lineTop = Math.round(height * 0.205);
  const lineHeight = height - 10 - lineTop;

  return (
    <div className="relative" style={{ height }}>
      <div aria-hidden="true" className="absolute" style={{ left: "50%", top: lineTop, transform: "translateX(-50%)", width: 3, height: lineHeight, background: C.cobalt, borderRadius: 2, zIndex: 2, pointerEvents: "none", boxShadow: `0 0 0 4px ${C.floor}` }} />
      <div aria-hidden="true" className="absolute inset-y-0 left-0" style={{ width: 56, background: `linear-gradient(90deg, ${C.floor}, transparent)`, zIndex: 1, pointerEvents: "none" }} />
      <div aria-hidden="true" className="absolute inset-y-0 right-0" style={{ width: 56, background: `linear-gradient(270deg, ${C.floor}, transparent)`, zIndex: 1, pointerEvents: "none" }} />
      <div
        ref={ref}
        onScroll={handleScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        role="slider"
        tabIndex={0}
        aria-label={isCardio ? "Minutes" : "Weight in pounds"}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={isCardio ? `${value} minutes` : value === 0 ? "bodyweight" : `${value} pounds`}
        className="ws-ruler absolute inset-0 flex items-end"
        style={{ overflowX: "auto", overflowY: "hidden", scrollSnapType: "x mandatory", touchAction: "pan-x", userSelect: "none", cursor: "grab", paddingLeft: pad, paddingRight: pad }}
      >
        {ticks}
      </div>
    </div>
  );
}

export default function WorkingSet() {
  const [screen, setScreen] = useState("setup"); // setup | pick | workout | summary | history | historyDetail
  const [exDb, setExDb] = useState(EX);
  const [groupLists, setGroupLists] = useState(INITIAL_LISTS);
  const [history, setHistory] = useState(MOCK_HISTORY);
  const [histSel, setHistSel] = useState(null);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [restOn, setRestOn] = useState(false);
  const [picked, setPicked] = useState([]);
  const [addingFor, setAddingFor] = useState(null);
  const [newName, setNewName] = useState("");
  const [newWeight, setNewWeight] = useState(50);
  const [plan, setPlan] = useState([]);
  const [idx, setIdx] = useState(0);
  const [logs, setLogs] = useState({});
  const [changing, setChanging] = useState(false);
  const [addSheet, setAddSheet] = useState(false); // "Add an exercise" sheet (additive, not a swap)
  const [expandedGroup, setExpandedGroup] = useState(null); // other-group accordion in Change/Add sheet
  const [weight, setWeight] = useState(0);
  const [reps, setReps] = useState(10);
  const [firstSetAt, setFirstSetAt] = useState(null);
  const [lastSetAt, setLastSetAt] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [restEnds, setRestEnds] = useState(null);
  const [restTotal, setRestTotal] = useState(90);
  const [summaryData, setSummaryData] = useState(null);
  const [copied, setCopied] = useState(false);

  const groupsLabel = selectedGroups.map((g) => GROUP_BY_ID[g].label).join(" + ");

  useEffect(() => {
    if (screen !== "workout") return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [screen]);

  useEffect(() => {
    if (screen !== "workout" || !plan.length) return;
    const ex = exDb[plan[idx]];
    if (!ex) return;
    const hasHist = ex.history.length > 0;
    const mid = ex.min + Math.round((ex.max - ex.min) / 2 / ex.step) * ex.step;
    setWeight(hasHist ? last(ex.history) : ex.start ?? mid);
    setReps(ex.reps || 10);
  }, [screen, idx, plan]);

  const restLeft = restEnds ? Math.max(0, Math.ceil((restEnds - now) / 1000)) : null;
  const restDone = restEnds !== null && restLeft === 0;
  useEffect(() => {
    if (!restDone) return;
    const t = setTimeout(() => setRestEnds(null), 2400);
    return () => clearTimeout(t);
  }, [restDone]);

  const toggleGroup = (gid) =>
    setSelectedGroups((cur) => (cur.includes(gid) ? cur.filter((x) => x !== gid) : [...cur, gid]));

  const togglePick = (id) =>
    setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const lastDoneIn = (gid) => {
    for (const h of history) {
      const ids = h.entries.map((e) => e.id).filter((id) => exDb[id] && exDb[id].group === gid);
      if (ids.length) return ids;
    }
    return [];
  };

  // Creates the exercise in its group's list and returns the new id.
  const createCustom = (gid) => {
    const name = newName.trim();
    if (!name) return null;
    const grp = GROUP_BY_ID[gid];
    const id = `custom_${Date.now()}`;
    const parsed = parseFloat(newWeight);
    const w = Number.isFinite(parsed) && parsed >= 0 ? parsed : 50; // 0 = bodyweight
    const ex = grp.cardio
      ? { name, min: 5, max: 40, step: 1, history: [], reps: 0, rest: 0, kind: "cardio", group: gid, pb: null, cues: [], start: 15, custom: true }
      : { name, min: 0, max: Math.max(100, Math.ceil((w * 2) / 25) * 25), step: 5, history: [], reps: 10, rest: 60, kind: "weight", group: gid, pb: null, cues: [], start: w, custom: true };
    setExDb((db) => ({ ...db, [id]: ex }));
    setGroupLists((gl) => ({ ...gl, [gid]: [...gl[gid], id] }));
    setAddingFor(null);
    setNewName("");
    return id;
  };

  const startWorkout = () => {
    setPlan(picked);
    setIdx(0);
    setLogs({});
    setFirstSetAt(null);
    setLastSetAt(null);
    setNow(Date.now());
    setSummaryData(null);
    setScreen("workout");
  };

  const startRest = (sec) => {
    setRestTotal(sec);
    setRestEnds(Date.now() + sec * 1000);
  };

  const logSet = () => {
    const id = plan[idx];
    const ex = exDb[id];
    const t = Date.now();
    setFirstSetAt((f) => f ?? t);
    setLastSetAt(t);
    setLogs((p) => ({
      ...p,
      [id]: [...(p[id] || []), ex.kind === "cardio" ? { min: weight } : { w: weight, r: reps }],
    }));
    if (restOn && ex.kind !== "cardio" && ex.rest > 0) startRest(ex.rest);
  };

  // Duration = first logged set to last logged set.
  const finish = (planArr) => {
    setRestEnds(null);
    const durMin = firstSetAt && lastSetAt ? Math.max(1, Math.round((lastSetAt - firstSetAt) / 60000)) : 0;
    let totalSets = 0;
    let volume = 0;
    const lines = [];
    const entries = [];
    planArr.forEach((pid) => {
      const ex = exDb[pid];
      const sets = logs[pid] || [];
      if (!sets.length) return; // skipped — omit entirely
      entries.push({ id: pid, name: ex.name, kind: ex.kind, sets });
      if (ex.kind !== "cardio") sets.forEach((s) => { volume += s.w * s.r; });
      totalSets += sets.length;
      lines.push({ id: pid, name: ex.name, kind: ex.kind, sets, count: sets.length });
    });
    setSummaryData({ durMin, totalSets, volume, lines, label: groupsLabel });
    if (entries.length) {
      setHistory((h) => [{ date: todayISO(), groups: [...selectedGroups], durMin, entries }, ...h]);
      setExDb((db) => {
        const nd = { ...db };
        entries.forEach((e) => {
          const ex = nd[e.id];
          if (!ex) return;
          const top = e.kind === "cardio" ? Math.max(...e.sets.map((s) => s.min)) : Math.max(...e.sets.map((s) => s.w));
          nd[e.id] = { ...ex, history: [...ex.history, top].slice(-8), pb: ex.pb == null ? top : Math.max(ex.pb, top) };
        });
        return nd;
      });
    }
    setScreen("summary");
  };

  const advance = () => {
    setRestEnds(null);
    if (idx >= plan.length - 1) finish(plan);
    else setIdx((i) => i + 1);
  };

  const doSwap = (newId) => {
    setChanging(false);
    setRestEnds(null);
    const newGroup = exDb[newId].group;
    setSelectedGroups((sg) => (sg.includes(newGroup) ? sg : [...sg, newGroup]));
    if ((logs[plan[idx]] || []).length) {
      setPlan((p) => {
        const np = [...p];
        np.splice(idx + 1, 0, newId);
        return np;
      });
      setIdx((i) => i + 1);
    } else {
      setPlan((p) => p.map((x, i) => (i === idx ? newId : x)));
    }
  };

  const removeCurrent = () => {
    setChanging(false);
    setRestEnds(null);
    const np = plan.filter((_, i) => i !== idx);
    setPlan(np);
    if (idx >= np.length) finish(np);
  };

  // Slots an exercise in right after the current one (becomes next up),
  // without disturbing the current exercise or its logged sets.
  const addExercise = (newId) => {
    setChanging(false);
    setAddSheet(false);
    const newGroup = exDb[newId].group;
    setSelectedGroups((sg) => (sg.includes(newGroup) ? sg : [...sg, newGroup]));
    setPlan((p) => {
      const np = [...p];
      np.splice(idx + 1, 0, newId);
      return np;
    });
  };

  // Single tap handler for the shared sheet: add-mode appends, change-mode swaps.
  const onSheetPick = (id) => { if (addSheet) addExercise(id); else doSwap(id); };
  const openChange = () => { setChanging(true); setAddSheet(false); setAddingFor(null); setExpandedGroup(null); };
  const openAdd = () => { setAddSheet(true); setChanging(false); setAddingFor(null); setExpandedGroup(null); };
  const closeSheet = () => { setChanging(false); setAddSheet(false); };

  const resetAll = () => {
    setScreen("setup");
    setSelectedGroups([]);
    setPicked([]);
    setPlan([]);
    setLogs({});
    setRestEnds(null);
    setChanging(false);
    setAddSheet(false);
    setCopied(false);
  };

  // ——— shared bits ———
  const page = {
    minHeight: "100dvh",
    background: C.floor,
    color: C.chalk,
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  };
  const btnPrimary = (enabled = true) => ({
    background: enabled ? C.cobalt : C.raised,
    color: enabled ? "#FFFFFF" : C.dust,
    minHeight: 56,
    borderRadius: 14,
    fontWeight: 700,
    fontSize: 17,
    width: "100%",
    border: "none",
    cursor: enabled ? "pointer" : "default",
  });
  const btnQuiet = {
    background: C.raised,
    color: C.chalk,
    minHeight: 48,
    borderRadius: 12,
    fontWeight: 600,
    border: `1px solid ${C.line}`,
    cursor: "pointer",
  };
  const inputStyle = {
    width: "100%",
    background: C.surface,
    border: `1px solid ${C.line}`,
    borderRadius: 10,
    padding: "12px 14px",
    color: C.chalk,
    fontSize: 16,
    outline: "none",
  };

  const css = `
    .ws-ruler { scrollbar-width: none; -webkit-overflow-scrolling: touch; }
    .ws-ruler::-webkit-scrollbar { display: none; }
    .ws-ruler:focus { outline: none; }
    .ws-ruler:focus-visible { outline: 3px solid ${C.amber}; outline-offset: 2px; border-radius: 12px; }
    .ws-press { transition: transform .12s ease; }
    .ws-press:active { transform: scale(.97); }
    @media (prefers-reduced-motion: reduce) { .ws-press { transition: none; } .ws-press:active { transform: none; } }
  `;

  const exRowMini = (id, onTap) => {
    const ex = exDb[id];
    const hasHist = ex.history.length > 0;
    return (
      <button
        key={id}
        onClick={onTap}
        className="ws-press w-full text-left px-4 py-3 flex items-center justify-between gap-3"
        style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, cursor: "pointer", color: C.chalk }}
      >
        <span>
          <span style={{ fontWeight: 700, fontSize: 15 }}>{ex.name}</span>
          <span className="block mt-1" style={{ color: C.dust, fontSize: 13 }}>
            {hasHist
              ? ex.kind === "cardio" ? `Last time ${last(ex.history)} min` : `Last time ${fmtW(last(ex.history))} x ${ex.reps}`
              : "New, no history yet"}
          </span>
        </span>
      </button>
    );
  };

  const customForm = (gid, onCreate) => {
    const grp = GROUP_BY_ID[gid];
    return addingFor === gid ? (
      <div className="p-4" style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: 14 }}>
        <p style={{ fontWeight: 700, fontSize: 15 }}>New {grp.label.toLowerCase()} exercise</p>
        <div className="mt-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Exercise name"
            aria-label="Exercise name"
            style={inputStyle}
          />
        </div>
        {!grp.cardio && (
          <div className="mt-3">
            <label className="block mb-2" style={{ color: C.dust, fontSize: 13, fontWeight: 600 }}>Typical weight in lb (0 = bodyweight)</label>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
              aria-label="Typical weight in pounds"
              style={inputStyle}
            />
          </div>
        )}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            className="ws-press"
            style={{ ...btnPrimary(!!newName.trim()), minHeight: 48, fontSize: 15 }}
            disabled={!newName.trim()}
            onClick={onCreate}
          >
            Add
          </button>
          <button className="ws-press" style={btnQuiet} onClick={() => setAddingFor(null)}>
            Cancel
          </button>
        </div>
      </div>
    ) : (
      <button
        className="ws-press w-full px-4 py-3 text-left"
        style={{ background: "none", border: `1px dashed ${C.line}`, borderRadius: 14, color: C.dust, fontWeight: 700, fontSize: 14, cursor: "pointer" }}
        onClick={() => { setAddingFor(gid); setNewName(""); setNewWeight(50); }}
      >
        Add your own {grp.label.toLowerCase()} exercise
      </button>
    );
  };

  // ————————————————— SETUP —————————————————
  if (screen === "setup") {
    return (
      <div style={{ ...page, height: "100dvh", overflow: "hidden" }}>
        <style>{css}</style>
        <div className="max-w-md mx-auto h-full px-5 pt-3 pb-3 flex flex-col">
          <div className="flex items-center justify-between">
            <p style={{ color: C.dust, fontWeight: 700, letterSpacing: "0.02em", fontSize: 12 }}>Working Set</p>
            <button
              onClick={() => setScreen("history")}
              className="ws-press"
              style={{ background: "none", border: `1px solid ${C.line}`, color: C.chalk, borderRadius: 10, padding: "6px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
            >
              History
            </button>
          </div>
          <h1 className="mt-2" style={{ fontSize: 23, fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.02em" }}>
            What are you training today?
          </h1>
          <p className="mt-1" style={{ color: C.dust, fontSize: 13 }}>
            Pick any combination of muscle groups. You'll choose the exercises yourself next.
          </p>

          <div className="mt-3 grid grid-cols-2 gap-1.5">
            {GROUPS.map((g) => {
              const on = selectedGroups.includes(g.id);
              return (
                <button
                  key={g.id}
                  onClick={() => toggleGroup(g.id)}
                  className="ws-press text-left px-3 py-2"
                  style={{
                    background: on ? C.raised : C.surface,
                    border: `2px solid ${on ? C.cobalt : C.line}`,
                    borderRadius: 12,
                    cursor: "pointer",
                    color: C.chalk,
                    minHeight: 48,
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{g.label}</span>
                  <span className="block" style={{ color: C.dust, fontSize: 11 }}>{g.hint}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setRestOn((v) => !v)}
            role="switch"
            aria-checked={restOn}
            className="ws-press mt-2 w-full flex items-center justify-between gap-4 px-3 py-2 text-left"
            style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, cursor: "pointer", color: C.chalk, minHeight: 48 }}
          >
            <span>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Rest timer between sets</span>
              <span className="block" style={{ color: C.dust, fontSize: 11 }}>
                {restOn ? "Starts automatically after each set" : "Off. You can still start one manually mid-workout."}
              </span>
            </span>
            <span className="relative" style={{ width: 46, height: 26, borderRadius: 999, background: restOn ? C.cobalt : C.line, flexShrink: 0, transition: "background .15s ease" }}>
              <span className="absolute" style={{ top: 3, left: restOn ? 23 : 3, width: 20, height: 20, borderRadius: 999, background: C.chalk, transition: "left .15s ease" }} />
            </span>
          </button>

          <div className="mt-auto pt-2">
            <button className="ws-press" style={{ ...btnPrimary(selectedGroups.length > 0), minHeight: 50 }} disabled={!selectedGroups.length} onClick={() => { setPicked([]); setScreen("pick"); }}>
              Choose exercises
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ————————————————— PICK EXERCISES —————————————————
  if (screen === "pick") {
    const count = picked.length;
    return (
      <div style={page}>
        <style>{css}</style>
        <div className="max-w-md mx-auto px-5 pt-8" style={{ paddingBottom: 130 }}>
          <button onClick={() => setScreen("setup")} style={{ background: "none", border: "none", color: C.dust, fontWeight: 600, cursor: "pointer", padding: 0 }}>
            Back
          </button>
          <h1 className="mt-3" style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em" }}>{groupsLabel}</h1>
          <p className="mt-1" style={{ color: C.dust, fontSize: 15 }}>
            Pick your exercises. The order you pick them is the order you'll train.
          </p>

          {selectedGroups.map((gid) => {
            const grp = GROUP_BY_ID[gid];
            const list = groupLists[gid];
            const lastIds = lastDoneIn(gid);
            const ordered = [...lastIds.filter((id) => list.includes(id)), ...list.filter((id) => !lastIds.includes(id))];
            const pickedInGroup = picked.filter((id) => exDb[id].group === gid).length;
            return (
              <div key={gid} className="mt-7">
                <div className="flex items-baseline justify-between">
                  <h2 style={{ fontSize: 19, fontWeight: 800 }}>{grp.label}</h2>
                  {pickedInGroup > 0 && (
                    <span className="tabular-nums" style={{ color: C.cobalt, fontSize: 13, fontWeight: 700 }}>{pickedInGroup} picked</span>
                  )}
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  {ordered.map((id) => {
                    const ex = exDb[id];
                    const order = picked.indexOf(id);
                    const on = order >= 0;
                    const wasLast = lastIds.includes(id);
                    const hasHist = ex.history.length > 0;
                    return (
                      <button
                        key={id}
                        onClick={() => togglePick(id)}
                        className="ws-press relative w-full text-left px-4 py-3 flex items-center justify-between gap-3"
                        style={{
                          background: on ? C.raised : C.surface,
                          border: `2px solid ${on ? C.cobalt : C.line}`,
                          borderRadius: 14,
                          cursor: "pointer",
                          color: C.chalk,
                        }}
                      >
                        <span className="flex items-center gap-3">
                          {on && (
                            <span
                              className="flex items-center justify-center tabular-nums"
                              style={{ width: 24, height: 24, borderRadius: 999, background: C.cobalt, color: "#fff", fontSize: 12, fontWeight: 800, flexShrink: 0 }}
                              aria-label={`Exercise ${order + 1} in your workout`}
                            >
                              {order + 1}
                            </span>
                          )}
                          <span>
                            <span className="flex items-center gap-2" style={{ fontWeight: 700, fontSize: 15 }}>
                              {ex.name}
                              {wasLast && (
                                <span style={{ background: C.sageDim, color: C.sage, borderRadius: 6, padding: "2px 7px", fontSize: 11, fontWeight: 700 }}>
                                  Last time
                                </span>
                              )}
                            </span>
                            <span className="block mt-1" style={{ color: C.dust, fontSize: 13 }}>
                              {hasHist
                                ? ex.kind === "cardio" ? `Last time ${last(ex.history)} min` : `Last time ${fmtW(last(ex.history))} x ${ex.reps}`
                                : "New, no history yet"}
                            </span>
                          </span>
                        </span>
                      </button>
                    );
                  })}

                  {customForm(gid, () => {
                    const id = createCustom(gid);
                    if (id) setPicked((p) => [...p, id]);
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* sticky footer */}
        <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-4 pt-3" style={{ background: C.floor, borderTop: `1px solid ${C.line}` }}>
          <div className="max-w-md mx-auto">
            <button className="ws-press" style={btnPrimary(count > 0)} disabled={count === 0} onClick={startWorkout}>
              {count === 0 ? "Pick at least one exercise" : `Start workout (${count} exercise${count === 1 ? "" : "s"})`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ————————————————— WORKOUT —————————————————
  if (screen === "workout") {
    const id = plan[idx];
    const ex = exDb[id];
    const grp = GROUP_BY_ID[ex.group];
    const isCardio = ex.kind === "cardio";
    const unit = isCardio ? "min" : "lb";
    const hasHist = ex.history.length > 0;
    const lastVal = hasHist ? last(ex.history) : null;
    const sets = logs[id] || [];
    const diff = hasHist ? weight - lastVal : null;
    // Precision scroller domain: 0 (BW) up to the exercise's max plus
    // generous headroom, at 1-unit resolution.
    const rCeil = isCardio ? Math.max(ex.max, 45) + 15 : Math.max(ex.max, ex.pb ?? 0) + 100;
    const lifting = firstSetAt ? Math.max(0, Math.floor((now - firstSetAt) / 1000)) : null;
    const isLast = idx === plan.length - 1;
    const sheetOpen = changing || addSheet;

    return (
      <div style={page}>
        <style>{css}</style>
        <div style={{ height: 4, background: C.line }}>
          <div style={{ height: 4, width: `${(idx / plan.length) * 100}%`, background: C.sage, transition: "width .3s ease" }} />
        </div>

        <div className="max-w-md mx-auto px-5 pt-2" style={{ paddingBottom: restEnds !== null && !sheetOpen ? 170 : 14 }}>
          <div className="flex items-center justify-between">
            <p style={{ color: C.dust, fontSize: 13, fontWeight: 600 }}>
              Exercise {idx + 1} of {plan.length}
            </p>
            <div className="flex items-center gap-3">
              {lifting != null && (
                <span className="tabular-nums" style={{ color: C.dust, fontSize: 13, fontWeight: 700 }}>{fmtClock(lifting)}</span>
              )}
              <button onClick={() => finish(plan)} style={{ background: "none", border: `1px solid ${C.line}`, color: C.dust, borderRadius: 10, padding: "5px 10px", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>
                End
              </button>
            </div>
          </div>

          <p className="mt-2" style={{ color: C.dust, fontSize: 12, fontWeight: 700 }}>{grp.label}</p>
          <div className="mt-0.5 flex items-center justify-between gap-3">
            <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>{ex.name}</h1>
            <button
              onClick={openChange}
              className="ws-press"
              style={{ background: "none", border: `1px solid ${C.line}`, color: C.chalk, borderRadius: 10, padding: "5px 10px", fontWeight: 700, cursor: "pointer", fontSize: 12, flexShrink: 0 }}
            >
              Change
            </button>
          </div>

          <div className="mt-1 flex items-center gap-3">
            <div>
              <p style={{ color: C.dust, fontSize: 13 }}>
                {hasHist ? (isCardio ? `Last time ${lastVal} min` : `Last time ${fmtW(lastVal)} x ${ex.reps}`) : "First time, no history yet"}
              </p>
              {ex.pb != null && (
                <p style={{ color: C.amber, fontSize: 13, fontWeight: 700 }}>Personal best {isCardio ? `${ex.pb} min` : fmtW(ex.pb)}</p>
              )}
            </div>
          </div>

          {ex.cues.length > 0 && (
            <div className="mt-2 pl-3" style={{ borderLeft: `2px solid ${C.cobalt}` }}>
              {ex.cues.map((c, i) => (
                <p key={i} style={{ color: C.dust, fontSize: 12, lineHeight: 1.35 }}>{c}</p>
              ))}
            </div>
          )}

          {/* hero readout */}
          <div className="mt-2 text-center">
            <p className="tabular-nums" style={{ fontSize: 56, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.03em" }}>
              {!isCardio && weight === 0 ? "BW" : weight}
              {(isCardio || weight !== 0) && (
                <span style={{ fontSize: 18, fontWeight: 700, color: C.dust, marginLeft: 6 }}>{unit}</span>
              )}
            </p>
            {diff != null && (
              <p className="mt-0.5" style={{ fontSize: 13, fontWeight: 600, color: diff > 0 ? C.sage : C.dust }}>
                {diff === 0 ? "Same as last time" : `${diff > 0 ? "+" : ""}${diff} ${unit} vs last time`}
              </p>
            )}
            {ex.pb != null && weight > ex.pb && (
              <p className="mt-0.5" style={{ fontSize: 13, fontWeight: 700, color: C.amber }}>
                Above your personal best
              </p>
            )}
          </div>

          {/* precision weight/minutes scroller with last-time + PB ticks */}
          <div className="mt-2">
            <WeightScroller
              value={weight}
              min={0}
              max={rCeil}
              step={1}
              isCardio={isCardio}
              lastVal={hasHist ? lastVal : null}
              pb={ex.pb}
              onChange={setWeight}
              height={70}
            />
            {(hasHist || ex.pb != null) && (
              <div className="mt-0.5 flex items-center justify-center gap-5" style={{ fontSize: 11, fontWeight: 600 }}>
                {hasHist && <span style={{ color: C.dust }}>| last {isCardio ? `${lastVal} min` : fmtW(lastVal)}</span>}
                {ex.pb != null && <span style={{ color: C.amber }}>| best {isCardio ? `${ex.pb} min` : fmtW(ex.pb)}</span>}
              </div>
            )}
          </div>

          {/* fine adjust + reps */}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2">
              <button className="ws-press flex-1" style={btnQuiet} onClick={() => setWeight((w) => Math.max(0, w - ex.step))} aria-label={`Decrease by ${ex.step}`}>
                −{ex.step}
              </button>
              <button className="ws-press flex-1" style={btnQuiet} onClick={() => setWeight((w) => Math.min(rCeil, w + ex.step))} aria-label={`Increase by ${ex.step}`}>
                +{ex.step}
              </button>
            </div>
            {!isCardio && (
              <div className="flex items-center justify-between px-2" style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12 }}>
                <button className="ws-press" style={{ ...btnQuiet, border: "none", background: "none", minHeight: 48, width: 44, fontSize: 20 }} onClick={() => setReps((r) => clamp(r - 1, 1, 30))} aria-label="One fewer rep">−</button>
                <span className="tabular-nums" style={{ fontWeight: 800, fontSize: 18 }}>{reps} <span style={{ color: C.dust, fontSize: 13, fontWeight: 600 }}>reps</span></span>
                <button className="ws-press" style={{ ...btnQuiet, border: "none", background: "none", minHeight: 48, width: 44, fontSize: 20 }} onClick={() => setReps((r) => clamp(r + 1, 1, 30))} aria-label="One more rep">+</button>
              </div>
            )}
          </div>

          <div className="mt-2">
            <button className="ws-press" style={{ ...btnPrimary(true), minHeight: 48 }} onClick={logSet}>
              {isCardio ? `Log ${weight} min` : `Log set ${sets.length + 1}`}
            </button>
          </div>

          {!restOn && !isCardio && restEnds === null && (
            <div className="mt-1.5">
              <button className="ws-press" style={{ ...btnQuiet, width: "100%" }} onClick={() => startRest(ex.rest)}>
                Start rest timer ({fmtClock(ex.rest)})
              </button>
            </div>
          )}

          {sets.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {sets.map((s, i) => (
                <span key={i} className="tabular-nums px-2.5 py-1.5" style={{ background: C.sageDim, color: C.sage, borderRadius: 8, fontWeight: 700, fontSize: 13 }}>
                  {"min" in s ? `${s.min} min` : `${s.w === 0 ? "BW" : s.w} x ${s.r}`}
                </span>
              ))}
            </div>
          )}

          <div className="mt-2 flex items-center gap-3">
            <button
              className="ws-press flex-1"
              style={{ ...btnQuiet, minHeight: 48, opacity: sets.length ? 1 : 0.5 }}
              onClick={advance}
              disabled={!sets.length}
            >
              {isLast ? "Finish workout" : "Next exercise"}
            </button>
            {!sets.length && (
              <button className="ws-press" style={{ background: "none", border: "none", color: C.dust, fontWeight: 600, cursor: "pointer" }} onClick={advance}>
                Skip
              </button>
            )}
          </div>

          <div className="mt-1.5">
            <button className="ws-press" style={{ ...btnQuiet, width: "100%" }} onClick={openAdd}>
              + Add an exercise
            </button>
          </div>
        </div>

        {/* change / add exercise sheet */}
        {sheetOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: C.floor }}>
            <div className="max-w-md mx-auto px-5 pt-6 pb-16">
              <div className="flex items-center justify-between">
                <h2 style={{ fontSize: 22, fontWeight: 800 }}>{addSheet ? "Add an exercise" : "Change exercise"}</h2>
                <button onClick={closeSheet} className="ws-press" style={{ ...btnQuiet, minHeight: 40, padding: "0 16px" }}>
                  Close
                </button>
              </div>
              <p className="mt-2" style={{ color: C.dust, fontSize: 14 }}>
                {addSheet
                  ? "Pick or create an exercise to add. It slots in right after your current exercise, which stays put."
                  : `Swapping out ${ex.name}.${sets.length > 0 ? " The sets you already logged will stay in your workout." : ""}`}
              </p>

              {sets.length === 0 && !addSheet && (
                <button className="ws-press mt-4" style={{ ...btnQuiet, width: "100%" }} onClick={removeCurrent}>
                  Remove from workout, move on
                </button>
              )}

              {selectedGroups.map((gid) => {
                const options = groupLists[gid].filter((oid) => !plan.includes(oid));
                return (
                  <div key={gid} className="mt-6">
                    <h3 style={{ fontSize: 17, fontWeight: 800 }}>{GROUP_BY_ID[gid].label}</h3>
                    <div className="mt-3 flex flex-col gap-2">
                      {options.map((oid) => exRowMini(oid, () => onSheetPick(oid)))}
                      {customForm(gid, () => {
                        const nid = createCustom(gid);
                        if (nid) onSheetPick(nid);
                      })}
                    </div>
                  </div>
                );
              })}

              {GROUPS.some((g) => !selectedGroups.includes(g.id)) && (
                <p className="mt-8" style={{ color: C.dust, fontSize: 13, fontWeight: 700 }}>Other muscle groups</p>
              )}
              {GROUPS.filter((g) => !selectedGroups.includes(g.id)).map((g) => {
                const options = groupLists[g.id].filter((oid) => !plan.includes(oid));
                const open = expandedGroup === g.id;
                return (
                  <div key={g.id} className="mt-3">
                    <button
                      onClick={() => setExpandedGroup(open ? null : g.id)}
                      className="ws-press w-full flex items-center justify-between px-4 py-3"
                      style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, color: C.chalk, cursor: "pointer" }}
                    >
                      <span style={{ fontSize: 16, fontWeight: 800 }}>{g.label}</span>
                      <span style={{ color: C.dust, fontSize: 13, fontWeight: 700 }}>{open ? "Hide" : "Show"}</span>
                    </button>
                    {open && (
                      <div className="mt-3 flex flex-col gap-2">
                        {options.map((oid) => exRowMini(oid, () => onSheetPick(oid)))}
                        {customForm(g.id, () => {
                          const nid = createCustom(g.id);
                          if (nid) onSheetPick(nid);
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* rest timer */}
        {restEnds !== null && !sheetOpen && (
          <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4" role="status">
            <div className="max-w-md mx-auto p-5" style={{ background: restDone ? C.sageDim : C.amberDim, border: `1px solid ${restDone ? C.sage : C.amber}`, borderRadius: 18, boxShadow: "0 -6px 30px rgba(0,0,0,.5)" }}>
              {restDone ? (
                <p className="text-center" style={{ color: C.sage, fontWeight: 800, fontSize: 24 }}>Rest done. Go.</p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p style={{ color: C.amber, fontWeight: 700, fontSize: 14 }}>Resting</p>
                    <p className="tabular-nums" style={{ color: C.chalk, fontWeight: 800, fontSize: 34, lineHeight: 1 }}>{fmtClock(restLeft)}</p>
                  </div>
                  <div className="mt-3" style={{ height: 6, background: C.line, borderRadius: 3 }}>
                    <div style={{ height: 6, width: `${(restLeft / restTotal) * 100}%`, background: C.amber, borderRadius: 3, transition: "width .4s linear" }} />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button className="ws-press" style={btnQuiet} onClick={() => { setRestEnds((e) => e + 30000); setRestTotal((t) => t + 30); }}>
                      +30 sec
                    </button>
                    <button className="ws-press" style={btnQuiet} onClick={() => setRestEnds(null)}>
                      Skip rest
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ————————————————— HISTORY LIST —————————————————
  if (screen === "history") {
    return (
      <div style={page}>
        <style>{css}</style>
        <div className="max-w-md mx-auto px-5 pt-8 pb-10">
          <button onClick={() => setScreen("setup")} style={{ background: "none", border: "none", color: C.dust, fontWeight: 600, cursor: "pointer", padding: 0 }}>
            Back
          </button>
          <h1 className="mt-3" style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em" }}>History</h1>
          <p className="mt-1" style={{ color: C.dust, fontSize: 15 }}>Tap a day for the full workout.</p>

          <div className="mt-5 flex flex-col gap-2">
            {history.map((h, i) => {
              const label = h.groups.map((g) => (GROUP_BY_ID[g] ? GROUP_BY_ID[g].label : g)).join(" + ");
              return (
                <button
                  key={`${h.date}-${i}`}
                  onClick={() => { setHistSel(i); setScreen("historyDetail"); }}
                  className="ws-press w-full text-left px-4 py-4 flex items-center justify-between gap-3"
                  style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, cursor: "pointer", color: C.chalk }}
                >
                  <span>
                    <span className="tabular-nums" style={{ fontWeight: 800, fontSize: 16 }}>{fmtDate(h.date)}</span>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>{"  —  "}{label}</span>
                    <span className="block mt-1" style={{ color: C.dust, fontSize: 13 }}>
                      {h.entries.length} exercise{h.entries.length === 1 ? "" : "s"}
                    </span>
                  </span>
                  <span className="tabular-nums" style={{ color: C.dust, fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{h.durMin} min</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ————————————————— HISTORY DETAIL —————————————————
  if (screen === "historyDetail" && histSel != null && history[histSel]) {
    const h = history[histSel];
    const label = h.groups.map((g) => (GROUP_BY_ID[g] ? GROUP_BY_ID[g].label : g)).join(" + ");
    let tSets = 0, vol = 0;
    const rows = h.entries.map((e) => {
      tSets += e.sets.length;
      if (e.kind !== "cardio") e.sets.forEach((s) => { vol += s.w * s.r; });
      return { name: e.name, kind: e.kind, sets: e.sets, count: e.sets.length };
    });
    return (
      <div style={page}>
        <style>{css}</style>
        <div className="max-w-md mx-auto px-5 pt-8 pb-10">
          <button onClick={() => setScreen("history")} style={{ background: "none", border: "none", color: C.dust, fontWeight: 600, cursor: "pointer", padding: 0 }}>
            Back to history
          </button>
          <h1 className="mt-3 tabular-nums" style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em" }}>{fmtDate(h.date)}</h1>
          <p className="mt-1" style={{ color: C.dust, fontSize: 15 }}>{label}</p>

          <div className="mt-6 grid grid-cols-3 gap-3">
            {[
              { n: h.durMin, u: "minutes" },
              { n: tSets, u: "sets" },
              { n: vol.toLocaleString(), u: "lb volume" },
            ].map((s, i) => (
              <div key={i} className="px-3 py-4 text-center" style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14 }}>
                <p className="tabular-nums" style={{ fontSize: 24, fontWeight: 800 }}>{s.n}</p>
                <p style={{ color: C.dust, fontSize: 12, fontWeight: 600 }}>{s.u}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-col gap-2">
            {rows.map((r, i) => (
              <div key={i} className="px-4 py-3" style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14 }}>
                <p style={{ fontWeight: 700, fontSize: 15 }}>{r.name}</p>
                <p className="mt-1" style={{ color: C.dust, fontSize: 13 }}>{r.count} set{r.count === 1 ? "" : "s"}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {r.sets.map((s, i2) => (
                    <span key={i2} className="tabular-nums px-3 py-2" style={{ background: C.sageDim, color: C.sage, borderRadius: 10, fontWeight: 700, fontSize: 14 }}>
                      {fmtSet(s)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ————————————————— SUMMARY —————————————————
  const sd = summaryData || { durMin: 0, totalSets: 0, volume: 0, lines: [], label: groupsLabel };
  const summaryText = [
    `${sd.label || "Workout"} (Working Set)`,
    `${sd.durMin} min first set to last, ${sd.totalSets} sets, ${sd.volume.toLocaleString()} lb total volume`,
    ...sd.lines.map((l) =>
      `${l.name}: ${l.count} set${l.count === 1 ? "" : "s"}, ${l.sets.map(fmtSet).join(", ")}`
    ),
  ].join("\n");

  // navigator.clipboard needs a secure context (https or localhost); LAN IP
  // testing over plain http on a phone falls back to the legacy textarea copy.
  const copySummary = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(summaryText);
      } else {
        const ta = document.createElement("textarea");
        ta.value = summaryText;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div style={page}>
      <style>{css}</style>
      <div className="max-w-md mx-auto px-5 pt-8 pb-10">
        <p style={{ color: C.dust, fontWeight: 700, fontSize: 13 }}>Working Set</p>
        <h1 className="mt-3" style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em" }}>Workout complete</h1>
        <p className="mt-1" style={{ color: C.dust, fontSize: 15 }}>{sd.label}{sd.lines.length ? " — saved to your history" : ""}</p>

        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { n: sd.durMin, u: "min, first to last set" },
            { n: sd.totalSets, u: "sets" },
            { n: sd.volume.toLocaleString(), u: "lb volume" },
          ].map((s, i) => (
            <div key={i} className="px-3 py-4 text-center" style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14 }}>
              <p className="tabular-nums" style={{ fontSize: 24, fontWeight: 800 }}>{s.n}</p>
              <p style={{ color: C.dust, fontSize: 12, fontWeight: 600 }}>{s.u}</p>
            </div>
          ))}
        </div>

        {sd.lines.length > 0 ? (
          <div className="mt-5 flex flex-col gap-2">
            {sd.lines.map((l) => (
              <div key={l.id} className="px-4 py-3" style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14 }}>
                <p style={{ fontWeight: 700, fontSize: 15 }}>{l.name}</p>
                <p className="mt-1" style={{ color: C.dust, fontSize: 13 }}>{l.count} set{l.count === 1 ? "" : "s"}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {l.sets.map((s, i) => (
                    <span key={i} className="tabular-nums px-3 py-2" style={{ background: C.sageDim, color: C.sage, borderRadius: 10, fontWeight: 700, fontSize: 14 }}>
                      {fmtSet(s)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-5" style={{ color: C.dust, fontSize: 14 }}>
            No sets logged this time. Start another workout when you're ready.
          </p>
        )}

        <div className="mt-6 p-4" style={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: 14 }}>
          <p style={{ fontWeight: 700, fontSize: 15 }}>For your other trackers</p>
          <p className="mt-1" style={{ color: C.dust, fontSize: 13 }}>
            Copy this recap to tag the activity in Whoop or anywhere else.
          </p>
          <pre className="mt-3 tabular-nums" style={{ whiteSpace: "pre-wrap", color: C.chalk, fontSize: 13, lineHeight: 1.5, fontFamily: "inherit", margin: 0 }}>
            {summaryText}
          </pre>
          <button className="ws-press mt-4" style={{ ...btnQuiet, width: "100%", background: copied ? C.sageDim : C.raised, color: copied ? C.sage : C.chalk }} onClick={copySummary}>
            {copied ? "Copied" : "Copy recap"}
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button className="ws-press" style={btnPrimary(true)} onClick={resetAll}>
            New workout
          </button>
          <button className="ws-press" style={{ ...btnQuiet, minHeight: 56 }} onClick={() => setScreen("history")}>
            View history
          </button>
        </div>
      </div>
    </div>
  );
}
