import { ApplyingToType } from './userProfileUtils';

/**
 * Agent ID mapping for Outspeed agents
 * These correspond to pre-configured agents in the Outspeed dashboard
 * 
 * Agent Names:
 * - Diya Onboarding Undergrad
 * - Diya Onboarding MBA
 * - Diya Onboarding LLM
 * - Diya Onboarding PhD
 * - Diya Onboarding Masters
 */
export const AGENT_ID_MAP: Record<ApplyingToType, string> = {
  'undergraduate': 'agent_f5e0516b861844deaa98947b0eb765a6', // Diya Onboarding Undergrad 
  'mba': 'agent_901bac597bfb44b1810616071984d858', // Diya Onboarding MBA
  'llm': 'agent_8dde3306ddd3445da5ba19c83d5f3d92', // Diya Onboarding LLM
  'phd': 'agent_8b620926023444b9966b723642357db5', // Diya Onboarding PhD 
  'masters': 'agent_056caeef542c45b2bf751c832b683ab1', // Diya Onboarding Masters
};

/**
 * Get the agent ID for a given program type
 * @param applyingTo - The program type
 * @returns The corresponding agent ID
 */
export function getAgentId(applyingTo: ApplyingToType): string {
  const agentId = AGENT_ID_MAP[applyingTo];
  if (!agentId) {
    throw new Error(`No agent ID found for program type: ${applyingTo}`);
  }
  return agentId;
}

/**
 * Get all available agent IDs
 * @returns Array of all agent IDs
 */
export function getAllAgentIds(): string[] {
  return Object.values(AGENT_ID_MAP);
}

/**
 * Check if a program type has a configured agent
 * @param applyingTo - The program type
 * @returns True if agent is configured
 */
export function hasAgent(applyingTo: ApplyingToType): boolean {
  return applyingTo in AGENT_ID_MAP;
}

/**
 * Get the program type from an agent ID (reverse lookup)
 * @param agentId - The agent ID
 * @returns The program type or null if not found
 */
export function getProgramTypeFromAgentId(agentId: string): ApplyingToType | null {
  const entry = Object.entries(AGENT_ID_MAP).find(([_, id]) => id === agentId);
  return entry ? (entry[0] as ApplyingToType) : null;
}

/**
 * Validate that all required agent IDs are configured
 * @returns True if all agents are configured
 */
export function validateAgentConfiguration(): boolean {
  const requiredTypes: ApplyingToType[] = ['Undergraduate', 'MBA', 'LLM', 'PhD', 'Masters'];
  
  for (const type of requiredTypes) {
    const agentId = AGENT_ID_MAP[type];
    if (!agentId || agentId.includes('xxxxx') || !agentId.startsWith('agent_')) {
      console.error(`Agent ID not properly configured for ${type}: ${agentId}`);
      return false;
    }
  }
  
  console.log('✅ All agent configurations validated successfully');
  return true;
}
