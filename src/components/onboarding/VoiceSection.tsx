import React from 'react';
import VoiceOrb from '@/components/VoiceOrb';

export interface VoiceSectionProps {
  variant: 'landing' | 'expanded';
  isListening: boolean;
  isSpeaking: boolean;
  audioLevel: number;
  audioOutputLevel: number;
  landingOrbSize?: number; // required when variant = 'landing'
}

const VoiceSection: React.FC<VoiceSectionProps> = ({
  variant,
  isListening,
  isSpeaking,
  audioLevel,
  audioOutputLevel,
  landingOrbSize,
}) => {
  if (variant === 'expanded') {
    return (
      <div className="w-80 h-80 max-w-full max-h-full aspect-square">
        <VoiceOrb
          isListening={isListening}
          isSpeaking={isSpeaking}
          isThinking={isListening && audioLevel < 0.1}
          audioLevel={audioLevel}
          audioOutputLevel={audioOutputLevel}
          className="w-full h-full"
        />
      </div>
    );
  }

  // landing variant
  const size = landingOrbSize ?? 200;
  return (
    <div className="mx-auto flex items-center justify-center" style={{ width: size, height: size }}>
      <div className="w-full h-full aspect-square">
        <VoiceOrb
          isListening={isListening}
          isSpeaking={isSpeaking}
          isThinking={isListening && audioLevel < 0.1}
          audioLevel={audioLevel}
          audioOutputLevel={audioOutputLevel}
          className="w-full h-full"
        />
      </div>
    </div>
  );
};

export default VoiceSection;
