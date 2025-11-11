import React from 'react';

const LoadingScreen: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F4EDE2' }}>
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

export default LoadingScreen;

