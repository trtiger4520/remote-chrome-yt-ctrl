<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { createCommand, createRemoteConnection } from './lib/connection';
import { clearPairingToken, readPairingToken } from './lib/pairing';

const token = readPairingToken();
const remote = createRemoteConnection(token);
const seekDraft = ref<number | null>(null);
const urlDraft = ref('');
const speedMenuOpen = ref(false);
const now = ref(Date.now());
let pendingVolume: number | null = null;
let volumeTimer: number | undefined;
let commandErrorTimer: number | undefined;
const timer = window.setInterval(() => {
  now.value = Date.now();
}, 250);

const player = computed(() => remote.state.player);
const isReady = computed(
  () =>
    remote.state.phase === 'connected' &&
    remote.state.status.extensionConnected &&
    remote.state.status.targetStatus === 'ready' &&
    player.value !== null,
);
const isLive = computed(() => player.value?.isLive ?? false);
const duration = computed(() => player.value?.duration ?? 0);
const currentTime = computed(() => {
  if (seekDraft.value !== null) {
    return seekDraft.value;
  }
  if (!player.value || player.value.paused) {
    return player.value?.currentTime ?? 0;
  }
  const elapsed = (now.value - Date.parse(player.value.capturedAtUtc)) / 1000;
  return Math.min(
    duration.value || Number.MAX_SAFE_INTEGER,
    player.value.currentTime + Math.max(0, elapsed) * player.value.playbackRate,
  );
});
const progress = computed(() =>
  duration.value > 0 ? Math.min(100, Math.max(0, (currentTime.value / duration.value) * 100)) : 0,
);
const phaseLabel = computed(
  () =>
    ({
      unpaired: '等待配對',
      connecting: '連線中',
      connected: '已連線',
      reconnecting: '重新連線中',
      error: '需要重新配對',
    })[remote.state.phase],
);
const phaseClass = computed(() => `phase-${remote.state.phase}`);

function formatTime(value: number): string {
  if (!Number.isFinite(value)) return '--:--';
  const totalSeconds = Math.max(0, Math.floor(value));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return hours > 0 ? `${hours}:${minutes}:${seconds}` : `${minutes}:${seconds}`;
}

async function runCommand(action: Parameters<typeof createCommand>[0], values: Record<string, unknown> = {}) {
  try {
    const result = await remote.sendCommand(createCommand(action, values));
    if (!result.success) scheduleCommandErrorClear();
  } catch (error) {
    remote.state.errorMessage = error instanceof Error ? error.message : '操作未完成';
    scheduleCommandErrorClear();
  }
}

function scheduleCommandErrorClear() {
  if (commandErrorTimer !== undefined) window.clearTimeout(commandErrorTimer);
  commandErrorTimer = window.setTimeout(() => {
    commandErrorTimer = undefined;
    remote.state.errorMessage = null;
  }, 5000);
}

function togglePlayback() {
  void runCommand('togglePlayback');
}

function updateSeek(event: Event) {
  const value = Number((event.target as HTMLInputElement).value);
  seekDraft.value = value;
}

function commitSeek() {
  if (seekDraft.value === null || isLive.value) return;
  const value = seekDraft.value;
  seekDraft.value = null;
  void runCommand('seekTo', { numberValue: value });
}

function selectRate(rate: number) {
  speedMenuOpen.value = false;
  void runCommand('setPlaybackRate', { numberValue: rate });
}

function submitNavigation() {
  const url = urlDraft.value.trim();
  if (!url) return;
  void runCommand('navigate', { stringValue: url });
}

function flushVolume() {
  volumeTimer = undefined;
  if (pendingVolume === null) return;
  const value = pendingVolume;
  pendingVolume = null;
  void runCommand('setVolume', { numberValue: value });
}

function setVolumeFromEvent(event: Event) {
  pendingVolume = Number((event.target as HTMLInputElement).value);
  if (volumeTimer === undefined) {
    volumeTimer = window.setTimeout(flushVolume, 100);
  }
}

function commitVolume() {
  if (volumeTimer !== undefined) {
    window.clearTimeout(volumeTimer);
    volumeTimer = undefined;
  }
  flushVolume();
}

function reloadPage() {
  window.location.reload();
}

function resetPairing() {
  clearPairingToken();
  window.location.reload();
}

onBeforeUnmount(() => {
  window.clearInterval(timer);
  if (volumeTimer !== undefined) window.clearTimeout(volumeTimer);
  if (commandErrorTimer !== undefined) window.clearTimeout(commandErrorTimer);
  void remote.stop();
});
</script>

<template>
  <!-- THESIS: a darkroom control surface turns live playback into a clear, tactile operating task and refuses dashboard clutter. OWN-WORLD: graphite, amber safelight, silver timing marks, and exposure-strip progress. STORY: pair once, see the active print, then make one-handed transport decisions. FIRST VIEWPORT: connection rail, current title, exposure-strip scrubber, and three transport controls occupy the thumb zone; settings recede below. FORM: assigned darkroom direction, seed 7cca67cc. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md -->
  <main class="remote-shell">
    <header class="top-rail">
      <div class="brand-lockup">
        <span class="brand-mark" aria-hidden="true">YR</span>
        <div>
          <p class="eyebrow">YouTube Remote</p>
          <p class="microcopy">LOCAL CONTROL / 5080</p>
        </div>
      </div>
      <div class="connection-badge" :class="phaseClass" role="status" aria-live="polite">
        <span class="status-dot" aria-hidden="true"></span>
        {{ phaseLabel }}
      </div>
    </header>

    <section v-if="remote.state.phase === 'unpaired'" class="message-panel" aria-labelledby="pairing-title">
      <span class="section-index">01 / PAIR</span>
      <h1 id="pairing-title">等待 Server 配對</h1>
      <p>請在執行 Server 的主控台掃描 QR Code。配對完成後，這個頁面會自動連線。</p>
      <button class="secondary-button" type="button" @click="reloadPage">重新檢查</button>
    </section>

    <section v-else-if="remote.state.phase === 'error'" class="message-panel" aria-labelledby="error-title">
      <span class="section-index">01 / PAIRING ERROR</span>
      <h1 id="error-title">需要重新配對</h1>
      <p>{{ remote.state.errorMessage }}</p>
      <button class="secondary-button" type="button" @click="resetPairing">清除並重新配對</button>
    </section>

    <template v-else>
      <section class="now-playing" aria-labelledby="now-playing-title">
        <div class="section-heading">
          <span class="section-index">01 / NOW PLAYING</span>
          <span class="target-state">{{ remote.state.status.targetStatus.toUpperCase() }}</span>
        </div>
        <h1 id="now-playing-title">{{ player?.title || remote.state.status.targetTitle || '等待 YouTube 影片' }}</h1>
        <p class="target-url">{{ player?.url || '請在 Chrome 開啟 YouTube 影片' }}</p>
      </section>

      <section class="transport-panel" aria-label="播放控制">
        <div class="exposure-track" :class="{ disabled: isLive || !isReady }">
          <input
            class="seek-slider"
            type="range"
            min="0"
            :max="duration || 1"
            step="0.1"
            :value="currentTime"
            :disabled="!isReady || isLive"
            :aria-label="isLive ? '直播無法調整進度' : '影片進度'"
            @input="updateSeek"
            @change="commitSeek"
          />
          <div class="exposure-fill" :style="{ width: `${progress}%` }"></div>
          <div class="exposure-marks" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
        </div>
        <div class="time-readout">
          <span>{{ formatTime(currentTime) }}</span>
          <span>{{ isLive ? 'LIVE' : formatTime(duration) }}</span>
        </div>

        <div class="transport-controls">
          <button
            class="transport-button secondary"
            type="button"
            :disabled="!isReady || isLive"
            aria-label="倒退十秒"
            @click="runCommand('seekBy', { numberValue: -10 })"
          >
            <span class="transport-glyph" aria-hidden="true">↶</span><small>10</small>
          </button>
          <button
            class="transport-button primary"
            type="button"
            :disabled="!isReady"
            :aria-label="player?.paused ? '播放' : '暫停'"
            @click="togglePlayback"
          >
            <span aria-hidden="true">{{ player?.paused ? '▶' : 'Ⅱ' }}</span>
          </button>
          <button
            class="transport-button secondary"
            type="button"
            :disabled="!isReady || isLive"
            aria-label="前進十秒"
            @click="runCommand('seekBy', { numberValue: 10 })"
          >
            <small>10</small><span class="transport-glyph" aria-hidden="true">↷</span>
          </button>
        </div>
      </section>

      <section class="control-grid" aria-label="音量與播放速度">
        <div class="control-block volume-block">
          <div class="control-label-row">
            <span class="section-index">02 / VOLUME</span>
            <strong>{{ Math.round((player?.volume ?? 0) * 100) }}%</strong>
          </div>
          <div class="volume-row">
            <button
              class="icon-button"
              type="button"
              :disabled="!isReady"
              :aria-label="player?.muted ? '取消靜音' : '靜音'"
              @click="runCommand('setMuted', { booleanValue: !(player?.muted ?? false) })"
            >
              {{ player?.muted ? '×' : '◖' }}
            </button>
            <input
              class="volume-slider"
              type="range"
              min="0"
              max="1"
              step="0.01"
              :value="player?.volume ?? 0"
              :disabled="!isReady"
              aria-label="音量"
              @input="setVolumeFromEvent"
              @change="commitVolume"
            />
          </div>
        </div>
        <div class="control-block rate-block">
          <div class="control-label-row">
            <span class="section-index">03 / RATE</span><strong>{{ player?.playbackRate ?? 1 }}×</strong>
          </div>
          <div class="rate-picker">
            <button
              class="rate-button"
              type="button"
              :disabled="!isReady"
              :aria-expanded="speedMenuOpen"
              @click="speedMenuOpen = !speedMenuOpen"
            >
              {{ player?.playbackRate ?? 1 }}× <span aria-hidden="true">⌄</span>
            </button>
            <div v-if="speedMenuOpen" class="rate-menu" role="menu">
              <button
                v-for="rate in [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]"
                :key="rate"
                type="button"
                role="menuitem"
                :class="{ selected: player?.playbackRate === rate }"
                @click="selectRate(rate)"
              >
                {{ rate }}×
              </button>
            </div>
          </div>
        </div>
      </section>

      <details class="navigation-panel">
        <summary class="section-heading">
          <span class="section-index">04 / LOAD PRINT</span>
          <span class="microcopy">YOUTUBE URL <span aria-hidden="true">⌄</span></span>
        </summary>
        <form class="url-form" @submit.prevent="submitNavigation">
          <label id="navigate-title" class="sr-only" for="video-url">YouTube 影片網址</label>
          <input
            id="video-url"
            v-model="urlDraft"
            type="url"
            inputmode="url"
            placeholder="貼上 YouTube 影片網址"
            autocomplete="off"
          />
          <button
            class="secondary-button"
            type="submit"
            :disabled="!urlDraft.trim() || remote.state.phase !== 'connected'"
          >
            載入
          </button>
        </form>
      </details>

      <p v-if="remote.state.errorMessage" class="error-strip" role="alert">{{ remote.state.errorMessage }}</p>
      <p v-else-if="!remote.state.status.extensionConnected" class="info-strip" role="status">
        請在 Chrome 載入 Extension，Server 會等待 localhost 連線
      </p>
      <p v-else-if="remote.state.status.targetStatus === 'none'" class="info-strip" role="status">
        找不到 YouTube 影片分頁，請先在 Chrome 開啟影片
      </p>
      <p v-else-if="remote.state.status.targetStatus === 'loading'" class="info-strip" role="status">
        影片已找到，正在等待 YouTube 載入 metadata
      </p>
      <p v-else-if="remote.state.status.targetStatus === 'unsupported'" class="info-strip" role="status">
        目前 YouTube 分頁不支援這項控制
      </p>
    </template>
  </main>
</template>
