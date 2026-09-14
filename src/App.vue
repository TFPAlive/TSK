<script lang="ts" src="./App.ts"></script>

<template>
  <main class="viewer-shell">
    <header class="toolbar">
      <!--
      <label v-if="selectedCharacterId" class="selector" for="model-select">
        <span>Character</span>
        <select id="model-select" v-model="selectedPath">
          <option v-for="model in formattedModels" :key="model.id" :value="model.path">
            {{ model.label }}
          </option>
        </select>
      </label>
      -->      
      <button class="character-button" type="button" @click="showCharacterList = !showCharacterList">
        Characters
      </button>
      <label v-if="animations.length" class="selector" for="animation-select">
        <div id="animation-select" class="animation-list" role="listbox" aria-label="Animation">
          <button
            v-for="animation in animations"
            :key="animation"
            class="animation-button"
            :class="{ selected: animation === selectedAnimation }"
            type="button"
            role="option"
            :aria-selected="animation === selectedAnimation"
            @click="selectedAnimation = animation; changeAnimation(animation)"
          >
            {{ animation }}
          </button>
        </div>
      </label>

      <button class="reset-button" type="button" title="Reset canvas position and zoom" @click="resetView">
        Reset view
      </button>
    </header>

    <div class="viewer-stage">
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
    </div>

    <Teleport to="body">
      <section v-if="showCharacterList" class="character-panel" aria-label="Character list">
        <div class="character-panel-header">
          <div>
            <span class="eyebrow">Library</span>
            <h2>Star Knights</h2>
          </div>
          <button class="close-button" type="button" aria-label="Close character list" @click="showCharacterList = false">
            Close
          </button>
        </div>
        <input
          v-model="characterSearch"
          class="character-search"
          type="search"
          placeholder="Search characters"
          aria-label="Search characters"
        >
        <div class="character-grid">
          <button
            v-for="character in filteredCharacters"
            :key="character.id + character.icon"
            class="character-card"
            :class="{ selected: character.id === selectedCharacterId }"
            type="button"
            :disabled="!character.model"
            @click="selectCharacter(character)"
          >
            <img :src="`/assets${character.icon}`" :alt="character.label" loading="lazy">
            <span>{{ character.label }}</span>
          </button>
        </div>
        <p v-if="!filteredCharacters.length" class="empty-character-state">No characters found.</p>
      </section>
    </Teleport>
  </main>
</template>

<style scoped src="./App.css"></style>
