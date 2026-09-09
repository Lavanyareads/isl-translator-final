import React, { useEffect, useRef } from 'react'

const Icon = {
  play: (props) => (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="currentColor"
      {...props}
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  ),

  trash: (props) => (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M5 7h14" />
      <path d="M9 7V5h6v2" />
      <path d="M7 7l1 13h8l1-13" />
    </svg>
  ),

  send: (props) => (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="currentColor"
      {...props}
    >
      <path d="M3 11l18-8-8 18-2-8-8-2z" />
    </svg>
  ),

  sparkle: (props) => (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="currentColor"
      {...props}
    >
      <path
        d="M12 2l1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5L12 2z"
        opacity=".6"
      />
      <path
        d="M6 19l.75 2.25L9 22l-2.25.75L6 25l-.75-2.25L3 22l2.25-.75L6 19z"
        opacity=".6"
      />
    </svg>
  ),
}

export default function ConversationMode({
  chat,
  reply,
  setReply,
  sendReply,
  lastReply,
  resetChat,
  startCamera,
  running,
}) {
  const scrollRef = useRef(null)

  useEffect(() => {
    if (!scrollRef.current) return

    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [chat])

  return (
    <div className="conversation-panel">

      {/* SHOW TO SIGNER */}
      <div
        className="signer-display"
        aria-live="polite"
      >

        {lastReply.text ? (

          <div
            className="signer-content"
            key={lastReply.text}
          >

            <label>
              Show this to the signer
            </label>

            <div className="signer-primary">
              {lastReply.text}
            </div>

            {lastReply.marathi && (
              <div className="signer-secondary">
                {lastReply.marathi}
              </div>
            )}

          </div>

        ) : (

          <div className="signer-empty">

            <p>
              Your typed replies will appear here,
              large enough to show the person you're
              signing with.
            </p>

          </div>

        )}

      </div>


      {/* CHAT */}
      <div className="chat-container">

        <div className="chat-header">

          <span className="chat-title">
            Conversation
          </span>

          {chat.length > 0 && (
            <button
              className="btn-clear"
              onClick={resetChat}
            >
              <Icon.trash />
              Clear
            </button>
          )}

        </div>


        {/* MESSAGES */}
        <div
          className="chat-messages"
          ref={scrollRef}
        >

          {chat.length ? (

            chat.map((message, index) => (

              <div
                key={`${message.sender}-${message.time}-${index}`}
                className={`message ${message.sender}`}
              >

                <div className="message-header">

                  <span className="message-sender">
                    {message.sender === 'you'
                      ? 'YOU'
                      : 'ISL'}
                  </span>

                  <span className="message-time">
                    {message.time}
                  </span>

                </div>


                <div className="message-bubble">

                  {/* ENGLISH */}
                  <div className="message-text">
                    {message.text}
                  </div>

                  {/* MARATHI */}
                  {message.marathi && (
                    <div className="message-marathi">
                      {message.marathi}
                    </div>
                  )}

                </div>

              </div>

            ))

          ) : (

            <div className="chat-empty">

              <div className="empty-glow" />

              <Icon.sparkle />

              <h3>
                Start a Conversation
              </h3>

              <p>
                Sign naturally in front of the camera.
                S-स्पर्श will recognize your signs,
                translate them, and build the conversation.
              </p>

              {!running && (
                <button
                  className="btn-primary"
                  onClick={startCamera}
                >
                  <Icon.play />
                  Start Camera
                </button>
              )}

            </div>

          )}

        </div>


        {/* REPLY COMPOSER */}
        <form
          onSubmit={sendReply}
          className="chat-composer"
        >

          <input
            value={reply}
            onChange={(event) =>
              setReply(event.target.value)
            }
            placeholder="Type a reply…"
            aria-label="Type a reply"
          />

          <button
            type="submit"
            aria-label="Send reply"
          >
            <Icon.send />
          </button>

        </form>

      </div>

    </div>
  )
}