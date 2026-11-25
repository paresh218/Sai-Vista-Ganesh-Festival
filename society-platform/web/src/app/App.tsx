import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { societies, demoEvents } from '../data/demo';
import { selectEvents, updateDemoEvent } from '../features/events/model';
import type { SocietyEvent } from '../features/events/model';
import { EventCard } from '../features/events/EventCard';
import { AdminPage } from '../features/admin/AdminPage';
import type { Community } from '../features/communities/model';
import type { SelectedBrand } from '../features/branding/LiveBrand';

const AccountRoute = lazy(() => import('../features/auth/AccountRoute'));
const CommunityRoute = lazy(() => import('../features/communities/CommunityRoute'));
const PublicEventsRoute = lazy(() => import('../features/events/PublicEventsRoute'));
const LiveBrand = lazy(() => import('../features/branding/LiveBrand'));

type Route = 'home' | 'archive' | 'admin' | 'account' | 'communities';
const routes: Record<Route, string> = { home: 'What’s on', archive: 'Archive', communities: 'Communities', admin: 'Admin preview', account: 'Account preview' };
function readRoute(): Route {
  const value = window.location.hash.slice(1);
  return value === 'archive' || value === 'admin' || value === 'account' || value === 'communities' ? value : 'home';
}

export function App() {
  const [societyId, setSocietyId] = useState(societies[0].id);
  const [choices, setChoices] = useState([...societies]);
  const [route, setRoute] = useState<Route>(readRoute);
  const [events, setEvents] = useState([...demoEvents]);
  const [announcement, setAnnouncement] = useState('');
  const mainRef = useRef<HTMLElement>(null);
  const [brand, setBrand] = useState<SelectedBrand | null>(null);
  const baseSociety = choices.find(item => item.id === societyId)!;
  const currentBrand = brand?.societyId === societyId ? brand : null;
  const society = { ...baseSociety, ...(currentBrand ? { name: currentBrand.name, tagline: currentBrand.tagline } : {}) };
  function chooseCommunity(community: Community) {
    const choice = { id: community.id, name: community.name, location: [community.location, community.city].filter(Boolean).join(', '), initials: community.name.split(/\s+/).slice(0, 2).map(word => Array.from(word)[0]).join('').toUpperCase(), tagline: 'Your community. Shared celebrations.' };
    setChoices(current => [...current.filter(item => item.id !== community.id), choice]);
    setSocietyId(community.id); setAnnouncement('');
    window.location.hash = '#account';
  }

  useEffect(() => {
    const onRoute = () => { setRoute(readRoute()); mainRef.current?.focus(); };
    window.addEventListener('hashchange', onRoute);
    return () => window.removeEventListener('hashchange', onRoute);
  }, []);

  function changeEvent(event: SocietyEvent, status: SocietyEvent['status'], pinned: boolean) {
    setEvents(current => updateDemoEvent(current, societyId, event.id, { status, pinned }));
    setAnnouncement(`${event.title} updated in this demo.`);
  }

  const live = import.meta.env.MODE === 'emulator';
  const feedStatus = route === 'archive' ? 'archived' : 'published';
  const visibleEvents = selectEvents(events, societyId, route === 'account' || route === 'communities' ? 'home' : route);
  return <>
    {live && <Suspense fallback={null}><LiveBrand societyId={societyId} onChange={setBrand} /></Suspense>}
    <a className="skip-link" href="#main-content" onClick={e => { e.preventDefault(); mainRef.current?.focus(); }}>Skip to content</a>
    <div className="demo-banner">Interactive demo <span aria-hidden="true">·</span> {live ? 'Local database events. This is not a hosted service.' : 'Sample events. This is not a live society service.'}</div>
    {currentBrand?.announcement && <aside className="community-announcement" aria-label="Community announcement">{currentBrand.announcement}</aside>}
    <header className="site-header">
      <a className="brand" href="#home" aria-label="Society Circle home"><span className="brand-mark" aria-hidden="true">c.</span><span>society circle<small>A little closer, together.</small></span></a>
      <label className="society-picker">Your community<select value={societyId} onChange={e => { setSocietyId(e.target.value); setAnnouncement(''); }}>
        {choices.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label>
    </header>
    <div className="app-layout">
      <aside className="sidebar">
        <div className="society-card"><span className="society-avatar">{society.initials}</span><h2>{society.name}</h2><p>{society.location}</p></div>
        <nav aria-label="Main navigation">{Object.entries(routes).map(([key, label]) => <a key={key} href={`#${key}`} aria-current={route === key ? 'page' : undefined}><span aria-hidden="true">{key === 'home' ? '◈' : key === 'archive' ? '▤' : key === 'account' ? '○' : '⚙'}</span>{label}</a>)}</nav>
        <p className="sidebar-note">Your community.<br />Your shared moments.</p>
      </aside>
      <main id="main-content" ref={mainRef} tabIndex={-1}>
        <div className="breadcrumb">{society.name}<span aria-hidden="true"> / </span>{routes[route]}</div>
        {route === 'home' && <>
          <section className="hero" aria-labelledby="welcome-title"><div className="hero-copy"><p className="eyebrow">Life at {society.name}</p><h1 id="welcome-title">{society.tagline}</h1><p>Discover what’s happening, join a celebration and make your community feel a little more like home.</p><a className="primary-link" href="#events" onClick={e => { e.preventDefault(); document.getElementById('events')?.focus(); }}>Explore events <span aria-hidden="true">↗</span></a></div><div className="hero-art" aria-hidden="true"><div className="sun" /><div className="building one" /><div className="building two" /><div className="building three" /><div className="hill" /><span>Made of moments.</span></div></section>
          <section id="events" tabIndex={-1} aria-labelledby="events-title"><div className="section-heading"><div><p className="eyebrow">Mark your calendar</p><h2 id="events-title">Coming together.</h2></div>{!live && <span className="pill">{visibleEvents.length} events</span>}</div><div className="event-list">{live ? <Suspense fallback={<p role="status">Opening public events…</p>}><PublicEventsRoute societyId={societyId} status={feedStatus} /></Suspense> : visibleEvents.map(event => <EventCard key={event.id} event={event} />)}</div>{!live && visibleEvents.length === 0 && <p className="empty-state">No published events yet. Check back soon.</p>}</section>
          <div className="community-note"><span aria-hidden="true">✳</span><div><h3>A community shaped by you.</h3><p>Event registration forms and more committee tools are coming in the next development steps.</p></div></div>
        </>}
        {route === 'archive' && <section aria-labelledby="archive-title"><div className="section-heading"><div><p className="eyebrow">The good times stay</p><h1 id="archive-title">Community archive.</h1></div></div><p className="section-note">Past celebrations and shared memories from {society.name}.</p><div className="event-list">{live ? <Suspense fallback={<p role="status">Opening public events…</p>}><PublicEventsRoute societyId={societyId} status={feedStatus} /></Suspense> : visibleEvents.map(event => <EventCard key={event.id} event={event} />)}</div>{!live && visibleEvents.length === 0 && <p className="empty-state">No archived events for this society yet.</p>}</section>}
        {route === 'admin' && <><h1 className="admin-page-title">Community administration</h1>{live ? <Suspense fallback={<p role="status">Opening administration…</p>}><AccountRoute societyId={societyId} /></Suspense> : <AdminPage events={visibleEvents} onChange={changeEvent} />}</>}
        {route === 'account' && <Suspense fallback={<p role="status">Opening account…</p>}><AccountRoute societyId={societyId} /></Suspense>}
        {route === 'communities' && <Suspense fallback={<p role="status">Opening communities…</p>}><CommunityRoute onSelect={chooseCommunity} /></Suspense>}
        <p className="save-status" role="status">{announcement}</p>
        <footer>Society Circle <span aria-hidden="true">·</span> Local prototype <span aria-hidden="true">·</span> Times shown in India Standard Time</footer>
      </main>
    </div>
  </>;
}
