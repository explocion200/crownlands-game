(function (root, factory) {
  const chatApi = factory();
  if (typeof module === "object" && module.exports) module.exports = chatApi;
  if (root) root.CrownlandsChat = chatApi;
})(typeof window !== "undefined" ? window : null, function () {
  const CHAT_MESSAGE_MAX_LENGTH = 250;
  const CHAT_INITIAL_MESSAGE_LIMIT = 80;
  const CHAT_RENDER_LIMIT = 200;
  const CHAT_QUICK_MESSAGE_LIMIT = 3;
  const CHAT_BOTTOM_THRESHOLD_PX = 56;
  const CHAT_SEND_COOLDOWN_MS = 3 * 1000;
  const GLOBAL_CHAT_RETENTION_MS = 24 * 60 * 60 * 1000;

  function filterExpiredGlobalMessages(messages = [], nowMs = Date.now()) {
    return messages.filter(message => message.channel === "clan"
      || message.createdAtMs > nowMs - GLOBAL_CHAT_RETENTION_MS);
  }
  const CHAT_QUICK_MIN_READABLE_WIDTH = 160;
  const CHAT_QUICK_TWO_MESSAGE_WIDTH = 210;
  const CHAT_QUICK_THREE_MESSAGE_WIDTH = 280;
  const CHAT_MODES = Object.freeze(["closed", "quick", "full"]);
  const CHAT_CHANNELS = Object.freeze(["global", "clan"]);
  const chatTimeFormatter = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

  function nextChatMode(current = "closed", action = "toggle") {
    const mode = CHAT_MODES.includes(current) ? current : "closed";
    if (action === "close") return "closed";
    if (action === "full") return "full";
    if (action === "minimize") return "quick";
    if (action === "toggle") return mode === "closed" ? "quick" : mode === "quick" ? "closed" : "quick";
    return mode;
  }

  function normalizeMessage(raw = {}) {
    return {
      id: String(raw.id || "").slice(0, 64),
      channel: CHAT_CHANNELS.includes(raw.channel) ? raw.channel : "global",
      channelId: String(raw.channelId || "").slice(0, 128),
      senderUid: String(raw.senderUid || "").slice(0, 128),
      senderDisplayName: String(raw.senderDisplayName || "Ruler").trim().slice(0, 18) || "Ruler",
      text: String(raw.text || "").slice(0, 1000),
      createdAtMs: Math.max(0, Math.floor(Number(raw.createdAtMs) || 0)),
      status: String(raw.status || "visible").slice(0, 24),
    };
  }

  function mergeMessages(current = [], incoming = [], limit = CHAT_RENDER_LIMIT) {
    const byId = new Map();
    [...current, ...incoming].forEach(raw => {
      const message = normalizeMessage(raw);
      if (message.id && message.status === "visible") byId.set(message.id, message);
    });
    return [...byId.values()]
      .sort((left, right) => left.createdAtMs - right.createdAtMs || left.id.localeCompare(right.id))
      .slice(-Math.max(1, limit));
  }

  function isMessageListNearBottom(element) {
    if (!element) return true;
    return element.scrollHeight - element.scrollTop - element.clientHeight <= CHAT_BOTTOM_THRESHOLD_PX;
  }

  function calculateQuickPanelGeometry(options = {}) {
    const numberOr = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
    const toggleRect = options.toggleRect || {};
    const toggleLeft = numberOr(toggleRect.left, 0);
    const toggleTop = numberOr(toggleRect.top, 0);
    const toggleHeight = Math.max(0, numberOr(toggleRect.height, 0));
    const viewportWidth = Math.max(0, numberOr(options.viewportWidth, 0));
    const viewportHeight = Math.max(0, numberOr(options.viewportHeight, 0));
    const safeInset = Math.max(0, numberOr(options.safeInset, 12));
    const gap = Math.max(0, numberOr(options.gap, 9));
    const maxWidth = Math.max(0, numberOr(options.maxWidth, 360));
    const panelHeight = Math.max(0, numberOr(options.panelHeight, 64));
    const minimumReadableWidth = Math.max(0, numberOr(options.minimumReadableWidth, CHAT_QUICK_MIN_READABLE_WIDTH));
    const panelTop = Math.max(safeInset, Math.min(
      toggleTop + (toggleHeight - panelHeight) / 2,
      Math.max(safeInset, viewportHeight - panelHeight - safeInset)
    ));
    const panelBottom = panelTop + panelHeight;
    const panelRight = Math.max(safeInset, Math.min(viewportWidth - safeInset, toggleLeft - gap));
    const blockers = Array.isArray(options.blockerRects) ? options.blockerRects : [];
    const activeBlockers = blockers.map(rect => ({
      left: numberOr(rect?.left, 0),
      right: numberOr(rect?.right, 0),
      top: numberOr(rect?.top, 0),
      bottom: numberOr(rect?.bottom, 0),
    })).filter(rect => rect.right > rect.left
      && rect.bottom > rect.top
      && rect.left < panelRight
      && rect.right > safeInset
      && rect.bottom > panelTop
      && rect.top < panelBottom);
    const blockerRight = activeBlockers.length
      ? Math.max(...activeBlockers.map(rect => rect.right))
      : null;
    const safeLeft = Math.max(safeInset, blockerRight === null ? safeInset : blockerRight + gap);
    const availableWidth = Math.max(0, panelRight - safeLeft);
    const width = Math.min(maxWidth, availableWidth);
    const visible = width >= minimumReadableWidth;
    const left = visible ? panelRight - width : panelRight;
    const messageLimit = !visible ? 0
      : width >= CHAT_QUICK_THREE_MESSAGE_WIDTH ? 3
        : width >= CHAT_QUICK_TWO_MESSAGE_WIDTH ? 2 : 1;
    return Object.freeze({
      visible,
      left,
      top: panelTop,
      right: panelRight,
      width: visible ? width : 0,
      availableWidth,
      height: panelHeight,
      gap: toggleLeft - panelRight,
      messageLimit,
      blockerCount: activeBlockers.length,
      blockerRight,
    });
  }

  function chatCooldownRemainingMs(value = {}, nowMs = Date.now()) {
    const details = value?.details || value?.customData?.details || value?.data || value || {};
    const serverNowMs = Math.max(0, Math.floor(Number(details.serverNowMs) || 0));
    const cooldownUntilMs = Math.max(0, Math.floor(Number(details.cooldownUntilMs) || 0));
    const retryAfterMs = Math.max(0, Math.floor(Number(details.retryAfterMs ?? details.cooldownMs) || 0));
    const absoluteRemainingMs = cooldownUntilMs
      ? cooldownUntilMs - (serverNowMs || Math.max(0, Math.floor(Number(nowMs) || 0)))
      : 0;
    return Math.min(60_000, Math.max(0, retryAfterMs, absoluteRemainingMs));
  }

  function createChatCooldownTimer(options = {}) {
    const now = typeof options.now === "function" ? options.now : () => Date.now();
    const schedule = typeof options.setTimeout === "function" ? options.setTimeout : setTimeout;
    const cancel = typeof options.clearTimeout === "function" ? options.clearTimeout : clearTimeout;
    let cooldownUntilMs = 0;
    let timer = null;

    function remainingMs() {
      return Math.max(0, cooldownUntilMs - Math.floor(Number(now()) || 0));
    }

    function clearTimer() {
      if (timer !== null) cancel(timer);
      timer = null;
    }

    function tick() {
      timer = null;
      const remaining = remainingMs();
      if (!remaining) cooldownUntilMs = 0;
      options.onChange?.(remaining);
      if (remaining) {
        const nextBoundary = remaining % 1000 || Math.min(1000, remaining);
        timer = schedule(tick, Math.max(1, Math.min(remaining, nextBoundary)));
      }
    }

    function start(durationMs = CHAT_SEND_COOLDOWN_MS) {
      const duration = Math.max(0, Math.floor(Number(durationMs) || 0));
      clearTimer();
      cooldownUntilMs = Math.floor(Number(now()) || 0) + duration;
      tick();
      return remainingMs();
    }

    function stop() {
      clearTimer();
      cooldownUntilMs = 0;
      options.onChange?.(0);
    }

    function diagnostics() {
      return {
        cooldownRemainingMs: remainingMs(),
        cooldownTimerActive: timer !== null,
      };
    }

    return Object.freeze({ start, stop, remainingMs, diagnostics });
  }

  function createChatSubscriptionManager(handlers = {}) {
    let api = null;
    let uid = "";
    let clanId = "";
    let globalUnsubscribe = null;
    let clanUnsubscribe = null;
    let globalGeneration = 0;
    let clanGeneration = 0;

    function stopGlobal() {
      if (typeof globalUnsubscribe === "function") globalUnsubscribe();
      globalUnsubscribe = null;
    }

    function stopClan() {
      if (typeof clanUnsubscribe === "function") clanUnsubscribe();
      clanUnsubscribe = null;
    }

    function subscribeGlobal(activeGeneration) {
      if (!api?.subscribeChatMessages || !uid) return;
      globalUnsubscribe = api.subscribeChatMessages({
        channel: "global",
        limitCount: CHAT_INITIAL_MESSAGE_LIMIT,
      }, {
        onMessages: (messages, metadata) => {
          if (activeGeneration !== globalGeneration) return;
          handlers.onMessages?.("global", messages, metadata || {});
        },
        onError: error => {
          if (activeGeneration !== globalGeneration) return;
          handlers.onError?.("global", error);
        },
      });
    }

    function subscribeClan(activeGeneration) {
      if (!api?.subscribeChatMessages || !uid || !clanId) return;
      const subscribedClanId = clanId;
      clanUnsubscribe = api.subscribeChatMessages({
        channel: "clan",
        clanId: subscribedClanId,
        limitCount: CHAT_INITIAL_MESSAGE_LIMIT,
      }, {
        onMessages: (messages, metadata) => {
          if (activeGeneration !== clanGeneration || subscribedClanId !== clanId) return;
          handlers.onMessages?.("clan", messages, { ...(metadata || {}), clanId: subscribedClanId });
        },
        onError: error => {
          if (activeGeneration !== clanGeneration || subscribedClanId !== clanId) return;
          handlers.onError?.("clan", error);
        },
      });
    }

    function start(nextApi, nextUid = "", nextClanId = "") {
      const normalizedUid = String(nextUid || "").trim();
      const normalizedClanId = String(nextClanId || "").trim();
      if (api === nextApi && uid === normalizedUid && clanId === normalizedClanId && globalUnsubscribe) {
        return diagnostics();
      }
      stopGlobal();
      stopClan();
      globalGeneration += 1;
      clanGeneration += 1;
      api = nextApi || null;
      uid = normalizedUid;
      clanId = normalizedClanId;
      subscribeGlobal(globalGeneration);
      subscribeClan(clanGeneration);
      return diagnostics();
    }

    function updateClan(nextClanId = "") {
      const normalizedClanId = String(nextClanId || "").trim();
      if (normalizedClanId === clanId && (normalizedClanId ? clanUnsubscribe : !clanUnsubscribe)) {
        return diagnostics();
      }
      stopClan();
      clanGeneration += 1;
      clanId = normalizedClanId;
      subscribeClan(clanGeneration);
      return diagnostics();
    }

    function stop() {
      stopGlobal();
      stopClan();
      globalGeneration += 1;
      clanGeneration += 1;
      api = null;
      uid = "";
      clanId = "";
      return diagnostics();
    }

    function diagnostics() {
      return {
        uid,
        clanId,
        globalListeners: typeof globalUnsubscribe === "function" ? 1 : 0,
        clanListeners: typeof clanUnsubscribe === "function" ? 1 : 0,
        totalListeners: (typeof globalUnsubscribe === "function" ? 1 : 0)
          + (typeof clanUnsubscribe === "function" ? 1 : 0),
        globalGeneration,
        clanGeneration,
      };
    }

    return Object.freeze({ start, updateClan, stop, diagnostics });
  }

  function renderMessageElement(documentRef, rawMessage = {}, onSender = null) {
    const message = normalizeMessage(rawMessage);
    const article = documentRef.createElement("article");
    article.className = "chat-message";
    article.dataset.messageId = message.id;

    const line = documentRef.createElement("p");
    line.className = "chat-message-line";
    const sender = documentRef.createElement("button");
    sender.type = "button";
    sender.className = "chat-message-sender player-name-link";
    sender.textContent = message.senderDisplayName;
    sender.setAttribute("aria-label", `View ${message.senderDisplayName}'s profile`);
    if (!message.senderUid) sender.disabled = true;
    else sender.addEventListener("click", () => onSender?.(message.senderUid));
    const colon = documentRef.createElement("span");
    colon.className = "chat-message-colon";
    colon.textContent = ": ";
    const body = documentRef.createElement("span");
    body.className = "chat-message-text";
    body.textContent = message.text;
    const time = documentRef.createElement("time");
    time.dateTime = message.createdAtMs ? new Date(message.createdAtMs).toISOString() : "";
    time.textContent = message.createdAtMs
      ? chatTimeFormatter.format(message.createdAtMs)
      : "Now";
    line.append(sender, colon, body, time);
    article.append(line);
    return article;
  }

  function reconcileMessageElements(element, messages, documentRef, onSender) {
    const existing = new Map(Array.from(element.children, row => [row.dataset.messageKey, row]));
    let cursor = element.firstElementChild;
    messages.forEach(message => {
      const key = `${message.channel}:${message.channelId}:${message.id}`;
      const signature = JSON.stringify(message);
      let row = existing.get(key);
      existing.delete(key);
      if (!row || row.dataset.messageSignature !== signature) {
        const replacement = renderMessageElement(documentRef, message, onSender);
        replacement.dataset.messageKey = key;
        replacement.dataset.messageSignature = signature;
        if (row) {
          if (cursor === row) cursor = replacement;
          row.replaceWith(replacement);
        }
        row = replacement;
      }
      if (row !== cursor) element.insertBefore(row, cursor);
      cursor = row.nextElementSibling;
    });
    existing.forEach(row => row.remove());
  }

  function createController(options = {}) {
    const documentRef = options.document || (typeof document !== "undefined" ? document : null);
    const windowRef = options.window || (typeof window !== "undefined" ? window : null);
    if (!documentRef) return null;

    const elements = {
      toggle: documentRef.getElementById("chatToggleBtn"),
      unread: documentRef.getElementById("chatToggleUnread"),
      quick: documentRef.getElementById("quickChat"),
      quickMessages: documentRef.getElementById("quickChatMessages"),
      dialog: documentRef.getElementById("chatDialog"),
      close: documentRef.getElementById("chatCloseBtn"),
      minimize: documentRef.getElementById("chatMinimizeBtn"),
      list: documentRef.getElementById("chatMessageList"),
      empty: documentRef.getElementById("chatEmptyState"),
      loadOlder: documentRef.getElementById("chatLoadOlderBtn"),
      newMessages: documentRef.getElementById("chatNewMessagesBtn"),
      form: documentRef.getElementById("chatComposer"),
      input: documentRef.getElementById("chatMessageInput"),
      send: documentRef.getElementById("chatSendBtn"),
      counter: documentRef.getElementById("chatCharacterCount"),
      status: documentRef.getElementById("chatStatus"),
      tabs: [...documentRef.querySelectorAll("[data-chat-channel]")],
    };
    if (!elements.toggle || !elements.dialog || !elements.list) return null;

    let api = null;
    let uid = "";
    let clanId = "";
    let mode = "closed";
    let sessionStarted = false;
    let sessionUid = "";
    let channel = "global";
    let sending = false;
    let loadingOlder = false;
    let dialogCloseTarget = "";
    let messages = { global: [], clan: [] };
    let hasOlder = { global: true, clan: true };
    let errors = { global: "", clan: "" };
    let unread = { global: false, clan: false };
    let lastReadAtMs = { global: null, clan: null };
    let quickMessageLimit = CHAT_QUICK_MESSAGE_LIMIT;
    let quickPreviewVisible = false;
    let lastQuickGeometry = null;
    let expiryTimer = null;
    let sessionGeneration = 0;
    const chatNow = () => options.now?.() ?? api?.getServerNowMs?.() ?? Date.now();
    const scheduleTimer = options.setTimeout || windowRef?.setTimeout?.bind(windowRef);
    const cancelTimer = options.clearTimeout || windowRef?.clearTimeout?.bind(windowRef);

    function pruneGlobalMessages() {
      messages.global = filterExpiredGlobalMessages(messages.global, chatNow());
    }

    function scheduleExpiry() {
      if (expiryTimer !== null) cancelTimer?.(expiryTimer);
      expiryTimer = null;
      pruneGlobalMessages();
      if (!uid || !messages.global.length || !scheduleTimer) return;
      const expiresAt = Math.min(...messages.global.map(message => message.createdAtMs + GLOBAL_CHAT_RETENTION_MS));
      expiryTimer = scheduleTimer(() => {
        expiryTimer = null;
        pruneGlobalMessages();
        renderQuick();
        if (channel === "global") renderMessages();
        unread.global = latestMessageAtMs("global") > (Number(lastReadAtMs.global) || 0);
        renderUnread();
        scheduleExpiry();
      }, Math.max(1, Math.ceil(expiresAt - chatNow())));
    }

    const cooldown = createChatCooldownTimer({
      now: typeof options.now === "function" ? options.now : () => Date.now(),
      setTimeout: options.setTimeout || windowRef?.setTimeout?.bind(windowRef),
      clearTimeout: options.clearTimeout || windowRef?.clearTimeout?.bind(windowRef),
      onChange: remainingMs => {
        if (elements.status?.dataset?.tone === "cooldown") {
          if (remainingMs) setStatus(`Wait ${Math.max(1, Math.ceil(remainingMs / 1000))}s`, "cooldown");
          else setStatus("");
        }
        renderComposer();
      },
    });

    const subscriptions = createChatSubscriptionManager({
      onMessages: handleMessages,
      onError: handleSubscriptionError,
    });

    function storageKey(targetChannel) {
      const realm = windowRef?.CROWNLANDS_REALM_CONFIG || {};
      const realmKey = String(realm.resetGeneration || realm.worldId || "current");
      const channelKey = targetChannel === "clan" ? `clan:${clanId || "none"}` : "global";
      return `crownlands-chat-last-read:${realmKey}:${uid}:${channelKey}`;
    }

    function loadLastRead(targetChannel) {
      if (!uid || (targetChannel === "clan" && !clanId)) return null;
      try {
        const stored = Number(windowRef?.localStorage?.getItem(storageKey(targetChannel)));
        return Number.isFinite(stored) && stored > 0 ? stored : null;
      } catch (_error) {
        return null;
      }
    }

    function saveLastRead(targetChannel, value) {
      try {
        windowRef?.localStorage?.setItem(storageKey(targetChannel), String(value));
      } catch (_error) {
        // Unread state intentionally remains session-local when storage is unavailable.
      }
    }

    function latestMessageAtMs(targetChannel) {
      return messages[targetChannel].at(-1)?.createdAtMs || 0;
    }

    function markRead(targetChannel, throughMs = latestMessageAtMs(targetChannel)) {
      const nextReadAtMs = Math.max(Number(lastReadAtMs[targetChannel]) || 0, Number(throughMs) || 0, Date.now());
      lastReadAtMs[targetChannel] = nextReadAtMs;
      unread[targetChannel] = false;
      saveLastRead(targetChannel, nextReadAtMs);
      renderUnread();
    }

    function handleMessages(targetChannel, incoming, metadata = {}) {
      const wasAtBottom = targetChannel === channel && isMessageListNearBottom(elements.list);
      messages[targetChannel] = mergeMessages(messages[targetChannel], incoming);
      pruneGlobalMessages();
      scheduleExpiry();
      const removedIds = new Set((metadata.changes || [])
        .filter(change => change?.type === "removed")
        .map(change => String(change?.message?.id || ""))
        .filter(Boolean));
      if (removedIds.size) {
        messages[targetChannel] = messages[targetChannel].filter(message => !removedIds.has(message.id));
      }
      if (metadata.initial) hasOlder[targetChannel] = metadata.hasMore !== false;
      errors[targetChannel] = "";
      const latestAtMs = latestMessageAtMs(targetChannel);
      if (metadata.initial && lastReadAtMs[targetChannel] === null) {
        lastReadAtMs[targetChannel] = loadLastRead(targetChannel);
        if (lastReadAtMs[targetChannel] === null) markRead(targetChannel, latestAtMs);
      }
      const hasUnread = latestAtMs > (Number(lastReadAtMs[targetChannel]) || 0);
      if (mode === "full" && targetChannel === channel && wasAtBottom) {
        markRead(targetChannel, latestAtMs);
      } else if (hasUnread) {
        unread[targetChannel] = true;
      }
      renderUnread();
      renderQuick();
      if (mode === "full" && targetChannel === channel) {
        renderMessages({ scrollToBottom: wasAtBottom });
        if (!wasAtBottom && hasUnread) elements.newMessages.hidden = false;
      }
    }

    function handleSubscriptionError(targetChannel, error) {
      errors[targetChannel] = targetChannel === "clan"
        ? "Clan Chat access changed or could not be verified."
        : "Global Chat is reconnecting.";
      options.onRealtimeError?.(error, targetChannel);
      if (mode === "full" && channel === targetChannel) renderMessages();
    }

    function setMode(nextMode) {
      const normalizedMode = CHAT_MODES.includes(nextMode) ? nextMode : "closed";
      mode = normalizedMode;
      elements.quick.hidden = mode !== "quick";
      elements.toggle.classList.toggle("is-expanded", mode !== "closed");
      elements.toggle.setAttribute("aria-expanded", String(mode !== "closed"));
      elements.toggle.setAttribute("aria-label", mode === "closed" ? "Open chat" : "Collapse chat");
      if (mode === "full") {
        if (!elements.dialog.open) elements.dialog.showModal();
        selectChannel(channel, { focus: false, forceBottom: true });
      } else if (elements.dialog.open) {
        dialogCloseTarget = mode;
        elements.dialog.close();
      }
      if (mode === "quick") {
        positionQuickPanel();
        renderQuick();
      }
    }

    function updateMode(action) {
      setMode(nextChatMode(mode, action));
    }

    function selectChannel(nextChannel, { focus = true, forceBottom = false } = {}) {
      channel = CHAT_CHANNELS.includes(nextChannel) ? nextChannel : "global";
      elements.tabs.forEach(tab => {
        const selected = tab.dataset.chatChannel === channel;
        tab.classList.toggle("active", selected);
        tab.setAttribute("aria-selected", String(selected));
        tab.tabIndex = selected ? 0 : -1;
        if (focus && selected) tab.focus();
      });
      renderMessages({ scrollToBottom: forceBottom });
      renderComposer();
      renderQuick();
      if (mode === "full") markRead(channel);
    }

    function renderUnread() {
      const anyUnread = unread.global || unread.clan;
      elements.unread.hidden = !anyUnread;
      elements.tabs.forEach(tab => {
        const indicator = tab.querySelector(".chat-tab-unread");
        if (indicator) indicator.hidden = !unread[tab.dataset.chatChannel];
      });
    }

    function renderQuick() {
      pruneGlobalMessages();
      if (!elements.quickMessages || mode !== "quick") return;
      const current = messages[channel].slice(-quickMessageLimit);
      const signature = JSON.stringify([channel, clanId, current]);
      if (elements.quickMessages.dataset.messageSignature === signature) return;
      elements.quickMessages.dataset.messageSignature = signature;
      elements.quickMessages.replaceChildren();
      if (!current.length) {
        const empty = documentRef.createElement("span");
        empty.className = "quick-chat-empty";
        empty.textContent = channel === "clan" && !clanId
          ? "You are not currently in a clan."
          : `No ${channel === "clan" ? "clan" : "global"} messages yet.`;
        elements.quickMessages.append(empty);
        return;
      }
      current.forEach(raw => {
        const message = normalizeMessage(raw);
        const row = documentRef.createElement("p");
        const name = documentRef.createElement("strong");
        name.textContent = `${message.senderDisplayName}:`;
        const text = documentRef.createElement("span");
        text.textContent = message.text;
        row.append(name, documentRef.createTextNode(" "), text);
        elements.quickMessages.append(row);
      });
    }

    function renderMessages({ scrollToBottom = false, preserveFromTop = false } = {}) {
      pruneGlobalMessages();
      if (mode !== "full") return;
      const priorHeight = elements.list.scrollHeight;
      const priorTop = elements.list.scrollTop;
      const anchor = !scrollToBottom && Array.from(elements.list.children)
        .find(row => row.offsetTop + row.offsetHeight > priorTop);
      const anchorOffset = anchor ? anchor.offsetTop - priorTop : 0;
      const current = messages[channel];
      const noClan = channel === "clan" && !clanId;
      const error = errors[channel];
      elements.empty.hidden = Boolean(current.length);
      elements.empty.textContent = error || (noClan
        ? "You are not currently in a clan."
        : `No ${channel === "clan" ? "clan" : "global"} messages yet. Begin the chronicle.`);
      reconcileMessageElements(elements.list, current, documentRef, senderUid => {
        windowRef?.dispatchEvent?.(new windowRef.CustomEvent("crownlands:chat-player-profile", {
          detail: { uid: senderUid },
        }));
      });
      if (scrollToBottom) elements.list.scrollTop = elements.list.scrollHeight;
      else if (anchor?.isConnected) elements.list.scrollTop = anchor.offsetTop - anchorOffset;
      else if (preserveFromTop) elements.list.scrollTop = priorTop + elements.list.scrollHeight - priorHeight;
      elements.newMessages.hidden = true;
      elements.loadOlder.hidden = noClan
        || !current.length
        || !hasOlder[channel]
        || current.length >= CHAT_RENDER_LIMIT;
      elements.loadOlder.disabled = loadingOlder;
      elements.loadOlder.textContent = loadingOlder ? "Loading..." : "Load older messages";
    }

    function renderComposer() {
      const noClan = channel === "clan" && !clanId;
      const text = String(elements.input?.value || "");
      const length = Array.from(text).length;
      const cooldownRemainingMs = cooldown.remainingMs();
      elements.input.disabled = noClan || sending;
      elements.input.placeholder = noClan ? "Join a clan to use Clan Chat" : "Enter your message...";
      elements.send.disabled = noClan || sending || cooldownRemainingMs > 0 || !text.trim() || length > CHAT_MESSAGE_MAX_LENGTH;
      elements.send.textContent = sending
        ? "Sending..."
        : cooldownRemainingMs > 0 ? `Send (${Math.max(1, Math.ceil(cooldownRemainingMs / 1000))})` : "Send";
      elements.counter.textContent = `${length}/${CHAT_MESSAGE_MAX_LENGTH}`;
      elements.counter.classList.toggle("over-limit", length > CHAT_MESSAGE_MAX_LENGTH);
    }

    function setStatus(message = "", tone = "") {
      elements.status.textContent = String(message || "");
      elements.status.dataset.tone = tone;
      elements.status.hidden = !message;
    }

    function createRequestId() {
      if (windowRef?.crypto?.randomUUID) return windowRef.crypto.randomUUID();
      return `chat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
    }

    async function sendCurrentMessage() {
      if (sending || cooldown.remainingMs() > 0 || !api?.sendChatMessage || !uid) return false;
      const text = String(elements.input.value || "").trim();
      if (!text || Array.from(text).length > CHAT_MESSAGE_MAX_LENGTH) {
        renderComposer();
        return false;
      }
      if (channel === "clan" && !clanId) return false;
      sending = true;
      setStatus("");
      renderComposer();
      try {
        const result = await api.sendChatMessage({ channel, text, requestId: createRequestId() });
        elements.input.value = "";
        cooldown.start(chatCooldownRemainingMs(result) || CHAT_SEND_COOLDOWN_MS);
        renderComposer();
        return true;
      } catch (error) {
        const retryAfterMs = chatCooldownRemainingMs(error);
        if (retryAfterMs > 0) {
          cooldown.start(retryAfterMs);
          setStatus(`Wait ${Math.max(1, Math.ceil(retryAfterMs / 1000))}s`, "cooldown");
          return false;
        }
        const message = String(error?.message || "Chat message could not be sent.")
          .replace(/^Firebase:\s*/i, "")
          .replace(/^\[[^\]]+\]\s*/, "");
        setStatus(message, "error");
        options.onToast?.(message);
        return false;
      } finally {
        sending = false;
        renderComposer();
        elements.input.focus();
      }
    }

    async function loadOlder() {
      if (loadingOlder || !api?.loadOlderChatMessages || !messages[channel].length) return;
      const requestedLimit = Math.min(50, CHAT_RENDER_LIMIT - messages[channel].length);
      if (requestedLimit <= 0) {
        hasOlder[channel] = false;
        renderMessages();
        return;
      }
      loadingOlder = true;
      const requestedChannel = channel;
      const requestedClanId = clanId;
      const requestedGeneration = sessionGeneration;
      elements.loadOlder.disabled = true;
      elements.loadOlder.textContent = "Loading...";
      let preserveFromTop = false;
      try {
        const older = await api.loadOlderChatMessages({
          channel,
          clanId: channel === "clan" ? clanId : "",
          beforeCreatedAtMs: messages[channel][0].createdAtMs,
          limitCount: requestedLimit,
        });
        if (requestedGeneration !== sessionGeneration || requestedClanId !== clanId) return;
        messages[requestedChannel] = mergeMessages(older, messages[requestedChannel]);
        pruneGlobalMessages();
        scheduleExpiry();
        preserveFromTop = older.length > 0;
        if (older.length < requestedLimit || messages[requestedChannel].length >= CHAT_RENDER_LIMIT) {
          hasOlder[requestedChannel] = false;
        }
        if (!older.length) setStatus("No older messages remain.");
      } catch (error) {
        setStatus(error?.message || "Older messages could not be loaded.", "error");
      } finally {
        loadingOlder = false;
        renderMessages({ preserveFromTop });
      }
    }

    function positionQuickPanel() {
      if (!windowRef || mode !== "quick") return;
      const toggleRect = elements.toggle.getBoundingClientRect();
      const viewportWidth = windowRef.innerWidth || documentRef.documentElement.clientWidth || 0;
      const viewportHeight = windowRef.innerHeight || documentRef.documentElement.clientHeight || 0;
      const blockerSelectors = options.quickCollisionSelectors || [".bottom-nav", "[data-chat-quick-blocker]"];
      const blockerElements = [...new Set(blockerSelectors.flatMap(selector => (
        [...documentRef.querySelectorAll(selector)]
      )))];
      const blockerRects = blockerElements.filter(element => {
        if (element === elements.quick || element.hidden || element.closest?.("[hidden]")) return false;
        const style = windowRef.getComputedStyle?.(element);
        return !style || (style.display !== "none" && style.visibility !== "hidden");
      }).map(element => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
      });
      const geometry = calculateQuickPanelGeometry({
        toggleRect,
        viewportWidth,
        viewportHeight,
        panelHeight: 64,
        blockerRects,
      });
      lastQuickGeometry = geometry;
      quickPreviewVisible = geometry.visible;
      const nextMessageLimit = geometry.messageLimit || CHAT_QUICK_MESSAGE_LIMIT;
      const messageLimitChanged = nextMessageLimit !== quickMessageLimit;
      quickMessageLimit = nextMessageLimit;
      elements.quick.hidden = !geometry.visible;
      elements.quick.dataset.collisionSuppressed = String(!geometry.visible);
      elements.quick.dataset.messageLimit = String(geometry.messageLimit);
      if (!geometry.visible) {
        if (messageLimitChanged) renderQuick();
        return;
      }
      elements.quick.style.width = `${geometry.width}px`;
      elements.quick.style.left = `${geometry.left}px`;
      elements.quick.style.top = `${geometry.top}px`;
      elements.quick.style.right = "auto";
      elements.quick.style.bottom = "auto";
      if (messageLimitChanged) renderQuick();
    }

    function start(context = {}) {
      const nextApi = context.api || api;
      const nextUid = String(context.uid || "").trim();
      const nextClanId = String(context.clanId || "").trim();
      if (!nextApi || !nextUid) {
        dispose();
        return diagnostics();
      }
      const accountChanged = nextUid !== uid;
      const freshSession = !sessionStarted || nextUid !== sessionUid;
      api = nextApi;
      uid = nextUid;
      clanId = nextClanId;
      if (accountChanged) {
        sessionGeneration += 1;
        cooldown.stop();
        messages = { global: [], clan: [] };
        hasOlder = { global: true, clan: true };
        errors = { global: "", clan: "" };
        unread = { global: false, clan: false };
        lastReadAtMs = { global: loadLastRead("global"), clan: loadLastRead("clan") };
      }
      if (freshSession) {
        sessionStarted = true;
        sessionUid = nextUid;
        setMode("quick");
      }
      subscriptions.start(api, uid, clanId);
      scheduleExpiry();
      renderUnread();
      renderQuick();
      renderComposer();
      return diagnostics();
    }

    function updateClan(nextClanId = "") {
      const normalizedClanId = String(nextClanId || "").trim();
      if (normalizedClanId === clanId) return diagnostics();
      clanId = normalizedClanId;
      messages.clan = [];
      hasOlder.clan = true;
      errors.clan = "";
      unread.clan = false;
      lastReadAtMs.clan = loadLastRead("clan");
      subscriptions.updateClan(clanId);
      if (channel === "clan") {
        renderMessages({ scrollToBottom: true });
        renderComposer();
      }
      renderQuick();
      renderUnread();
      return diagnostics();
    }

    function dispose(options = {}) {
      sessionGeneration += 1;
      if (expiryTimer !== null) cancelTimer?.(expiryTimer);
      expiryTimer = null;
      const resetSession = options.resetSession === true;
      cooldown.stop();
      subscriptions.stop();
      api = null;
      uid = "";
      clanId = "";
      messages = { global: [], clan: [] };
      elements.list.replaceChildren();
      elements.quickMessages.replaceChildren();
      delete elements.quickMessages.dataset.messageSignature;
      hasOlder = { global: true, clan: true };
      errors = { global: "", clan: "" };
      unread = { global: false, clan: false };
      lastReadAtMs = { global: null, clan: null };
      if (resetSession) {
        sessionStarted = false;
        sessionUid = "";
        setMode("closed");
      }
      renderUnread();
      renderQuick();
      renderMessages();
      return diagnostics();
    }

    function diagnostics() {
      return {
        mode,
        channel,
        uid,
        clanId,
        sessionStarted,
        sessionUid,
        renderedMessages: messages[channel].length,
        unread: { ...unread },
        quickPreviewVisible,
        quickMessageLimit: quickPreviewVisible ? quickMessageLimit : 0,
        quickAvailableWidth: lastQuickGeometry?.availableWidth || 0,
        quickBlockerCount: lastQuickGeometry?.blockerCount || 0,
        quickCollisionEventListeners: windowRef ? 3 : 0,
        quickCollisionObservers: 0,
        ...cooldown.diagnostics(),
        ...subscriptions.diagnostics(),
      };
    }

    elements.toggle.addEventListener("click", () => updateMode("toggle"));
    elements.quick.addEventListener("click", event => {
      if (event.target.closest("button, a")) return;
      updateMode("full");
    });
    elements.quick.addEventListener("keydown", event => {
      if (["Enter", " "].includes(event.key)) {
        event.preventDefault();
        updateMode("full");
      }
    });
    elements.close.addEventListener("click", () => updateMode("close"));
    elements.minimize.addEventListener("click", () => updateMode("minimize"));
    elements.dialog.addEventListener("click", event => {
      if (event.target === elements.dialog) updateMode("close");
    });
    elements.dialog.addEventListener("close", () => {
      const target = dialogCloseTarget || "closed";
      dialogCloseTarget = "";
      mode = target;
      elements.quick.hidden = mode !== "quick";
      elements.toggle.classList.toggle("is-expanded", mode !== "closed");
      elements.toggle.setAttribute("aria-expanded", String(mode !== "closed"));
      elements.toggle.setAttribute("aria-label", mode === "closed" ? "Open chat" : "Collapse chat");
      if (mode === "quick") positionQuickPanel();
    });
    elements.tabs.forEach(tab => tab.addEventListener("click", () => selectChannel(tab.dataset.chatChannel)));
    elements.form.addEventListener("submit", event => {
      event.preventDefault();
      sendCurrentMessage();
    });
    elements.input.addEventListener("input", renderComposer);
    elements.input.addEventListener("keydown", event => {
      if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        sendCurrentMessage();
      }
    });
    elements.list.addEventListener("scroll", () => {
      if (mode === "full" && isMessageListNearBottom(elements.list)) {
        markRead(channel);
        elements.newMessages.hidden = true;
      }
    }, { passive: true });
    elements.newMessages.addEventListener("click", () => {
      elements.list.scrollTop = elements.list.scrollHeight;
      markRead(channel);
      elements.newMessages.hidden = true;
    });
    elements.loadOlder.addEventListener("click", loadOlder);
    windowRef?.addEventListener?.("resize", positionQuickPanel);
    function refreshExpiry() {
      scheduleExpiry();
      renderQuick();
      renderMessages();
    }
    windowRef?.addEventListener?.("focus", refreshExpiry);
    windowRef?.addEventListener?.("crownlands:server-clock-updated", refreshExpiry);
    windowRef?.addEventListener?.("crownlands:ui-layout-applied", positionQuickPanel);
    windowRef?.addEventListener?.("crownlands:hud-occupancy-changed", positionQuickPanel);

    setMode("closed");
    selectChannel("global", { focus: false });
    renderUnread();
    renderComposer();
    return Object.freeze({ start, updateClan, dispose, diagnostics, setMode, selectChannel });
  }

  let singleton = null;
  function init(options = {}) {
    if (!singleton) singleton = createController(options);
    return singleton;
  }

  return Object.freeze({
    CHAT_MESSAGE_MAX_LENGTH,
    CHAT_INITIAL_MESSAGE_LIMIT,
    CHAT_RENDER_LIMIT,
    CHAT_SEND_COOLDOWN_MS,
    GLOBAL_CHAT_RETENTION_MS,
    filterExpiredGlobalMessages,
    CHAT_QUICK_MIN_READABLE_WIDTH,
    CHAT_MODES,
    CHAT_CHANNELS,
    nextChatMode,
    normalizeMessage,
    mergeMessages,
    isMessageListNearBottom,
    calculateQuickPanelGeometry,
    chatCooldownRemainingMs,
    createChatCooldownTimer,
    createChatSubscriptionManager,
    renderMessageElement,
    createController,
    init,
    start: context => init()?.start(context),
    updateClan: clanId => init()?.updateClan(clanId),
    dispose: () => singleton?.dispose(),
    diagnostics: () => singleton?.diagnostics() || null,
  });
});
