export interface RobotState {
  x: number;
  z: number;
  rotation: number;
  isAnimating: boolean;
}

export interface MouseState {
  x: number;
  y: number;
  isDown: boolean;
}

export interface CameraState {
  isThirdPersonView: boolean;
}
