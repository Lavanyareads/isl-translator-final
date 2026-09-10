import React, { useEffect, useMemo, useState } from "react";

const TARGETS = ["A", "B", "C", "D", "E"];

const Icon = {
  back: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M19 12H5" /><path d="m11 18-6-6 6-6" />
    </svg>
  ),
  camera: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="3" y="7" width="18" height="13" rx="2.5" />
      <path d="M8 7l1.5-3h5L16 7" />
      <circle cx="12" cy="13.5" r="3.2" />
    </svg>
  ),
  play: (p) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M8 5v14l11-7z" />
    </svg>
  ),
  check: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="m5 12 4 4L19 6" />
    </svg>
  ),
  lock: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  ),
  arrow: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M5 12h13" /><path d="m13 6 6 6-6 6" />
    </svg>
  ),
};

export default function Compete({
  videoRef,
  running = false,
  prediction = "",
  confidence = 0,
  hold = 0,
  startCamera,
  stopCamera,
  resetCapture,
  onBack,
  onComplete,
  onPassed,
  initialTarget = 0,
}) {
  const [targetIndex, setTargetIndex] = useState(initialTarget);
  const [passed, setPassed] = useState(() => new Set());
  const [wrongFlash, setWrongFlash] = useState(false);

  const target = TARGETS[targetIndex];
  const detected = String(prediction || "").trim().toUpperCase();
  const confidenceValue = Math.max(0, Math.min(100, Number(confidence) || 0));
  const holdValue = Math.max(0, Math.min(100, Number(hold) || 0));

  // A level passes ONLY when the model's current prediction is the exact target
  // and the existing App confirmation hold reaches 100%.
  const exactMatch = detected === target;
  // Once a target has been confirmed, keep that result until the learner
  // chooses Next. The live hold meter resets when their hand leaves camera.
  const isPassed = passed.has(target) || (exactMatch && holdValue >= 100);
  const isWrong = running && detected && detected !== target;

  useEffect(() => {
    if (isPassed && !passed.has(target)) {
      setPassed((old) => {
        const next = new Set(old);
        next.add(target);
        return next;
      });
      onPassed?.(target, targetIndex);
    }
  }, [isPassed, target, targetIndex, onPassed, passed]);

  useEffect(() => {
    if (!isWrong) return;
    setWrongFlash(true);
    const timer = window.setTimeout(() => setWrongFlash(false), 500);
    return () => window.clearTimeout(timer);
  }, [detected, isWrong]);

  const completedCount = passed.size;
  const allComplete = completedCount === TARGETS.length;

  const next = () => {
    if (!isPassed) return;
    if (targetIndex < TARGETS.length - 1) {
      setTargetIndex((i) => i + 1);
      resetCapture?.();
    } else {
      onComplete?.();
    }
  };

  const restart = () => {
    setTargetIndex(0);
    setPassed(new Set());
    resetCapture?.();
  };

  const progress = useMemo(
    () => ((targetIndex + (isPassed ? 1 : 0)) / TARGETS.length) * 100,
    [targetIndex, isPassed]
  );

  return (
    <div className="sparsh-compete-page">
      <style>{`
        .sparsh-compete-page{
          --c-bg:var(--bg,#f8f6ff);
          --c-card:var(--card,#fff);
          --c-soft:var(--card2,#f3efff);
          --c-border:var(--border,#e4dcf7);
          --c-text:var(--text,#261a43);
          --c-muted:var(--muted,#75688f);
          --c-dim:var(--dim,#9589ad);
          --c-accent:var(--accent,#7c3aed);
          --c-pink:var(--pink,#b35bf0);
          --c-green:var(--good,#72c63e);
          min-height:calc(100vh - 72px);
          padding:26px clamp(16px,4vw,52px) 42px;
          color:var(--c-text);
          font-family:Outfit,system-ui,sans-serif;
          background:
            radial-gradient(circle at 8% 12%,color-mix(in srgb,var(--c-accent) 7%,transparent),transparent 240px),
            radial-gradient(circle at 92% 82%,color-mix(in srgb,var(--c-pink) 6%,transparent),transparent 250px),
            var(--c-bg);
        }
        .sparsh-compete-page *{box-sizing:border-box}
        .comp-shell{width:min(1220px,100%);margin:auto}
        .comp-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
        .comp-back{display:flex;align-items:center;gap:8px;border:0;background:none;color:var(--c-muted);font:600 12px Outfit;cursor:pointer}
        .comp-back svg{width:17px;height:17px}
        .comp-back:hover{color:var(--c-accent)}
        .comp-breadcrumb{font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--c-dim)}
        .comp-breadcrumb b{color:var(--c-accent)}
        .comp-heading{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:20px}
        .comp-kicker{margin:0 0 7px;color:var(--c-pink);font-size:10px;font-weight:800;letter-spacing:.16em}
        .comp-title{margin:0;font-size:clamp(32px,4vw,48px);line-height:.95;letter-spacing:-.045em}
        .comp-title span{color:var(--c-accent)}
        .comp-sub{margin:9px 0 0;color:var(--c-muted);font-size:12px;line-height:1.5}
        .comp-score{min-width:118px;padding:12px 15px;border:1px solid var(--c-border);border-radius:16px;background:var(--c-card);text-align:center;box-shadow:0 5px 0 color-mix(in srgb,var(--c-accent) 8%,transparent)}
        .comp-score strong{display:block;color:var(--c-accent);font-size:22px}
        .comp-score span{font-size:8px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--c-dim)}
        .comp-progress{height:8px;overflow:hidden;border-radius:99px;background:color-mix(in srgb,var(--c-accent) 10%,transparent);margin-bottom:18px}
        .comp-progress i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--c-accent),var(--c-pink));transition:width .3s}
        .comp-grid{display:grid;grid-template-columns:minmax(0,1.18fr) minmax(370px,.82fr);gap:18px;align-items:start}
        .comp-camera{position:relative;min-height:610px;overflow:hidden;border:2px solid color-mix(in srgb,var(--c-accent) 20%,var(--c-border));border-radius:25px;background:#171022;box-shadow:0 18px 50px rgba(49,24,91,.1),0 5px 0 color-mix(in srgb,var(--c-accent) 12%,transparent)}
        .comp-camera:before{content:"";position:absolute;inset:0;background:linear-gradient(rgba(172,119,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(172,119,255,.05) 1px,transparent 1px);background-size:42px 42px;pointer-events:none;z-index:1}
        .comp-camera:after{content:"";position:absolute;width:340px;height:340px;left:50%;top:45%;transform:translate(-50%,-50%);border-radius:50%;background:rgba(143,83,230,.1);filter:blur(60px)}
        .comp-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scaleX(-1);background:#100b18}
        .comp-video.hidden{display:none}
        .comp-frame{position:absolute;inset:35px;z-index:3;pointer-events:none}
        .comp-corner{position:absolute;width:43px;height:43px;border-color:#be91ffb8;border-style:solid}
        .comp-corner.tl{top:0;left:0;border-width:2px 0 0 2px;border-radius:7px 0 0}
        .comp-corner.tr{top:0;right:0;border-width:2px 2px 0 0;border-radius:0 7px 0 0}
        .comp-corner.bl{bottom:0;left:0;border-width:0 0 2px 2px;border-radius:0 0 0 7px}
        .comp-corner.br{bottom:0;right:0;border-width:0 2px 2px 0;border-radius:0 0 7px 0}
        .comp-live{position:absolute;z-index:4;top:17px;left:17px;display:flex;align-items:center;gap:7px;padding:7px 10px;border:1px solid #fff2;border-radius:99px;background:#130a1fbb;color:#eee6fa;font-size:10px;font-weight:700;backdrop-filter:blur(12px)}
        .comp-dot{width:7px;height:7px;border-radius:50%;background:#85db5e;box-shadow:0 0 0 4px #85db5e1a}
        .comp-stop{position:absolute;z-index:4;top:14px;right:14px;width:38px;height:38px;display:grid;place-items:center;border:1px solid #fff2;border-radius:11px;background:#130a1fbb;color:#fff;cursor:pointer}
        .comp-stop i{width:13px;height:13px;border-radius:3px;background:currentColor}
        .comp-target-pill{position:absolute;z-index:4;left:50%;top:22px;transform:translateX(-50%);padding:8px 14px;border:1px solid #fff2;border-radius:99px;background:#130a1fcc;color:#e9ddf7;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;backdrop-filter:blur(12px);white-space:nowrap}
        .comp-camera-bottom{position:absolute;z-index:4;left:24px;right:24px;bottom:22px;display:flex;justify-content:space-between;align-items:end;gap:15px}
        .comp-detected{padding:11px 14px;border:1px solid #fff2;border-radius:15px;background:#130a1fcc;backdrop-filter:blur(14px)}
        .comp-detected small{display:block;margin-bottom:3px;color:#9f8db4;font-size:8px;font-weight:800;letter-spacing:.13em;text-transform:uppercase}
        .comp-detected strong{font-size:25px;line-height:1;color:#fff}
        .comp-detected.wrong strong{color:#ff9aab}
        .comp-detected.right strong{color:#9de778}
        .comp-hint{padding:9px 11px;border:1px solid #fff2;border-radius:12px;background:#130a1fcc;color:#bcaecb;font-size:9px;text-align:right;backdrop-filter:blur(14px)}
        .comp-placeholder{position:absolute;inset:0;z-index:2;display:grid;place-items:center;text-align:center;padding:35px}
        .comp-placeholder-inner{max-width:390px}
        .comp-camera-icon{width:68px;height:68px;margin:auto;display:grid;place-items:center;border:1px solid #b989ff47;border-radius:21px;background:#8f53e61c;color:#c49cff;box-shadow:0 0 0 9px #8f53e60a}
        .comp-camera-icon svg{width:32px;height:32px}
        .comp-placeholder .comp-kicker{margin-top:22px}
        .comp-placeholder h2{margin:0;color:#fff;font-size:32px;letter-spacing:-.035em}
        .comp-placeholder p{margin:9px 0 20px;color:#aa9abf;font-size:12px;line-height:1.6}
        .comp-primary{min-height:45px;display:inline-flex;align-items:center;gap:8px;padding:0 17px;border:0;border-radius:12px;background:linear-gradient(100deg,#7c3aed,#a855f7);color:#fff;font:700 12px Outfit;cursor:pointer;box-shadow:0 5px 0 #5525a2}
        .comp-primary svg{width:15px;height:15px}
        .comp-side{display:flex;flex-direction:column;gap:13px}
        .comp-card{border:2px solid var(--c-border);border-radius:20px;background:var(--c-card);box-shadow:0 6px 0 color-mix(in srgb,var(--c-accent) 8%,transparent)}
        .comp-test{padding:22px;position:relative;overflow:hidden}
        .comp-test:before{content:"";position:absolute;width:220px;height:220px;right:-110px;top:-120px;border-radius:50%;background:color-mix(in srgb,var(--c-accent) 9%,transparent)}
        .comp-test-head{position:relative;z-index:1;display:flex;align-items:start;justify-content:space-between;gap:12px;margin-bottom:18px}
        .comp-test-head h2{margin:0;font-size:25px;letter-spacing:-.035em}
        .comp-level{padding:7px 10px;border:1px solid var(--c-border);border-radius:99px;background:var(--c-soft);color:var(--c-muted);font-size:9px;font-weight:800;letter-spacing:.08em}
        .comp-target{position:relative;z-index:1;display:grid;grid-template-columns:112px 1fr;gap:17px;align-items:center;padding:15px;border:2px solid var(--c-border);border-radius:18px;background:var(--c-soft)}
        .comp-target-letter{height:108px;display:grid;place-items:center;border:1px solid color-mix(in srgb,var(--c-accent) 20%,var(--c-border));border-radius:16px;background:var(--c-card)}
        .comp-target-letter strong{font-size:55px;line-height:1;color:var(--c-accent)}
        .comp-target small{display:block;color:var(--c-pink);font-size:9px;font-weight:800;letter-spacing:.14em}
        .comp-target h3{margin:4px 0 5px;font-size:24px}
        .comp-target p{margin:0;color:var(--c-muted);font-size:10px;line-height:1.5}
        .comp-status{position:relative;z-index:1;margin-top:13px;padding:13px 14px;border-radius:14px;background:var(--c-soft);border:1px solid var(--c-border)}
        .comp-status strong{display:block;font-size:14px}
        .comp-status span{display:block;margin-top:4px;color:var(--c-muted);font-size:10px;line-height:1.4}
        .comp-status.wrong{border-color:#e79aaa;background:#fff1f3}
        .comp-status.wrong strong{color:#c63753}
        .comp-status.success{border-color:#9bd879;background:#f1faea}
        .comp-status.success strong{color:#4d9a25}
        .comp-metric{margin-top:15px}
        .comp-metric-row{display:flex;justify-content:space-between;gap:10px;margin-bottom:7px;font-size:10px}
        .comp-metric-row span{color:var(--c-muted)}
        .comp-metric-row b{color:var(--c-accent)}
        .comp-bar{height:7px;overflow:hidden;border-radius:99px;background:color-mix(in srgb,var(--c-accent) 10%,transparent)}
        .comp-bar i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--c-accent),var(--c-pink));transition:width .25s}
        .comp-bar.hold i{background:linear-gradient(90deg,#78c84a,#b4ed76)}
        .comp-next{width:100%;min-height:45px;margin-top:15px;border:0;border-radius:12px;background:var(--c-accent);color:#fff;font:700 12px Outfit;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 0 color-mix(in srgb,var(--c-accent) 65%,#000)}
        .comp-next:disabled{opacity:.35;cursor:not-allowed;box-shadow:none}
        .comp-next svg{width:16px;height:16px}
        .comp-next.complete{background:var(--c-green);box-shadow:0 4px 0 #4c9827}
        .comp-map{padding:17px 18px}
        .comp-map-head{display:flex;justify-content:space-between;align-items:end;margin-bottom:12px}
        .comp-map-head small{display:block;color:var(--c-pink);font-size:9px;font-weight:800;letter-spacing:.13em}
        .comp-map-head h3{margin:3px 0 0;font-size:16px}
        .comp-map-head span{font-size:9px;color:var(--c-dim)}
        .comp-letters{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
        .comp-letter-card{min-width:0;min-height:75px;padding:10px 6px;border:1px solid var(--c-border);border-radius:13px;background:var(--c-soft);text-align:center;transition:.2s}
        .comp-letter-card strong{display:block;font-size:21px;color:var(--c-accent)}
        .comp-letter-card span{display:block;margin-top:3px;font-size:8px;font-weight:700;color:var(--c-muted)}
        .comp-letter-card.current{border-color:color-mix(in srgb,var(--c-accent) 45%,var(--c-border));box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c-accent) 20%,transparent)}
        .comp-letter-card.current strong{color:var(--c-accent)}
        .comp-letter-card.done{background:#eaf8df;border-color:#9bd879}
        .comp-letter-card.done strong,.comp-letter-card.done span{color:#4d9a25}
        .comp-letter-card.locked{opacity:.48}
        .comp-rule{padding:13px 15px;border:1px solid var(--c-border);border-radius:15px;background:color-mix(in srgb,var(--c-accent) 4%,var(--c-card));color:var(--c-muted);font-size:10px;line-height:1.5}
        .comp-rule b{color:var(--c-text)}
        .comp-complete{text-align:center;padding:25px 20px}
        .comp-complete-badge{width:58px;height:58px;margin:0 auto 10px;display:grid;place-items:center;border-radius:18px;background:#eaf8df;color:#4d9a25;border:1px solid #9bd879}
        .comp-complete-badge svg{width:29px;height:29px}
        .comp-complete h2{margin:0;font-size:25px}
        .comp-complete p{margin:7px auto 17px;color:var(--c-muted);font-size:11px;max-width:310px;line-height:1.5}
        .comp-restart{border:1px solid var(--c-border);border-radius:11px;background:var(--c-soft);color:var(--c-accent);font:700 11px Outfit;padding:10px 15px;cursor:pointer}
        @media(max-width:980px){.comp-grid{grid-template-columns:1fr}.comp-camera{min-height:540px}}
        @media(max-width:600px){
          .sparsh-compete-page{padding:18px 13px 30px}
          .comp-breadcrumb,.comp-score{display:none}
          .comp-heading{display:block}
          .comp-grid{gap:13px}
          .comp-camera{min-height:430px;border-radius:20px}
          .comp-target{grid-template-columns:90px 1fr}
          .comp-target-letter{height:88px}
          .comp-target-letter strong{font-size:42px}
          .comp-target h3{font-size:20px}
          .comp-camera-bottom{left:15px;right:15px;bottom:15px}
          .comp-hint{display:none}
        }
        [data-theme="dark"] .sparsh-compete-page{
          --c-bg:#10091d;--c-card:#1b1330;--c-soft:#241a3d;--c-border:#3b2a5c;
          --c-text:#f4efff;--c-muted:#b9accd;--c-dim:#8f7ca9;--c-accent:#ae70ff;--c-pink:#e58cff;--c-green:#85db5e;
          background:radial-gradient(circle at 12% 12%,#8f53e61a 0 90px,transparent 230px),linear-gradient(180deg,#10091d,#160d28)
        }
        [data-theme="dark"] .comp-status.wrong{background:#311624;border-color:#8b3d55}
        [data-theme="dark"] .comp-status.wrong strong{color:#ff9bad}
        [data-theme="dark"] .comp-status.success{background:#1b3214;border-color:#4f8237}
        [data-theme="dark"] .comp-status.success strong{color:#9de778}
        [data-theme="dark"] .comp-letter-card.done{background:#1c3515;border-color:#4f8237}
        [data-theme="dark"] .comp-letter-card.done strong,[data-theme="dark"] .comp-letter-card.done span{color:#9de778}
      `}</style>

      <div className="comp-shell">
        <div className="comp-top">
          <button className="comp-back" onClick={onBack} type="button">
            <Icon.back /> Back to learning
          </button>
          <div className="comp-breadcrumb">Learning / <b>Compete</b></div>
        </div>

        <div className="comp-heading">
          <div>
            <p className="comp-kicker">THE SPARSH CHALLENGE</p>
            <h1 className="comp-title">Prove your <span>sign.</span></h1>
            <p className="comp-sub">
              Match the exact target sign, hold it steady, and clear all five checkpoints.
            </p>
          </div>
          <div className="comp-score">
            <strong>{completedCount}/5</strong>
            <span>Signs passed</span>
          </div>
        </div>

        <div className="comp-progress" aria-label="Level progress">
          <i style={{ width: `${progress}%` }} />
        </div>

        <div className="comp-grid">
          <section className="comp-camera" aria-label="Compete camera">
            <video ref={videoRef} className={`comp-video ${running ? "" : "hidden"}`} muted playsInline />

            {!running && (
              <div className="comp-placeholder">
                <div className="comp-placeholder-inner">
                  <div className="comp-camera-icon"><Icon.camera /></div>
                  <p className="comp-kicker">READY FOR THE TEST?</p>
                  <h2>Sign {target}</h2>
                  <p>
                    Show the target sign clearly. A level passes only when the model
                    recognises the exact target and the hold is confirmed.
                  </p>
                  <button className="comp-primary" onClick={startCamera} type="button">
                    <Icon.play /> Start camera
                  </button>
                </div>
              </div>
            )}

            {running && (
              <>
                <div className="comp-live"><i className="comp-dot" /> Camera live</div>
                <div className="comp-target-pill">Target · Sign {target}</div>
                <button className="comp-stop" onClick={stopCamera} type="button" aria-label="Stop camera"><i /></button>
              </>
            )}

            <div className="comp-frame" aria-hidden="true">
              <i className="comp-corner tl" /><i className="comp-corner tr" />
              <i className="comp-corner bl" /><i className="comp-corner br" />
            </div>

            {running && (
              <div className="comp-camera-bottom">
                <div className={`comp-detected ${exactMatch ? "right" : isWrong ? "wrong" : ""}`}>
                  <small>Detected now</small>
                  <strong>{detected || "—"}</strong>
                </div>
                <div className="comp-hint">
                  {isPassed ? "Target matched · Passed" : exactMatch ? "Keep holding the sign" : "Show the target sign"}
                </div>
              </div>
            )}
          </section>

          <aside className="comp-side">
            {allComplete ? (
              <section className="comp-card comp-complete">
                <div className="comp-complete-badge"><Icon.check /></div>
                <h2>Level complete!</h2>
                <p>You passed A, B, C, D and E. The checkpoint cards can now be marked as completed.</p>
                <button className="comp-restart" onClick={restart} type="button">Play again</button>
              </section>
            ) : (
              <section className="comp-card comp-test">
                <div className="comp-test-head">
                  <div>
                    <p className="comp-kicker">CURRENT CHECKPOINT</p>
                    <h2>Can you sign it?</h2>
                  </div>
                  <span className="comp-level">LEVEL 1 · {targetIndex + 1}/5</span>
                </div>

                <div className="comp-target">
                  <div className="comp-target-letter"><strong>{target}</strong></div>
                  <div>
                    <small>TARGET SIGN</small>
                    <h3>Sign {target}</h3>
                    <p>Only <b>{target}</b> will pass this checkpoint.</p>
                  </div>
                </div>

                <div className={`comp-status ${isPassed ? "success" : isWrong ? "wrong" : ""}`}>
                  <strong>
                    {isPassed ? "Passed!" : isWrong ? "Try again" : running ? (exactMatch ? "Correct sign" : "Waiting for target") : "Start the camera"}
                  </strong>
                  <span>
                    {isPassed
                      ? `Sign ${target} matched and was held long enough.`
                      : isWrong
                        ? `You signed ${detected}. The target is Sign ${target}.`
                        : exactMatch
                          ? "Great — keep the exact sign steady until confirmation."
                          : `Show Sign ${target} to continue.`}
                  </span>
                </div>

                <div className="comp-metric">
                  <div className="comp-metric-row">
                    <span>Recognition confidence</span><b>{Math.round(confidenceValue)}%</b>
                  </div>
                  <div className="comp-bar"><i style={{ width: `${confidenceValue}%` }} /></div>
                </div>

                <div className="comp-metric">
                  <div className="comp-metric-row">
                    <span>Hold to confirm</span><b>{isPassed ? "Confirmed" : `${Math.round(holdValue)}%`}</b>
                  </div>
                  <div className="comp-bar hold"><i style={{ width: `${holdValue}%` }} /></div>
                </div>

                <button
                  className="comp-next"
                  disabled={!isPassed}
                  onClick={next}
                  type="button"
                >
                  {targetIndex === TARGETS.length - 1 ? "Complete level" : <>Next · Sign {TARGETS[targetIndex + 1]} <Icon.arrow /></>}
                </button>
              </section>
            )}

            <section className="comp-card comp-map">
              <div className="comp-map-head">
                <div>
                  <small>YOUR ADVENTURE MAP</small>
                  <h3>Basics · Five signs</h3>
                </div>
                <span>{completedCount}/5 complete</span>
              </div>

              <div className="comp-letters">
                {TARGETS.map((letter, index) => {
                  const done = passed.has(letter);
                  const current = !done && index === targetIndex;
                  return (
                    <div
                      key={letter}
                      className={`comp-letter-card ${done ? "done" : current ? "current" : "locked"}`}
                    >
                      {done ? <Icon.check style={{ width: 14, height: 14, margin: "0 auto 3px" }} /> : null}
                      <strong>{letter}</strong>
                      <span>{done ? "Passed" : current ? "Current" : "Locked"}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            <div className="comp-rule">
              <b>How passing works:</b> the detected sign must exactly match the current
              target. Signing another letter never passes the checkpoint. Once the correct
              sign reaches 100% hold confirmation, the checkpoint turns green and Next unlocks.
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}