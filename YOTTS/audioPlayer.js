// Simple audio-based voice player with optional TTS fallback.
// 音檔放在 /audio 資料夾，例如：
// /audio/prayer_start.mp3, /audio/down_dog_correction.mp3, /audio/encourage_good.mp3

(function (global) {
  // GitHub Pages 會把網站掛在 /<repo>/ 下，若用 "/audio/" 會變成根網域 /audio/ 造成 404。
  // 這裡改成「以 audioPlayer.js 自己的載入位置為基準」去找同層的 /audio/ 資料夾：
  // e.g. https://user.github.io/repo/audioPlayer.js → https://user.github.io/repo/audio/
  const SCRIPT_URL = (() => {
    const cs = document.currentScript && document.currentScript.src ? document.currentScript.src : "";
    if (cs) return cs;
    try {
      const scripts = Array.from(document.scripts || []);
      const hit = scripts
        .map((s) => (s && typeof s.src === "string" ? s.src : ""))
        .find((src) => /audioPlayer\.js(\?|#|$)/.test(src));
      if (hit) return hit;
    } catch (_) {}
    return new URL("audioPlayer.js", document.baseURI).toString();
  })();
  const BASE_URL = new URL("./audio/", SCRIPT_URL).toString();

  /**
   * 將語音 key 對應到實際音檔檔名。
   * 之後你只要補齊對應的 mp3/wav 檔案即可。
   */
  const VOICE_MAP = {
    // 登入／引導
    login_sign_intro: "sign.mp3",//註冊
    login_button_intro: "welcome.mp3",//歡迎來到tacto yoga
    login_one_intro: "one.mp3",//步驟1
    login_two_intro: "two.mp3",//步驟2
    login_three_intro: "three.mp3",//步驟3
    login_name_intro: "name.mp3",//我聽到的暱稱是
    login_reconf_intro: "retryconfirm.mp3",//正確請說確認；重來請說重來
    login_tall_intro: "tall.mp3",//身高
    login_kg_intro: "kg.mp3",//體重
    login_signok_intro: "signok.mp3",//註冊完成為你登入
    login_comein_intro: "comein.mp3",//請說開始課前準備然後等待回復
    login_okone_intro: "okone.mp3",//已確認，稍等，準備進入下一步
    login_retryone_intro: "retryone.mp3",//好的我們重來
    login_reco_intro: "reco.mp3",//需要回答確認或重來
    login_deletenono_intro: "deletenono.mp3",//刪除失敗
    login_deletename_intro: "deletename.mp3",//刪除帳號暱稱
    login_deleteok_intro: "deleteok.mp3",//已刪除帳號
    login_listen_intro: "listen.mp3",//我聽到的是
    login_wherename_intro: "wherename.mp3",//找不到相符暱稱
    login_nosign_intro: "nosign.mp3",//找不到該帳號
    login_nolistenname_intro: "nolistenname.mp3",//未聽清楚刪除帳號暱稱
    login_talkname_intro: "talkname.mp3",//說出暱稱登入
    login_talkwait_intro: "talkwait.mp3",//說完請等待回覆
    login_classprepare_intro: "classprepare.mp3",//課前準備(開始)
    login_lastpractise_intro: "lastpractise.mp3",//上次練習到
    login_finishnext_intro: "finishnext.mp3",//完成下一步
    login_startone_intro: "startone.mp3",//課前步驟1
    login_starttwo_intro: "starttwo.mp3",//課前步驟2
    login_startthree_intro: "startthree.mp3",//課前步驟3
    login_welcomeback_intro: "welcomeback.mp3",//歡迎回來
    login_startprepare_intro: "startprepare.mp3",//開始課前準備

    // 進度（NEW）
    progress_1: "oneaa.mp3",
    progress_2: "onebb.mp3",

    //課前步驟
    lesson_top:"lesson_top.mp3",//進入課程前的講述概要111111
    yogaa_script:"yogaa.mp3",//瑜珈墊鋪好
    yogab_script:"yogab.mp3",//放置輔助產品
    yogac_script:"yogac.mp3",//調整姿勢

    camera_1:"camer.mp3",//鏡頭開啟

    //拜日式各步驟
    prayer_1_guide: "prayer_start1.mp3",//祈禱式
    prayer_0111_guide: "011110.mp3",
    prayer_011_guide: "011.mp3",

    wang1_guide: "wang1.mp3",//前彎向下
    wang1_0222_guide: "02229.mp3",
    wang1_022_guide: "022.mp3",

    spine_guide: "spine.mp3",//脊椎延伸
    spine_0333_guide: "0333.mp3",
    spine_033_guide: "033.mp3",

    step_back_guide: "step_back.mp3",//腳往後踩
    step_0444_guide: "0444.mp3",
    step_044_guide: "044.mp3",

    down_dog_1_guide: "down_dog1.mp3",//下犬式
    down_dog_0555_guide: "0555.mp3",
    down_dog_055_guide: "055.mp3",

    plank_guide: "plank.mp3",//平板式
    plank_0666_guide: "0666.mp3",
    plank_066_guide: "066.mp3",

    snake_guide: "snake.mp3",//眼鏡蛇式
    snake_0777_guide: "0777.mp3",
    snake_077_guide: "077.mp3",

    down_dog_2_guide: "down_dog2.mp3",//下犬式
    down_dog_0888_guide: "0888.mp3",
    down_dog_088_guide: "088.mp3",

    wang2_guide: "wang2.mp3",//前彎向下
    wang2_0999_guide: "0999.mp3",
    wang2_099_guide: "099.mp3",

    prayer_2_guide: "prayer_start2.mp3",//祈禱式
    prayer_11110_guide: "11110.mp3",
    prayer_1010_guide: "END2.mp3",

    // 可以在此持續擴充：例如
    // "prayer_1_prompt": "prayer_prompt.mp3",
    // "prayer_1_success": "prayer_success.mp3",
    // "sun_salutation_complete": "sun_salutation_complete.mp3",
  };

  const audioCache = {};
  let currentAudio = null;
  let audioUnlocked = false;
  let status = "idle"; // "idle" | "initializing" | "ready"

  // mode = 'audio'：使用音檔；mode = 'tts'：只用瀏覽器 TTS（備援或開發用）
  let mode = "audio";

  // iOS/平板端保活：使用極短 Base64 靜音軌，每 2 秒撥弄一次喇叭
  let heartbeatTimer = null;
  const HEARTBEAT_SRC = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";

  function startHeartbeat() {
    if (heartbeatTimer) return;
    try {
      const silent = new Audio(HEARTBEAT_SRC);
      heartbeatTimer = global.setInterval(() => {
        silent.currentTime = 0;
        silent.play().catch(() => {});
      }, 2000);
    } catch (_) {}
  }

  function stopHeartbeat() {
    if (!heartbeatTimer) return;
    try {
      global.clearInterval(heartbeatTimer);
    } catch (_) {}
    heartbeatTimer = null;
  }

  function resolveUrl(key) {
    const file = VOICE_MAP[key];
    if (!file) return null;
    return new URL(file, BASE_URL).toString();
  }

  function preload(key) {
    const url = resolveUrl(key);
    if (!url) return null;
    if (audioCache[key]) return audioCache[key];
    const audio = new Audio(url);
    // 效能優化：不要全域預載，且在平板端減少初始頻寬佔用
    audio.preload = "none";
    audioCache[key] = audio;
    return audio;
  }

  function stopAll() {
    if (currentAudio) {
      try {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      } catch (_) {}
      currentAudio = null;
    }
    // 同時也把 TTS 取消，避免混音
    try {
      if (global.speechSynthesis) {
        global.speechSynthesis.cancel();
      }
    } catch (_) {}
  }

  function speakTTS(text) {
    if (!("speechSynthesis" in global) || !text) {
      return Promise.resolve();
    }

    global.speechSynthesis.cancel();

    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "zh-TW";
      u.rate = 0.9;
      u.pitch = 1.0;
      u.volume = 1.0;
      u.onend = resolve;
      u.onerror = resolve;
      global.speechSynthesis.speak(u);
    });
  }

  /**
   * NEW: 解鎖行動裝置自動播放限制（iOS/Android）
   * - 請在「使用者點擊按鈕」事件中呼叫一次 unlockAudio()
   */
  async function unlockAudio() {
    if (audioUnlocked) return true;
    try {
      const AudioCtx = global.AudioContext || global.webkitAudioContext;
      if (!AudioCtx) return false;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.0;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(0);
      osc.stop(0.01);
      if (ctx.state === "suspended") await ctx.resume();
      audioUnlocked = true;
      // 解鎖成功後即可啟動保活
      startHeartbeat();
      return true;
    } catch (_) {
      return false;
    }
  }

  function setStatus(next) {
    if (next !== "idle" && next !== "initializing" && next !== "ready") return;
    if (status === next) return;
    status = next;
    if (next === "initializing") {
      void speakTTS("系統正在啟動，請稍候");
    } else if (next === "ready") {
      void speakTTS("系統已就緒");
    }
  }

  function pickRandom(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // NEW: 播放佇列（避免 guide 被 prompt 中斷；確保一次只播一段）
  let playbackChain = Promise.resolve();
  function enqueuePlayback(task) {
    playbackChain = playbackChain.then(task, task);
    return playbackChain;
  }

  function waitForEndedOrError(audio) {
    return new Promise((resolve) => {
      const done = () => {
        audio.removeEventListener("ended", done);
        audio.removeEventListener("error", done);
        resolve();
      };
      audio.addEventListener("ended", done);
      audio.addEventListener("error", done);
    });
  }

  /**
   * 統一入口：播放音檔（mp3/wav）或 fallback TTS。
   * - audioKey: string | null（例："prayer_1_prompt"）
   * - audioKeys: string[] | null（隨機播放其中一個）
   * - text: fallback TTS 文字（沒有音檔、或音檔播放失敗時使用）
   */
  async function playAudio({ audioKey, audioKeys, text, interrupt = false } = {}) {
    // 預設不 interrupt（避免導引語被短提示掐斷）；透過 queue 保證不重疊
    return enqueuePlayback(async () => {
      const key = audioKey || pickRandom(audioKeys);

      if (key) {
        return await playVoice(key, { interrupt, fallbackText: text });
      }

      if (interrupt) stopAll();
      return await speakTTS(text);
    });
  }

  /**
   * 播放指定 key 的語音。
   * - 會在播放前先停止上一段，避免重疊。
   * - 若找不到對應音檔，且提供 fallbackText，則使用 TTS 當備援。
   */
  // NEW: Never Silent 版本（永遠 resolve；1.5 秒保險絲 + 自動 TTS 備援）
  function playVoice(key, options = {}) {
    const { interrupt = true, fallbackText } = options;
    const ttsText = fallbackText || key;

    if (interrupt) stopAll();

    if (mode === "tts") {
      return speakTTS(ttsText);
    }

    return new Promise((resolve) => {
      const audio = preload(key);

      // 事先建立 1.5 秒保險絲：不論任何原因，只要音檔沒成功走完，就改走 TTS 並 resolve
      const safetyTimer = global.setTimeout(() => {
        console.warn("audioPlayer: 音訊超時，強制改用 TTS", key);
        speakTTS(ttsText).then(resolve);
      }, 1500);

      if (!audio) {
        global.clearTimeout(safetyTimer);
        speakTTS(ttsText).then(resolve);
        return;
      }

      currentAudio = audio;

      const cleanupAndResolve = (fn) => {
        return () => {
          global.clearTimeout(safetyTimer);
          if (currentAudio === audio) {
            currentAudio = null;
          }
          fn && fn();
          resolve();
        };
      };

      audio.onended = cleanupAndResolve(null);
      audio.onerror = () => {
        global.clearTimeout(safetyTimer);
        if (currentAudio === audio) currentAudio = null;
        speakTTS(ttsText).then(resolve);
      };

      try {
        audio.load();
      } catch (_) {}

      try {
        const playPromise = audio.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(() => {
            global.clearTimeout(safetyTimer);
            if (currentAudio === audio) currentAudio = null;
            speakTTS(ttsText).then(resolve);
          });
        }
      } catch (_) {
        global.clearTimeout(safetyTimer);
        if (currentAudio === audio) currentAudio = null;
        speakTTS(ttsText).then(resolve);
      }
    });
  }

  function setMode(newMode) {
    if (newMode === "audio" || newMode === "tts") {
      mode = newMode;
    }
  }

  function getMode() {
    return mode;
  }

  global.audioPlayer = {
    playVoice,
    playAudio,
    stopAll,
    setMode,
    getMode,
    unlockAudio,
    setStatus,
    startHeartbeat,
    stopHeartbeat,
  };

  // 方便直接呼叫：playVoice("prayer_start")
  global.playVoice = playVoice;
  // 方便直接呼叫：playAudio({ audioKey: "prayer_1_prompt", text: "..." })
  global.playAudio = playAudio;
})(window);


