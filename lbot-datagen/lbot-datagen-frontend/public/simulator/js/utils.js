import * as THREE from 'three';

// Constantes do simulador
export const CONSTANTS = {
  PATH_WIDTH: 3,
  WALL_THICKNESS: 1,
  WALL_HEIGHT: 2,
  LABYRINTH_SIZE: 20,
  FLOOR_SIZE: 100,
  RAMP_ANGLE: THREE.MathUtils.degToRad(30),
  RAMP_LENGTH: 2.0,
  PLATFORM_THICKNESS: 0.2,
  FIXED_TIMESTEP: 1 / 60,
};

// Cálculos derivados
CONSTANTS.RAMP_HEIGHT = Math.sin(CONSTANTS.RAMP_ANGLE) * CONSTANTS.RAMP_LENGTH;

// Funções utilitárias
export function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Parsing de comandos LBML
export function parseLBMLCommand(command) {
  // Remove espaços e ponto e vírgula do final se existir
  const cleanCommand = command.trim().replace(/;$/, '');
  const regex = /^([DR])(\d+)([FBLR])$/;
  const match = cleanCommand.match(regex);
  if (!match) return null;
  
  const [, type, value, direction] = match;
  const numValue = parseInt(value, 10);
  
  if (type === 'D' && !['F', 'B', 'L', 'R'].includes(direction)) return null;
  if (type === 'R' && !['L', 'R'].includes(direction)) return null;
  
  return { type, value: numValue, direction };
}

// Comunicação com o parent frame
export function postAck(type, payload) {
  try {
    window.parent.postMessage({ type, payload }, '*');
  } catch (error) {
    console.warn('Não foi possível enviar mensagem para o parent:', error);
  }
}