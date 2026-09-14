<script lang="ts" src="./App.ts"></script>

<template>
  <main class="viewer-shell">
    <header class="toolbar">
      <label class="selector" for="model-select">
        <span>Character</span>
        <select id="model-select" v-model="selectedPath">
          <option v-for="model in formattedModels" :key="model.id" :value="model.path">
            {{ model.label }}
          </option>
        </select>
      </label>
      <label v-if="animations.length" class="selector" for="animation-select">
        <span>Animation</span>
        <select id="animation-select" v-model="selectedAnimation" @change="changeAnimation(selectedAnimation)">
          <option v-for="animation in animations" :key="animation" :value="animation">
            {{ animation }}
          </option>
        </select>
      </label>
      <button class="reset-button" type="button" title="Reset canvas position and zoom" @click="resetView">
        Reset view
      </button>
    </header>

    <section
      ref="playerRoot"
      class="player-root"
      :class="{ dragging: isDragging }"
      aria-live="polite"
      aria-label="Spine character viewer"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointercancel="handlePointerUp"
      @wheel="handleWheel"
    />
  </main>
</template>

<style scoped src="./App.css"></style>
