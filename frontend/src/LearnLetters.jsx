import { useEffect, useState } from "react";

/*
  S-स्पर्श — Individual Sign Learning UI
  One reusable page for A-Z. Put images in:
  frontend/public/signs/A.png ... Z.png
*/

const Icon = {
  back: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M19 12H5"/><path d="m11 18-6-6 6-6"/></svg>,
  next: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>,
  camera: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M8 7l1.5-3h5L16 7"/><circle cx="12" cy="13.5" r="3.2"/></svg>,
  play: (p) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M8 5v14l11-7z"/></svg>,
  volume: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="M17 8a5 5 0 0 1 0 8"/></svg>,
  bulb: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 18h6"/><path d="M10 22h4"/><path d="M8.2 14.5A6 6 0 1 1 15.8 14.5c-.9.7-1.5 1.7-1.7 2.5h-4.2c-.2-.8-.8-1.8-1.7-2.5Z"/></svg>,
  image: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m21 15-4.5-4.5L8 19"/></svg>
};

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export default function IndividualLetterLearning({
  sign = "A",
  imageSrc,
  level = 1,
  videoRef,
  running = false,
  prediction = "—",
  confidence = 0,
  practiceFeedback = "",
  learned = false,
  onBack = () => {},
  onStartCamera = () => {},
  onStopCamera = () => {},
  onNext,
  onPrevious,
  onSpeak
}) {
  const current = String(sign || "A").toUpperCase();
  const [missingImage, setMissingImage] = useState(false);

  useEffect(() => setMissingImage(false), [current, imageSrc]);

  const image = imageSrc || `/signs/${current}.png`;
  const index = Math.max(0, LETTERS.indexOf(current));
  const confidenceValue = Math.max(0, Math.min(100, Number(confidence) || 0));
  const progress = ((index + 1) / LETTERS.length) * 100;

  const speak = () => {
    if (onSpeak) return onSpeak(current);
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(current);
    u.lang = "en-IN";
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
  };

  return (
    <div className="sparsh-letter-page">
      <style>{`
        .sparsh-letter-page{
          --sl-bg:var(--bg,#f8f6ff);--sl-card:var(--card,#fff);--sl-card2:var(--card2,#f3efff);
          --sl-border:var(--border,#e4dcf7);--sl-text:var(--text,#261a43);--sl-muted:var(--muted,#75688f);
          --sl-dim:var(--dim,#9589ad);--sl-accent:var(--accent,#7c3aed);--sl-pink:var(--pink,#b35bf0);
          --sl-good:var(--good,#6dcb3b);min-height:calc(100vh - 72px);padding:28px clamp(16px,4vw,52px) 40px;
          color:var(--sl-text);font-family:Outfit,system-ui,sans-serif;
          background:radial-gradient(circle at 10% 8%,color-mix(in srgb,var(--sl-accent) 7%,transparent) 0 100px,transparent 230px),
          radial-gradient(circle at 92% 80%,color-mix(in srgb,var(--sl-pink) 7%,transparent) 0 110px,transparent 250px),
          var(--sl-bg);overflow-x:hidden
        }
        .sparsh-letter-page *{box-sizing:border-box}
        .sl-shell{width:min(1260px,100%);margin:auto}
        .sl-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}
        .sl-back{display:inline-flex;align-items:center;gap:8px;padding:7px 0;border:0;background:none;color:var(--sl-muted);font:600 12px Outfit;cursor:pointer}
        .sl-back svg{width:17px;height:17px;transition:transform .2s}
        .sl-back:hover{color:var(--sl-accent)}.sl-back:hover svg{transform:translateX(-3px)}
        .sl-crumb{display:flex;gap:8px;align-items:center;color:var(--sl-dim);font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase}
        .sl-crumb b{color:var(--sl-accent)}
        .sl-grid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(370px,.85fr);gap:18px}
        .sl-camera{min-height:620px;position:relative;overflow:hidden;border:2px solid color-mix(in srgb,var(--sl-accent) 20%,var(--sl-border));border-radius:25px;background:#171022;box-shadow:0 18px 50px rgba(49,24,91,.10),0 5px 0 color-mix(in srgb,var(--sl-accent) 12%,transparent)}
        .sl-camera:before{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(rgba(172,119,255,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(172,119,255,.055) 1px,transparent 1px);background-size:42px 42px}
        .sl-camera:after{content:"";position:absolute;width:320px;height:320px;left:50%;top:45%;transform:translate(-50%,-50%);border-radius:50%;background:rgba(143,83,230,.10);filter:blur(55px)}
        .sl-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scaleX(-1);background:#100b18}.sl-video.hidden{display:none}
        .sl-placeholder{position:absolute;inset:0;z-index:2;display:grid;place-items:center;text-align:center;padding:38px}
        .sl-placeholder-inner{width:min(390px,100%);display:flex;flex-direction:column;align-items:center}
        .sl-camera-icon{width:72px;height:72px;display:grid;place-items:center;border:1px solid #b989ff47;border-radius:22px;background:#8f53e61c;color:#c49cff;box-shadow:0 0 0 9px #8f53e60a}
        .sl-camera-icon svg{width:34px;height:34px}
        .sl-kicker{margin:24px 0 7px;color:#bf99f7;font-size:10px;font-weight:800;letter-spacing:.15em}
        .sl-placeholder h2{margin:0;color:white;font-size:clamp(25px,3vw,35px);letter-spacing:-.03em}
        .sl-placeholder p{max-width:390px;margin:10px 0 21px;color:#aa9abf;font-size:13px;line-height:1.6}
        .sl-primary{min-height:46px;display:inline-flex;align-items:center;gap:9px;padding:0 18px;border:0;border-radius:12px;background:linear-gradient(100deg,#7c3aed,#a855f7);color:white;font:700 12px Outfit;cursor:pointer;box-shadow:0 5px 0 #5525a2;transition:.18s}
        .sl-primary:hover{transform:translateY(-2px);box-shadow:0 7px 0 #5525a2}.sl-primary:active{transform:translateY(3px);box-shadow:0 2px 0 #5525a2}
        .sl-primary svg{width:15px;height:15px}
        .sl-live{position:absolute;z-index:4;top:17px;left:17px;display:flex;align-items:center;gap:7px;padding:7px 10px;border:1px solid #fff2;border-radius:99px;background:#130a1fbb;color:#eee6fa;font-size:10px;font-weight:700;backdrop-filter:blur(12px)}
        .sl-dot{width:7px;height:7px;border-radius:50%;background:#85db5e;box-shadow:0 0 0 4px #85db5e1a}
        .sl-stop{position:absolute;z-index:4;top:14px;right:14px;width:38px;height:38px;display:grid;place-items:center;border:1px solid #fff2;border-radius:11px;background:#130a1fbb;color:white;cursor:pointer;backdrop-filter:blur(12px)}
        .sl-stop i{width:13px;height:13px;border-radius:3px;background:currentColor}
        .sl-frame{position:absolute;inset:34px;z-index:3;pointer-events:none}
        .sl-corner{position:absolute;width:42px;height:42px;border-color:#be91ffb8;border-style:solid}.sl-corner.tl{top:0;left:0;border-width:2px 0 0 2px;border-radius:7px 0 0}.sl-corner.tr{top:0;right:0;border-width:2px 2px 0 0;border-radius:0 7px 0}.sl-corner.bl{bottom:0;left:0;border-width:0 0 2px 2px;border-radius:0 0 0 7px}.sl-corner.br{bottom:0;right:0;border-width:0 2px 2px 0;border-radius:0 0 7px}
        .sl-camera-label{position:absolute;z-index:4;left:50%;bottom:18px;transform:translateX(-50%);padding:8px 12px;border:1px solid #fff2;border-radius:99px;background:#0f0818a8;color:#cbbdde;backdrop-filter:blur(12px);font-size:10px;white-space:nowrap}
        .sl-camera-label strong{color:#e8d8ff}
        .sl-side{display:flex;flex-direction:column;gap:13px;min-width:0}
        .sl-reference,.sl-status,.sl-tip{border:2px solid var(--sl-border);background:var(--sl-card);box-shadow:0 6px 0 color-mix(in srgb,var(--sl-accent) 8%,transparent)}
        .sl-reference{position:relative;flex:1;min-height:510px;overflow:hidden;padding:27px;border-radius:25px}
        .sl-reference:before{content:"";position:absolute;width:230px;height:230px;right:-100px;top:-110px;border-radius:50%;background:color-mix(in srgb,var(--sl-accent) 10%,transparent)}
        .sl-reference:after{content:"";position:absolute;width:180px;height:180px;left:-100px;bottom:-110px;border-radius:50%;background:color-mix(in srgb,var(--sl-pink) 8%,transparent)}
        .sl-head{position:relative;z-index:1;display:flex;justify-content:space-between;gap:12px}
        .sl-eyebrow{margin:0 0 5px;color:var(--sl-pink);font-size:10px;font-weight:800;letter-spacing:.15em}
        .sl-title{margin:0;font-size:clamp(32px,4vw,47px);line-height:.95;letter-spacing:-.045em}.sl-title span{color:var(--sl-accent)}
        .sl-level{padding:7px 10px;height:max-content;border:1px solid var(--sl-border);border-radius:99px;background:var(--sl-card2);color:var(--sl-muted);font-size:9px;font-weight:800;letter-spacing:.09em;text-transform:uppercase}
        .sl-image-box{
  position:relative;
  z-index:1;
  height:285px;
  display:flex;
  align-items:center;
  justify-content:center;
  margin:24px 0 20px;
  padding:20px;
  overflow:hidden;
  border:2px solid var(--sl-border);
  border-radius:20px;
  background:radial-gradient(
    circle at 50% 45%,
    color-mix(in srgb,var(--sl-accent) 8%,transparent),
    transparent 56%
  ),var(--sl-card2);
}
        .sl-sign-image{
  position:relative;
  z-index:1;
  display:block;

  /* Let the image keep its natural proportions */
  width:auto;
  height:auto;

  /* NEVER allow the image to escape the reference box */
  max-width:100%;
  max-height:100%;

  object-fit:contain;
  object-position:center;

  border-radius:14px;
  filter:drop-shadow(0 15px 18px rgba(55,29,98,.13));
  animation:sl-in .35s ease;
}
        .sl-missing{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;text-align:center;gap:8px;color:var(--sl-dim);padding:25px}
        .sl-missing-icon{width:54px;height:54px;display:grid;place-items:center;border-radius:17px;background:color-mix(in srgb,var(--sl-accent) 10%,transparent);color:var(--sl-accent)}
        .sl-missing-icon svg{width:23px;height:23px}.sl-missing strong{color:var(--sl-text);font-size:13px}.sl-missing span{max-width:240px;font-size:10px;line-height:1.5}
        .sl-desc{position:relative;z-index:1;margin:0;color:var(--sl-muted);font-size:12px;line-height:1.55}
        .sl-speak{position:absolute;z-index:2;right:25px;bottom:25px;width:40px;height:40px;display:grid;place-items:center;padding:0;border:1px solid var(--sl-border);border-radius:12px;background:var(--sl-card2);color:var(--sl-accent);cursor:pointer}.sl-speak svg{width:17px;height:17px}
        .sl-status{padding:16px 18px;border-radius:19px}
        .sl-status-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:11px}.sl-status-head div{display:flex;align-items:center;gap:9px}.sl-status-head strong{font-size:12px}.sl-status-head span{color:var(--sl-dim);font-size:10px}
        .sl-status-dot{width:9px;height:9px;border-radius:50%;background:var(--sl-dim)}.sl-status-dot.active{background:var(--sl-good);box-shadow:0 0 0 5px color-mix(in srgb,var(--sl-good) 12%,transparent)}
        .sl-confidence{display:grid;grid-template-columns:1fr auto;gap:8px 12px}.sl-confidence label{color:var(--sl-muted);font-size:10px}.sl-confidence b{color:var(--sl-accent);font-size:11px}
        .sl-bar{grid-column:1/-1;height:6px;overflow:hidden;border-radius:99px;background:color-mix(in srgb,var(--sl-accent) 10%,transparent)}.sl-bar i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--sl-accent),var(--sl-pink));transition:width .3s}
        .sl-feedback{margin:10px 0 0;color:var(--sl-dim);font-size:10px;line-height:1.4}.sl-feedback.good{color:var(--sl-good);font-weight:700}
        .sl-nav{display:grid;grid-template-columns:1fr 1fr;gap:10px}.sl-nav button{min-height:46px;display:flex;align-items:center;justify-content:center;gap:8px;border:2px solid var(--sl-border);border-radius:13px;background:var(--sl-card);color:var(--sl-muted);font:700 11px Outfit;cursor:pointer;transition:.18s}.sl-nav button:hover:not(:disabled){transform:translateY(-2px);border-color:color-mix(in srgb,var(--sl-accent) 40%,var(--sl-border));color:var(--sl-accent)}.sl-nav button.primary{border-color:transparent;background:linear-gradient(100deg,#7c3aed,#a855f7);color:#fff;box-shadow:0 4px 0 #6331bd}.sl-nav button:disabled{opacity:.42;cursor:not-allowed}.sl-nav svg{width:16px;height:16px}
        .sl-tip{display:grid;grid-template-columns:40px 1fr;gap:11px;align-items:start;padding:13px 14px;border-radius:15px;background:color-mix(in srgb,var(--sl-accent) 4%,var(--sl-card));box-shadow:none}.sl-tip-icon{width:40px;height:40px;display:grid;place-items:center;border-radius:12px;background:color-mix(in srgb,var(--sl-accent) 10%,var(--sl-card2));color:var(--sl-accent)}.sl-tip-icon svg{width:19px;height:19px}.sl-tip small{display:block;margin-bottom:3px;color:var(--sl-pink);font-size:9px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.sl-tip p{margin:0;color:var(--sl-muted);font-size:10px;line-height:1.45}
        .sl-progress{display:flex;align-items:center;gap:10px;padding:10px 13px;border:1px solid var(--sl-border);border-radius:13px;background:color-mix(in srgb,var(--sl-accent) 3%,var(--sl-card))}.sl-progress span{color:var(--sl-dim);font-size:9px;font-weight:700;white-space:nowrap}.sl-mini{flex:1;height:5px;overflow:hidden;border-radius:99px;background:color-mix(in srgb,var(--sl-accent) 10%,transparent)}.sl-mini i{display:block;width:${progress}%;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--sl-accent),var(--sl-pink))}.sl-progress b{color:var(--sl-accent);font-size:10px}
        @keyframes sl-in{from{opacity:0;transform:scale(.96) translateY(5px)}to{opacity:1;transform:none}}
        @media(max-width:980px){.sl-grid{grid-template-columns:1fr}.sl-camera{min-height:540px}.sl-reference{min-height:auto}.sl-image-box{height:320px}}
        @media(max-width:600px){.sparsh-letter-page{padding:18px 13px 28px}.sl-crumb{display:none}.sl-camera{min-height:430px;border-radius:20px}.sl-reference{padding:20px;border-radius:20px}.sl-image-box{height:260px}.sl-title{font-size:34px}.sl-speak{right:19px;bottom:19px}.sl-camera-label{max-width:calc(100% - 30px);overflow:hidden;text-overflow:ellipsis}.sl-frame{inset:24px}}
        @media(max-width:390px){.sl-camera{min-height:380px}.sl-image-box{height:225px}.sl-nav button{font-size:10px}}
        @media(prefers-reduced-motion:reduce){.sparsh-letter-page *{animation-duration:.01ms!important;transition-duration:.01ms!important}}
        [data-theme="dark"] .sparsh-letter-page{--sl-bg:#10091d;--sl-card:#1b1330;--sl-card2:#241a3d;--sl-border:#3b2a5c;--sl-text:#f4efff;--sl-muted:#b9accd;--sl-dim:#8f7ca9;--sl-accent:#ae70ff;--sl-pink:#e58cff;--sl-good:#85db5e;background:radial-gradient(circle at 12% 12%,#8f53e61a 0 90px,transparent 230px),radial-gradient(circle at 88% 76%,#e58cff14 0 100px,transparent 240px),linear-gradient(180deg,#10091d,#160d28)}
        [data-theme="dark"] .sl-reference,[data-theme="dark"] .sl-status,[data-theme="dark"] .sl-nav button{box-shadow:0 6px 0 #08040f8c}
        [data-theme="dark"] .sl-image-box{background:radial-gradient(circle at 50% 45%,#ae70ff1a,transparent 56%),#241a3d}
      `}</style>

      <div className="sl-shell">
        <div className="sl-top">
          <button className="sl-back" type="button" onClick={onBack}>
            <Icon.back /> Back to sign library
          </button>
          <div className="sl-crumb"><span>Learning</span><span>/</span><b>{current}</b></div>
        </div>

        <div className="sl-grid">
          <section className="sl-camera" aria-label={`Camera practice for sign ${current}`}>
            <video ref={videoRef} className={`sl-video ${running ? "" : "hidden"}`} muted playsInline />

            {!running && (
              <div className="sl-placeholder">
                <div className="sl-placeholder-inner">
                  <div className="sl-camera-icon"><Icon.camera /></div>
                  <p className="sl-kicker">READY TO PRACTISE</p>
                  <h2>Show the sign for {current}</h2>
                  <p>Position your hand inside the frame and start the camera when you're ready to practise.</p>
                  <button className="sl-primary" type="button" onClick={onStartCamera}>
                    <Icon.play /> Start Camera
                  </button>
                </div>
              </div>
            )}

            {running && (
              <>
                <div className="sl-live"><i className="sl-dot" /> Camera live</div>
                <button className="sl-stop" type="button" onClick={onStopCamera} aria-label="Stop camera"><i /></button>
              </>
            )}

            <div className="sl-frame" aria-hidden="true">
              <i className="sl-corner tl"/><i className="sl-corner tr"/><i className="sl-corner bl"/><i className="sl-corner br"/>
            </div>
            <div className="sl-camera-label"><strong>Practice area</strong>&nbsp; · &nbsp;Keep your hand clearly visible</div>
          </section>

          <aside className="sl-side">
            <section className="sl-reference">
              <div className="sl-head">
                <div>
                  <p className="sl-eyebrow">SIGN REFERENCE</p>
                  <h1 className="sl-title">SIGN <span>{current}</span></h1>
                </div>
                <span className="sl-level">Level {level}</span>
              </div>

              <div className="sl-image-box">
                {!missingImage ? (
                  <img
                    key={image}
                    className="sl-sign-image"
                    src={image}
                    alt={`Indian Sign Language sign for ${current}`}
                    onError={() => setMissingImage(true)}
                  />
                ) : (
                  <div className="sl-missing">
                    <div className="sl-missing-icon"><Icon.image /></div>
                    <strong>Sign image coming soon</strong>
                    <span>Upload <b>{current}.png</b> inside <b>public/signs/</b> to show the reference image.</span>
                  </div>
                )}
              </div>

              <p className="sl-desc">
                Learn the handshape for <b>{current}</b>, then try reproducing it in the camera.
              </p>

              <button className="sl-speak" type="button" onClick={speak} aria-label={`Hear ${current}`}>
                <Icon.volume />
              </button>
            </section>

            <section className="sl-status">
              <div className="sl-status-head">
                <div><i className={`sl-status-dot ${running ? "active" : ""}`} /><strong>{running ? "Practising" : "Waiting for practice"}</strong></div>
                <span>Detected: <b>{prediction || "—"}</b></span>
              </div>
              <div className="sl-confidence">
                <label>Recognition confidence</label>
                <b>{Math.round(confidenceValue)}%</b>
                <div className="sl-bar"><i style={{width:`${confidenceValue}%`}}/></div>
              </div>
              <p className={`sl-feedback ${learned || practiceFeedback.toLowerCase().includes("correct") ? "good" : ""}`}>
                {practiceFeedback || (learned ? `${current} has been learned.` : `Show ${current} to the camera and hold your hand steady.`)}
              </p>
            </section>

            <div className="sl-nav">
              <button type="button" onClick={onPrevious} disabled={!onPrevious || index === 0}>
                <Icon.back /> Previous
              </button>
              <button className="primary" type="button" onClick={onNext} disabled={!onNext || index === LETTERS.length - 1}>
                Next sign <Icon.next />
              </button>
            </div>

            <section className="sl-tip">
              <div className="sl-tip-icon"><Icon.bulb /></div>
              <div><small>Practice tip</small><p>Match the reference image and keep your hand clearly inside the camera frame for better recognition.</p></div>
            </section>

            <div className="sl-progress">
              <span>ALPHABET JOURNEY</span>
              <div className="sl-mini"><i/></div>
              <b>{index + 1} / 26</b>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
