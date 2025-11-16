/**
 * Represents the current state of the robot in the simulator.
 */
export interface RobotState {
  /** X position in the arena (horizontal axis) */
  x: number;
  /** Z position in the arena (depth axis) */
  z: number;
  /** Current rotation angle in degrees (0-360) */
  rotation: number;
  /** Whether the robot is currently executing a command animation */
  isAnimating: boolean;
}

/**
 * Represents the state of mouse input for camera control.
 */
export interface MouseState {
  /** Normalized X position (-1 to 1) */
  x: number;
  /** Normalized Y position (-1 to 1) */
  y: number;
  /** Whether the mouse button is currently pressed */
  isDown: boolean;
}

/**
 * Represents the current camera view mode state.
 */
export interface CameraState {
  /** Whether the camera is in third-person follow mode */
  isThirdPersonView: boolean;
}

/**
 * Represents a 2D position in the arena.
 */
export interface Position2D {
  x: number;
  z: number;
}

/**
 * Represents a 3D position in the simulator space.
 */
export interface Position3D {
  x: number;
  y: number;
  z: number;
}
