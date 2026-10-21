import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { Loading } from './components/Common';
import { LangProvider } from './i18n/LangProvider';
import Home from './pages/Home';
import Join from './pages/Join';
import Play from './pages/Play';

// Spelledarens vyer (med låtlistan och Spotify) laddas bara för spelledaren.
const HostStart = lazy(() => import('./pages/HostStart'));
const HostGame = lazy(() => import('./pages/HostGame'));
const Songs = lazy(() => import('./pages/Songs'));
const Callback = lazy(() => import('./pages/Callback'));
const HostGuide = lazy(() => import('./pages/hostGuide/HostGuide'));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          {/* Bara lagens sidor går att översätta. Spelledarens vyer är på svenska. */}
          <Route element={<LangProvider />}>
            <Route path="/" element={<Home />} />
            <Route path="/join/:code" element={<Join />} />
            <Route path="/play/:code" element={<Play />} />
          </Route>
          <Route path="/host" element={<HostStart />} />
          <Route path="/host/songs" element={<Songs />} />
          <Route path="/host/guide" element={<HostGuide />} />
          <Route path="/host/:code" element={<HostGame />} />
          <Route path="/callback" element={<Callback />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
