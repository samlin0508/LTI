import { Component, signal } from '@angular/core';
import { ActivatedRoute, RouterOutlet } from '@angular/router';
import * as echarts from 'echarts/core';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { BarChart } from 'echarts/charts';
import { BrushComponent, GridComponent, LegendComponent, ToolboxComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { ECharts, EChartsOption } from 'echarts';
import { ApiService } from './api.service';
import { forkJoin } from 'rxjs';

echarts.use([BarChart, GridComponent, CanvasRenderer, LegendComponent, TooltipComponent, BrushComponent, ToolboxComponent]);

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NgxEchartsDirective, NgxEchartsDirective],
  templateUrl: './app.html',
  styleUrl: './app.css',
  providers: [
    provideEchartsCore({ echarts }),
  ]
})
export class App {
  protected readonly title = signal('LTI-APP');

  entityName = signal('');

  epsYoyBarChart!: ECharts;
  optionsEpsYoy!: EChartsOption;

  epsVsDividendsBarChart!: ECharts;
  optionsEpsVsDividends!: EChartsOption;

  constructor(
    private apiService: ApiService,
    private route: ActivatedRoute
  ) {
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      let id: any = params.get('id');

      if(id) {
        this.apiService.getEntities()
          .subscribe(x => {
            this.entityName.set(`${id} ${x.filter(y => y.id === id)[0]?.name}`);
          });

        forkJoin([
          this.apiService.getEps(id),
          this.apiService.getDividends(id)
        ])
        .subscribe(x => {
          this.renderEpsYoy(x[0]);
          this.renderEpsVsDividends(x[0], x[1]);
        });
      }
    });

    this.renderEpsYoy([]);
    this.renderEpsVsDividends([], []);
  }

  onEpsYoyBarChartInit(echartsIntance: any) {
    this.epsYoyBarChart = echartsIntance;
  }

  onEpsVsDividendsBarChartInit(echartsIntance: any) {
    this.epsVsDividendsBarChart = echartsIntance;
  }

  renderEpsYoy(data: any[]): void {
    let thisYear: number = new Date().getFullYear();

    let nMinusOneYear: number = thisYear - 1;

    let nMinusTwoYear: number = thisYear - 2;

    let xAxisData: string[] = data
      .filter(x => x.year === nMinusOneYear)
      .sort((a, b) => {
        if (a.month > b.month) {
          return 1;
        }

        if (a.month < b.month) {
          return -1;
        }

        return 0;
      })
      .map(x => x.month.toString().padStart(2, '0'));

    let epsNMinusOneYear: number[] = data
      .filter(x => x.year === nMinusOneYear)
      .sort((a, b) => {
        if (a.month > b.month) {
          return 1;
        }

        if (a.month < b.month) {
          return -1;
        }

        return 0;
      })
      .map(x => x.eps_month);

    let epsNMinusTwoYear: number[] = data
      .filter(x => x.year === nMinusTwoYear)
      .sort((a, b) => {
        if (a.month > b.month) {
          return 1;
        }

        if (a.month < b.month) {
          return -1;
        }

        return 0;
      })
      .map(x => x.eps_month);

    let epsThisYear: number[] = data
      .filter(x => x.year === thisYear)
      .sort((a, b) => {
        if (a.month > b.month) {
          return 1;
        }

        if (a.month < b.month) {
          return -1;
        }

        return 0;
      })
      .map(x => x.eps_month);

    var emphasisStyle = {
      itemStyle: {
        shadowBlur: 10,
        shadowColor: 'rgba(0,0,0,0.3)'
      }
    };

    this.optionsEpsYoy = {
      legend: {
        data: [nMinusTwoYear.toString(), nMinusOneYear.toString(), thisYear.toString()],
        // left: '10%'
      },
      // brush: {
      //   toolbox: ['rect', 'polygon', 'lineX', 'lineY', 'keep', 'clear'],
      //   xAxisIndex: 0
      // },
      // toolbox: {
      //   feature: {
      //     magicType: {
      //       type: ['stack']
      //     },
      //     dataView: {}
      //   }
      // },
      tooltip: {},
      xAxis: {
        data: xAxisData,
        name: '月份',
        axisLine: { onZero: true },
        splitLine: { show: false },
        splitArea: { show: false }
      },
      yAxis: {},
      // grid: {
      //   bottom: 100
      // },
      series: [
        {
          name: nMinusTwoYear.toString(),
          type: 'bar',
          stack: 'nMinusTwoYear',
          emphasis: emphasisStyle,
          label: {
            show: true
          },
          data: epsNMinusTwoYear
        },
        {
          name: nMinusOneYear.toString(),
          type: 'bar',
          stack: 'nMinusOneYear',
          emphasis: emphasisStyle,
          label: {
            show: true
          },
          data: epsNMinusOneYear
        },
        {
          name: thisYear.toString(),
          type: 'bar',
          stack: 'thisYear',
          emphasis: emphasisStyle,
          label: {
            show: true
          },
          data: epsThisYear
        }
      ]
    };

    if(this.epsYoyBarChart) {
      this.epsYoyBarChart.setOption(this.optionsEpsYoy);
    }
  }

  renderEpsVsDividends(
    dataEps: any[],
    dataDividends: any[]
  ): void {
    let thisYear: number = new Date().getFullYear();

    let nYear = 10;

    let xAxisData: number[] = dataEps
      .filter(x => x.year >= thisYear - nYear && x.month === 12)
      .sort((a, b) => {
        if (a.year > b.year) {
          return 1;
        }

        if (a.year < b.year) {
          return -1;
        }

        return 0;
      })
      .map(x => x.year);

    let eps: number[] = dataEps
      .filter(x => x.year >= thisYear - nYear && x.year < thisYear && x.month === 12)
      .sort((a, b) => {
        if (a.year > b.year) {
          return 1;
        }

        if (a.year < b.year) {
          return -1;
        }

        return 0;
      })
      .map(x => x.eps);

    eps.push(
      dataEps.filter(x => x.year === thisYear && x.eps !== null)
        .sort((a, b) => {
          if (a.month < b.month) {
            return 1;
          }

          if (a.month > b.month) {
            return -1;
          }

          return 0;
        })[0]?.eps
    );

    let cashDividends: (number | null)[] = [];

    let stockDividends: (number | null)[] = [];

    for(let i = 0; i < xAxisData.length ; i++) {
      cashDividends.push(dataDividends.filter(x => x.year === xAxisData[i])[0]?.dividend_cash);
      stockDividends.push(dataDividends.filter(x => x.year === xAxisData[i])[0]?.dividend_stock);
    }

    var emphasisStyle = {
      itemStyle: {
        shadowBlur: 10,
        shadowColor: 'rgba(0,0,0,0.3)'
      }
    };

    this.optionsEpsVsDividends = {
      legend: {
        data: ["EPS", "現金股利", "股票股利"],
        // left: '10%'
      },
      // brush: {
      //   toolbox: ['rect', 'polygon', 'lineX', 'lineY', 'keep', 'clear'],
      //   xAxisIndex: 0
      // },
      // toolbox: {
      //   feature: {
      //     magicType: {
      //       type: ['stack']
      //     },
      //     dataView: {}
      //   }
      // },
      tooltip: {},
      xAxis: {
        data: xAxisData,
        name: '西元年',
        axisLine: { onZero: true },
        splitLine: { show: false },
        splitArea: { show: false }
      },
      yAxis: {},
      // grid: {
      //   bottom: 100
      // },
      series: [
        {
          name: "EPS",
          type: 'bar',
          stack: 'EPS',
          emphasis: emphasisStyle,
          label: {
            show: true
          },
          data: eps
        },
        {
          name: "現金股利",
          type: 'bar',
          stack: 'Dividends',
          emphasis: emphasisStyle,
          label: {
            show: true
          },
          data: cashDividends
        },
        {
          name: "股票股利",
          type: 'bar',
          stack: 'Dividends',
          emphasis: emphasisStyle,
          label: {
            show: true
          },
          data: stockDividends
        }
      ]
    };

    if(this.epsVsDividendsBarChart) {
      this.epsVsDividendsBarChart.setOption(this.optionsEpsVsDividends);
    }
  }
}
