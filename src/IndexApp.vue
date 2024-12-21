<script setup lang="ts">
import { ref, watch } from 'vue';
import AsyncLock from 'async-lock';
import { whenever, useDocumentVisibility, useIntervalFn } from '@vueuse/core';
import Chart, { type ChartConfiguration } from 'chart.js/auto';
import 'chartjs-adapter-dayjs-4/dist/chartjs-adapter-dayjs-4.esm';
import annotationPlugin from 'chartjs-plugin-annotation';
import { AppBaseV2, AnimatedClock } from '@nanase/alnilam/components';
import { useIntervalFetch } from '@nanase/alnilam/use';

import type { ObservedValue, SensorType } from './types';
import ChartBase from './components/ChartBase.vue';

Chart.register(annotationPlugin);

const apiBaseUri = 'http://localhost:8000/';
const apiGetSensorTypes = '/api/v1/sensor-types/';
const apiGetObservedValues = '/api/v1/observed-values/';
const apiGetLatestObservedValues = '/api/v1/observed-values/latest';

const latestVoltage = ref<ObservedValue>();
const latestFrequency = ref<ObservedValue>();
const sensorTypes = ref<SensorType[]>([]);
const chartVoltage = ref<InstanceType<typeof ChartBase>>();
const chartFrequency = ref<InstanceType<typeof ChartBase>>();
const latestCreatedAt = ref<number>(0);
const visibility = useDocumentVisibility();
const displayDuration = ref<number>(10 * 60 * 1000);
const lock = new AsyncLock();

const { error, fetchedAt, data } = useIntervalFetch<string>(
  new URL(apiGetLatestObservedValues, apiBaseUri).toString(),
  1000,
);

watch(
  () =>
    chartVoltage.value?.getChart().ready && chartFrequency.value?.getChart().ready && sensorTypes.value.length === 2,
  async () => {
    await reloadData();
  },
);

watch(
  () => displayDuration.value,
  async () => {
    await reloadData();
  },
);

useIntervalFn(() => {
  const voltageChartState = chartVoltage.value?.getChart();
  const frequencyChartState = chartFrequency.value?.getChart();
  const now = new Date().getTime();

  latestCreatedAt.value =
    now - (new Date(latestFrequency.value?.createdAt ?? 0).getTime() - new Date().getTimezoneOffset() * 60000);

  if (voltageChartState?.ready && latestVoltage.value) {
    const latestCreatedAtGap =
      now - (new Date(latestVoltage.value.createdAt).getTime() - new Date().getTimezoneOffset() * 60000);

    if (latestCreatedAtGap > 10000) {
      voltageChartState.chart.data.datasets[0].data.push({
        x: now,
        y: Number.NaN,
      });
    }
    updateGraph(voltageChartState.chart);
  }

  if (frequencyChartState?.ready && latestFrequency.value) {
    const latestCreatedAtGap =
      now - (new Date(latestFrequency.value.createdAt).getTime() - new Date().getTimezoneOffset() * 60000);

    if (latestCreatedAtGap > 10000) {
      frequencyChartState.chart.data.datasets[0].data.push({
        x: now,
        y: Number.NaN,
      });
    }
    updateGraph(frequencyChartState.chart);
  }
}, 1000);

function initializeVoltageChart(canvas: HTMLCanvasElement): Chart {
  return new Chart(canvas, {
    type: 'line',
    data: {
      datasets: [
        {
          label: '電圧 (Vrms)',
          data: [],
          pointStyle: false,
          spanGaps: false,
          borderColor: 'rgba(230, 81, 0, 1)',
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        decimation: {
          enabled: true,
          algorithm: 'min-max',
        },
        legend: {
          display: false,
        },
        annotation: {
          annotations: [
            {
              type: 'line',
              scaleID: 'y',
              value: 110,
              borderWidth: 3,
              borderColor: '#FFCCBC',
              drawTime: 'beforeDatasetsDraw',
              adjustScaleRange: true,
            },
            {
              type: 'line',
              scaleID: 'y',
              value: 107,
              borderWidth: 3,
              borderColor: '#FFE082',
              drawTime: 'beforeDatasetsDraw',
              adjustScaleRange: false,
            },
            {
              type: 'line',
              scaleID: 'y',
              value: 101,
              borderWidth: 3,
              borderColor: '#dddddd',
              drawTime: 'beforeDatasetsDraw',
              adjustScaleRange: false,
            },
            {
              type: 'line',
              scaleID: 'y',
              value: 95,
              borderWidth: 3,
              borderColor: '#FFE082',
              drawTime: 'beforeDatasetsDraw',
              adjustScaleRange: false,
            },
            {
              type: 'line',
              scaleID: 'y',
              value: 92,
              borderWidth: 3,
              borderColor: '#FFCCBC',
              drawTime: 'beforeDatasetsDraw',
              adjustScaleRange: true,
            },
          ],
        },
      },
      parsing: {
        xAxisKey: 'x',
        yAxisKey: 'y',
      },
      scales: {
        x: {
          type: 'time',
          time: {
            parser: 'YYYY-MM-DDTHH:mm:ss',
            unit: 'minute',
            displayFormats: {
              minute: 'HH:mm',
            },
            tooltipFormat: 'HH:mm:ss',
          },
          ticks: {
            align: 'end',
            autoSkip: true,
            maxTicksLimit: 10,
          },
        },
        y: {
          type: 'linear',
        },
      },
    },
  } as const satisfies ChartConfiguration<'line'>);
}

function initializeFrequencyChart(canvas: HTMLCanvasElement): Chart {
  return new Chart(canvas, {
    type: 'line',
    data: {
      datasets: [
        {
          label: '周波数 (Hz)',
          data: [],
          pointStyle: false,
          spanGaps: false,
          borderColor: 'rgba(57, 73, 171, 1)',
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        decimation: {
          enabled: true,
          algorithm: 'min-max',
        },
        legend: {
          display: false,
        },
        annotation: {
          annotations: [
            {
              type: 'line',
              scaleID: 'y',
              value: 60.3,
              borderWidth: 3,
              borderColor: '#FFCCBC',
              drawTime: 'beforeDatasetsDraw',
              adjustScaleRange: true,
            },
            {
              type: 'line',
              scaleID: 'y',
              value: 60.2,
              borderWidth: 3,
              borderColor: '#FFE082',
              drawTime: 'beforeDatasetsDraw',
              adjustScaleRange: false,
            },
            {
              type: 'line',
              scaleID: 'y',
              value: 60,
              borderWidth: 3,
              borderColor: '#dddddd',
              drawTime: 'beforeDatasetsDraw',
              adjustScaleRange: false,
            },
            {
              type: 'line',
              scaleID: 'y',
              value: 59.8,
              borderWidth: 3,
              borderColor: '#FFE082',
              drawTime: 'beforeDatasetsDraw',
              adjustScaleRange: false,
            },
            {
              type: 'line',
              scaleID: 'y',
              value: 59.7,
              borderWidth: 3,
              borderColor: '#FFCCBC',
              drawTime: 'beforeDatasetsDraw',
              adjustScaleRange: true,
            },
          ],
        },
      },
      parsing: {
        xAxisKey: 'x',
        yAxisKey: 'y',
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'minute',
            displayFormats: {
              minute: 'HH:mm',
            },
            tooltipFormat: 'YYYY-MM-DD HH:mm:ss',
          },
          ticks: {
            align: 'end',
            autoSkip: true,
            maxTicksLimit: 10,
          },
        },
        y: {
          type: 'linear',
        },
      },
    },
  } as const satisfies ChartConfiguration<'line'>);
}

whenever(data, async () => {
  if (!data.value) {
    return;
  }

  const latestObservedValues: ObservedValue[] = JSON.parse(data.value);

  for (const observedValue of latestObservedValues) {
    let sensorType = sensorTypes.value.find((type) => type.id === observedValue.sensorTypeId);

    if (!sensorType) {
      const params = { sensorTypeId: observedValue.sensorTypeId.toString() };
      const url = new URL(apiGetSensorTypes, apiBaseUri);
      url.search = new URLSearchParams(params).toString();
      sensorType = (await (await fetch(url)).json()) as SensorType;
      sensorTypes.value.push(sensorType);
    }

    switch (sensorType.name) {
      case 'voltage': {
        latestVoltage.value = observedValue;
        break;
      }

      case 'frequency': {
        latestFrequency.value = observedValue;
        break;
      }
    }
  }
});

watch(latestVoltage, async (voltage, oldVoltage) => {
  const chartState = chartVoltage.value?.getChart();

  if (voltage && voltage.value !== oldVoltage?.value && chartState?.ready) {
    await lock.acquire('graphUpdate', () => {
      chartState.chart.data.datasets[0].data.push({
        x: new Date(voltage.createdAt).getTime() - new Date().getTimezoneOffset() * 60000,
        y: voltage.value,
      });
    });
  }
});

watch(latestFrequency, async (frequency, oldFrequency) => {
  const chartState = chartFrequency.value?.getChart();

  if (frequency && frequency.value !== oldFrequency?.value && chartState?.ready) {
    await lock.acquire('graphUpdate', () => {
      chartState.chart.data.datasets[0].data.push({
        x: new Date(frequency.createdAt).getTime() - new Date().getTimezoneOffset() * 60000,
        y: frequency.value,
      });
    });
  }
});

watch(visibility, async () => {
  if (visibility.value === 'visible') {
    await reloadData();
  }
});

function removeElements<T>(array: T[], conditionFn: (element: T, index: number, array: T[]) => boolean): void {
  for (let i = array.length - 1; i >= 0; i--) {
    if (!conditionFn(array[i], i, array)) {
      array.splice(i, 1);
    }
  }
}

function updateGraph(chart: Chart) {
  const now = new Date().getTime();

  removeElements(chart.data.datasets[0].data, (point) => {
    if (point && typeof point === 'object' && 'x' in point) {
      return now - point.x <= displayDuration.value * 1.1;
    }

    return false;
  });

  if (chart.options.scales?.x) {
    chart.options.scales.x.min = now - displayDuration.value;
    chart.options.scales.x.max = now;
  }

  chart.update('none');
}

async function reloadData() {
  const chartVoltageState = chartVoltage.value?.getChart();
  const chartFrequencyState = chartFrequency.value?.getChart();
  const voltageType = sensorTypes.value.find((t) => t.name === 'voltage');
  const frequencyType = sensorTypes.value.find((t) => t.name === 'frequency');

  if (!chartVoltageState?.ready || !chartFrequencyState?.ready || !voltageType || !frequencyType) {
    return;
  }

  await lock.acquire('graphUpdate', async () => {
    const now = new Date();
    chartVoltageState.chart.data.datasets[0].data = [];
    chartFrequencyState.chart.data.datasets[0].data = [];
    let offset = 0;
    let fetchedSize = 0;
    const limit = 1000;

    do {
      const params = {
        start: new Date(now.getTime() - displayDuration.value).toISOString(),
        end: now.toISOString(),
        limit: limit.toString(),
        offset: offset.toString(),
      };
      const url = new URL(apiGetObservedValues, apiBaseUri);
      url.search = new URLSearchParams(params).toString();
      const observedValues = (await (await fetch(url)).json()) as ObservedValue[];
      fetchedSize = observedValues.length;
      offset += fetchedSize;

      for (const observedValue of observedValues) {
        const chart =
          observedValue.sensorTypeId === voltageType.id ? chartVoltageState.chart : chartFrequencyState.chart;

        chart.data.datasets[0].data.push({
          x: new Date(observedValue.createdAt).getTime() - now.getTimezoneOffset() * 60000,
          y: observedValue.value,
        });
      }
    } while (fetchedSize === limit);
  });
}
</script>

<template>
  <AppBaseV2 title="ACObservator Dashboard" :page-sections="[]">
    <template #appbarAppend>
      <AnimatedClock />
    <!-- </template>
    <template #toolbarAppend> -->
      <v-btn icon>
        <v-icon color="red" v-if="error">mdi-database-off-outline</v-icon>
        <v-icon color="grey" v-else-if="!data">mdi-database-off-outline</v-icon>
        <v-icon color="green" v-else>mdi-database-outline</v-icon>

        <v-icon color="red" v-if="latestCreatedAt > 5000">mdi-power-plug-off-outline</v-icon>
        <v-icon color="green" v-else>mdi-power-plug-outline</v-icon>
      </v-btn>

      <!-- <v-menu>
        <template #activator="{ props }">
          <v-btn icon v-bind="props">
            <v-icon>mdi-dots-vertical</v-icon>
          </v-btn>
        </template>

        <v-list>
          <v-list-item title="デバイスとの接続" />
        </v-list>
      </v-menu> -->
    </template>

    <v-row class="bg-white" >
      <v-col cols="12" sm="6">
        <v-card color="orange-darken-4" variant="text">
          <v-card-text class="pa-0 mr-3 text-h3 text-right">
            {{ latestVoltage?.value.toFixed(3) }}
            <span class="text-h5">V<sub>rms</sub></span>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6">
        <v-card color="indigo-darken-1" variant="text">
          <v-card-text class="pa-0 mr-3 text-h3 text-right">
            {{ latestFrequency?.value.toFixed(6) }}
            <span class="text-h5">Hz</span>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row class=" bg-white">
      <v-col cols="12" sm="6">
        <div style="height: 480px">
          <ChartBase ref="chartVoltage" :initializer="initializeVoltageChart" />
        </div>
      </v-col>
      <v-col cols="12" sm="6">
        <div style="height: 480px">
          <ChartBase ref="chartFrequency" :initializer="initializeFrequencyChart" />
        </div>
      </v-col>

      <v-col cols="12" class="text-center">
        <v-btn-toggle $="displayDuration" divided density="compact">
          <v-btn :value="5 * 60 * 1000">5分</v-btn>
          <v-btn :value="10 * 60 * 1000">10分</v-btn>
          <v-btn :value="30 * 60 * 1000">30分</v-btn>
          <v-btn :value="1 * 60 * 60 * 1000">1時間</v-btn>
          <v-btn :value="3 * 60 * 60 * 1000">3時間</v-btn>
          <v-btn :value="6 * 60 * 60 * 1000">6時間</v-btn>
          <v-btn :value="12 * 60 * 60 * 1000">12時間</v-btn>
          <v-btn :value="24 * 60 * 60 * 1000">1日</v-btn>
        </v-btn-toggle>
      </v-col>
    </v-row>
  </AppBaseV2>
</template>
