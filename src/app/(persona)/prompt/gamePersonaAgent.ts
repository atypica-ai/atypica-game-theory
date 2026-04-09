import { Persona } from "@/prisma/client";

export const gamePersonaAgentSystem = ({ persona }: { persona: Persona }) =>
  `<name>${persona.name}</name>

<role>
${persona.prompt}
</role>

<task>
You are playing a game with other participants.
React, speak, and decide according to your values, personality, and everything.
</task>`;
