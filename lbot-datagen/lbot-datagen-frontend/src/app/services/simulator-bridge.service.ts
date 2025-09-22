import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface SimulatorCommand {
  type: 'lbml-exec' | 'lbml-reset';
  payload?: string;
}

@Injectable({ providedIn: 'root' })
export class SimulatorBridgeService {
  private commandSubject = new Subject<SimulatorCommand>();
  readonly commands$ = this.commandSubject.asObservable();

  executeLbml(sequence: string): void {
    this.commandSubject.next({ type: 'lbml-exec', payload: sequence });
  }

  reset(): void {
    this.commandSubject.next({ type: 'lbml-reset' });
  }
}


