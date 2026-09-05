import React, { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { CitySelectorModal } from '../common/CitySelectorModal';
import { JudgePitchBar } from '../common/JudgePitchBar';

export interface LayoutProps {
  children: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const isMapFullscreen =
    location.pathname === '/bus' ||
    location.pathname === '/charging' ||
    location.pathname === '/simulation';

  return (
    <div className={`flex flex-col bg-background text-on-background ${isMapFullscreen ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
      <Header />
      <main className={`flex-1 w-full flex flex-col ${isMapFullscreen ? 'min-h-0 overflow-hidden' : ''}`}>{children}</main>
      {!isMapFullscreen && <Footer />}
      <CitySelectorModal />
      <JudgePitchBar />
    </div>
  );
};
