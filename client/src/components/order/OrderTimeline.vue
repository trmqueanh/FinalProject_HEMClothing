<template>
  <div v-if="timeline.length" class="profile-order-timeline">
    <div
      v-for="(event, index) in displayTimeline"
      :key="event.id"
      class="profile-order-timeline__item"
      :class="{
        'profile-order-timeline__item--active': index === 0,
        'profile-order-timeline__item--cancelled': isTimelineCancellation(event),
        'profile-order-timeline__item--failed': String(event.newStatus || '').toLowerCase() === 'delivery_failed',
        'profile-order-timeline__item--success': ['delivered', 'completed'].includes(String(event.newStatus || '').toLowerCase())
      }"
      :aria-current="index === 0 ? 'step' : undefined"
    >
      <span></span>
      <div>
        <strong>{{ formatOrderTimelineTitle(event) }}</strong>
        <p>{{ formatTimelineRole(event.changedByRole) }} · {{ formatDate(event.createdAt) }}</p>
        <small v-if="formatTimelineNote(event)">{{ formatTimelineNote(event) }}</small>
      </div>
    </div>
  </div>
  <p v-else class="profile-order-detail__muted">No status history yet.</p>
</template>

<script>
export default {
  name: 'OrderTimeline',
  computed: {
    displayTimeline() {
      return [...this.timeline].reverse();
    }
  },
  props: {
    timeline: {
      type: Array,
      default: () => []
    },
    isTimelineCancellation: {
      type: Function,
      default: () => false
    },
    formatOrderTimelineTitle: {
      type: Function,
      default: () => ''
    },
    formatTimelineRole: {
      type: Function,
      default: () => ''
    },
    formatDate: {
      type: Function,
      default: () => ''
    },
    formatTimelineNote: {
      type: Function,
      default: () => ''
    }
  }
};
</script>

<style scoped>
.profile-order-detail__muted {
  color: var(--color-text-secondary);
  font-size: 12px;
}

.profile-order-timeline {
  display: grid;
  gap: 0;
  padding-left: 2px;
}

.profile-order-timeline__item {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 12px;
  position: relative;
  padding-bottom: 20px;
}

.profile-order-timeline__item::before {
  content: '';
  position: absolute;
  left: 7px;
  top: 16px;
  bottom: 0;
  width: 1.5px;
  background: linear-gradient(to bottom, rgba(17,17,17,0.09), rgba(17,17,17,0.025));
}

.profile-order-timeline__item:last-child {
  padding-bottom: 0;
}

.profile-order-timeline__item:last-child::before {
  display: none;
}

.profile-order-timeline__item > span {
  width: 14px;
  height: 14px;
  margin-top: 2px;
  border: 2px solid rgba(17,17,17,0.11);
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(17,17,17,0.025);
  z-index: 1;
  flex-shrink: 0;
}

/* The API is chronological; displayTimeline reverses it so the current event is first. */
.profile-order-timeline__item--active > span {
  border-color: #111111;
  background: #111111;
  box-shadow: 0 0 0 4px rgba(17,17,17,0.09);
}

.profile-order-timeline__item--active.profile-order-timeline__item--cancelled > span,
.profile-order-timeline__item--active.profile-order-timeline__item--failed > span {
  border-color: #dc2626;
  background: #fee2e2;
  box-shadow: 0 0 0 4px rgba(220,38,38,0.08);
}

.profile-order-timeline__item--active.profile-order-timeline__item--success > span {
  border-color: #15803d;
  background: #dcfce7;
  box-shadow: 0 0 0 4px rgba(21,128,61,0.10);
}

.profile-order-timeline__item strong,
.profile-order-timeline__item p,
.profile-order-timeline__item small {
  display: block;
  margin: 0;
}

.profile-order-timeline__item strong {
  font-size: 13px;
  font-weight: 700;
  color: rgba(17,17,17,0.42);
  line-height: 1.35;
}

.profile-order-timeline__item--active strong {
  color: var(--color-text-primary);
}

.profile-order-timeline__item--active.profile-order-timeline__item--cancelled strong,
.profile-order-timeline__item--active.profile-order-timeline__item--failed strong {
  color: #dc2626;
}

.profile-order-timeline__item--active.profile-order-timeline__item--success strong {
  color: #15803d;
}

.profile-order-timeline__item p,
.profile-order-timeline__item small {
  color: rgba(17,17,17,0.34);
  font-size: 11.5px;
  margin-top: 2px;
}

.profile-order-timeline__item--active p,
.profile-order-timeline__item--active small {
  color: var(--color-text-secondary);
}

.profile-order-timeline__item small {
  font-size: 11px;
  font-style: italic;
  margin-top: 3px;
}
</style>
