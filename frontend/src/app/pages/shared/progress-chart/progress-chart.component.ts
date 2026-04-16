import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import Chart from 'chart.js/auto';
import { ProgressService } from "../../../core/progress.service";

@Component({
  selector: 'app-progress-chart',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="wrap"><canvas #c></canvas></div>`,
  styles: [`
    .wrap {
      height: 250px;
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,0.10);
      background: rgba(0,0,0,0.35);
      padding: 12px;
    }
    canvas { width: 100% !important; height: 100% !important; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressChartComponent implements AfterViewInit {
  @ViewChild('c') c!: ElementRef<HTMLCanvasElement>;

  private progress = inject(ProgressService);
  private chart!: Chart;

  ngAfterViewInit() {
    this.chart = new Chart(this.c.nativeElement.getContext('2d')!, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Progress',
          data: [],
          tension: 0.35,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: 'rgba(255,255,255,0.6)' }, grid: { color: 'rgba(255,255,255,0.06)' } },
          y: { ticks: { color: 'rgba(255,255,255,0.6)' }, grid: { color: 'rgba(255,255,255,0.06)' } },
        }
      }
    });

    this.load();
  }

  load() {
    this.progress.getProgress().subscribe({
      next: (res) => {
        this.chart.data.labels = res.labels;
        this.chart.data.datasets[0].data = res.values;
        this.chart.update();
      }
    });
  }
}
