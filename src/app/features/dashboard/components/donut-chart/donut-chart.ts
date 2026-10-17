import { Component, computed, input } from '@angular/core';

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Anneau de répartition en SVG pur (aucune bibliothèque de graphiques). Chaque segment est un arc du cercle. */
@Component({
  selector: 'app-donut-chart',
  styleUrl: './donut-chart.scss',
  templateUrl: './donut-chart.html',
})
export class DonutChart {
  readonly segments = input.required<DonutSegment[]>();
  readonly centerValue = input('');
  readonly centerLabel = input('');

  protected readonly radius = RADIUS;
  protected readonly total = computed(() => this.segments().reduce((sum, s) => sum + s.value, 0));

  protected readonly arcs = computed(() => {
    const total = this.total();
    let offset = 0;
    return this.segments()
      .filter((s) => s.value > 0 && total > 0)
      .map((s) => {
        const length = (s.value / total) * CIRCUMFERENCE;
        const arc = { color: s.color, label: s.label, dash: `${length} ${CIRCUMFERENCE - length}`, offset: -offset };
        offset += length;
        return arc;
      });
  });

  protected readonly description = computed(() =>
    this.segments().map((s) => `${s.label} : ${s.value}`).join(', '),
  );
}
