import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LbotChat } from './lbot-chat';

describe('LbotChat', () => {
  let component: LbotChat;
  let fixture: ComponentFixture<LbotChat>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LbotChat]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LbotChat);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
