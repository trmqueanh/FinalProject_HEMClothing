<template>
  <section class="profile-summary" aria-label="Account overview">
    <div class="profile-summary__identity">
      <span class="profile-summary__eyebrow">HEM Member</span>
      <h1>{{ currentUser.name || 'Customer' }}</h1>
      <p>{{ currentUser.email || 'Member account' }}</p>
      <span class="profile-summary__member-code">{{ memberCode }}</span>
    </div>

    <article class="profile-summary__metric">
      <span class="profile-summary__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M3 5h2l2.2 9.2a2 2 0 0 0 2 1.5h7.9a2 2 0 0 0 1.9-1.4L21 8H7" />
          <circle cx="10" cy="19" r="1.3" />
          <circle cx="18" cy="19" r="1.3" />
        </svg>
      </span>
      <div>
        <strong>{{ totalOrders }}</strong>
        <span>Total completed orders</span>
      </div>
    </article>

    <article class="profile-summary__metric">
      <span class="profile-summary__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
          <path d="M9 9h6M9 13h6" />
        </svg>
      </span>
      <div>
        <strong>{{ formatCurrency(totalSpent) }}</strong>
        <span>Total spent on completed orders</span>
      </div>
    </article>
  </section>
</template>

<script>
export default {
  name: 'ProfileSummaryHeader',
  props: {
    currentUser: {
      type: Object,
      default: () => ({ name: 'Customer', email: '' })
    },
    memberCode: {
      type: String,
      default: 'HEM MEMBER'
    },
    totalOrders: {
      type: Number,
      default: 0
    },
    totalSpent: {
      type: Number,
      default: 0
    },
    formatCurrency: {
      type: Function,
      required: true
    }
  }
};
</script>

<style scoped>
.profile-summary {
  --accent: #201c18;
  display: grid;
  grid-template-columns: minmax(260px, 1.25fr) repeat(2, minmax(230px, 1fr));
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(17, 17, 17, 0.08);
  background: var(--color-bg-surface-alt);
  box-shadow: 0 4px 16px rgba(17, 17, 17, 0.04);
}

.profile-summary__identity,
.profile-summary__metric {
  min-width: 0;
  padding: clamp(22px, 3vw, 34px);
}

.profile-summary__identity {
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: linear-gradient(120deg, var(--accent) 0%, #3a332b 100%);
  color: #fff;
  position: relative;
  overflow: hidden;
}

.profile-summary__identity::after {
  content: '';
  position: absolute;
  right: -50px;
  top: -50px;
  width: 170px;
  height: 170px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.04);
}

.profile-summary__eyebrow {
  margin-bottom: 8px;
  color: rgba(255, 255, 255, 0.85);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.profile-summary__identity h1 {
  margin: 0;
  color: #fff;
  font-size: clamp(22px, 3vw, 32px);
  font-weight: 700;
  line-height: 1.15;
}

.profile-summary__identity p {
  margin: 8px 0 16px;
  overflow: hidden;
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-summary__member-code {
  align-self: flex-start;
  padding: 6px 12px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  backdrop-filter: blur(2px);
}

.profile-summary__metric {
  display: flex;
  align-items: center;
  gap: 18px;
  border-left: 1px solid var(--color-border-subtle);
  transition: background 0.2s ease;
}

.profile-summary__metric:hover {
  background: rgba(17, 17, 17, 0.02);
}

.profile-summary__metric > div {
  min-width: 0;
  display: grid;
  gap: 7px;
}

.profile-summary__metric strong {
  color: var(--color-text-primary);
  font-size: clamp(24px, 3vw, 34px);
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
}

.profile-summary__metric div > span {
  color: var(--color-text-secondary);
  font-size: 13px;
  line-height: 1.45;
}

.profile-summary__icon {
  width: 50px;
  height: 50px;
  flex: 0 0 50px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: rgba(32, 28, 24, 0.06);
  color: var(--accent);
}

.profile-summary__icon svg {
  width: 26px;
  height: 26px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

@media (max-width: 1050px) {
  .profile-summary {
    grid-template-columns: 1fr 1fr;
    border-radius: 10px;
  }

  .profile-summary__identity {
    grid-column: 1 / -1;
  }

  .profile-summary__metric:nth-of-type(1) {
    border-left: 0;
  }
}

@media (max-width: 620px) {
  .profile-summary {
    grid-template-columns: 1fr;
  }

  .profile-summary__identity {
    grid-column: auto;
  }

  .profile-summary__metric {
    border-top: 1px solid var(--color-border-subtle);
    border-left: 0;
  }

  .profile-summary__metric:nth-of-type(1) {
    border-top: 0;
  }
}
</style>
