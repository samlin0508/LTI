import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import * as echarts from 'echarts/core';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { BarChart } from 'echarts/charts';
import { BrushComponent, GridComponent, LegendComponent, ToolboxComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { ECharts, EChartsOption } from 'echarts';
import { ApiService } from './api.service';
import { BehaviorSubject, debounceTime, distinctUntilChanged, forkJoin, Observable } from 'rxjs';
import { MatSelectModule } from '@angular/material/select';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

echarts.use([BarChart, GridComponent, CanvasRenderer, LegendComponent, TooltipComponent, BrushComponent, ToolboxComponent]);

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    NgxEchartsDirective,
    NgxEchartsDirective,
    MatSelectModule,
    ReactiveFormsModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  providers: [
    provideEchartsCore({ echarts }),
  ]
})
export class App {
  stockControl: FormControl = new FormControl("2887");
  entities: any[] = [];

  lastNYearsOfEpsYoyControl: FormControl = new FormControl(1);
  lastNYearsOfEpsYoy: any[] = [{
    id: 1,
    name: "最近2年"
  }, {
    id: 2,
    name: "最近3年"
  }, {
    id: 3,
    name: "最近4年"
  }, {
    id: 4,
    name: "最近5年"
  }];

  lastNYearsOfEpsVsDividendsControl: FormControl = new FormControl(9);
  lastNYearsOfEpsVsDividends: any[] = [{
    id: 1,
    name: "最近2年"
  }, {
    id: 2,
    name: "最近3年"
  }, {
    id: 4,
    name: "最近5年"
  }, {
    id: 9,
    name: "最近10年"
  }];

  paramStream: BehaviorSubject<string> = new BehaviorSubject<string>("");
  paramStream$: Observable<string> = this.paramStream.asObservable();

  epsYoyBarChart!: ECharts;
  optionsEpsYoy!: EChartsOption;

  epsVsDividendsBarChart!: ECharts;
  optionsEpsVsDividends!: EChartsOption;
  
  constructor(
    private apiService: ApiService,
    private route: ActivatedRoute,
    private title: Title
  ) {
  }

  ngOnInit(): void {
    this.renderEpsYoy([]);
    this.renderEpsVsDividends([], []);

    // 方法一
    // forkJoin([
    //   this.apiService.getEntities(),
    //   this.paramStream$
    //     .pipe(
    //       debounceTime(50),
    //       distinctUntilChanged()
    //     )
    // ])
    // .subscribe(x => {
    //   this.entities = x[0];
    //   this.stockControl.setValue(x[1]);
    //   this.fetch();
    // });

    // 方法二
    this.apiService.getEntities()
      .subscribe(x => {
        this.entities = x;

        this.paramStream$
          .pipe(
            debounceTime(50),
            distinctUntilChanged()
          )
          .subscribe(y => {
            this.stockControl.setValue(y);
            this.fetch();
          });
      });

    this.paramStream.next("2887");

    this.route.queryParamMap.subscribe(params => {
      let id: any = params.get('id');

      if (id) {
        this.paramStream.next(id);
      }
    });

    // 方法一
    // setTimeout(
    //   () => {
    //     this.paramStream.complete();
    //   },
    //   100
    // );
  }

  fetch(): void {
    this.setTitle();

    forkJoin([
      this.apiService.getEps(this.stockControl.value),
      this.apiService.getDividends(this.stockControl.value)
    ])
    .subscribe(x => {
      this.renderEpsYoy(x[0]);
      this.renderEpsVsDividends(x[0], x[1]);
    });
  }

  onStockSelectionChange(event: any) {
    this.fetch();
  }

  onLastNYearsOfEpsYoySelectionChange(event: any) {
    this.fetch();
  }

  onLastNYearsOfEpsVsDividendsSelectionChange(event: any) {
    this.fetch();
  }

  setTitle(): void {
    let entity = this.entities.filter(y => y.id === this.stockControl.value)[0];
    this.title.setTitle(`${entity?.id ?? ""} ${entity?.name ?? ""} EPS 趨勢分析`);
  }

  onEpsYoyBarChartInit(echartsIntance: any) {
    this.epsYoyBarChart = echartsIntance;
  }

  onEpsVsDividendsBarChartInit(echartsIntance: any) {
    this.epsVsDividendsBarChart = echartsIntance;
  }

  renderEpsYoy(data: any[]): void {
    let thisYear: number = new Date().getFullYear();

    let xAxisData: string[] = data
      .filter(x => x.year === thisYear - this.lastNYearsOfEpsYoyControl.value)
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

    let epsOfNYears: number[][] = [];

    for(let i = this.lastNYearsOfEpsYoyControl.value; i >= 0 ; i--) {
      let yearN = i > 0 ? thisYear - i : thisYear;

      epsOfNYears.push(
        data
          .filter(x => x.year === yearN)
          .sort((a, b) => {
            if (a.month > b.month) {
              return 1;
            }

            if (a.month < b.month) {
              return -1;
            }

            return 0;
          })
          .map(x => x.eps_month)
      );
    }

    var emphasisStyle = {
      itemStyle: {
        shadowBlur: 10,
        shadowColor: 'rgba(0,0,0,0.3)'
      }
    };

    this.optionsEpsYoy = {
      legend: {
        data: epsOfNYears.map((value, index) => (thisYear - (this.lastNYearsOfEpsYoyControl.value - index)).toString()),
      },
      tooltip: {},
      xAxis: {
        data: xAxisData,
        name: '月份',
        axisLine: { onZero: true },
        splitLine: { show: false },
        splitArea: { show: false }
      },
      yAxis: {},
      series: 
        epsOfNYears
          .map((value, index) => {
            let yearN = (thisYear - (this.lastNYearsOfEpsYoyControl.value - index)).toString();

            return {
              name: yearN,
              type: 'bar',
              stack: yearN,
              emphasis: emphasisStyle,
              label: {
                show: true
              },
              data: value
            };
          })
    };

    if (this.epsYoyBarChart) {
      this.epsYoyBarChart.setOption(this.optionsEpsYoy);
    }
  }

  renderEpsVsDividends(
    dataEps: any[],
    dataDividends: any[]
  ): void {
    let thisYear: number = new Date().getFullYear();

    let xAxisData: number[] = dataEps
      .filter(x => x.year >= thisYear - this.lastNYearsOfEpsVsDividendsControl.value && x.month === 12)
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
      .filter(x => x.year >= thisYear - this.lastNYearsOfEpsVsDividendsControl.value && x.year < thisYear && x.month === 12)
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

    for (let i = 0; i < xAxisData.length; i++) {
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
      },
      tooltip: {},
      xAxis: {
        data: xAxisData,
        name: '西元年',
        axisLine: { onZero: true },
        splitLine: { show: false },
        splitArea: { show: false }
      },
      yAxis: {},
      series: [
        {
          name: "EPS",
          type: 'bar',
          stack: 'EPS',
          emphasis: emphasisStyle,
          label: {
            show: true,
            formatter: (params) => {
              let index = xAxisData.indexOf(+params.name);
              let cash = cashDividends[index] ?? 0;
              let stock = stockDividends[index] ?? 0;
              let eps = params.value ? +params.value! : 0;
              let payoutRatio = 0;

              if(eps === 0) {
                payoutRatio = 0;
              } else {
                payoutRatio = Math.round(((cash + stock) / eps) * 100);
              }
              
              return `${params.value}\n(${payoutRatio}%)`;
            }
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

    if (this.epsVsDividendsBarChart) {
      this.epsVsDividendsBarChart.setOption(this.optionsEpsVsDividends);
    }
  }
}
