<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { createCommand, createRemoteConnection } from './lib/connection';
import { clearPairingToken, readPairingToken } from './lib/pairing';

const token = readPairingToken();
const remote = createRemoteConnection(token);
const seekDraft = ref<number | null>(null);
const volumeDraft = ref<number | null>(null);
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
const canSeek = computed(() => isReady.value && !isLive.value && (player.value?.canSeek ?? false));
const canLike = computed(() => isReady.value && player.value?.liked !== null && player.value?.liked !== undefined);
const likeStatusLabel = computed(() => {
  if (!player.value || !isReady.value) return '等待影片';
  if (player.value.liked === null) return '無法使用';
  return player.value.liked ? '已按讚' : '未按讚';
});
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
const displayedVolume = computed(() => volumeDraft.value ?? player.value?.volume ?? 0);
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
const videoTitle = computed(() => player.value?.title || remote.state.status.targetTitle || '等待 YouTube 影片');
const videoUrl = computed(() => player.value?.url || '請在 Chrome 開啟 YouTube 影片');
const videoMenuItems = computed(() => {
  const menu = remote.state.videoMenu;
  if (!menu || !player.value || menu.targetKey !== player.value.targetKey) return [];
  return menu.items;
});
const unavailableThumbnailUrls = ref(new Set<string>());
const videoMenuItemsWithThumbnails = computed(() =>
  videoMenuItems.value.map((item) => ({
    ...item,
    thumbnailUrl: getYouTubeThumbnailUrl(item.url),
  })),
);
const canNavigate = computed(() => remote.state.phase === 'connected' && remote.state.status.extensionConnected);
const videoMenuSummary = computed(() => {
  if (!remote.state.status.extensionConnected) return '等待 Extension 回報目前 YouTube 畫面';
  if (!player.value) return '請在 Chrome 開啟 YouTube 影片';
  if (videoMenuItems.value.length === 0) return '目前畫面沒有其他已載入的影片連結';
  return `已找到 ${videoMenuItems.value.length} 部影片，點選後才會切換`;
});
const playbackLabel = computed(() => {
  if (!player.value) return '等待影片';
  if (player.value.isLive) return '直播中';
  return player.value.paused ? '已暫停' : '播放中';
});
const targetStateLabel = computed(() => {
  if (remote.state.status.targetStatus === 'ready') return isLive.value ? '直播' : '已就緒';
  return (
    {
      none: '未找到',
      loading: '載入中',
      unsupported: '不支援',
    }[remote.state.status.targetStatus] ?? '等待中'
  );
});
const targetStateTone = computed(() => {
  if (remote.state.status.targetStatus === 'ready') return 'on';
  if (remote.state.status.targetStatus === 'loading') return 'pending';
  if (remote.state.status.targetStatus === 'unsupported') return 'error';
  return 'off';
});
const connectionHeadline = computed(() => {
  if (isReady.value) return '控制中心已就緒';
  if (!remote.state.status.extensionConnected) return '等待 Chrome Extension';
  if (remote.state.status.targetStatus === 'loading') return '等待影片載入';
  if (remote.state.status.targetStatus === 'none') return '請開啟 YouTube 分頁';
  if (remote.state.status.targetStatus === 'unsupported') return '目前分頁不支援控制';
  return '正在同步播放狀態';
});
const connectionItems = computed(() => {
  const pending = remote.state.phase === 'connecting' || remote.state.phase === 'reconnecting';
  const serverTone =
    remote.state.phase === 'error' ? 'error' : remote.state.status.serverConnected ? 'on' : pending ? 'pending' : 'off';
  const extensionTone = remote.state.status.extensionConnected ? 'on' : pending ? 'pending' : 'off';

  return [
    {
      label: 'Server',
      value: remote.state.status.serverConnected ? '已連線' : pending ? '連線中' : '離線',
      tone: serverTone,
    },
    {
      label: 'Extension',
      value: remote.state.status.extensionConnected ? '已連線' : pending ? '等待中' : '離線',
      tone: extensionTone,
    },
    {
      label: 'YouTube',
      value: targetStateLabel.value,
      tone: targetStateTone.value,
    },
  ];
});

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

function formatRate(rate: number): string {
  return Number.isInteger(rate) ? `${rate}` : rate.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function formatVideoUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

function getYouTubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(parsed.hostname)) {
      return null;
    }

    if (parsed.hostname === 'youtu.be') {
      return parsed.pathname.split('/').filter(Boolean)[0] ?? null;
    }

    const path = parsed.pathname.replace(/\/$/, '');
    if (path === '/watch') return parsed.searchParams.get('v');
    if (path.startsWith('/shorts/') || path.startsWith('/live/')) {
      return path.split('/').filter(Boolean)[1] ?? null;
    }
    return null;
  } catch {
    return null;
  }
}

function getYouTubeThumbnailUrl(url: string): string | null {
  const videoId = getYouTubeVideoId(url);
  return videoId ? `/api/youtube-thumbnail/${encodeURIComponent(videoId)}` : null;
}

function handleThumbnailError(url: string) {
  unavailableThumbnailUrls.value = new Set(unavailableThumbnailUrls.value).add(url);
}

async function runCommand(
  action: Parameters<typeof createCommand>[0],
  values: Record<string, unknown> = {},
): Promise<boolean> {
  try {
    const result = await remote.sendCommand(createCommand(action, values));
    if (!result.success) scheduleCommandErrorClear();
    return result.success;
  } catch (error) {
    remote.state.errorMessage = error instanceof Error ? error.message : '操作未完成';
    scheduleCommandErrorClear();
    return false;
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
  if (seekDraft.value === null || !canSeek.value) return;
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

function selectVideo(url: string) {
  if (!canNavigate.value) return;
  void runCommand('navigate', { stringValue: url });
}

async function flushVolume() {
  volumeTimer = undefined;
  if (pendingVolume === null) return;
  const value = pendingVolume;
  pendingVolume = null;
  const success = await runCommand('setVolume', { numberValue: value });
  if (!success) volumeDraft.value = null;
}

function setVolumeFromEvent(event: Event) {
  const value = Number((event.target as HTMLInputElement).value);
  volumeDraft.value = value;
  pendingVolume = value;
  if (volumeTimer === undefined) {
    volumeTimer = window.setTimeout(() => void flushVolume(), 100);
  }
}

function commitVolume() {
  if (volumeTimer !== undefined) {
    window.clearTimeout(volumeTimer);
    volumeTimer = undefined;
  }
  void flushVolume();
}

function reloadPage() {
  window.location.reload();
}

function resetPairing() {
  clearPairingToken();
  window.location.reload();
}

watch(
  () => player.value?.targetKey,
  () => {
    seekDraft.value = null;
    volumeDraft.value = null;
  },
);

watch(
  () => player.value?.volume,
  (volume) => {
    if (volumeDraft.value !== null && volume !== undefined && Math.abs(volume - volumeDraft.value) < 0.005) {
      volumeDraft.value = null;
    }
  },
);

onBeforeUnmount(() => {
  window.clearInterval(timer);
  if (volumeTimer !== undefined) window.clearTimeout(volumeTimer);
  if (commandErrorTimer !== undefined) window.clearTimeout(commandErrorTimer);
  void remote.stop();
});
</script>

<template>
  <!-- THESIS: a Liquid Glass control center turns remote playback into a calm, glanceable operating surface and refuses dashboard clutter. OWN-WORLD: near-black ambient light, translucent silver glass, semantic blue/green/yellow/coral controls, and authored SVG geometry. STORY: confirm the LAN path, identify the current video, then make one-handed transport decisions. FIRST VIEWPORT: connection and media modules lead into the scrubber, three transport controls, and volume and quick toggles. FORM: user-pinned iOS 26 Control Center composition, adapted for YouTube Remote. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md -->
  <main class="remote-shell" aria-label="YouTube Remote 控制中心">
    <svg class="icon-defs" aria-hidden="true" focusable="false">
      <symbol id="icon-remote" viewBox="0 0 24 24">
        <rect x="5" y="3.5" width="14" height="17" rx="4"></rect>
        <path d="M9 7.5h6M9 16.5h6"></path>
        <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"></circle>
      </symbol>
      <symbol id="icon-link" viewBox="0 0 24 24">
        <path d="m9.5 14.5 5-5"></path>
        <path d="M7.4 17.8H6.2a4 4 0 0 1 0-8h3.1M16.6 6.2h1.2a4 4 0 0 1 0 8h-3.1"></path>
      </symbol>
      <symbol id="icon-server" viewBox="0 0 24 24">
        <rect x="4" y="4" width="16" height="6" rx="2"></rect>
        <rect x="4" y="14" width="16" height="6" rx="2"></rect>
        <path d="M8 7h.01M8 17h.01M12 7h5M12 17h5"></path>
      </symbol>
      <symbol id="icon-video" viewBox="0 0 24 24">
        <rect x="3.5" y="6" width="13" height="12" rx="3"></rect>
        <path d="m16.5 10 4-2v8l-4-2"></path>
        <path d="m9.5 10 3 2-3 2z" fill="currentColor" stroke="none"></path>
      </symbol>
      <symbol id="icon-list" viewBox="0 0 24 24">
        <path d="M8 6h12M8 12h12M8 18h12"></path>
        <path d="M4 6h.01M4 12h.01M4 18h.01"></path>
      </symbol>
      <symbol id="icon-play" viewBox="0 0 24 24">
        <path d="m8 5 11 7-11 7z" fill="currentColor" stroke="none"></path>
      </symbol>
      <symbol id="icon-pause" viewBox="0 0 24 24">
        <rect x="7" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"></rect>
        <rect x="13" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"></rect>
      </symbol>
      <symbol id="icon-rewind" viewBox="0 0 24 24">
        <path d="m4 12 7-6v12zM11 12l7-6v12z" fill="currentColor" stroke="none"></path>
      </symbol>
      <symbol id="icon-forward" viewBox="0 0 24 24">
        <path d="m20 12-7-6v12zM13 12 6 6v12z" fill="currentColor" stroke="none"></path>
      </symbol>
      <symbol id="icon-volume" viewBox="0 0 24 24">
        <path d="M4 10v4h4l5 4V6l-5 4z"></path>
        <path d="M16 9.5a4 4 0 0 1 0 5M18.5 7a7.5 7.5 0 0 1 0 10"></path>
      </symbol>
      <symbol id="icon-mute" viewBox="0 0 24 24">
        <path d="M4 10v4h4l5 4V6l-5 4z"></path>
        <path d="m17 9 4 6M21 9l-4 6"></path>
      </symbol>
      <symbol id="icon-speed" viewBox="0 0 24 24">
        <path d="M4.5 15a7.5 7.5 0 1 1 15 0"></path>
        <path d="m12 12 3.5-3.5M7 18h10"></path>
      </symbol>
      <symbol id="icon-captions" viewBox="0 0 24 24">
        <rect x="3.5" y="6" width="17" height="12" rx="3"></rect>
        <path d="M7 11h4M13 11h4M7 14h3M12 14h5"></path>
      </symbol>
      <symbol id="icon-like" viewBox="0 0 24 24">
        <path d="M7 10v10H4V10h3z"></path>
        <path
          d="M7 10h2.5l2.4-5.6A1.8 1.8 0 0 1 15.4 5l-.7 5H18a2.5 2.5 0 0 1 2.45 3l-1.05 5A2.5 2.5 0 0 1 16.95 20H7"
        ></path>
      </symbol>
      <symbol id="icon-fullscreen" viewBox="0 0 24 24">
        <path d="M8 4H4v4M16 4h4v4M20 16v4h-4M4 16v4h4"></path>
      </symbol>
      <symbol id="icon-chevron" viewBox="0 0 24 24">
        <path d="m6 9 6 6 6-6"></path>
      </symbol>
      <symbol id="icon-refresh" viewBox="0 0 24 24">
        <path d="M19 8V4l-2.2 2.2A7 7 0 1 0 19 12"></path>
      </symbol>
      <symbol id="icon-alert" viewBox="0 0 24 24">
        <path d="M12 4 21 19H3z"></path>
        <path d="M12 9v4M12 16h.01"></path>
      </symbol>
      <symbol id="icon-check" viewBox="0 0 24 24">
        <path d="m5 12 4 4L19 6"></path>
      </symbol>
    </svg>

    <header class="remote-topbar">
      <div class="brand-lockup remote-brand">
        <span class="brand-mark remote-brand-mark" aria-hidden="true">
          <svg class="control-icon"><use href="#icon-remote"></use></svg>
        </span>
        <div>
          <p class="brand-name">YouTube Remote</p>
          <p class="brand-context">PRIVATE LAN / 8154</p>
        </div>
      </div>
      <div class="connection-badge" :class="phaseClass" role="status" aria-live="polite">
        <span class="status-dot" aria-hidden="true"></span>
        <span>{{ phaseLabel }}</span>
      </div>
    </header>

    <section
      v-if="remote.state.phase === 'unpaired'"
      class="remote-empty-state glass-module"
      aria-labelledby="pairing-title"
    >
      <div class="empty-icon" aria-hidden="true">
        <svg class="control-icon large-icon"><use href="#icon-link"></use></svg>
      </div>
      <h1 id="pairing-title">等待 Server 配對</h1>
      <p>
        請在執行 Server 的電腦開啟 <strong>/connect</strong>，掃描該頁顯示的 QR Code。配對完成後，這個頁面會自動連線。
      </p>
      <button class="glass-action primary-action" type="button" @click="reloadPage">重新檢查</button>
    </section>

    <section
      v-else-if="remote.state.phase === 'error'"
      class="remote-empty-state glass-module error-state"
      aria-labelledby="error-title"
    >
      <div class="empty-icon error-icon" aria-hidden="true">
        <svg class="control-icon large-icon"><use href="#icon-alert"></use></svg>
      </div>
      <h1 id="error-title">需要重新配對</h1>
      <p>{{ remote.state.errorMessage }}</p>
      <button class="glass-action primary-action" type="button" @click="resetPairing">清除並重新配對</button>
    </section>

    <template v-else>
      <section class="control-center-grid" aria-label="播放與連線控制" :aria-busy="remote.state.phase !== 'connected'">
        <section class="glass-module connection-module" aria-labelledby="connection-module-title">
          <div class="module-heading-line">
            <h2 id="connection-module-title">連線狀態</h2>
            <svg class="control-icon module-icon" aria-hidden="true"><use href="#icon-link"></use></svg>
          </div>
          <p class="module-summary">{{ connectionHeadline }}</p>
          <div class="connection-list">
            <div v-for="item in connectionItems" :key="item.label" class="connection-row">
              <span class="status-indicator" :class="`tone-${item.tone}`" aria-hidden="true"></span>
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </div>
          </div>
        </section>

        <section class="glass-module now-playing-module" aria-labelledby="now-playing-title">
          <div class="module-heading-line">
            <h2 id="now-playing-title">現在播放</h2>
            <span class="media-state" :class="`tone-${targetStateTone}`">{{ playbackLabel }}</span>
          </div>
          <p class="media-title" :title="videoTitle">{{ videoTitle }}</p>
          <p class="media-url" :title="videoUrl">{{ videoUrl }}</p>
          <div class="media-meta">
            <span class="media-provider">
              <svg class="control-icon tiny-icon" aria-hidden="true"><use href="#icon-video"></use></svg>
              YouTube
            </span>
            <span>{{ formatRate(player?.playbackRate ?? 1) }}×</span>
          </div>
        </section>

        <section class="glass-module progress-module" aria-labelledby="progress-title">
          <div class="module-heading-line">
            <h2 id="progress-title">影片進度</h2>
            <span class="progress-percent">{{ isLive ? 'LIVE' : `${Math.round(progress)}%` }}</span>
          </div>
          <div class="seek-control" :class="{ disabled: !canSeek }">
            <input
              class="seek-slider"
              type="range"
              min="0"
              :max="duration || 1"
              step="0.1"
              :value="isLive ? 0 : currentTime"
              :style="{ '--range-progress': `${progress}%` }"
              :disabled="!canSeek"
              :aria-label="isLive ? '直播無法調整進度' : canSeek ? '影片進度' : '目前無法調整進度'"
              @input="updateSeek"
              @change="commitSeek"
            />
          </div>
          <div class="time-readout">
            <span>{{ formatTime(currentTime) }}</span>
            <span>{{ isLive ? 'LIVE' : formatTime(duration) }}</span>
          </div>
        </section>

        <section class="glass-module transport-module" aria-label="播放控制">
          <button
            class="transport-button skip-button"
            type="button"
            :disabled="!canSeek"
            aria-label="倒退十秒"
            @click="runCommand('seekBy', { numberValue: -10 })"
          >
            <svg class="control-icon transport-icon" aria-hidden="true"><use href="#icon-rewind"></use></svg>
            <span class="skip-number">10</span>
          </button>
          <button
            class="transport-button play-button"
            type="button"
            :disabled="!isReady"
            :aria-label="player ? (player.paused ? '播放' : '暫停') : '播放'"
            @click="togglePlayback"
          >
            <svg v-if="player?.paused" class="control-icon play-icon" aria-hidden="true">
              <use href="#icon-play"></use>
            </svg>
            <svg v-else class="control-icon play-icon" aria-hidden="true"><use href="#icon-pause"></use></svg>
          </button>
          <button
            class="transport-button skip-button"
            type="button"
            :disabled="!canSeek"
            aria-label="前進十秒"
            @click="runCommand('seekBy', { numberValue: 10 })"
          >
            <span class="skip-number">10</span>
            <svg class="control-icon transport-icon" aria-hidden="true"><use href="#icon-forward"></use></svg>
          </button>
        </section>

        <section class="glass-module volume-module" aria-labelledby="volume-title">
          <div class="module-heading-line">
            <h2 id="volume-title">音量</h2>
            <strong class="volume-value">{{ Math.round(displayedVolume * 100) }}%</strong>
          </div>
          <div class="volume-control">
            <svg class="control-icon volume-icon" aria-hidden="true">
              <use :href="player?.muted ? '#icon-mute' : '#icon-volume'"></use>
            </svg>
            <input
              class="volume-slider"
              type="range"
              min="0"
              max="1"
              step="0.01"
              :value="displayedVolume"
              :style="{ '--range-progress': `${displayedVolume * 100}%` }"
              :disabled="!isReady"
              aria-label="音量"
              @input="setVolumeFromEvent"
              @change="commitVolume"
            />
          </div>
          <span class="module-footnote">拖曳調整播放音量</span>
        </section>

        <section class="quick-grid" aria-label="快速控制">
          <button
            class="quick-control"
            :class="{ active: player?.muted }"
            type="button"
            :disabled="!isReady"
            :aria-pressed="player?.muted ?? false"
            aria-label="靜音"
            @click="runCommand('setMuted', { booleanValue: !(player?.muted ?? false) })"
          >
            <svg class="control-icon quick-icon" aria-hidden="true">
              <use :href="player?.muted ? '#icon-mute' : '#icon-volume'"></use>
            </svg>
            <span class="quick-title">靜音</span>
            <span class="quick-value">{{ player?.muted ? '已開啟' : '關閉' }}</span>
          </button>
          <button
            class="quick-control"
            :class="{ active: speedMenuOpen || (player?.playbackRate ?? 1) !== 1 }"
            type="button"
            :disabled="!isReady"
            :aria-expanded="speedMenuOpen"
            aria-controls="rate-panel"
            aria-label="播放速度"
            @click="speedMenuOpen = !speedMenuOpen"
          >
            <svg class="control-icon quick-icon" aria-hidden="true"><use href="#icon-speed"></use></svg>
            <span class="quick-title">速度</span>
            <span class="quick-value">{{ formatRate(player?.playbackRate ?? 1) }}×</span>
          </button>
          <button
            class="quick-control"
            :class="{ active: player?.captionsEnabled }"
            type="button"
            :disabled="!isReady"
            :aria-pressed="player?.captionsEnabled ?? false"
            aria-label="字幕"
            @click="runCommand('toggleCaptions')"
          >
            <svg class="control-icon quick-icon" aria-hidden="true"><use href="#icon-captions"></use></svg>
            <span class="quick-title">字幕</span>
            <span class="quick-value">{{ player?.captionsEnabled ? '已開啟' : '關閉' }}</span>
          </button>
          <button
            class="quick-control"
            :class="{ active: player?.isFullscreen }"
            type="button"
            :disabled="!isReady"
            :aria-pressed="player?.isFullscreen ?? false"
            aria-label="全螢幕"
            @click="runCommand('toggleFullscreen')"
          >
            <svg class="control-icon quick-icon" aria-hidden="true"><use href="#icon-fullscreen"></use></svg>
            <span class="quick-title">全螢幕</span>
            <span class="quick-value">{{ player?.isFullscreen ? '已開啟' : '關閉' }}</span>
          </button>
          <button
            class="quick-control like-control"
            :class="{ active: player?.liked === true }"
            type="button"
            :disabled="!canLike"
            :aria-pressed="player?.liked === true"
            aria-label="按讚"
            @click="runCommand('toggleLike')"
          >
            <svg class="control-icon quick-icon" aria-hidden="true"><use href="#icon-like"></use></svg>
            <span class="quick-title">按讚</span>
            <span class="quick-value">{{ likeStatusLabel }}</span>
          </button>
        </section>

        <section class="glass-module video-menu-module" aria-labelledby="video-menu-title">
          <div class="module-heading-line">
            <div class="video-menu-heading">
              <h2 id="video-menu-title">畫面上的影片</h2>
              <span>手動選擇下一部</span>
            </div>
            <span class="video-menu-count" :aria-label="`${videoMenuItems.length} 部影片`">{{
              videoMenuItems.length
            }}</span>
          </div>
          <p class="video-menu-summary">{{ videoMenuSummary }}</p>
          <ol v-if="videoMenuItemsWithThumbnails.length > 0" class="video-menu-list">
            <li v-for="(item, index) in videoMenuItemsWithThumbnails" :key="item.url">
              <button
                class="video-menu-item"
                type="button"
                :disabled="!canNavigate"
                :title="item.title"
                @click="selectVideo(item.url)"
              >
                <span class="video-menu-thumb" aria-hidden="true">
                  <img
                    v-if="item.thumbnailUrl && !unavailableThumbnailUrls.has(item.url)"
                    class="video-menu-thumbnail"
                    :src="item.thumbnailUrl"
                    alt=""
                    loading="lazy"
                    decoding="async"
                    @error="handleThumbnailError(item.url)"
                  />
                  <span class="video-menu-index">{{ String(index + 1).padStart(2, '0') }}</span>
                </span>
                <span class="video-menu-copy">
                  <strong>{{ item.title }}</strong>
                  <small>{{ formatVideoUrl(item.url) }}</small>
                </span>
                <svg class="control-icon tiny-icon video-menu-chevron" aria-hidden="true">
                  <use href="#icon-chevron"></use>
                </svg>
              </button>
            </li>
          </ol>
          <div v-else class="video-menu-empty" role="status">
            <svg class="control-icon tiny-icon" aria-hidden="true"><use href="#icon-list"></use></svg>
            <span>目前沒有可選的其他影片，請在 YouTube 捲動或等待內容載入</span>
          </div>
        </section>

        <Transition name="panel-reveal">
          <div
            v-if="speedMenuOpen"
            id="rate-panel"
            class="glass-module rate-panel"
            role="group"
            aria-label="播放速度選擇"
          >
            <div class="rate-panel-heading">
              <h2>播放速度</h2>
              <button class="close-panel-button" type="button" @click="speedMenuOpen = false">
                關閉
                <svg class="control-icon tiny-icon" aria-hidden="true"><use href="#icon-chevron"></use></svg>
              </button>
            </div>
            <div class="rate-options">
              <button
                v-for="rate in [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]"
                :key="rate"
                class="rate-option"
                :class="{ selected: player?.playbackRate === rate }"
                type="button"
                :aria-pressed="player?.playbackRate === rate"
                @click="selectRate(rate)"
              >
                <span>{{ formatRate(rate) }}×</span>
                <svg v-if="player?.playbackRate === rate" class="control-icon tiny-icon" aria-hidden="true">
                  <use href="#icon-check"></use>
                </svg>
              </button>
            </div>
          </div>
        </Transition>

        <details class="navigation-panel glass-module">
          <summary>
            <span class="navigation-icon" aria-hidden="true">
              <svg class="control-icon"><use href="#icon-refresh"></use></svg>
            </span>
            <span class="navigation-copy">
              <strong>開啟 YouTube 影片</strong>
              <small>貼上網址切換目前控制目標</small>
            </span>
            <svg class="control-icon navigation-chevron" aria-hidden="true"><use href="#icon-chevron"></use></svg>
          </summary>
          <form class="url-form" @submit.prevent="submitNavigation">
            <label class="sr-only" for="video-url">YouTube 影片網址</label>
            <input
              id="video-url"
              v-model="urlDraft"
              type="url"
              inputmode="url"
              placeholder="貼上 YouTube 影片網址"
              autocomplete="off"
            />
            <button
              class="glass-action"
              type="submit"
              :disabled="!urlDraft.trim() || remote.state.phase !== 'connected'"
            >
              載入
            </button>
          </form>
        </details>
      </section>

      <p v-if="remote.state.errorMessage" class="status-banner status-error" role="alert">
        <svg class="control-icon tiny-icon" aria-hidden="true"><use href="#icon-alert"></use></svg>
        <span>{{ remote.state.errorMessage }}</span>
      </p>
      <p v-else-if="remote.state.phase === 'reconnecting'" class="status-banner" role="status">
        <span class="status-indicator tone-pending" aria-hidden="true"></span>
        <span>連線中斷，正在重新連線，控制項會在恢復後自動啟用</span>
      </p>
      <p v-else-if="!remote.state.status.extensionConnected" class="status-banner" role="status">
        <span class="status-indicator tone-off" aria-hidden="true"></span>
        <span>請在 Chrome 載入 Extension，Server 會等待 localhost 連線</span>
      </p>
      <p v-else-if="remote.state.status.targetStatus === 'none'" class="status-banner" role="status">
        <span class="status-indicator tone-off" aria-hidden="true"></span>
        <span>找不到 YouTube 影片分頁，請先在 Chrome 開啟影片</span>
      </p>
      <p v-else-if="remote.state.status.targetStatus === 'loading'" class="status-banner" role="status">
        <span class="status-indicator tone-pending" aria-hidden="true"></span>
        <span>影片已找到，正在等待 YouTube 載入 metadata</span>
      </p>
      <p
        v-else-if="remote.state.status.targetStatus === 'unsupported'"
        class="status-banner status-error"
        role="status"
      >
        <svg class="control-icon tiny-icon" aria-hidden="true"><use href="#icon-alert"></use></svg>
        <span>目前 YouTube 分頁不支援這項控制</span>
      </p>
    </template>
  </main>
</template>
