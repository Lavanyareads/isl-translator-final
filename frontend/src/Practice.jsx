import React from "react";

const Icon = {
  back: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M19 12H5" /><path d="m11 18-6-6 6-6" />
    </svg>
  ),
  camera: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
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
  volume: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M4 9v6h4l5 4V5L8 9H4Z" />
      <path d="M17 8a5 5 0 0 1 0 8" />
    </svg>
  ),
  trash: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M5 7h14" /><path d="M9 7V5h6v2" />
      <path d="M7 7l1 13h8l1-13" />
    </svg>
  ),
  translate: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M4 6h8" /><path d="M7 4v2c0 3.5-1.8 6-4 7.5" />
      <path d="M8 10c1 1.4 2.2 2.4 4 3" />
      <path d="M14 20l4-10 4 10" /><path d="M15.5 17h5" />
    </svg>
  ),
  check: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="m5 12 4 4L19 6" />
    </svg>
  ),
};

export default function Practice({
  videoRef,
  running = false,
  prediction = "·",
  confidence = 0,
  hold = 0,
  sentence = "",
  currentWord = "",
  lastAdded = "",
  output = { cleaned: "", marathi: "" },
  stats = { signs: 0, words: 0 },
  translate,
  startCamera,
  stopCamera,
  resetCapture,
  onBack,
}) {
  const confidenceValue = Math.max(
    0,
    Math.min(100, Number(confidence) || 0)
  );
  const holdValue = Math.max(0, Math.min(100, Number(hold) || 0));

  const detected = prediction && prediction !== "·" ? prediction : "—";
  const builtMessage = `${sentence || ""}${currentWord || ""}`.trim();

  const speak = (text, lang) => {
    if (!text || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="sparsh-practice-page">
      <style>{`
        .sparsh-practice-page{
          --sp-bg:var(--bg,#f8f6ff);
          --sp-card:var(--card,#fff);
          --sp-card2:var(--card2,#f3efff);
          --sp-border:var(--border,#e4dcf7);
          --sp-text:var(--text,#261a43);
          --sp-muted:var(--muted,#75688f);
          --sp-dim:var(--dim,#9589ad);
          --sp-accent:var(--accent,#7c3aed);
          --sp-pink:var(--pink,#b35bf0);
          --sp-good:var(--good,#6dcb3b);

          min-height:calc(100vh - 72px);
          padding:28px clamp(16px,4vw,52px) 40px;
          color:var(--sp-text);
          font-family:Outfit,system-ui,sans-serif;
          background:
            radial-gradient(circle at 9% 8%,color-mix(in srgb,var(--sp-accent) 7%,transparent) 0 100px,transparent 230px),
            radial-gradient(circle at 91% 80%,color-mix(in srgb,var(--sp-pink) 7%,transparent) 0 110px,transparent 250px),
            var(--sp-bg);
          overflow-x:hidden;
        }

        .sparsh-practice-page *{box-sizing:border-box}

        .sp-shell{width:min(1260px,100%);margin:auto}

        .sp-top{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:18px;
          margin-bottom:18px;
        }

        .sp-back{
          display:inline-flex;
          align-items:center;
          gap:8px;
          padding:7px 0;
          border:0;
          background:none;
          color:var(--sp-muted);
          font:600 12px Outfit;
          cursor:pointer;
        }

        .sp-back svg{width:17px;height:17px;transition:transform .2s}
        .sp-back:hover{color:var(--sp-accent)}
        .sp-back:hover svg{transform:translateX(-3px)}

        .sp-crumb{
          display:flex;
          align-items:center;
          gap:8px;
          color:var(--sp-dim);
          font-size:10px;
          font-weight:700;
          letter-spacing:.1em;
          text-transform:uppercase;
        }

        .sp-crumb b{color:var(--sp-accent)}

        .sp-intro{
          display:flex;
          align-items:flex-end;
          justify-content:space-between;
          gap:24px;
          margin-bottom:18px;
        }

        .sp-eyebrow{
          margin:0 0 6px;
          color:var(--sp-pink);
          font-size:10px;
          font-weight:800;
          letter-spacing:.15em;
          text-transform:uppercase;
        }

        .sp-title{
          margin:0;
          font-size:clamp(34px,4vw,50px);
          line-height:.95;
          letter-spacing:-.045em;
        }

        .sp-title span{color:var(--sp-accent)}

        .sp-intro-text{
          max-width:500px;
          margin:8px 0 0;
          color:var(--sp-muted);
          font-size:12px;
          line-height:1.55;
        }

        .sp-free-pill{
          flex:0 0 auto;
          padding:8px 11px;
          border:1px solid var(--sp-border);
          border-radius:99px;
          background:var(--sp-card2);
          color:var(--sp-muted);
          font-size:9px;
          font-weight:800;
          letter-spacing:.1em;
          text-transform:uppercase;
        }

        .sp-grid{
          display:grid;
          grid-template-columns:minmax(0,1.15fr) minmax(370px,.85fr);
          gap:18px;
          align-items:start;
        }

        .sp-camera{
          min-height:620px;
          position:relative;
          overflow:hidden;
          border:2px solid color-mix(in srgb,var(--sp-accent) 20%,var(--sp-border));
          border-radius:25px;
          background:#171022;
          box-shadow:
            0 18px 50px rgba(49,24,91,.10),
            0 5px 0 color-mix(in srgb,var(--sp-accent) 12%,transparent);
        }

        .sp-camera:before{
          content:"";
          position:absolute;
          inset:0;
          z-index:1;
          pointer-events:none;
          background:
            linear-gradient(rgba(172,119,255,.055) 1px,transparent 1px),
            linear-gradient(90deg,rgba(172,119,255,.055) 1px,transparent 1px);
          background-size:42px 42px;
        }

        .sp-camera:after{
          content:"";
          position:absolute;
          width:320px;
          height:320px;
          left:50%;
          top:45%;
          transform:translate(-50%,-50%);
          border-radius:50%;
          background:rgba(143,83,230,.10);
          filter:blur(55px);
        }

        .sp-video{
          position:absolute;
          inset:0;
          width:100%;
          height:100%;
          object-fit:cover;
          transform:scaleX(-1);
          background:#100b18;
        }

        .sp-video.hidden{display:none}

        .sp-placeholder{
          position:absolute;
          inset:0;
          z-index:2;
          display:grid;
          place-items:center;
          text-align:center;
          padding:38px;
        }

        .sp-placeholder-inner{
          width:min(390px,100%);
          display:flex;
          flex-direction:column;
          align-items:center;
        }

        .sp-camera-icon{
          width:72px;
          height:72px;
          display:grid;
          place-items:center;
          border:1px solid #b989ff47;
          border-radius:22px;
          background:#8f53e61c;
          color:#c49cff;
          box-shadow:0 0 0 9px #8f53e60a;
        }

        .sp-camera-icon svg{width:34px;height:34px}

        .sp-kicker{
          margin:24px 0 7px;
          color:#bf99f7;
          font-size:10px;
          font-weight:800;
          letter-spacing:.15em;
        }

        .sp-placeholder h2{
          margin:0;
          color:white;
          font-size:clamp(25px,3vw,35px);
          letter-spacing:-.03em;
        }

        .sp-placeholder p{
          max-width:390px;
          margin:10px 0 21px;
          color:#aa9abf;
          font-size:13px;
          line-height:1.6;
        }

        .sp-primary{
          min-height:46px;
          display:inline-flex;
          align-items:center;
          gap:9px;
          padding:0 18px;
          border:0;
          border-radius:12px;
          background:linear-gradient(100deg,#7c3aed,#a855f7);
          color:white;
          font:700 12px Outfit;
          cursor:pointer;
          box-shadow:0 5px 0 #5525a2;
          transition:.18s;
        }

        .sp-primary:hover{
          transform:translateY(-2px);
          box-shadow:0 7px 0 #5525a2;
        }

        .sp-primary:active{
          transform:translateY(3px);
          box-shadow:0 2px 0 #5525a2;
        }

        .sp-primary svg{width:15px;height:15px}

        .sp-live{
          position:absolute;
          z-index:4;
          top:17px;
          left:17px;
          display:flex;
          align-items:center;
          gap:7px;
          padding:7px 10px;
          border:1px solid #fff2;
          border-radius:99px;
          background:#130a1fbb;
          color:#eee6fa;
          font-size:10px;
          font-weight:700;
          backdrop-filter:blur(12px);
        }

        .sp-dot{
          width:7px;
          height:7px;
          border-radius:50%;
          background:#85db5e;
          box-shadow:0 0 0 4px #85db5e1a;
        }

        .sp-stop{
          position:absolute;
          z-index:4;
          top:14px;
          right:14px;
          width:38px;
          height:38px;
          display:grid;
          place-items:center;
          border:1px solid #fff2;
          border-radius:11px;
          background:#130a1fbb;
          color:white;
          cursor:pointer;
          backdrop-filter:blur(12px);
        }

        .sp-stop i{
          width:13px;
          height:13px;
          border-radius:3px;
          background:currentColor;
        }

        .sp-frame{
          position:absolute;
          inset:34px;
          z-index:3;
          pointer-events:none;
        }

        .sp-corner{
          position:absolute;
          width:42px;
          height:42px;
          border-color:#be91ffb8;
          border-style:solid;
        }

        .sp-corner.tl{top:0;left:0;border-width:2px 0 0 2px;border-radius:7px 0 0}
        .sp-corner.tr{top:0;right:0;border-width:2px 2px 0 0;border-radius:0 7px 0 0}
        .sp-corner.bl{bottom:0;left:0;border-width:0 0 2px 2px;border-radius:0 0 0 7px}
        .sp-corner.br{bottom:0;right:0;border-width:0 2px 2px 0;border-radius:0 0 7px 0}

        .sp-camera-label{
          position:absolute;
          z-index:4;
          left:50%;
          bottom:18px;
          transform:translateX(-50%);
          padding:8px 12px;
          border:1px solid #fff2;
          border-radius:99px;
          background:#0f0818a8;
          color:#cbbdde;
          backdrop-filter:blur(12px);
          font-size:10px;
          white-space:nowrap;
        }

        .sp-camera-label strong{color:#e8d8ff}

        .sp-detected-floating{
          position:absolute;
          z-index:4;
          left:24px;
          bottom:24px;
          padding:11px 14px;
          border:1px solid #fff2;
          border-radius:15px;
          background:#130a1fcc;
          color:#cbbdde;
          backdrop-filter:blur(14px);
        }

        .sp-detected-floating small{
          display:block;
          margin-bottom:2px;
          color:#9f8db4;
          font-size:8px;
          font-weight:800;
          letter-spacing:.13em;
          text-transform:uppercase;
        }

        .sp-detected-floating strong{
          color:white;
          font-size:22px;
          line-height:1;
        }

        .sp-side{
          display:flex;
          flex-direction:column;
          gap:13px;
          min-width:0;
        }

        .sp-card{
          border:2px solid var(--sp-border);
          background:var(--sp-card);
          box-shadow:0 6px 0 color-mix(in srgb,var(--sp-accent) 8%,transparent);
          border-radius:20px;
        }

        .sp-recognition{
          position:relative;
          overflow:hidden;
          padding:24px;
        }

        .sp-recognition:before{
          content:"";
          position:absolute;
          width:220px;
          height:220px;
          right:-105px;
          top:-110px;
          border-radius:50%;
          background:color-mix(in srgb,var(--sp-accent) 10%,transparent);
        }

        .sp-head{
          position:relative;
          z-index:1;
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:12px;
          margin-bottom:18px;
        }

        .sp-head h2{
          margin:0;
          font-size:25px;
          letter-spacing:-.035em;
        }

        .sp-status{
          display:flex;
          align-items:center;
          gap:7px;
          padding:7px 10px;
          border:1px solid var(--sp-border);
          border-radius:99px;
          background:var(--sp-card2);
          color:var(--sp-muted);
          font-size:9px;
          font-weight:800;
        }

        .sp-status-dot{
          width:7px;
          height:7px;
          border-radius:50%;
          background:var(--sp-dim);
        }

        .sp-status-dot.live{
          background:var(--sp-good);
          box-shadow:0 0 0 4px color-mix(in srgb,var(--sp-good) 12%,transparent);
        }

        .sp-detection-box{
          position:relative;
          z-index:1;
          display:grid;
          grid-template-columns:110px 1fr;
          gap:18px;
          align-items:center;
          padding:17px;
          border:2px solid var(--sp-border);
          border-radius:18px;
          background:var(--sp-card2);
        }

        .sp-detection-value{
          min-height:105px;
          display:grid;
          place-items:center;
          border-radius:15px;
          background:
            radial-gradient(circle at 50% 35%,color-mix(in srgb,var(--sp-accent) 17%,transparent),transparent 65%),
            var(--sp-card);
          border:1px solid color-mix(in srgb,var(--sp-accent) 18%,var(--sp-border));
        }

        .sp-detection-value strong{
          color:var(--sp-accent);
          font-size:48px;
          line-height:1;
          letter-spacing:-.05em;
        }

        .sp-detection-info{
          min-width:0;
        }

        .sp-metric{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          margin-bottom:7px;
        }

        .sp-metric span{
          color:var(--sp-muted);
          font-size:10px;
        }

        .sp-metric b{
          color:var(--sp-accent);
          font-size:11px;
        }

        .sp-bar{
          height:7px;
          overflow:hidden;
          border-radius:99px;
          background:color-mix(in srgb,var(--sp-accent) 10%,transparent);
          margin-bottom:15px;
        }

        .sp-bar i{
          display:block;
          height:100%;
          border-radius:inherit;
          background:linear-gradient(90deg,var(--sp-accent),var(--sp-pink));
          transition:width .25s;
        }

        .sp-bar.hold i{
          background:linear-gradient(90deg,#85db5e,#b4ed76);
        }

        .sp-confirm-line{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
        }

        .sp-confirm-line span{
          color:var(--sp-muted);
          font-size:10px;
        }

        .sp-confirm-line b{
          color:var(--sp-text);
          font-size:10px;
        }

        .sp-feedback{
          position:relative;
          z-index:1;
          margin:12px 0 0;
          color:var(--sp-dim);
          font-size:10px;
          line-height:1.45;
        }

        .sp-feedback.good{
          color:var(--sp-good);
          font-weight:700;
        }

        .sp-message{
          padding:18px 19px;
        }

        .sp-card-heading{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          margin-bottom:11px;
        }

        .sp-card-heading div small{
          display:block;
          margin-bottom:3px;
          color:var(--sp-pink);
          font-size:9px;
          font-weight:800;
          letter-spacing:.13em;
          text-transform:uppercase;
        }

        .sp-card-heading h3{
          margin:0;
          font-size:16px;
          letter-spacing:-.02em;
        }

        .sp-clear{
          width:35px;
          height:35px;
          display:grid;
          place-items:center;
          border:1px solid var(--sp-border);
          border-radius:10px;
          background:var(--sp-card2);
          color:var(--sp-muted);
          cursor:pointer;
        }

        .sp-clear:hover{color:var(--sp-accent);border-color:var(--sp-accent)}

        .sp-message-text{
          min-height:62px;
          display:flex;
          align-items:center;
          padding:13px 14px;
          border:1px solid var(--sp-border);
          border-radius:13px;
          background:var(--sp-card2);
          color:var(--sp-text);
          font-size:15px;
          line-height:1.45;
          word-break:break-word;
        }

        .sp-message-text.empty{
          color:var(--sp-dim);
          font-size:10px;
          font-style:italic;
        }

        .sp-current{
          margin-top:9px;
          color:var(--sp-dim);
          font-size:10px;
        }

        .sp-current b{color:var(--sp-accent)}

        .sp-translation{
          padding:18px 19px;
        }

        .sp-translate-button{
          display:inline-flex;
          align-items:center;
          gap:7px;
          min-height:34px;
          padding:0 12px;
          border:1px solid var(--sp-border);
          border-radius:10px;
          background:var(--sp-card2);
          color:var(--sp-accent);
          font:700 10px Outfit;
          cursor:pointer;
        }

        .sp-translate-button:hover{
          border-color:color-mix(in srgb,var(--sp-accent) 40%,var(--sp-border));
          transform:translateY(-1px);
        }

        .sp-translate-button svg{width:14px;height:14px}

        .sp-translation-grid{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:10px;
        }

        .sp-language{
          min-width:0;
          padding:14px;
          border:1px solid var(--sp-border);
          border-radius:14px;
          background:var(--sp-card2);
        }

        .sp-language-head{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:8px;
          margin-bottom:8px;
        }

        .sp-language-head span{
          color:var(--sp-pink);
          font-size:9px;
          font-weight:800;
          letter-spacing:.1em;
          text-transform:uppercase;
        }

        .sp-speak{
          width:30px;
          height:30px;
          display:grid;
          place-items:center;
          border:1px solid var(--sp-border);
          border-radius:9px;
          background:var(--sp-card);
          color:var(--sp-accent);
          cursor:pointer;
        }

        .sp-speak:hover{
          border-color:var(--sp-accent);
          transform:translateY(-1px);
        }

        .sp-speak svg{width:14px;height:14px}

        .sp-language p{
          min-height:38px;
          margin:0;
          color:var(--sp-text);
          font-size:11px;
          line-height:1.5;
        }

        .sp-language p.empty{
          color:var(--sp-dim);
          font-style:italic;
        }

        .sp-stats{
          display:grid;
          grid-template-columns:repeat(3,1fr);
          gap:9px;
        }

        .sp-stat{
          padding:13px;
          border:1px solid var(--sp-border);
          border-radius:14px;
          background:var(--sp-card);
          text-align:center;
        }

        .sp-stat strong{
          display:block;
          color:var(--sp-accent);
          font-size:19px;
          line-height:1;
        }

        .sp-stat span{
          display:block;
          margin-top:5px;
          color:var(--sp-dim);
          font-size:8px;
          font-weight:800;
          letter-spacing:.08em;
          text-transform:uppercase;
        }

        .sp-tip{
          padding:13px 14px;
          border:1px solid var(--sp-border);
          border-radius:15px;
          background:color-mix(in srgb,var(--sp-accent) 4%,var(--sp-card));
        }

        .sp-tip small{
          display:block;
          margin-bottom:3px;
          color:var(--sp-pink);
          font-size:9px;
          font-weight:800;
          letter-spacing:.12em;
          text-transform:uppercase;
        }

        .sp-tip p{
          margin:0;
          color:var(--sp-muted);
          font-size:10px;
          line-height:1.45;
        }

        @media(max-width:980px){
          .sp-grid{grid-template-columns:1fr}
          .sp-camera{min-height:540px}
        }

        @media(max-width:600px){
          .sparsh-practice-page{padding:18px 13px 28px}
          .sp-crumb{display:none}
          .sp-intro{align-items:flex-start}
          .sp-free-pill{display:none}
          .sp-camera{min-height:430px;border-radius:20px}
          .sp-recognition{padding:19px}
          .sp-detection-box{grid-template-columns:92px 1fr;gap:12px}
          .sp-detection-value{min-height:90px}
          .sp-detection-value strong{font-size:39px}
          .sp-translation-grid{grid-template-columns:1fr}
          .sp-camera-label{max-width:calc(100% - 30px);overflow:hidden;text-overflow:ellipsis}
          .sp-frame{inset:24px}
        }

        @media(prefers-reduced-motion:reduce){
          .sparsh-practice-page *{
            animation-duration:.01ms!important;
            transition-duration:.01ms!important;
          }
        }

        [data-theme="dark"] .sparsh-practice-page{
          --sp-bg:#10091d;
          --sp-card:#1b1330;
          --sp-card2:#241a3d;
          --sp-border:#3b2a5c;
          --sp-text:#f4efff;
          --sp-muted:#b9accd;
          --sp-dim:#8f7ca9;
          --sp-accent:#ae70ff;
          --sp-pink:#e58cff;
          --sp-good:#85db5e;
          background:
            radial-gradient(circle at 12% 12%,#8f53e61a 0 90px,transparent 230px),
            radial-gradient(circle at 88% 76%,#e58cff14 0 100px,transparent 240px),
            linear-gradient(180deg,#10091d,#160d28);
        }

        [data-theme="dark"] .sp-card,
        [data-theme="dark"] .sp-message,
        [data-theme="dark"] .sp-translation,
        [data-theme="dark"] .sp-stats .sp-stat{
          box-shadow:0 6px 0 #08040f8c;
        }
      `}</style>

      <div className="sp-shell">
        <div className="sp-top">
          <button className="sp-back" type="button" onClick={onBack}>
            <Icon.back /> Back to learning
          </button>

          <div className="sp-crumb">
            <span>Learning</span>
            <span>/</span>
            <b>Free Practice</b>
          </div>
        </div>

        <div className="sp-intro">
          <div>
            <p className="sp-eyebrow">FREE PRACTICE</p>
            <h1 className="sp-title">Practice <span>freely.</span></h1>
            <p className="sp-intro-text">
              Sign any supported letter or word. There is no target to follow —
              the model recognises whatever you show to the camera.
            </p>
          </div>

          <span className="sp-free-pill">No target · Open practice</span>
        </div>

        <div className="sp-grid">
          <section className="sp-camera" aria-label="Free ISL practice camera">
            <video
              ref={videoRef}
              className={`sp-video ${running ? "" : "hidden"}`}
              muted
              playsInline
            />

            {!running && (
              <div className="sp-placeholder">
                <div className="sp-placeholder-inner">
                  <div className="sp-camera-icon">
                    <Icon.camera />
                  </div>

                  <p className="sp-kicker">READY TO PRACTISE</p>
                  <h2>Show any sign</h2>
                  <p>
                    Position your hand inside the frame and start the camera.
                    You can practise any supported ISL sign.
                  </p>

                  <button
                    className="sp-primary"
                    type="button"
                    onClick={startCamera}
                  >
                    <Icon.play /> Start Camera
                  </button>
                </div>
              </div>
            )}

            {running && (
              <>
                <div className="sp-live">
                  <i className="sp-dot" /> Camera live
                </div>

                <button
                  className="sp-stop"
                  type="button"
                  onClick={stopCamera}
                  aria-label="Stop camera"
                >
                  <i />
                </button>
              </>
            )}

            <div className="sp-frame" aria-hidden="true">
              <i className="sp-corner tl" />
              <i className="sp-corner tr" />
              <i className="sp-corner bl" />
              <i className="sp-corner br" />
            </div>

            {running && (
              <div className="sp-detected-floating">
                <small>Detected now</small>
                <strong>{detected}</strong>
              </div>
            )}

            {!running && (
              <div className="sp-camera-label">
                <strong>Practice area</strong>&nbsp; · &nbsp;Keep your hand clearly visible
              </div>
            )}
          </section>

          <aside className="sp-side">
            <section className="sp-card sp-recognition">
              <div className="sp-head">
                <div>
                  <p className="sp-eyebrow">LIVE RECOGNITION</p>
                  <h2>What the model sees</h2>
                </div>

                <div className="sp-status">
                  <i className={`sp-status-dot ${running ? "live" : ""}`} />
                  {running ? "Detecting" : "Waiting"}
                </div>
              </div>

              <div className="sp-detection-box">
                <div className="sp-detection-value">
                  <strong>{detected}</strong>
                </div>

                <div className="sp-detection-info">
                  <div className="sp-metric">
                    <span>Recognition confidence</span>
                    <b>{Math.round(confidenceValue)}%</b>
                  </div>

                  <div className="sp-bar">
                    <i style={{ width: `${confidenceValue}%` }} />
                  </div>

                  <div className="sp-metric">
                    <span>Hold to confirm</span>
                    <b>{holdValue >= 100 ? "Confirmed" : `${Math.round(holdValue)}%`}</b>
                  </div>

                  <div className="sp-bar hold">
                    <i style={{ width: `${holdValue}%` }} />
                  </div>

                  <div className="sp-confirm-line">
                    <span>Last confirmed</span>
                    <b>{lastAdded || "—"}</b>
                  </div>
                </div>
              </div>

              <p className={`sp-feedback ${lastAdded ? "good" : ""}`}>
                {lastAdded
                  ? `${lastAdded} was added to your practice message.`
                  : running
                    ? "Keep the sign steady until the hold reaches 100%."
                    : "Start the camera to begin recognition."}
              </p>
            </section>

            <section className="sp-card sp-message">
              <div className="sp-card-heading">
                <div>
                  <small>BUILT MESSAGE</small>
                  <h3>Your signs</h3>
                </div>

                <button
                  className="sp-clear"
                  type="button"
                  onClick={resetCapture}
                  aria-label="Clear practice message"
                  title="Clear"
                >
                  <Icon.trash />
                </button>
              </div>

              <div className={`sp-message-text ${!builtMessage ? "empty" : ""}`}>
                {builtMessage || "Your confirmed signs will appear here."}
              </div>

              <p className="sp-current">
                Currently building: <b>{currentWord || "—"}</b>
              </p>
            </section>

            <section className="sp-card sp-translation">
              <div className="sp-card-heading">
                <div>
                  <small>TRANSLATION</small>
                  <h3>Your translation</h3>
                </div>

                <button
                  className="sp-translate-button"
                  type="button"
                  onClick={translate}
                >
                  <Icon.translate /> Translate
                </button>
              </div>

              <div className="sp-translation-grid">
                <div className="sp-language">
                  <div className="sp-language-head">
                    <span>English</span>
                    <button
                      className="sp-speak"
                      type="button"
                      aria-label="Speak English translation"
                      onClick={() => speak(output?.cleaned || builtMessage, "en-IN")}
                    >
                      <Icon.volume />
                    </button>
                  </div>

                  <p className={!output?.cleaned ? "empty" : ""}>
                    {output?.cleaned || "Your English translation will appear here."}
                  </p>
                </div>

                <div className="sp-language">
                  <div className="sp-language-head">
                    <span>मराठी</span>
                    <button
                      className="sp-speak"
                      type="button"
                      aria-label="Speak Marathi translation"
                      onClick={() => speak(output?.marathi, "mr-IN")}
                    >
                      <Icon.volume />
                    </button>
                  </div>

                  <p className={!output?.marathi ? "empty" : ""}>
                    {output?.marathi || "तुमचे मराठी भाषांतर येथे दिसेल."}
                  </p>
                </div>
              </div>
            </section>

            <div className="sp-stats">
              <div className="sp-stat">
                <strong>{stats?.signs || 0}</strong>
                <span>Signs confirmed</span>
              </div>

              <div className="sp-stat">
                <strong>{stats?.words || 0}</strong>
                <span>Words built</span>
              </div>

              <div className="sp-stat">
                <strong>{running ? "LIVE" : "—"}</strong>
                <span>Session</span>
              </div>
            </div>

            <div className="sp-tip">
              <small>Practice tip</small>
              <p>
                You can switch between letters and supported words freely.
                Hold each sign steady for a moment so the recogniser can confirm it.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
