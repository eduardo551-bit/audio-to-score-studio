import { Suspense, lazy } from 'react'
import { MetronomePanel } from './components/MetronomePanel'
import { TunerPanel } from './components/TunerPanel'
import { assetUrl } from './utils/assets'
import { useLocalStorage } from './utils/useLocalStorage'

const ChordDictionary = lazy(() => import('./components/ChordDictionary').then((module) => ({ default: module.ChordDictionary })))
const CavacoProgressions = lazy(() => import('./components/CavacoProgressions').then((module) => ({ default: module.CavacoProgressions })))
const ChordProgressions = lazy(() => import('./components/ChordProgressions').then((module) => ({ default: module.ChordProgressions })))
const ChordTransposer = lazy(() => import('./components/ChordTransposer').then((module) => ({ default: module.ChordTransposer })))
const CircleOfFifths = lazy(() => import('./components/CircleOfFifths').then((module) => ({ default: module.CircleOfFifths })))
const HarmonyAnalysis = lazy(() => import('./components/HarmonyAnalysis').then((module) => ({ default: module.HarmonyAnalysis })))
const ScaleFinder = lazy(() => import('./components/ScaleFinder').then((module) => ({ default: module.ScaleFinder })))
const ScoreLibrary = lazy(() => import('./components/ScoreLibrary').then((module) => ({ default: module.ScoreLibrary })))
const SongbookLibrary = lazy(() => import('./components/SongbookLibrary').then((module) => ({ default: module.SongbookLibrary })))
const StageMode = lazy(() => import('./components/StageMode').then((module) => ({ default: module.StageMode })))
const ScoreWorkspace = lazy(() => import('./components/ScoreWorkspace').then((module) => ({ default: module.ScoreWorkspace })))

type Tab = 'ferramentas' | 'acordes' | 'escalas' | 'analise' | 'repertorio' | 'palco' | 'biblioteca' | 'partitura'

const TABS: { id: Tab; label: string }[] = [
  { id: 'ferramentas', label: 'Ferramentas' },
  { id: 'acordes', label: 'Acordes' },
  { id: 'escalas', label: 'Escalas' },
  { id: 'analise', label: 'Analise' },
  { id: 'repertorio', label: 'Repertorio' },
  { id: 'palco', label: 'Palco' },
  { id: 'biblioteca', label: 'Biblioteca' },
  { id: 'partitura', label: 'Partitura' },
]

export default function App() {
  const [activeTab, setActiveTab] = useLocalStorage<Tab>('app-active-tab', 'ferramentas')

  return (
    <main className="app-shell">
      <header className="site-header">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true"><span>SR</span></div>
          <div>
            <span className="brand-name">SR Music Studio</span>
            <span className="brand-sep" aria-hidden="true">·</span>
            <span className="brand-tagline">Ferramentas para musicos</span>
          </div>
        </div>
        <div className="header-pills">
          <span>Offline</span>
          <span>PDF &amp; MusicXML</span>
          <span>Afinador &amp; Metronomo</span>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy-block">
          <p className="eyebrow">Transcricao automatica</p>
          <h1>Do audio<br />a <em>partitura</em></h1>
          <p className="hero-lead">
            Importe MIDI, WAV ou MP3 e gere lead sheets em segundos.
            Edicao manual, afinador e metronomo incluidos, tudo offline.
          </p>
          <div className="hero-steps">
            <div className="hero-step"><strong>01</strong><span>Importe o arquivo</span></div>
            <div className="hero-step-divider" aria-hidden="true" />
            <div className="hero-step"><strong>02</strong><span>Refine a partitura</span></div>
            <div className="hero-step-divider" aria-hidden="true" />
            <div className="hero-step"><strong>03</strong><span>Exporte em PDF</span></div>
          </div>
        </div>

        <div className="hero-card hero-portrait-card">
          <a className="portrait-wrap portrait-link" href="https://www.instagram.com/sergio_roberto_music/" target="_blank" rel="noreferrer">
            <img src={assetUrl('/sr-sergio-roberto.jpg')} alt="Sergio Roberto tocando violao" className="hero-portrait" />
            <div className="portrait-badge">
              <span>SR</span>
              <strong>sergio_roberto_music</strong>
            </div>
          </a>
          <div className="hero-card-head">
            <p className="eyebrow">Criado por</p>
            <strong>Sergio Roberto</strong>
            <p className="muted">Musico e compositor. Siga no Instagram.</p>
          </div>
        </div>
      </section>

      <nav className="app-tabs" role="tablist" aria-label="Secoes do app">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`app-tab ${activeTab === tab.id ? 'app-tab-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === 'ferramentas' && (
        <div className="tab-content">
          <section className="utility-grid">
            <TunerPanel />
            <MetronomePanel />
            <section className="panel utility-panel utility-feature">
              <p className="eyebrow">Como funciona</p>
              <h3>Tres passos para a partitura</h3>
              <div className="feature-grid">
                <article><span>01</span><h4>Importe</h4><p>MIDI, WAV, MP3, OGG ou FLAC.</p></article>
                <article><span>02</span><h4>Refine</h4><p>Ajuste notas, compasso e layout.</p></article>
                <article><span>03</span><h4>Exporte</h4><p>PDF, MusicXML ou MIDI.</p></article>
              </div>
            </section>
          </section>
        </div>
      )}

      {activeTab === 'acordes' && (
        <Suspense fallback={<TabFallback title="Carregando acordes..." />}>
          <div className="tab-content">
            <section className="dictionary-wrap">
              <ChordDictionary />
            </section>
            <section className="progressions-grid">
              <ChordProgressions />
              <CavacoProgressions />
            </section>
          </div>
        </Suspense>
      )}

      {activeTab === 'escalas' && (
        <Suspense fallback={<TabFallback title="Carregando escalas..." />}>
          <div className="tab-content">
            <section className="tools-grid">
              <CircleOfFifths />
              <ScaleFinder />
              <ChordTransposer />
            </section>
          </div>
        </Suspense>
      )}

      {activeTab === 'biblioteca' && (
        <Suspense fallback={<TabFallback title="Carregando biblioteca..." />}>
          <div className="tab-content">
            <ScoreLibrary />
          </div>
        </Suspense>
      )}

      {activeTab === 'repertorio' && (
        <Suspense fallback={<TabFallback title="Carregando repertorio..." />}>
          <div className="tab-content">
            <SongbookLibrary />
          </div>
        </Suspense>
      )}

      {activeTab === 'palco' && (
        <Suspense fallback={<TabFallback title="Carregando modo palco..." />}>
          <div className="tab-content">
            <StageMode />
          </div>
        </Suspense>
      )}

      {activeTab === 'analise' && (
        <Suspense fallback={<TabFallback title="Carregando analise..." />}>
          <div className="tab-content">
            <HarmonyAnalysis />
          </div>
        </Suspense>
      )}

      {activeTab === 'partitura' && (
        <Suspense fallback={<TabFallback title="Carregando partitura..." />}>
          <ScoreWorkspace />
        </Suspense>
      )}
    </main>
  )
}

function TabFallback({ title }: { title: string }) {
  return (
    <div className="tab-content">
      <section className="panel songbook-panel">
        <p className="eyebrow">Carregando</p>
        <h3>{title}</h3>
      </section>
    </div>
  )
}