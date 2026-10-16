import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { Loading } from './components/Common';
import Home from './pages/Home';
import Join from './pages/Join';
import Play from './pages/Play';

// Spelledarens vyer (med låtlistan och Spotify) laddas bara för spelledaren.
const HostStart = lazy(() => import('./pages/HostStart'));
const HostGame = lazy(() => import('./pages/HostGame'));
const Songs = lazy(() => import('./pages/Songs'));
const Callback = lazy(() => import('./pages/Callback'));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/join/:code" element={<Join />} />
          <Route path="/play/:code" element={<Play />} />
          <Route path="/host" element={<HostStart />} />
          <Route path="/host/songs" element={<Songs />} />
          <Route path="/host/:code" element={<HostGame />} />
          <Route path="/callback" element={<Callback />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
