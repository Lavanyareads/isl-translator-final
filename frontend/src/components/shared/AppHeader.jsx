import { Link, NavLink, useLocation } from 'react-router-dom'

export function AppHeader({ dark, toggleTheme, running, health }) {
  const location = useLocation()
  const page = location.pathname === '/learning' ? 'Practice' : location.pathname === '/conversation' ? 'Conversation' : location.pathname === '/learn' ? 'Learning journey' : location.pathname === '/achievements' ? 'Achievements' : 'Home'
  return <header className="app-header"><Link to="/" className="brand" aria-label="S Sparsh home"><span className="brand-mark">S</span><span><strong>S-स्पर्श</strong><small>Indian Sign Language · Sign → Speech</small></span></Link><nav aria-label="Primary navigation"><NavLink to="/learn">Learn</NavLink><NavLink to="/learning">Practice</NavLink><NavLink to="/conversation">Conversation</NavLink><NavLink to="/achievements">Progress</NavLink></nav><div className="header-actions"><span className={`status-pill ${running ? 'live' : ''}`} title={health?.modelError || ''}><i />{running ? 'Live' : health?.modelReady ? page : 'Offline'}</span><button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">{dark ? '☀' : '☾'}</button></div></header>
}
