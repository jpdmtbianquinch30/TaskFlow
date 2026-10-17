import { Component, input } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-panel',
  styleUrl: './panel.scss',
  templateUrl: './panel.html',
})
export class Panel {
  title = input<string>('');
}
