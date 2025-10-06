import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SimulatorBridgeService, SimulatorCommand } from '../../services/simulator-bridge.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-simulator-frame',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="simulator-wrapper">
      <iframe #simFrame title="LBML Simulator" class="sim-iframe" src="/robo-simulator.html"></iframe>
    </div>
  `,
  styleUrls: ['./simulator-frame.css']
})
export class SimulatorFrameComponent implements OnInit, OnDestroy {
  @ViewChild('simFrame', { static: true }) simFrameRef!: ElementRef<HTMLIFrameElement>;
  private sub?: Subscription;

  constructor(private bridge: SimulatorBridgeService) {}

  ngOnInit(): void {
    this.sub = this.bridge.commands$.subscribe(cmd => this.forwardCommand(cmd));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private forwardCommand(cmd: SimulatorCommand): void {
    const frame = this.simFrameRef?.nativeElement?.contentWindow;
    if (!frame) return;
    frame.postMessage(cmd, '*');
  }
}


