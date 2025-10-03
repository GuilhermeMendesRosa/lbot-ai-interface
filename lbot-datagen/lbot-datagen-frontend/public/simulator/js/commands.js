import { parseLBMLCommand, postAck } from './utils.js';
import { setIndicator, showError, updateCommandDisplay } from './ui.js';

let executing = false;

export async function executeCommandSequenceFromString(input, robot) {
  console.log('Input recebido:', input);
  
  const commands = (input || '')
    .split(';')
    .map((cmd) => cmd.trim())
    .filter(Boolean);

  console.log('Comandos divididos:', commands);

  const parsedCommands = [];
  for (const cmd of commands) {
    console.log('Processando comando:', cmd);
    const parsed = parseLBMLCommand(cmd);
    console.log('Comando parseado:', parsed);
    if (!parsed) {
      showError(`Comando inválido: ${cmd}`);
      return;
    }
    parsedCommands.push(parsed);
  }

  if (parsedCommands.length === 0 || executing) return;

  executing = true;
  setIndicator(true);

  try {
    for (const cmd of parsedCommands) {
      updateCommandDisplay(`${cmd.type}${cmd.direction}${cmd.value}`);
      
      try {
        if (cmd.type === 'D') {
          // Converter centímetros para metros (unidade base do simulador)
          const distanceInMeters = cmd.value / 100;
          await robot.moveDistance(distanceInMeters, cmd.direction);
        } else if (cmd.type === 'R') {
          const angle = cmd.direction === 'L' ? -cmd.value : cmd.value;
          await robot.rotateDegrees(angle);
        }
        
        postAck('command-completed', {
          command: `${cmd.type}${cmd.direction}${cmd.value}`,
          success: true
        });
      } catch (error) {
        showError(`Erro: ${error.message}`);
        postAck('command-completed', {
          command: `${cmd.type}${cmd.direction}${cmd.value}`,
          success: false,
          error: error.message
        });
        break;
      }
    }
  } finally {
    executing = false;
    setIndicator(false);
    updateCommandDisplay('-');
  }
}

export function resetRobot(robot, labyrinth) {
  if (!robot || !labyrinth) return;
  
  robot.reset(labyrinth.spawnPosition);
  updateCommandDisplay('-');
  setIndicator(false);
  executing = false;
}

export function isExecuting() {
  return executing;
}