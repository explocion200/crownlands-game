(function () {
  "use strict";

  const STORAGE_KEY = "crownlands.animation.mode.v1";
  const LEGACY_STORAGE_KEY = "crownlands-animation-mode";
  const MODE_PREFERENCES = Object.freeze(["auto", "full", "reduced", "off"]);
  const EFFECT_TYPES = Object.freeze([
    "city-attack",
    "city-capture",
    "city-upgrade",
    "reward-gold",
    "reward-troops",
    "camp-gold",
    "camp-warband",
    "camp-relic",
    "camp-deed",
    "deed-completed",
  ]);
  const EFFECT_ALIASES = Object.freeze({
    "gold-reward": "reward-gold",
    "troop-reward": "reward-troops",
    "gold-camp-capture": "camp-gold",
    "camp-gold-capture": "camp-gold",
    "warband-camp-capture": "camp-warband",
    "camp-warband-capture": "camp-warband",
    "relic-camp-capture": "camp-relic",
    "camp-relic-capture": "camp-relic",
    "deed-camp-capture": "camp-deed",
    "camp-deed-capture": "camp-deed",
    "deed-reward-complete": "deed-completed",
    "deed-reward-completed": "deed-completed",
    "deed-hold-active": "camp-deed",
  });
  const EFFECT_DEFINITIONS = Object.freeze({
    "city-attack": Object.freeze({
      scope: "world",
      intensity: "standard",
      duration: 650,
      reducedDuration: 360,
      particles: 5,
      reducedParticles: 1,
      maxParticles: 7,
      builder: "buildCityAttack",
    }),
    "city-capture": Object.freeze({
      scope: "world",
      intensity: "major",
      duration: 1350,
      reducedDuration: 520,
      particles: 8,
      reducedParticles: 2,
      maxParticles: 10,
      builder: "buildCityCapture",
    }),
    "city-upgrade": Object.freeze({
      scope: "world",
      intensity: "standard",
      duration: 950,
      reducedDuration: 420,
      particles: 2,
      reducedParticles: 0,
      maxParticles: 4,
      builder: "buildCityUpgrade",
    }),
    "reward-gold": Object.freeze({
      scope: "ui",
      intensity: "standard",
      duration: 850,
      reducedDuration: 380,
      particles: 5,
      reducedParticles: 2,
      maxParticles: 7,
      builder: "buildGoldReward",
    }),
    "reward-troops": Object.freeze({
      scope: "ui",
      intensity: "standard",
      duration: 850,
      reducedDuration: 380,
      particles: 4,
      reducedParticles: 2,
      maxParticles: 5,
      builder: "buildTroopReward",
    }),
    "camp-gold": Object.freeze({
      scope: "world",
      intensity: "standard",
      duration: 900,
      reducedDuration: 400,
      particles: 6,
      reducedParticles: 2,
      maxParticles: 8,
      builder: "buildGoldCamp",
    }),
    "camp-warband": Object.freeze({
      scope: "world",
      intensity: "standard",
      duration: 900,
      reducedDuration: 400,
      particles: 5,
      reducedParticles: 1,
      maxParticles: 7,
      builder: "buildWarbandCamp",
    }),
    "camp-relic": Object.freeze({
      scope: "world",
      intensity: "major",
      duration: 1200,
      reducedDuration: 500,
      particles: 8,
      reducedParticles: 2,
      maxParticles: 10,
      builder: "buildRelicCamp",
    }),
    "camp-deed": Object.freeze({
      scope: "world",
      intensity: "standard",
      duration: 900,
      reducedDuration: 420,
      particles: 0,
      reducedParticles: 0,
      maxParticles: 0,
      builder: "buildDeedCamp",
    }),
    "deed-completed": Object.freeze({
      scope: "world",
      intensity: "major",
      duration: 1400,
      reducedDuration: 560,
      particles: 4,
      reducedParticles: 1,
      maxParticles: 6,
      builder: "buildDeedCompleted",
    }),
  });
  const DEFAULT_LIMITS = Object.freeze({
    effects: 14,
    particles: 64,
    dedupeEntries: 256,
    dedupeTtlMs: 5000,
    cleanupPaddingMs: 220,
    persistentWatchdogMs: 2 * 60 * 60 * 1000,
    transitionWatchdogMs: 15000,
  });
  const DEFAULT_SCOPE_LIMITS = Object.freeze({
    world: 7,
    ui: 8,
    transition: 1,
  });
  const INTENSITY_PRIORITY = Object.freeze({ minor: 1, standard: 2, major: 3 });
  const MAP_DIRECTIONS = Object.freeze(["north", "south", "east", "west", "none"]);

  function isObject(value) {
    return Boolean(value) && typeof value === "object";
  }

  function isElement(value) {
    return Boolean(value) && value.nodeType === 1 && typeof value.appendChild === "function";
  }

  function finiteNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, finiteNumber(value, min)));
  }

  function normalizeToken(value, fallback = "") {
    const token = String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return token || fallback;
  }

  function normalizeMode(value, allowAuto = true) {
    const mode = normalizeToken(value);
    if (!MODE_PREFERENCES.includes(mode)) return "";
    if (!allowAuto && mode === "auto") return "";
    return mode;
  }

  function normalizeDirection(value) {
    const direction = normalizeToken(value, "none");
    return MAP_DIRECTIONS.includes(direction) ? direction : "none";
  }

  function normalizeIntensity(value, fallback = "standard") {
    const intensity = normalizeToken(value, fallback);
    return Object.prototype.hasOwnProperty.call(INTENSITY_PRIORITY, intensity) ? intensity : fallback;
  }

  function canonicalEffectType(value) {
    const type = normalizeToken(value);
    return EFFECT_ALIASES[type] || type;
  }

  function safeCssValue(value) {
    if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
    const string = String(value ?? "").trim();
    return string.length <= 160 && !/[;{}]/.test(string) ? string : "";
  }

  function safeAssetSource(value) {
    const source = String(value || "").trim();
    if (!source || source.length > 1024) return "";
    if (/^(?:javascript|vbscript|data:(?!image\/))/i.test(source)) return "";
    return source;
  }

  function hashString(value) {
    let hash = 2166136261;
    const string = String(value || "");
    for (let index = 0; index < string.length; index += 1) {
      hash ^= string.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function readRect(value) {
    if (!isObject(value)) return null;
    const hasViewportRect = Number.isFinite(Number(value.viewportLeft))
      && Number.isFinite(Number(value.viewportTop));
    const left = finiteNumber(hasViewportRect ? value.viewportLeft : value.left, NaN);
    const top = finiteNumber(hasViewportRect ? value.viewportTop : value.top, NaN);
    const width = Math.max(0, finiteNumber(value.width, 0));
    const height = Math.max(0, finiteNumber(value.height, 0));
    const x = finiteNumber(hasViewportRect ? value.viewportX : value.x, NaN);
    const y = finiteNumber(hasViewportRect ? value.viewportY : value.y, NaN);
    if (Number.isFinite(left) && Number.isFinite(top)) {
      return { left, top, width, height };
    }
    if (Number.isFinite(x) && Number.isFinite(y)) {
      return { left: x, top: y, width, height };
    }
    return null;
  }

  class AnimationManager {
    constructor() {
      this.initialized = false;
      this.destroyed = false;
      this.modePreference = "auto";
      this.performanceReduced = false;
      this.frameSample = { previous: 0, elapsed: 0, count: 0, slow: 0, healthy: 0 };
      this.storageKey = STORAGE_KEY;
      this.storage = null;
      this.modeReader = null;
      this.modeWriter = null;
      this.rootResolver = null;
      this.rootSpecs = {
        world: "#mapVfxLayer",
        ui: "#screenVfxLayer",
        transition: "#mapFrame",
      };
      this.transitionStageSpec = "#mapTransitionStage";
      this.limits = { ...DEFAULT_LIMITS };
      this.scopeLimits = { ...DEFAULT_SCOPE_LIMITS };
      this.active = new Map();
      this.activeDedupe = new Map();
      this.recentDedupe = new Map();
      this.activeParticles = 0;
      this.sequence = 0;
      this.listeners = new Map();
      this.targetClassCounts = new WeakMap();
      this.mediaQuery = null;
      this.mediaListener = null;
      this.pageHideListener = null;
      this.mapTransition = null;
      this.lastSkipReason = "";
    }

    init(options = {}) {
      if (this.destroyed) return this;
      const settings = isObject(options) ? options : {};
      if (Object.prototype.hasOwnProperty.call(settings, "worldRoot")) this.rootSpecs.world = settings.worldRoot;
      if (Object.prototype.hasOwnProperty.call(settings, "worldLayer")) this.rootSpecs.world = settings.worldLayer;
      if (Object.prototype.hasOwnProperty.call(settings, "uiRoot")) this.rootSpecs.ui = settings.uiRoot;
      if (Object.prototype.hasOwnProperty.call(settings, "screenRoot")) this.rootSpecs.ui = settings.screenRoot;
      if (Object.prototype.hasOwnProperty.call(settings, "screenLayer")) this.rootSpecs.ui = settings.screenLayer;
      if (Object.prototype.hasOwnProperty.call(settings, "transitionRoot")) this.rootSpecs.transition = settings.transitionRoot;
      if (Object.prototype.hasOwnProperty.call(settings, "mapStage")) this.transitionStageSpec = settings.mapStage;
      if (typeof settings.resolveRoot === "function") this.rootResolver = settings.resolveRoot;
      if (typeof settings.readMode === "function") this.modeReader = settings.readMode;
      if (typeof settings.writeMode === "function") this.modeWriter = settings.writeMode;
      if (settings.storageKey) this.storageKey = String(settings.storageKey);
      if (settings.storage) this.storage = settings.storage;
      if (isObject(settings.limits)) {
        Object.keys(DEFAULT_LIMITS).forEach(key => {
          if (Number.isFinite(Number(settings.limits[key]))) {
            this.limits[key] = Math.max(0, Number(settings.limits[key]));
          }
        });
      }
      if (isObject(settings.scopeLimits)) {
        Object.keys(DEFAULT_SCOPE_LIMITS).forEach(key => {
          if (Number.isFinite(Number(settings.scopeLimits[key]))) {
            this.scopeLimits[key] = Math.max(0, Number(settings.scopeLimits[key]));
          }
        });
      }
      Object.entries({
        modechange: "onModeChange",
        effectstart: "onEffectStart",
        effectend: "onEffectEnd",
        transitionphase: "onTransitionPhase",
      }).forEach(([eventName, optionName]) => {
        if (typeof settings[optionName] === "function") this.on(eventName, settings[optionName]);
      });

      if (!this.initialized) {
        this.storage = this.storage || this.getDefaultStorage();
        this.bindMotionPreference();
        this.pageHideListener = () => this.clearAll("pagehide");
        window.addEventListener?.("pagehide", this.pageHideListener);
        this.initialized = true;
      }

      const requestedMode = normalizeMode(settings.mode);
      const storedMode = requestedMode || this.readStoredMode();
      this.modePreference = storedMode || "auto";
      this.applyModeAttributes();
      return this;
    }

    getDefaultStorage() {
      try {
        return window.localStorage || null;
      } catch (_error) {
        return null;
      }
    }

    readStoredMode() {
      try {
        let value = this.modeReader
          ? this.modeReader(this.storageKey)
          : this.storage?.getItem?.(this.storageKey);
        if (!value && !this.modeReader && this.storageKey === STORAGE_KEY) {
          value = this.storage?.getItem?.(LEGACY_STORAGE_KEY);
        }
        return normalizeMode(value, false);
      } catch (_error) {
        return "";
      }
    }

    writeStoredMode(mode) {
      try {
        if (this.modeWriter) this.modeWriter(mode, this.storageKey);
        else if (mode === "auto") {
          this.storage?.removeItem?.(this.storageKey);
          if (this.storageKey === STORAGE_KEY) this.storage?.removeItem?.(LEGACY_STORAGE_KEY);
        } else {
          this.storage?.setItem?.(this.storageKey, mode);
          if (this.storageKey === STORAGE_KEY) this.storage?.setItem?.(LEGACY_STORAGE_KEY, mode);
        }
        return true;
      } catch (_error) {
        return false;
      }
    }

    bindMotionPreference() {
      try {
        this.mediaQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)") || null;
        this.mediaListener = () => {
          if (this.modePreference !== "auto") return;
          this.applyModeAttributes();
          this.notify("modechange", {
            preference: "auto",
            effectiveMode: this.getEffectiveMode(),
            source: "system",
          });
        };
        this.mediaQuery?.addEventListener?.("change", this.mediaListener);
        if (!this.mediaQuery?.addEventListener) this.mediaQuery?.addListener?.(this.mediaListener);
      } catch (_error) {
        this.mediaQuery = null;
      }
    }

    setPersistenceHooks({ read, write, storage, storageKey } = {}) {
      if (typeof read === "function") this.modeReader = read;
      if (typeof write === "function") this.modeWriter = write;
      if (storage) this.storage = storage;
      if (storageKey) this.storageKey = String(storageKey);
      return this;
    }

    setMode(value, { persist = false, source = "runtime" } = {}) {
      const nextMode = normalizeMode(value);
      if (!nextMode) return false;
      const previousPreference = this.modePreference;
      const previousEffective = this.getEffectiveMode();
      this.modePreference = nextMode;
      if (persist) this.writeStoredMode(nextMode);
      const effectiveMode = this.getEffectiveMode();
      this.applyModeAttributes();
      if (effectiveMode === "off") this.clearAll("animations-off");
      if (previousPreference !== nextMode || previousEffective !== effectiveMode) {
        this.notify("modechange", {
          preference: nextMode,
          effectiveMode,
          previousPreference,
          previousEffectiveMode: previousEffective,
          source,
        });
      }
      return true;
    }

    setModePreference(value) {
      return this.setMode(value, { persist: true, source: "preference" });
    }

    getMode() {
      return this.modePreference;
    }

    getEffectiveMode() {
      if (this.modePreference !== "auto") return this.modePreference;
      return this.mediaQuery?.matches || this.performanceReduced ? "reduced" : "full";
    }

    sampleFrame(now, active = true) {
      const sample = this.frameSample;
      const elapsed = now - sample.previous;
      sample.previous = now;
      // A background gap or startup stall is not evidence of sustained load.
      if (!active || elapsed <= 0 || elapsed > 250) {
        sample.elapsed = 0;
        sample.count = 0;
        sample.slow = 0;
        sample.healthy = 0;
        return;
      }
      sample.elapsed += elapsed;
      sample.count += 1;
      if (sample.elapsed < 1000) return;
      const average = sample.elapsed / sample.count;
      sample.slow = average > 24 ? sample.slow + 1 : 0;
      sample.healthy = average < 20 ? sample.healthy + 1 : 0;
      sample.elapsed = 0;
      sample.count = 0;
      const reduced = sample.slow >= 2 ? true : sample.healthy >= 5 ? false : this.performanceReduced;
      if (reduced === this.performanceReduced) return;
      const previousEffectiveMode = this.getEffectiveMode();
      this.performanceReduced = reduced;
      if (this.modePreference !== "auto" || previousEffectiveMode === this.getEffectiveMode()) return;
      this.applyModeAttributes();
      this.notify("modechange", {
        preference: "auto", effectiveMode: this.getEffectiveMode(),
        previousEffectiveMode, source: "frame-pacing",
      });
    }

    subscribeMode(listener) {
      return this.on("modechange", listener);
    }

    on(eventName, listener) {
      const name = normalizeToken(eventName);
      if (!name || typeof listener !== "function") return () => {};
      if (!this.listeners.has(name)) this.listeners.set(name, new Set());
      this.listeners.get(name).add(listener);
      return () => this.listeners.get(name)?.delete(listener);
    }

    notify(eventName, detail) {
      const callbacks = this.listeners.get(normalizeToken(eventName));
      if (!callbacks?.size) return;
      callbacks.forEach(callback => {
        try {
          callback(detail);
        } catch (error) {
          console.warn("Crownlands animation listener failed", error);
        }
      });
    }

    applyModeAttributes() {
      const effectiveMode = this.getEffectiveMode();
      const documentElement = document.documentElement;
      if (documentElement?.dataset) documentElement.dataset.animationMode = effectiveMode;
      Object.keys(this.rootSpecs).forEach(scope => {
        const root = this.resolveConfiguredRoot(scope);
        if (root?.dataset) root.dataset.animationMode = effectiveMode;
      });
    }

    resolveConfiguredRoot(scope) {
      const spec = this.rootSpecs[scope];
      if (isElement(spec)) return spec.isConnected === false ? null : spec;
      if (typeof spec === "function") {
        try {
          const result = spec(scope);
          return isElement(result) ? result : null;
        } catch (_error) {
          return null;
        }
      }
      if (typeof spec === "string") return document.querySelector?.(spec) || null;
      return null;
    }

    resolveRoot(renderScope, event) {
      if (isElement(event.root)) return event.root;
      if (renderScope === "ui" && isElement(event.host)) return event.host;
      if (typeof this.rootResolver === "function") {
        try {
          const resolved = this.rootResolver(renderScope, event);
          if (isElement(resolved)) return resolved;
        } catch (error) {
          console.warn("Crownlands animation root resolver failed", error);
        }
      }
      const configured = this.resolveConfiguredRoot(renderScope);
      if (configured) return configured;
      if (renderScope === "ui") return document.body || null;
      if (renderScope === "transition") return document.getElementById?.("mapFrame") || null;
      return null;
    }

    resolveTransitionStage(event, root) {
      if (isElement(event.stage)) return event.stage;
      if (isElement(event.mapStage)) return event.mapStage;
      if (isElement(this.transitionStageSpec)) return this.transitionStageSpec;
      if (typeof this.transitionStageSpec === "function") {
        try {
          const resolved = this.transitionStageSpec(event, root);
          if (isElement(resolved)) return resolved;
        } catch (_error) {
          // The overlay can still run without moving the live stage.
        }
      }
      if (typeof this.transitionStageSpec === "string") {
        const withinRoot = root?.querySelector?.(this.transitionStageSpec);
        if (isElement(withinRoot)) return withinRoot;
        const withinDocument = document.querySelector?.(this.transitionStageSpec);
        if (isElement(withinDocument)) return withinDocument;
      }
      return null;
    }

    captureAnchor(source, options = {}) {
      const settings = isObject(options) ? options : {};
      let element = null;
      if (isElement(source)) element = source;
      else if (isElement(source?.element)) element = source.element;
      else if (isElement(source?.currentTarget)) element = source.currentTarget;
      else if (isElement(source?.target)) element = source.target;
      else if (typeof source === "string") element = document.querySelector?.(source) || null;

      const hasExplicitGeometry = isObject(source) && (
        Number.isFinite(Number(source.viewportLeft))
        || Number.isFinite(Number(source.left))
        || Number.isFinite(Number(source.viewportX))
        || Number.isFinite(Number(source.x))
      );
      let rect = hasExplicitGeometry ? readRect(source) : null;
      if (!rect && element?.getBoundingClientRect) {
        try {
          rect = element.getBoundingClientRect();
        } catch (_error) {
          rect = null;
        }
      }
      rect = readRect(rect) || readRect(source);
      if (!rect) return null;
      if (element && rect.width === 0 && rect.height === 0 && !hasExplicitGeometry) return null;

      const xRatio = Number.isFinite(Number(settings.xRatio)) ? clamp(settings.xRatio, 0, 1) : 0.5;
      const yRatio = Number.isFinite(Number(settings.yRatio)) ? clamp(settings.yRatio, 0, 1) : 0.5;
      const viewportLeft = rect.left;
      const viewportTop = rect.top;
      const viewportX = viewportLeft + rect.width * (Number.isFinite(Number(source?.viewportX ?? source?.x)) && rect.width === 0
        ? 0
        : xRatio);
      const viewportY = viewportTop + rect.height * (Number.isFinite(Number(source?.viewportY ?? source?.y)) && rect.height === 0
        ? 0
        : yRatio);
      const explicitX = finiteNumber(source?.viewportX ?? source?.x, NaN);
      const explicitY = finiteNumber(source?.viewportY ?? source?.y, NaN);
      const resolvedViewportX = rect.width === 0 && Number.isFinite(explicitX) ? explicitX : viewportX;
      const resolvedViewportY = rect.height === 0 && Number.isFinite(explicitY) ? explicitY : viewportY;

      const relativeRoot = isElement(settings.relativeTo)
        ? settings.relativeTo
        : (typeof settings.relativeTo === "string" ? document.querySelector?.(settings.relativeTo) : null);
      let rootLeft = 0;
      let rootTop = 0;
      if (relativeRoot?.getBoundingClientRect) {
        try {
          const rootRect = relativeRoot.getBoundingClientRect();
          rootLeft = finiteNumber(rootRect?.left, 0) - finiteNumber(relativeRoot.scrollLeft, 0);
          rootTop = finiteNumber(rootRect?.top, 0) - finiteNumber(relativeRoot.scrollTop, 0);
        } catch (_error) {
          rootLeft = 0;
          rootTop = 0;
        }
      }
      const localLeft = viewportLeft - rootLeft;
      const localTop = viewportTop - rootTop;
      return Object.freeze({
        left: localLeft,
        top: localTop,
        right: localLeft + rect.width,
        bottom: localTop + rect.height,
        width: rect.width,
        height: rect.height,
        x: resolvedViewportX - rootLeft,
        y: resolvedViewportY - rootTop,
        viewportLeft,
        viewportTop,
        viewportRight: viewportLeft + rect.width,
        viewportBottom: viewportTop + rect.height,
        viewportX: resolvedViewportX,
        viewportY: resolvedViewportY,
        space: relativeRoot ? "local" : "viewport",
        element,
        root: relativeRoot,
        capturedAt: Date.now(),
      });
    }

    emit(typeOrEvent, payload = {}) {
      const rawEvent = typeof typeOrEvent === "string"
        ? { ...(isObject(payload) ? payload : {}), type: typeOrEvent }
        : (isObject(typeOrEvent) ? { ...typeOrEvent } : {});
      const nestedPayload = isObject(rawEvent.payload) ? rawEvent.payload : {};
      const event = { ...nestedPayload, ...rawEvent, payload: nestedPayload };
      const type = canonicalEffectType(event.type);
      if (type === "map-transition") return this.beginMapTransition(event);
      if (!Object.prototype.hasOwnProperty.call(EFFECT_DEFINITIONS, type)) {
        this.lastSkipReason = "unknown-effect";
        return null;
      }
      if (canonicalEffectType(rawEvent.type) === "camp-deed" && normalizeToken(rawEvent.type) === "deed-hold-active") {
        event.state = event.state || "active-hold";
      }
      return this.emitEffect(type, event);
    }

    emitEffect(type, event) {
      this.sweepDisconnected();
      const mode = this.getEffectiveMode();
      if (mode === "off") {
        this.lastSkipReason = "animations-off";
        return null;
      }
      const definition = EFFECT_DEFINITIONS[type];
      const requestedScope = String(event.scope || "");
      const renderScope = event.worldSpace || requestedScope.startsWith("map:")
        ? "world"
        : (["screen", "ui"].includes(requestedScope) ? "ui" : (definition.scope || "ui"));
      const root = this.resolveRoot(renderScope, event);
      if (!root) {
        this.lastSkipReason = "missing-root";
        return null;
      }

      const dedupeKey = this.getDedupeKey(type, event);
      if (dedupeKey && this.isDuplicate(dedupeKey, event)) {
        this.lastSkipReason = "duplicate";
        return null;
      }

      const intensity = normalizeIntensity(event.intensity, definition.intensity);
      if (!this.reserveEffectSlot(renderScope, INTENSITY_PRIORITY[intensity])) {
        this.lastSkipReason = "effect-cap";
        return null;
      }

      const persistent = Boolean(event.persistent)
        || (type === "camp-deed" && ["hold", "active", "active-hold"].includes(normalizeToken(event.state)));
      const duration = this.resolveDuration(definition, event, mode, persistent);
      const record = this.createRecord({
        type,
        event,
        root,
        renderScope,
        scope: String(event.scope || (renderScope === "world" ? "map" : "screen")),
        mode,
        intensity,
        duration,
        persistent,
        dedupeKey,
      });

      try {
        this.decorateRoot(record);
        this.positionEffect(record);
        const particleBudget = this.resolveParticleBudget(definition, event, mode);
        const context = { record, element: record.element, event, mode, particleBudget, particles: 0 };
        this[definition.builder](context);
        record.particleCount = context.particles;
        this.activeParticles += record.particleCount;
        root.appendChild(record.element);
        this.active.set(record.instanceId, record);
        if (dedupeKey) this.markDedupe(dedupeKey, record, duration);
        this.decorateTarget(record);
        this.armRecord(record, persistent
          ? finiteNumber(event.watchdogMs, this.limits.persistentWatchdogMs)
          : duration + this.limits.cleanupPaddingMs);
        this.notify("effectstart", this.publicRecord(record));
        this.lastSkipReason = "";
        return record.handle;
      } catch (error) {
        this.completeRecord(record, "build-failed", error);
        console.warn("Crownlands animation effect failed", error);
        this.lastSkipReason = "build-failed";
        return null;
      }
    }

    resolveDuration(definition, event, mode, persistent) {
      if (persistent) return 0;
      const fallback = mode === "reduced" ? definition.reducedDuration : definition.duration;
      return Number.isFinite(Number(event.duration))
        ? Math.round(clamp(event.duration, 80, 5000))
        : fallback;
    }

    resolveParticleBudget(definition, event, mode) {
      const tier = normalizeToken(event.tier, "medium");
      let requested = mode === "reduced" ? definition.reducedParticles : definition.particles;
      if (event.type === "reward-gold" || canonicalEffectType(event.type) === "reward-gold") {
        requested = mode === "reduced"
          ? 2
          : ({ small: 3, medium: 5, large: 7 }[tier] || 5);
      } else if (event.type === "reward-troops" || canonicalEffectType(event.type) === "reward-troops") {
        requested = mode === "reduced"
          ? 2
          : ({ small: 3, medium: 4, large: 5 }[tier] || 4);
      }
      if (Number.isFinite(Number(event.particleCount))) requested = Number(event.particleCount);
      if (event.degraded) requested = Math.min(requested, mode === "reduced" ? 1 : 2);
      requested = Math.floor(clamp(requested, 0, definition.maxParticles));
      return Math.max(0, Math.min(requested, this.limits.particles - this.activeParticles));
    }

    createRecord({ type, event, root, renderScope, scope, mode, intensity, duration, persistent, dedupeKey }) {
      const instanceId = `vfx-${Date.now().toString(36)}-${(++this.sequence).toString(36)}`;
      const eventId = String(event.id || instanceId).slice(0, 240);
      const element = document.createElement("div");
      let resolveFinished;
      const finished = new Promise(resolve => { resolveFinished = resolve; });
      const record = {
        instanceId,
        eventId,
        type,
        event,
        root,
        renderScope,
        scope,
        mode,
        intensity,
        priority: INTENSITY_PRIORITY[intensity],
        duration,
        persistent,
        dedupeKey,
        element,
        createdAt: Date.now(),
        particleCount: 0,
        targetClassRefs: [],
        auxiliaryTimers: [],
        timer: 0,
        completed: false,
        resolveFinished,
        finished,
        handle: null,
      };
      record.handle = Object.freeze({
        id: eventId,
        instanceId,
        type,
        scope,
        element,
        finished,
        cancel: reason => this.completeRecord(record, reason || "cancelled"),
        complete: reason => this.completeRecord(record, reason || "completed"),
      });
      return record;
    }

    decorateRoot(record) {
      const { element, type, intensity, mode, renderScope, event, duration } = record;
      element.className = [
        "crownlands-vfx",
        `crownlands-vfx--${type}`,
        `crownlands-vfx--${intensity}`,
        `crownlands-vfx--mode-${mode}`,
        `crownlands-vfx--scope-${renderScope}`,
      ].join(" ");
      if (event.degraded) element.classList.add("is-degraded");
      const variant = normalizeToken(event.variant || event.state);
      if (variant) {
        element.classList.add(`crownlands-vfx--variant-${variant}`);
        element.dataset.variant = variant;
      }
      element.dataset.effectId = record.eventId;
      element.dataset.effectInstance = record.instanceId;
      element.dataset.effectType = type;
      element.dataset.effectScope = record.scope;
      if (event.targetId || event.cityId || event.campId) {
        element.dataset.targetId = String(event.targetId || event.cityId || event.campId).slice(0, 180);
      }
      element.setAttribute("aria-hidden", "true");
      element.style.pointerEvents = "none";
      element.style.setProperty("--vfx-duration", `${duration}ms`);
      this.applyColorVariables(element, event);
      if (isObject(event.cssVars)) {
        Object.entries(event.cssVars).forEach(([name, value]) => {
          if (!String(name).startsWith("--")) return;
          const safeValue = safeCssValue(value);
          if (safeValue) element.style.setProperty(name, safeValue);
        });
      }
    }

    applyColorVariables(element, event) {
      const colors = {
        "--vfx-old-primary": event.oldPrimary ?? event.previousPrimary ?? event.oldColor,
        "--vfx-old-secondary": event.oldSecondary ?? event.previousSecondary,
        "--vfx-new-primary": event.newPrimary ?? event.nextPrimary ?? event.newColor ?? event.primary,
        "--vfx-new-secondary": event.newSecondary ?? event.nextSecondary ?? event.secondary,
      };
      Object.entries(colors).forEach(([name, value]) => {
        const safeValue = safeCssValue(value);
        if (safeValue) element.style.setProperty(name, safeValue);
      });
    }

    positionEffect(record) {
      const { element, event, root, renderScope, type } = record;
      const coordinateRoot = renderScope === "ui" ? null : root;
      let source = null;
      let target = null;
      if (renderScope === "world" && event.worldSpace && isObject(event.anchor)) {
        const x = finiteNumber(event.anchor.x, NaN);
        const y = finiteNumber(event.anchor.y, NaN);
        if (Number.isFinite(x) && Number.isFinite(y)) {
          source = { x, y, width: 0, height: 0 };
        }
      }
      if (!source) source = this.captureAnchor(event.source || event.anchor || event.target, { relativeTo: coordinateRoot });
      if (renderScope === "world" && isObject(event.targetAnchor)) {
        const targetX = finiteNumber(event.targetAnchor.x, NaN);
        const targetY = finiteNumber(event.targetAnchor.y, NaN);
        if (Number.isFinite(targetX) && Number.isFinite(targetY)) {
          target = { x: targetX, y: targetY, width: 0, height: 0 };
        }
      }
      if (!target && event.target && event.target !== event.source) {
        target = this.captureAnchor(event.target, { relativeTo: coordinateRoot });
      }
      if (!target && type === "deed-completed") {
        target = this.captureAnchor(event.targetAnchor || event.cityTarget || event.awardedCity, { relativeTo: coordinateRoot });
      }
      if (!source && target) source = target;
      if (!source) source = { x: 0, y: 0, width: 0, height: 0 };
      if (!target) target = source;
      const sourceX = finiteNumber(source.x, 0);
      const sourceY = finiteNumber(source.y, 0);
      const targetX = finiteNumber(target.x, sourceX);
      const targetY = finiteNumber(target.y, sourceY);
      element.style.left = `${sourceX}px`;
      element.style.top = `${sourceY}px`;
      element.style.setProperty("--vfx-x", `${sourceX}px`);
      element.style.setProperty("--vfx-y", `${sourceY}px`);
      element.style.setProperty("--vfx-source-x", `${sourceX}px`);
      element.style.setProperty("--vfx-source-y", `${sourceY}px`);
      element.style.setProperty("--vfx-target-x", `${targetX}px`);
      element.style.setProperty("--vfx-target-y", `${targetY}px`);
      element.style.setProperty("--vfx-travel-x", `${targetX - sourceX}px`);
      element.style.setProperty("--vfx-travel-y", `${targetY - sourceY}px`);
      element.style.setProperty("--vfx-source-width", `${finiteNumber(source.width, 0)}px`);
      element.style.setProperty("--vfx-source-height", `${finiteNumber(source.height, 0)}px`);
      element.style.setProperty("--vfx-target-width", `${finiteNumber(target.width, 0)}px`);
      element.style.setProperty("--vfx-target-height", `${finiteNumber(target.height, 0)}px`);
      record.sourceAnchor = source;
      record.targetAnchor = target;
    }

    createPart(context, name, options = {}) {
      const source = safeAssetSource(options.src);
      const assetAsElement = Boolean(source && options.assetAsElement);
      const part = document.createElement(assetAsElement ? "img" : (options.tag || "span"));
      part.classList.add("crownlands-vfx__part", `crownlands-vfx__part--${normalizeToken(name, "detail")}`);
      if (options.particle) {
        part.classList.add("crownlands-vfx__particle", `crownlands-vfx__particle--${normalizeToken(options.kind || name, "detail")}`);
      }
      if (assetAsElement) {
        part.src = source;
        part.alt = "";
        part.draggable = false;
        part.decoding = "async";
      } else if (source) {
        const image = document.createElement("img");
        image.className = "crownlands-vfx__asset";
        image.src = source;
        image.alt = "";
        image.draggable = false;
        image.decoding = "async";
        image.setAttribute("aria-hidden", "true");
        part.appendChild(image);
      }
      if (options.className) {
        String(options.className).split(/\s+/).forEach(token => {
          const normalized = normalizeToken(token);
          if (normalized) part.classList.add(normalized);
        });
      }
      const styleValues = {
        "--vfx-index": options.index,
        "--vfx-count": options.count,
        "--vfx-delay": Number.isFinite(Number(options.delay)) ? `${Number(options.delay)}ms` : "",
        "--vfx-angle": Number.isFinite(Number(options.angle)) ? `${Number(options.angle)}deg` : "",
        "--vfx-distance": Number.isFinite(Number(options.distance)) ? `${Number(options.distance)}px` : "",
        "--vfx-offset-x": Number.isFinite(Number(options.offsetX)) ? `${Number(options.offsetX)}px` : "",
        "--vfx-offset-y": Number.isFinite(Number(options.offsetY)) ? `${Number(options.offsetY)}px` : "",
      };
      Object.entries(styleValues).forEach(([property, value]) => {
        if (value !== "" && value !== undefined) part.style.setProperty(property, String(value));
      });
      context.element.appendChild(part);
      return part;
    }

    createParticle(context, kind, index, count, options = {}) {
      if (context.particles >= context.particleBudget) return null;
      const seed = hashString(`${context.record.eventId}:${kind}:${index}`);
      const angle = Number.isFinite(Number(options.angle))
        ? Number(options.angle)
        : ((360 / Math.max(1, count)) * index + (seed % 29) - 14);
      const distance = Number.isFinite(Number(options.distance))
        ? Number(options.distance)
        : 18 + (seed % 22);
      const rewardParticle = context.record.type === "reward-gold" || context.record.type === "reward-troops";
      const delayStep = rewardParticle ? (context.mode === "reduced" ? 16 : 26) : (context.mode === "reduced" ? 24 : 42);
      const upwardParticle = ["smoke", "ember", "magic"].includes(kind);
      const radians = angle * (Math.PI / 180);
      const defaultOffsetX = upwardParticle
        ? ((seed >>> 8) % 17) - 8
        : Math.cos(radians) * distance;
      const defaultOffsetY = upwardParticle
        ? -distance
        : Math.sin(radians) * distance;
      const particle = this.createPart(context, kind, {
        ...options,
        particle: true,
        kind,
        index,
        count,
        angle,
        distance,
        delay: Number.isFinite(Number(options.delay)) ? Number(options.delay) : index * delayStep,
        offsetX: Number.isFinite(Number(options.offsetX)) ? Number(options.offsetX) : Math.round(defaultOffsetX),
        offsetY: Number.isFinite(Number(options.offsetY)) ? Number(options.offsetY) : Math.round(defaultOffsetY),
      });
      if (particle) context.particles += 1;
      return particle;
    }

    fillParticles(context, kinds, options = {}) {
      const available = context.particleBudget - context.particles;
      const count = Math.max(0, Math.min(available, Math.floor(finiteNumber(options.count, available))));
      for (let index = 0; index < count; index += 1) {
        const kind = kinds[index % kinds.length];
        this.createParticle(context, kind, index, count, options);
      }
    }

    buildCityAttack(context) {
      this.createPart(context, "weapons");
      this.createPart(context, "dust");
      if (context.mode === "full" && !context.event.degraded) this.createPart(context, "mist");
      this.fillParticles(context, ["spark"]);
    }

    buildCityCapture(context) {
      this.createPart(context, "impact");
      this.createPart(context, "dust");
      this.createPart(context, "ownership-old");
      this.createPart(context, "ownership-new");
      this.createPart(context, "banner");
      if (context.mode === "full" && !context.event.degraded) this.createPart(context, "fire");
      const smokeCount = Math.min(context.mode === "reduced" ? 1 : 2, context.particleBudget);
      for (let index = 0; index < smokeCount; index += 1) {
        this.createParticle(context, "smoke", index, smokeCount, { distance: 28 + index * 7 });
      }
      this.fillParticles(context, ["ember"]);
    }

    buildCityUpgrade(context) {
      const previousAsset = context.event.previousAsset || context.event.oldAsset;
      const nextAsset = context.event.nextAsset || context.event.newAsset;
      if (previousAsset) this.createPart(context, "castle-old", { src: previousAsset, assetAsElement: true });
      if (nextAsset) this.createPart(context, "castle-new", { src: nextAsset, assetAsElement: true });
      this.createPart(context, "foundation");
      this.createPart(context, "dust");
      this.createPart(context, "shimmer");
      this.createPart(context, "settle");
      this.fillParticles(context, ["gold-sparkle"]);
    }

    buildGoldReward(context) {
      const icon = context.event.icon || context.event.asset;
      this.fillParticles(context, ["coin"], { src: icon });
      if (context.mode === "full") this.createPart(context, "arrival");
    }

    buildTroopReward(context) {
      const icon = context.event.icon || context.event.asset;
      this.fillParticles(context, ["troop"], { src: icon });
      if (context.mode === "full") this.createPart(context, "arrival");
    }

    buildGoldCamp(context) {
      this.createPart(context, "burst");
      this.createPart(context, "shimmer");
      this.createPart(context, "ownership-new");
      this.fillParticles(context, ["gold-sparkle", "coin"]);
    }

    buildWarbandCamp(context) {
      this.createPart(context, "dust");
      this.createPart(context, "weapons");
      this.createPart(context, "shield");
      this.createPart(context, "banner");
      this.createPart(context, "ownership-new");
      this.fillParticles(context, ["spark", "ember"]);
    }

    buildRelicCamp(context) {
      this.createPart(context, "glow");
      this.createPart(context, "rune");
      this.createPart(context, "ring");
      this.createPart(context, "pulse");
      this.createPart(context, "ownership-new");
      this.fillParticles(context, ["magic"]);
    }

    buildDeedCamp(context) {
      const holdState = ["hold", "active", "active-hold"].includes(normalizeToken(context.event.state));
      if (holdState) {
        context.element.classList.add("is-persistent", "is-active-hold");
        this.createPart(context, "hold-ring");
        this.createPart(context, "hold-seal");
        this.createPart(context, "hold-progress");
        const progress = clamp(context.event.progress, 0, 1);
        context.element.style.setProperty("--vfx-progress", String(progress));
        return;
      }
      this.createPart(context, "parchment");
      this.createPart(context, "seal");
      this.createPart(context, "outline");
      this.createPart(context, "banner");
      this.createPart(context, "ownership-new");
    }

    buildDeedCompleted(context) {
      if (context.event.cityHighlightOnly) {
        this.createPart(context, "city-highlight");
        this.createPart(context, "gold-pulse");
        this.createPart(context, "ownership-new");
        this.fillParticles(context, ["gold-sparkle"]);
        return;
      }
      this.createPart(context, "parchment");
      this.createPart(context, "seal");
      this.createPart(context, "stamp");
      if (context.event.sourceOnly) return;
      this.createPart(context, "city-highlight");
      this.createPart(context, "gold-pulse");
      this.createPart(context, "ownership-new");
      this.fillParticles(context, ["gold-sparkle"]);
    }

    decorateTarget(record) {
      const eventTarget = record.event.target;
      const targetElement = isElement(eventTarget)
        ? eventTarget
        : (isElement(eventTarget?.element) ? eventTarget.element : null);
      if (!targetElement) return;
      const isReward = record.type === "reward-gold" || record.type === "reward-troops";
      const classes = isReward
        ? [
          "crownlands-vfx-target-pulse",
          `crownlands-vfx-target-pulse--${record.type}`,
          `crownlands-vfx-target-pulse--${record.type === "reward-gold" ? "gold" : "troops"}`,
        ]
        : ["crownlands-vfx-target", `crownlands-vfx-target--${record.type}`];
      if (isReward) {
        const pulseDelay = record.mode === "reduced" ? 80 : 520;
        const timer = window.setTimeout(() => {
          record.auxiliaryTimers = record.auxiliaryTimers.filter(timerId => timerId !== timer);
          if (record.completed || targetElement.isConnected === false) return;
          classes.forEach(className => this.acquireTargetClass(record, targetElement, className));
        }, pulseDelay);
        record.auxiliaryTimers.push(timer);
        return;
      }
      classes.forEach(className => this.acquireTargetClass(record, targetElement, className));
    }

    acquireTargetClass(record, element, className) {
      let counts = this.targetClassCounts.get(element);
      if (!counts) {
        counts = new Map();
        this.targetClassCounts.set(element, counts);
      }
      counts.set(className, (counts.get(className) || 0) + 1);
      element.classList.add(className);
      record.targetClassRefs.push({ element, className });
    }

    releaseTargetClasses(record) {
      record.targetClassRefs.forEach(({ element, className }) => {
        const counts = this.targetClassCounts.get(element);
        if (!counts) return;
        const nextCount = Math.max(0, (counts.get(className) || 0) - 1);
        if (nextCount) counts.set(className, nextCount);
        else {
          counts.delete(className);
          element.classList?.remove(className);
        }
        if (!counts.size) this.targetClassCounts.delete(element);
      });
      record.targetClassRefs = [];
    }

    reserveEffectSlot(renderScope, priority) {
      const activeInScope = Array.from(this.active.values()).filter(record => record.renderScope === renderScope);
      const totalAtCap = this.active.size >= this.limits.effects;
      const scopeAtCap = activeInScope.length >= (this.scopeLimits[renderScope] ?? this.limits.effects);
      if (!totalAtCap && !scopeAtCap) return true;
      const candidates = Array.from(this.active.values())
        .filter(record => !record.persistent && record.priority < priority)
        .filter(record => !scopeAtCap || record.renderScope === renderScope)
        .sort((a, b) => a.priority - b.priority || a.createdAt - b.createdAt);
      if (!candidates.length) return false;
      this.completeRecord(candidates[0], "capacity-preempted");
      const nextScopeCount = Array.from(this.active.values()).filter(record => record.renderScope === renderScope).length;
      return this.active.size < this.limits.effects
        && nextScopeCount < (this.scopeLimits[renderScope] ?? this.limits.effects);
    }

    getDedupeKey(type, event) {
      const rawKey = event.dedupeKey || event.id || event.eventId;
      return rawKey ? `${type}:${String(rawKey).slice(0, 300)}` : "";
    }

    pruneDedupe() {
      const now = Date.now();
      this.recentDedupe.forEach((entry, key) => {
        if (entry.expiresAt <= now) this.recentDedupe.delete(key);
      });
      while (this.recentDedupe.size > this.limits.dedupeEntries) {
        this.recentDedupe.delete(this.recentDedupe.keys().next().value);
      }
    }

    isDuplicate(key, event) {
      this.pruneDedupe();
      const activeId = this.activeDedupe.get(key);
      if (activeId) {
        const activeRecord = this.active.get(activeId);
        if (event.replace && activeRecord) this.completeRecord(activeRecord, "dedupe-replaced");
        else return true;
      }
      if (!event.replace && this.recentDedupe.has(key)) return true;
      return false;
    }

    markDedupe(key, record, duration) {
      this.activeDedupe.set(key, record.instanceId);
      this.recentDedupe.delete(key);
      this.recentDedupe.set(key, {
        createdAt: Date.now(),
        expiresAt: Date.now() + Math.max(this.limits.dedupeTtlMs, duration),
      });
      this.pruneDedupe();
    }

    armRecord(record, delayMs) {
      if (record.timer) window.clearTimeout(record.timer);
      const delay = Math.max(80, finiteNumber(delayMs, this.limits.cleanupPaddingMs));
      record.timer = window.setTimeout(() => {
        this.completeRecord(record, record.persistent ? "persistent-watchdog" : "finished");
      }, delay);
    }

    completeRecord(record, reason = "completed", error = null) {
      if (!record || record.completed) return false;
      record.completed = true;
      if (record.timer) window.clearTimeout(record.timer);
      record.timer = 0;
      record.auxiliaryTimers.forEach(timer => window.clearTimeout(timer));
      record.auxiliaryTimers = [];
      this.active.delete(record.instanceId);
      if (record.dedupeKey && this.activeDedupe.get(record.dedupeKey) === record.instanceId) {
        this.activeDedupe.delete(record.dedupeKey);
      }
      this.activeParticles = Math.max(0, this.activeParticles - finiteNumber(record.particleCount, 0));
      this.releaseTargetClasses(record);
      if (record.element?.parentNode) record.element.parentNode.removeChild(record.element);
      this.releaseTransitionStage(record);
      if (this.mapTransition?.record === record) this.mapTransition = null;
      const result = Object.freeze({
        id: record.eventId,
        instanceId: record.instanceId,
        type: record.type,
        scope: record.scope,
        reason,
        error: error || null,
      });
      try {
        if (typeof record.event.onComplete === "function") record.event.onComplete(result);
      } catch (callbackError) {
        console.warn("Crownlands animation completion callback failed", callbackError);
      }
      record.resolveFinished?.(result);
      this.notify("effectend", result);
      return true;
    }

    cancel(idOrHandle, reason = "cancelled") {
      const requestedId = typeof idOrHandle === "string"
        ? idOrHandle
        : (idOrHandle?.instanceId || idOrHandle?.id || "");
      if (!requestedId) return false;
      const direct = this.active.get(requestedId);
      if (direct) return this.completeRecord(direct, reason);
      const record = Array.from(this.active.values()).find(item => item.eventId === requestedId);
      return record ? this.completeRecord(record, reason) : false;
    }

    cancelScope(scope, reason = "scope-cancelled", options = {}) {
      const requestedScope = String(scope || "");
      if (!requestedScope) return 0;
      const prefix = Boolean(options?.prefix);
      const matches = Array.from(this.active.values()).filter(record => (
        prefix ? record.scope.startsWith(requestedScope) : record.scope === requestedScope
      ));
      matches.forEach(record => this.completeRecord(record, reason));
      return matches.length;
    }

    clearAll(reason = "cleared") {
      const records = Array.from(this.active.values());
      records.forEach(record => this.completeRecord(record, reason));
      this.activeDedupe.clear();
      this.recentDedupe.clear();
      this.mapTransition = null;
      return records.length;
    }

    sweepDisconnected() {
      Array.from(this.active.values()).forEach(record => {
        if (record.element?.isConnected === false && record.element?.parentNode == null) {
          this.completeRecord(record, "detached");
        }
      });
    }

    beginMapTransition(options = {}) {
      const event = isObject(options) ? { ...options } : {};
      if (this.getEffectiveMode() === "off") return null;
      this.cancelMapTransition("superseded");
      const root = this.resolveRoot("transition", event);
      if (!root) {
        this.lastSkipReason = "missing-transition-root";
        return null;
      }
      const direction = normalizeDirection(event.direction);
      const mode = this.getEffectiveMode();
      if (!this.reserveEffectSlot("transition", INTENSITY_PRIORITY.minor)) {
        this.lastSkipReason = "effect-cap";
        return null;
      }
      const record = this.createRecord({
        type: "map-transition",
        event,
        root,
        renderScope: "transition",
        scope: String(event.scope || "map-transition"),
        mode,
        intensity: "minor",
        duration: 0,
        persistent: true,
        dedupeKey: "",
      });
      const element = record.element;
      const stage = this.resolveTransitionStage(event, root);
      const coverDuration = mode === "reduced"
        ? 140
        : Math.round(clamp(
          Number.isFinite(Number(event.coverDurationMs)) ? event.coverDurationMs : 420,
          160,
          600,
        ));
      record.transitionStage = stage;
      record.transitionCoverDuration = coverDuration;
      record.transitionCoverReadyAt = Date.now() + coverDuration;
      record.transitionRevealScheduled = false;
      element.className = `crownlands-map-transition crownlands-map-transition--${direction} crownlands-map-transition--mode-${mode} is-leaving`;
      element.dataset.transitionToken = String(event.token || record.instanceId);
      element.dataset.direction = direction;
      element.dataset.phase = "leaving";
      element.setAttribute("aria-hidden", "true");
      element.style.pointerEvents = "none";
      element.style.setProperty("--map-cover-duration", `${coverDuration}ms`);
      element.style.setProperty("--map-cloud-back-cover-duration", `${Math.max(120, coverDuration - 20)}ms`);
      element.style.setProperty("--map-cloud-front-cover-duration", `${Math.max(120, coverDuration - 70)}ms`);
      this.createMapTransitionPart(element, "outgoing", event.outgoing || event.snapshot, event.cloneSnapshot);
      this.createMapTransitionPart(element, "incoming", null, false);
      this.createMapTransitionPart(element, "mist");
      this.createMapTransitionPart(element, "cloud-back");
      this.createMapTransitionPart(element, "cloud-front");
      if (stage) {
        stage.classList.add("is-transitioning");
        stage.classList.remove("is-leaving", "is-entering");
        stage.dataset.transitionDirection = direction;
      }
      root.appendChild(element);
      this.active.set(record.instanceId, record);
      const token = element.dataset.transitionToken;
      const transitionHandle = Object.freeze({
        token,
        id: record.eventId,
        instanceId: record.instanceId,
        element,
        finished: record.finished,
        finish: finishOptions => this.finishMapTransition(token, finishOptions),
        cancel: reason => (this.mapTransition?.record === record
          ? this.completeRecord(record, reason || "cancelled")
          : false),
      });
      record.handle = transitionHandle;
      this.mapTransition = { token, record, phase: "leaving", handle: transitionHandle };
      this.armRecord(record, finiteNumber(event.watchdogMs, this.limits.transitionWatchdogMs));
      this.notify("effectstart", this.publicRecord(record));
      this.notify("transitionphase", { token, direction, phase: "leaving", element });
      window.requestAnimationFrame?.(() => {
        if (
          this.mapTransition?.record !== record
          || this.mapTransition.phase !== "leaving"
          || record.completed
        ) return;
        element.classList.add("is-loading");
        element.dataset.phase = "loading";
        this.mapTransition.phase = "loading";
        this.notify("transitionphase", { token, direction, phase: "loading", element });
      });
      return transitionHandle;
    }

    cloneTransitionSnapshot(snapshot, cloneSnapshot) {
      if (!snapshot?.cloneNode || cloneSnapshot === false) return null;
      const tagName = String(snapshot.tagName || "").toUpperCase();
      if (["IMG", "CANVAS", "PICTURE"].includes(tagName)) return snapshot.cloneNode(true);
      if (snapshot.classList?.contains?.("map-bg")) return snapshot.cloneNode(true);
      if (snapshot.classList?.contains?.("map-world")) {
        const shell = snapshot.cloneNode(false);
        shell.removeAttribute?.("id");
        shell.dataset.vfxMapSnapshot = "true";
        const background = Array.from(snapshot.children || []).find(child => child.classList?.contains?.("map-bg"));
        if (background) {
          const backgroundClone = background.cloneNode(true);
          backgroundClone.removeAttribute?.("id");
          shell.appendChild(backgroundClone);
        }
        return shell;
      }
      return null;
    }

    createMapTransitionPart(root, name, snapshot = null, cloneSnapshot = true) {
      const part = document.createElement("div");
      part.className = `crownlands-map-transition__part crownlands-map-transition__part--${name}`;
      let clone = null;
      try {
        clone = this.cloneTransitionSnapshot(snapshot, cloneSnapshot);
      } catch (_error) {
        clone = null;
      }
      if (clone) {
        try {
          clone.setAttribute?.("aria-hidden", "true");
          part.appendChild(clone);
        } catch (_error) {
          // A transition snapshot is optional; haze still masks the map swap.
        }
      }
      if ((name === "outgoing" || name === "incoming") && !part.children?.length) part.hidden = true;
      root.appendChild(part);
      return part;
    }

    finishMapTransition(tokenOrOptions = "", maybeOptions = {}) {
      if (!this.mapTransition) return false;
      const token = typeof tokenOrOptions === "string"
        ? tokenOrOptions
        : (tokenOrOptions?.token || "");
      const options = typeof tokenOrOptions === "string"
        ? (isObject(maybeOptions) ? maybeOptions : {})
        : (isObject(tokenOrOptions) ? tokenOrOptions : {});
      if (token && token !== this.mapTransition.token) return false;
      const { record } = this.mapTransition;
      if (record.completed) return false;
      if (record.transitionRevealScheduled || this.mapTransition.phase === "entering") return true;
      const element = record.element;
      const incomingPart = element.querySelector?.(".crownlands-map-transition__part--incoming");
      const incoming = options.incoming || options.snapshot;
      if (incomingPart && incoming) {
        try {
          const clone = this.cloneTransitionSnapshot(incoming, options.cloneSnapshot);
          if (clone) {
            clone.setAttribute?.("aria-hidden", "true");
            incomingPart.appendChild(clone);
            incomingPart.hidden = false;
          }
        } catch (_error) {
          // Incoming snapshots are optional.
        }
      }
      const settleDuration = this.getEffectiveMode() === "reduced"
        ? 160
        : (Number.isFinite(Number(options.duration)) ? Math.round(clamp(options.duration, 240, 900)) : 520);
      const beginReveal = () => {
        if (this.mapTransition?.record !== record || record.completed) return false;
        record.transitionRevealScheduled = false;
        element.classList.remove("is-leaving", "is-loading");
        element.classList.add("is-entering");
        element.dataset.phase = "entering";
        this.mapTransition.phase = "entering";
        if (record.transitionStage) {
          record.transitionStage.classList.remove("is-leaving", "is-entering");
          record.transitionStage.classList.add("is-transitioning");
        }
        element.style.setProperty("--map-transition-duration", `${settleDuration}ms`);
        element.style.setProperty("--map-cloud-back-reveal-duration", `${Math.max(160, settleDuration - 30)}ms`);
        element.style.setProperty("--map-cloud-front-reveal-duration", `${Math.max(160, settleDuration - 80)}ms`);
        this.armRecord(record, settleDuration + this.limits.cleanupPaddingMs);
        this.notify("transitionphase", {
          token: this.mapTransition.token,
          direction: element.dataset.direction,
          phase: "entering",
          element,
        });
        return true;
      };
      const remainingCoverMs = Math.max(0, finiteNumber(record.transitionCoverReadyAt, 0) - Date.now());
      if (remainingCoverMs > 8) {
        record.transitionRevealScheduled = true;
        element.classList.add("is-loading");
        element.dataset.phase = "loading";
        this.mapTransition.phase = "loading";
        this.armRecord(record, remainingCoverMs + settleDuration + this.limits.cleanupPaddingMs);
        const timer = window.setTimeout(() => {
          record.auxiliaryTimers = record.auxiliaryTimers.filter(timerId => timerId !== timer);
          beginReveal();
        }, remainingCoverMs);
        record.auxiliaryTimers.push(timer);
        return true;
      }
      return beginReveal();
    }

    releaseTransitionStage(record) {
      const stage = record?.transitionStage;
      if (!stage) return;
      stage.classList.remove("is-transitioning", "is-leaving", "is-entering");
      stage.style?.removeProperty?.("--map-transition-duration");
      if (stage.dataset?.transitionDirection === record.element?.dataset?.direction) {
        delete stage.dataset.transitionDirection;
      }
      record.transitionStage = null;
    }

    cancelMapTransition(reasonOrToken = "transition-cancelled", maybeReason = "") {
      if (!this.mapTransition) return false;
      const first = String(reasonOrToken || "");
      const second = String(maybeReason || "");
      const firstIsToken = first && first === this.mapTransition.token;
      const secondIsToken = second && second === this.mapTransition.token;
      const token = firstIsToken ? first : (secondIsToken ? second : "");
      const reason = firstIsToken
        ? (second || "transition-cancelled")
        : (first || "transition-cancelled");
      if (token && token !== this.mapTransition.token) return false;
      this.mapTransition.record.element.classList.add("is-cancelled");
      this.mapTransition.record.element.dataset.phase = "cancelled";
      return this.completeRecord(this.mapTransition.record, reason);
    }

    publicRecord(record) {
      return Object.freeze({
        id: record.eventId,
        instanceId: record.instanceId,
        type: record.type,
        scope: record.scope,
        renderScope: record.renderScope,
        mode: record.mode,
        intensity: record.intensity,
        element: record.element,
        handle: record.handle,
      });
    }

    getDebugState() {
      return {
        initialized: this.initialized,
        destroyed: this.destroyed,
        preference: this.modePreference,
        effectiveMode: this.getEffectiveMode(),
        performanceReduced: this.performanceReduced,
        activeEffectCount: this.active.size,
        activeParticleCount: this.activeParticles,
        recentDedupeCount: this.recentDedupe.size,
        activeByScope: Array.from(this.active.values()).reduce((counts, record) => {
          counts[record.scope] = (counts[record.scope] || 0) + 1;
          return counts;
        }, {}),
        transition: this.mapTransition
          ? { token: this.mapTransition.token, phase: this.mapTransition.phase }
          : null,
        lastSkipReason: this.lastSkipReason,
        limits: { ...this.limits },
        scopeLimits: { ...this.scopeLimits },
      };
    }

    destroy() {
      if (this.destroyed) return;
      this.clearAll("destroyed");
      if (this.mediaQuery && this.mediaListener) {
        this.mediaQuery.removeEventListener?.("change", this.mediaListener);
        if (!this.mediaQuery.removeEventListener) this.mediaQuery.removeListener?.(this.mediaListener);
      }
      if (this.pageHideListener) window.removeEventListener?.("pagehide", this.pageHideListener);
      this.listeners.clear();
      this.destroyed = true;
      this.initialized = false;
    }
  }

  if (typeof window === "undefined" || typeof document === "undefined") return;
  const manager = new AnimationManager();
  manager.MODES = MODE_PREFERENCES;
  manager.EFFECT_TYPES = EFFECT_TYPES;
  window.CrownlandsAnimations = manager;
  manager.init();
})();
